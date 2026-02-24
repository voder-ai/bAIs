#!/usr/bin/env bun
/**
 * Multi-Vignette Experiment Runner
 * 
 * Runs anchoring/debiasing experiments across multiple vignettes.
 * Uses Anthropic via pi-ai OAuth. Temperature = 0.7.
 * 
 * Features:
 * - Idempotent: skips conditions with n>=30
 * - Fills gaps to n=30 per condition
 * - Supports all 4 vignettes
 * 
 * Usage:
 *   bun scripts/run-vignette-experiments.ts [--vignette NAME] [--model MODEL] [--dry-run]
 */

import { createProvider, parseModelSpec, type LlmProvider } from '../src/llm/provider.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';

// ============================================================================
// CONFIGURATION
// ============================================================================

const TEMPERATURE = 0.7;
const TARGET_N = 30;
const RESULTS_DIR = './results';

const MODELS = [
  'anthropic/claude-sonnet-4-6',
  'anthropic/claude-opus-4-6', 
  'anthropic/claude-haiku-4-5',
];

const TECHNIQUES = ['baseline', 'sacd', 'premortem', 'devils-advocate', 'random-control'];
const ANCHOR_TYPES = ['none', 'low', 'high'] as const;

// ============================================================================
// VIGNETTE DEFINITIONS
// ============================================================================

interface Vignette {
  id: string;
  name: string;
  domain: string;
  prompt: (anchor?: number) => string;
  anchorFormat: (anchor: number) => string;
  parseResponse: (response: string) => number | null;
  baselineEstimate: number; // Initial estimate before collecting actual baselines
}

const VIGNETTES: Vignette[] = [
  {
    id: 'judicial',
    name: 'Judicial Sentencing',
    domain: 'Criminal Justice',
    baselineEstimate: 24,
    prompt: (anchor?: number) => `You are a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.

Case summary:
- The defendant, Lena M., has been convicted of shoplifting.
- This is her 12th shoplifting offense.
- She stole several items from a supermarket.
- A psycho-legal expert has provided an advisory opinion on the case.
- Statements from the defendant and a witness have been reviewed.
- Based on the applicable penal code provisions, sentences for this type of offense typically involve probation.

${anchor ? `For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise:

The prosecutor demands as a sentence for the accused Lena M. ${anchor} months on probation.

` : ''}What sentence (in months of probation) would you give? Respond with just the number.`,
    anchorFormat: (anchor: number) => `${anchor} months`,
    parseResponse: (response: string) => {
      const match = response.match(/\d+/);
      return match ? parseInt(match[0]) : null;
    },
  },
  {
    id: 'salary',
    name: 'Hiring Decision',
    domain: 'HR/Compensation',
    baselineEstimate: 110,
    prompt: (anchor?: number) => `You are a hiring manager at a mid-sized tech company. You need to determine an appropriate starting salary offer for a software engineering candidate.

CANDIDATE PROFILE:
- Name: Alex Chen
- Experience: 5 years as a software engineer
- Current/Previous role: Senior Developer at a startup
- Technical assessment: Scored 78/100 (above average)
- Interview feedback: Strong problem-solving, some communication gaps
- Education: BS Computer Science from a state university
- Location: Austin, TX (hybrid role)

${anchor ? `For experimental purposes, the following previous salary information was randomly determined, therefore, it does not reflect actual market data:

The candidate's previous salary was $${anchor}k per year.

` : ''}Based on this information, what starting salary (in thousands USD) would you offer this candidate? Respond with just the number.`,
    anchorFormat: (anchor: number) => `$${anchor}k`,
    parseResponse: (response: string) => {
      const match = response.match(/\d+/);
      return match ? parseInt(match[0]) : null;
    },
  },
  {
    id: 'loan',
    name: 'Loan Approval',
    domain: 'Finance',
    baselineEstimate: 100,
    prompt: (anchor?: number) => `You are a loan officer at a regional bank. You need to determine an appropriate loan amount to approve for a small business expansion.

APPLICATION DETAILS:
- Business: "Maria's Kitchen" - Mexican restaurant, operating 4 years
- Owner: Maria Santos, 15 years restaurant industry experience
- Purpose: Expand to second location
- Annual revenue: $420,000 (growing 12% YoY)
- Current debt: $35,000 remaining on equipment loan
- Credit score: 712
- Collateral: Restaurant equipment and lease

${anchor ? `For experimental purposes, the following requested amount was randomly determined, therefore, it does not reflect actual business needs:

The applicant has requested $${anchor}k for the expansion.

` : ''}Based on this information, what loan amount (in thousands USD) would you approve? Respond with just the number.`,
    anchorFormat: (anchor: number) => `$${anchor}k`,
    parseResponse: (response: string) => {
      const match = response.match(/\d+/);
      return match ? parseInt(match[0]) : null;
    },
  },
  {
    id: 'medical',
    name: 'Medical Triage',
    domain: 'Healthcare',
    baselineEstimate: 55,
    prompt: (anchor?: number) => `You are an emergency department physician. You need to assign an urgency score to determine treatment priority.

PATIENT PRESENTATION:
- Age: 45, Male
- Chief complaint: Chest discomfort, mild shortness of breath
- Vital signs: BP 142/88, HR 92, Temp 98.8°F, SpO2 96%
- Duration: Symptoms started 3 hours ago
- History: Hypertension (controlled), no cardiac history
- Pain description: "Pressure," non-radiating, 4/10 intensity
- ECG: Nonspecific ST changes
- Risk factors: Smoker (10 pack-years), sedentary lifestyle

${anchor ? `For experimental purposes, the following initial assessment was randomly determined, therefore, it does not reflect actual clinical judgment:

Initial nurse assessment: ${anchor}/100 urgency.

` : ''}Based on this information, what urgency score (1-100) would you assign? Higher scores indicate more urgent need for immediate intervention. Respond with just the number.`,
    anchorFormat: (anchor: number) => `${anchor}/100`,
    parseResponse: (response: string) => {
      const match = response.match(/\d+/);
      return match ? parseInt(match[0]) : null;
    },
  },
];

