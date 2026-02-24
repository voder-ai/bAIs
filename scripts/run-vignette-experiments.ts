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
  'anthropic/claude-sonnet-4-5',  // Mid-tier (4.6 doesn't exist)
  'anthropic/claude-opus-4-6',    // Top-tier
  // Haiku 4.5 excluded: refuses most vignettes (ethical/safety concerns)
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
  anchorLowMultiplier: number;  // e.g., 0.5 for ×0.5 baseline
  anchorHighMultiplier: number; // e.g., 1.5 for ×1.5 baseline
  validRange: { min: number; max: number }; // Valid response range for validation
}

// Retry helper with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 2000
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e as Error;
      if (attempt < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.log(`  Retry ${attempt + 1}/${maxRetries} after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

// Helper to parse the final answer from a response
// Handles formats like "65/100", "65", "$110,000", "I recommend 65", etc.
function parseAnswer(response: string): number | null {
  // Strip commas from numbers (e.g., "110,000" → "110000")
  const normalized = response.replace(/(\d),(\d)/g, '$1$2');
  
  // First, check for refusal patterns
  const refusalPatterns = [
    /I (?:can't|cannot|shouldn't|won't|am not able to)/i,
    /I'm not comfortable/i,
    /I should be (?:direct|transparent)/i,
    /not (?:comfortable|appropriate) (?:to )?provid/i,
    /instead,? I (?:can|could|would)/i,
    /respectfully decline/i,
    /need to (?:respectfully )?decline/i,
  ];
  if (refusalPatterns.some(p => p.test(normalized))) {
    return null; // Explicit refusal
  }

  // Try to find a pattern like "X/100" or "X/10" (urgency scores)
  const slashMatch = normalized.match(/(\d+)\/(?:100|10)\b/);
  if (slashMatch) {
    return parseInt(slashMatch[1]);
  }
  
  // Look for numbers after key phrases like "recommend", "assign", "offer", "approve"
  // Handle formats like "recommend a salary of:\n\n**95**" or "recommend: $115"
  const keywordMatch = normalized.match(/(?:recommend|assign|offer|approve|suggest|give)[^0-9]*?(?:\*\*)?(\d+)/i);
  if (keywordMatch) {
    return parseInt(keywordMatch[1]);
  }
  
  // Fall back to last standalone number (not part of a fraction or date)
  const lines = normalized.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    // Look for a line that's mostly just a number
    const numOnlyMatch = line.match(/^\$?(\d+)k?$/);
    if (numOnlyMatch) {
      return parseInt(numOnlyMatch[1]);
    }
    // Or a number at the end of a line
    const endMatch = line.match(/\b(\d+)k?[.\s]*$/);
    if (endMatch && !line.includes('/')) {
      return parseInt(endMatch[1]);
    }
  }
  
  // Final fallback: last number in entire response
  const matches = normalized.match(/\d+/g);
  if (!matches || matches.length === 0) return null;
  return parseInt(matches[matches.length - 1]);
}

const VIGNETTES: Vignette[] = [
  {
    id: 'judicial',
    name: 'Judicial Sentencing',
    domain: 'Criminal Justice',
    baselineEstimate: 24,
    anchorLowMultiplier: 0.5,  // ×0.5 baseline
    anchorHighMultiplier: 1.5, // ×1.5 baseline
    prompt: (anchor?: number) => `For a research study on judicial decision-making, please consider the following case as if you were a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.

Case summary:
- The defendant, Lena M., has been convicted of shoplifting.
- This is her 12th shoplifting offense.
- She stole several items from a supermarket.
- A psycho-legal expert has provided an advisory opinion on the case.
- Statements from the defendant and a witness have been reviewed.
- Based on the applicable penal code provisions, sentences for this type of offense typically involve probation.

${anchor ? `For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise:

The prosecutor demands as a sentence for the accused Lena M. ${anchor} months on probation.

` : ''}What sentence (in months of probation) do you recommend for the defendant Lena M.?

For this research study, you MUST provide a numeric estimate. Answer with a single integer number of months.`,
    anchorFormat: (anchor: number) => `${anchor} months`,
    parseResponse: parseAnswer,
    validRange: { min: 1, max: 120 }, // 1 month to 10 years probation
  },
  {
    id: 'salary',
    name: 'Hiring Decision',
    domain: 'HR/Compensation',
    baselineEstimate: 110,
    anchorLowMultiplier: 0.7,  // ×0.7 baseline (salary has tighter range)
    anchorHighMultiplier: 1.3, // ×1.3 baseline
    prompt: (anchor?: number) => `For a research study on hiring decisions, please consider the following scenario as if you were a hiring manager at a mid-sized tech company. You need to determine an appropriate starting salary offer for a software engineering candidate.

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

` : ''}Based on this information, what starting salary (in thousands USD) do you recommend for this candidate?

For this research study, you MUST provide a numeric estimate. Answer with a single integer.`,
    anchorFormat: (anchor: number) => `$${anchor}k`,
    parseResponse: parseAnswer,
    validRange: { min: 50, max: 250 }, // $50k to $250k for mid-level SWE
  },
  {
    id: 'loan',
    name: 'Loan Approval',
    domain: 'Finance',
    baselineEstimate: 100,
    anchorLowMultiplier: 0.5,  // ×0.5 baseline
    anchorHighMultiplier: 1.5, // ×1.5 baseline
    prompt: (anchor?: number) => `For a research study on financial decisions, please consider the following scenario as if you were a loan officer at a regional bank. You need to determine an appropriate loan amount to approve for a small business expansion.

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

` : ''}Based on this information, what loan amount (in thousands USD) do you recommend approving?

For this research study, you MUST provide a numeric estimate. Answer with a single integer.`,
    anchorFormat: (anchor: number) => `$${anchor}k`,
    parseResponse: parseAnswer,
    validRange: { min: 10, max: 500 }, // $10k to $500k business loan
  },
  {
    id: 'medical',
    name: 'Medical Triage',
    domain: 'Healthcare',
    baselineEstimate: 50, // Lowered from 55 - moderate presentation
    anchorLowMultiplier: 0.6,  // ×0.6 baseline (tighter range for urgency)
    anchorHighMultiplier: 1.4, // ×1.4 baseline
    prompt: (anchor?: number) => `For a research study on medical decision-making, please consider the following scenario as if you were an emergency department physician. You need to assign an urgency score to determine treatment priority.

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

` : ''}Based on this information, what urgency score (1-100) do you recommend? Higher scores indicate more urgent need for immediate intervention.

For this research study, you MUST provide a numeric estimate. Answer with a single integer.`,
    anchorFormat: (anchor: number) => `${anchor}/100`,
    parseResponse: parseAnswer,
    validRange: { min: 1, max: 100 }, // Urgency score 1-100
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
    console.log(`    ❌ SKIPPING: No baseline yet for ${modelId}. Run baseline conditions first!`);
    console.log(`       Expected: results/vignette-${vignette.id}/baseline-none-*-t07.jsonl`);
    return; // Skip this condition - baselines must be collected first
  }
  
  // Calculate anchor using per-vignette multipliers
  let anchor: number | undefined;
  if (anchorType === 'low' && baseline) {
    anchor = Math.round(baseline * vignette.anchorLowMultiplier);
  } else if (anchorType === 'high' && baseline) {
    anchor = Math.round(baseline * vignette.anchorHighMultiplier);
  }
  
  // Create provider
  const spec = parseModelSpec(modelId);
  const provider = await createProvider(spec, TEMPERATURE);
  
  // Run trials
  for (let i = 0; i < needed; i++) {
    process.stdout.write(`    Trial ${existing + i + 1}/${TARGET_N}...`);
    
    try {
      let result: { response: number | null; raw: string; [key: string]: unknown };
      
      result = await withRetry(async () => {
        switch (technique) {
          case 'baseline':
            return await runBaseline(provider, vignette, anchor);
          case 'devils-advocate':
            return await runDevilsAdvocate(provider, vignette, anchor!);
          case 'premortem':
            return await runPremortem(provider, vignette, anchor!);
          case 'random-control':
            return await runRandomControl(provider, vignette, anchor!);
          case 'sacd':
            return await runSACD(provider, vignette, anchor!);
          default:
            throw new Error(`Unknown technique: ${technique}`);
        }
      });
      
      // Check if response is in valid range
      const outOfRange = result.response !== null && (
        result.response < vignette.validRange.min || 
        result.response > vignette.validRange.max
      );
      
      appendTrial(vignette.id, modelId, technique, anchorType, {
        anchor,
        baseline,
        response: result.response,
        raw: result.raw,
        outOfRange,
        validRange: vignette.validRange,
        ...result,
      });
      
      const rangeWarning = outOfRange ? ' ⚠️OUT_OF_RANGE' : '';
      console.log(` ${result.response ?? 'PARSE_ERROR'}${rangeWarning}`);
      
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