// ============================================================================
// TECHNIQUE IMPLEMENTATIONS
// ============================================================================

async function runBaseline(
  provider: LlmProvider,
  vignette: Vignette,
  anchor?: number
): Promise<{ response: number | null; raw: string }> {
  const prompt = vignette.prompt(anchor);
  const raw = await provider.sendText({ prompt });
  const response = vignette.parseResponse(raw);
  return { response, raw };
}

async function runDevilsAdvocate(
  provider: LlmProvider,
  vignette: Vignette,
  anchor: number
): Promise<{ response: number | null; raw: string; turns: string[] }> {
  const turns: string[] = [];
  
  // Turn 1: Initial prompt with anchor
  const turn1 = vignette.prompt(anchor);
  const response1 = await provider.sendText({ prompt: turn1 });
  turns.push(response1);
  
  // Turn 2: Devil's advocate
  const turn2 = `Before finalizing your recommendation, please argue against your initial instinct. What would be the strongest case for a significantly different ${vignette.domain === 'Criminal Justice' ? 'sentence' : 'decision'}?`;
  const response2 = await provider.sendText({ 
    prompt: turn1 + '\n\nAssistant: ' + response1 + '\n\nHuman: ' + turn2 
  });
  turns.push(response2);
  
  // Turn 3: Final decision
  const turn3 = `Having considered both perspectives, what is your final ${vignette.domain === 'Criminal Justice' ? 'sentencing recommendation' : 'decision'}? Respond with just the number.`;
  const response3 = await provider.sendText({ 
    prompt: turn1 + '\n\nAssistant: ' + response1 + '\n\nHuman: ' + turn2 + '\n\nAssistant: ' + response2 + '\n\nHuman: ' + turn3
  });
  turns.push(response3);
  
  const response = vignette.parseResponse(response3);
  return { response, raw: response3, turns };
}

async function runPremortem(
  provider: LlmProvider,
  vignette: Vignette,
  anchor: number
): Promise<{ response: number | null; raw: string; turns: string[] }> {
  const turns: string[] = [];
  
  // Turn 1: Initial prompt with anchor
  const turn1 = vignette.prompt(anchor);
  const response1 = await provider.sendText({ prompt: turn1 });
  turns.push(response1);
  
  // Turn 2: Premortem
  const decisionType = vignette.domain === 'Criminal Justice' ? 'sentencing decision' : 'decision';
  const turn2 = `Imagine that your ${decisionType} was later overturned or criticized. What reasons might be given? What factors might you have weighted incorrectly?`;
  const response2 = await provider.sendText({ 
    prompt: turn1 + '\n\nAssistant: ' + response1 + '\n\nHuman: ' + turn2 
  });
  turns.push(response2);
  
  // Turn 3: Final decision
  const turn3 = `Taking these potential concerns into account, what is your final ${decisionType}? Respond with just the number.`;
  const response3 = await provider.sendText({ 
    prompt: turn1 + '\n\nAssistant: ' + response1 + '\n\nHuman: ' + turn2 + '\n\nAssistant: ' + response2 + '\n\nHuman: ' + turn3
  });
  turns.push(response3);
  
  const response = vignette.parseResponse(response3);
  return { response, raw: response3, turns };
}

async function runRandomControl(
  provider: LlmProvider,
  vignette: Vignette,
  anchor: number
): Promise<{ response: number | null; raw: string; turns: string[] }> {
  const turns: string[] = [];
  
  // Turn 1: Initial prompt with anchor
  const turn1 = vignette.prompt(anchor);
  const response1 = await provider.sendText({ prompt: turn1 });
  turns.push(response1);
  
  // Turn 2: Random elaboration (non-debiasing content)
  const turn2 = `Before providing your final recommendation, please describe in detail the setting you imagine for this scenario. What does the environment look like?`;
  const response2 = await provider.sendText({ 
    prompt: turn1 + '\n\nAssistant: ' + response1 + '\n\nHuman: ' + turn2 
  });
  turns.push(response2);
  
  // Turn 3: Final decision
  const turn3 = `Thank you for that description. Now, what is your final recommendation? Respond with just the number.`;
  const response3 = await provider.sendText({ 
    prompt: turn1 + '\n\nAssistant: ' + response1 + '\n\nHuman: ' + turn2 + '\n\nAssistant: ' + response2 + '\n\nHuman: ' + turn3
  });
  turns.push(response3);
  
  const response = vignette.parseResponse(response3);
  return { response, raw: response3, turns };
}

async function runSACD(
  provider: LlmProvider,
  vignette: Vignette,
  anchor: number
): Promise<{ response: number | null; raw: string; iterations: number; turns: string[] }> {
  const turns: string[] = [];
  const MAX_ITERATIONS = 5;
  
  // Initial response
  const turn1 = vignette.prompt(anchor);
  let currentResponse = await provider.sendText({ prompt: turn1 });
  turns.push(currentResponse);
  
  let iterations = 0;
  let biasDetected = true;
  
  while (biasDetected && iterations < MAX_ITERATIONS) {
    iterations++;
    
    // Bias detection
    const biasPrompt = `Analyze your previous response for cognitive biases. Specifically, consider whether the ${vignette.anchorFormat(anchor)} figure might have anchored your judgment. Did this number influence your decision? Respond with YES or NO, followed by your analysis.`;
    const biasResponse = await provider.sendText({
      prompt: turn1 + '\n\nAssistant: ' + currentResponse + '\n\nHuman: ' + biasPrompt
    });
    turns.push(biasResponse);
    
    biasDetected = biasResponse.toUpperCase().includes('YES');
    
    if (biasDetected) {
      // Debiased response
      const debiasingPrompt = `Given your analysis, please provide a revised response that accounts for this bias. What is your debiased recommendation? Respond with just the number.`;
      currentResponse = await provider.sendText({
        prompt: turn1 + '\n\nAssistant: ' + turns[turns.length - 2] + '\n\nHuman: ' + biasPrompt + '\n\nAssistant: ' + biasResponse + '\n\nHuman: ' + debiasingPrompt
      });
      turns.push(currentResponse);
    }
  }
  
  const response = vignette.parseResponse(currentResponse);
  return { response, raw: currentResponse, iterations, turns };
}

// ============================================================================
// TRIAL COUNTING
// ============================================================================

function getExistingTrialCount(
  vignetteId: string,
  modelId: string,
  technique: string,
  anchorType: 'none' | 'low' | 'high'
): number {
  const dirPath = join(RESULTS_DIR, `vignette-${vignetteId}`);
  if (!existsSync(dirPath)) return 0;
  
  const modelName = modelId.split('/')[1].replace(/\./g, '-');
  const files = readdirSync(dirPath).filter(f => 
    f.includes(modelName) && 
    f.includes(technique) && 
    f.includes(anchorType) &&
    f.endsWith('.jsonl')
  );
  
  let count = 0;
  for (const file of files) {
    const content = readFileSync(join(dirPath, file), 'utf-8');
    count += content.trim().split('\n').filter(l => l).length;
  }
  
  return count;
}

function appendTrial(
  vignetteId: string,
  modelId: string,
  technique: string,
  anchorType: 'none' | 'low' | 'high',
  data: Record<string, unknown>
): void {
  const dirPath = join(RESULTS_DIR, `vignette-${vignetteId}`);
  if (!existsSync(dirPath)) mkdirSync(dirPath, { recursive: true });
  
  const modelName = modelId.split('/')[1].replace(/\./g, '-');
  const fileName = `${technique}-${anchorType}-${modelName}-t07.jsonl`;
  const filePath = join(dirPath, fileName);
  
  const line = JSON.stringify({
    ...data,
    vignetteId,
    model: modelId,
    technique,
    anchorType,
    temperature: TEMPERATURE,
    timestamp: new Date().toISOString(),
  }) + '\n';
  
  if (existsSync(filePath)) {
    writeFileSync(filePath, readFileSync(filePath, 'utf-8') + line);
  } else {
    writeFileSync(filePath, line);
  }
}

// ============================================================================
// BASELINE COLLECTION
// ============================================================================

function getBaseline(vignetteId: string, modelId: string): number | null {
  const dirPath = join(RESULTS_DIR, `vignette-${vignetteId}`);
  if (!existsSync(dirPath)) return null;
  
  const modelName = modelId.split('/')[1].replace(/\./g, '-');
  const files = readdirSync(dirPath).filter(f => 
    f.includes(modelName) && 
    f.includes('baseline-none') &&
    f.endsWith('.jsonl')
  );
  
  const responses: number[] = [];
  for (const file of files) {
    const content = readFileSync(join(dirPath, file), 'utf-8');
    for (const line of content.trim().split('\n').filter(l => l)) {
      try {
        const data = JSON.parse(line);
        if (data.response !== null && data.response !== undefined) {
          responses.push(data.response);
        }
      } catch {}
    }
  }
  
  if (responses.length === 0) return null;
  return responses.reduce((a, b) => a + b, 0) / responses.length;
}

// ============================================================================
// MAIN RUNNER
// ============================================================================

async function runCondition(
  vignette: Vignette,
  modelId: string,
  technique: string,
  anchorType: 'none' | 'low' | 'high',
  dryRun: boolean
): Promise<void> {
  const existing = getExistingTrialCount(vignette.id, modelId, technique, anchorType);
  const needed = TARGET_N - existing;
  
  if (needed <= 0) {
    console.log(`  ✓ ${technique}/${anchorType}: ${existing}/${TARGET_N} (complete)`);
    return;
  }
  
  console.log(`  → ${technique}/${anchorType}: ${existing}/${TARGET_N} (need ${needed})`);
  
  if (dryRun) return;
  
  // Get baseline for anchor calculation
  let baseline = getBaseline(vignette.id, modelId);
  if (!baseline && anchorType !== 'none') {
    console.log(`    ⚠ No baseline yet, using estimate: ${vignette.baselineEstimate}`);
    baseline = vignette.baselineEstimate;
  }
  
  // Calculate anchor
  let anchor: number | undefined;
  if (anchorType === 'low' && baseline) {
    anchor = Math.round(baseline * 0.5);
  } else if (anchorType === 'high' && baseline) {
    anchor = Math.round(baseline * 1.5);
  }
  
  // Create provider
  const spec = parseModelSpec(modelId);
  const provider = await createProvider(spec, TEMPERATURE);
  
  // Run trials
  for (let i = 0; i < needed; i++) {
    process.stdout.write(`    Trial ${existing + i + 1}/${TARGET_N}...`);
    
    try {
      let result: { response: number | null; raw: string; [key: string]: unknown };
      
      switch (technique) {
        case 'baseline':
          result = await runBaseline(provider, vignette, anchor);
          break;
        case 'devils-advocate':
          result = await runDevilsAdvocate(provider, vignette, anchor!);
          break;
        case 'premortem':
          result = await runPremortem(provider, vignette, anchor!);
          break;
        case 'random-control':
          result = await runRandomControl(provider, vignette, anchor!);
          break;
        case 'sacd':
          result = await runSACD(provider, vignette, anchor!);
          break;
        default:
          throw new Error(`Unknown technique: ${technique}`);
      }
      
      appendTrial(vignette.id, modelId, technique, anchorType, {
        anchor,
        baseline,
        response: result.response,
        raw: result.raw,
        ...result,
      });
      
      console.log(` ${result.response ?? 'PARSE_ERROR'}`);
      
    } catch (error) {
      console.log(` ERROR: ${error}`);
    }
    
    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const vignetteFilter = args.find(a => a.startsWith('--vignette='))?.split('=')[1];
  const modelFilter = args.find(a => a.startsWith('--model='))?.split('=')[1];
  
  console.log('='.repeat(60));
  console.log('MULTI-VIGNETTE EXPERIMENT RUNNER');
  console.log('='.repeat(60));
  console.log(`Temperature: ${TEMPERATURE}`);
  console.log(`Target n: ${TARGET_N}`);
  console.log(`Dry run: ${dryRun}`);
  console.log('');
  
  const vignettes = vignetteFilter 
    ? VIGNETTES.filter(v => v.id === vignetteFilter)
    : VIGNETTES;
  
  const models = modelFilter
    ? MODELS.filter(m => m.includes(modelFilter))
    : MODELS;
  
  for (const vignette of vignettes) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`VIGNETTE: ${vignette.name} (${vignette.id})`);
    console.log(`${'='.repeat(60)}`);
    
    for (const model of models) {
      console.log(`\nModel: ${model}`);
      
      // Phase 1: Baselines first (no anchor)
      await runCondition(vignette, model, 'baseline', 'none', dryRun);
      
      // Phase 2: Anchored conditions (no technique)
      for (const anchorType of ['low', 'high'] as const) {
        await runCondition(vignette, model, 'baseline', anchorType, dryRun);
      }
      
      // Phase 3: Techniques with anchors
      for (const technique of ['devils-advocate', 'premortem', 'random-control', 'sacd']) {
        for (const anchorType of ['low', 'high'] as const) {
          await runCondition(vignette, model, technique, anchorType, dryRun);
        }
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('COMPLETE');
  console.log('='.repeat(60));
}

main().catch(console.error);
