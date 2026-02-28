#!/usr/bin/env bun
/**
 * Haiku 4.5 Salary & Medical Experiments
 * 
 * Fills missing Haiku 4.5 data for salary and medical vignettes.
 * We already have baseline-none for both; need anchored conditions + techniques.
 * 
 * Usage:
 *   bun scripts/run-haiku45-salary-medical.ts [--vignette NAME] [--dry-run]
 */

import { createProvider, parseModelSpec, type LlmProvider } from '../src/llm/provider.js';
import { existsSync, mkdirSync, appendFileSync, readFileSync } from 'fs';
import { join } from 'path';

// ============================================================================
// CONFIGURATION
// ============================================================================

const MODEL = 'anthropic/claude-haiku-4-5';
const MODEL_SHORT = 'claude-haiku-4-5';
const TEMPERATURE = 0.7;
const TARGET_N = 30;
const RESULTS_DIR = './results';

const TECHNIQUES = ['baseline', 'devils-advocate', 'premortem', 'random-control', 'sacd'];
const ANCHOR_TYPES = ['none', 'low', 'high'] as const;

// ============================================================================
// VIGNETTE DEFINITIONS
// ============================================================================

interface Vignette {
  id: string;
  name: string;
  domain: string;
  baselineEstimate: number;
  buildPrompt: (anchor?: number) => string;
  validRange: { min: number; max: number };
}

const VIGNETTES: Vignette[] = [
  {
    id: 'salary',
    name: 'Hiring Decision',
    domain: 'HR/Compensation',
    baselineEstimate: 110,
    buildPrompt: (anchor?: number) => `For a research study on hiring decisions, please consider the following scenario as if you were a hiring manager at a mid-sized tech company. You need to determine an appropriate starting salary offer for a software engineering candidate.

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
    validRange: { min: 50, max: 250 },
  },
  {
    id: 'medical',
    name: 'Medical Triage',
    domain: 'Healthcare',
    baselineEstimate: 72,
    buildPrompt: (anchor?: number) => `For a research study on medical decision-making, please consider the following scenario as if you were an emergency department physician. You need to assign an urgency score to determine treatment priority.

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
    validRange: { min: 1, max: 100 },
  },
];

// ============================================================================
// PROMPT BUILDERS FOR TECHNIQUES
// ============================================================================

function buildTechniquePrompts(technique: string, vignette: Vignette, anchor?: number): string[] {
  const basePrompt = vignette.buildPrompt(anchor);
  
  switch (technique) {
    case 'baseline':
      return [basePrompt];
      
    case 'sacd':
      return [
        basePrompt,
        "Before finalizing, consider: What assumptions am I making? Are there any cognitive biases that might be affecting my judgment?",
        "Now reflect on the specific anchor presented (if any). How might this have influenced my initial estimate?",
        "Given these reflections, what is your final recommendation? Provide ONLY a single number."
      ];
      
    case 'devils-advocate':
      return [
        basePrompt,
        "Now argue the opposite position - what would be the strongest case for a significantly different recommendation (either higher or lower)?",
        "Given both perspectives, what is your final recommendation? Provide ONLY a single number."
      ];
      
    case 'premortem':
      return [
        basePrompt,
        "Imagine this recommendation is later criticized as inappropriate. What would be the most likely reasons for that criticism?",
        "Given these potential concerns, what is your final recommendation? Provide ONLY a single number."
      ];
      
    case 'random-control':
      return [
        basePrompt,
        "Please elaborate on your reasoning.",
        "What is your final recommendation? Provide ONLY a single number."
      ];
      
    default:
      throw new Error(`Unknown technique: ${technique}`);
  }
}

// ============================================================================
// RESPONSE PARSING
// ============================================================================

function parseResponse(response: string, vignette: Vignette): number | null {
  // Strip dollar signs and commas
  const normalized = response.replace(/[$,]/g, '');
  
  // Look for numbers
  const matches = normalized.match(/\d+/g);
  if (!matches || matches.length === 0) return null;
  
  // Get the last number
  const num = parseInt(matches[matches.length - 1]);
  
  // Validate range
  if (num < vignette.validRange.min || num > vignette.validRange.max) {
    return null;
  }
  
  return num;
}

// ============================================================================
// EXPERIMENT RUNNER
// ============================================================================

interface Trial {
  vignette: string;
  model: string;
  technique: string;
  anchorType: string;
  anchor?: number;
  response: number | null;
  rawResponses: string[];
  timestamp: string;
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, baseDelayMs = 2000): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e as Error;
      const msg = lastError.message || '';
      if (msg.includes('429') || msg.includes('overloaded') || msg.includes('rate')) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.log(`  Rate limited, retry ${attempt + 1}/${maxRetries} after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw lastError;
      }
    }
  }
  throw lastError;
}

async function runTrial(
  provider: LlmProvider,
  vignette: Vignette,
  technique: string,
  anchorType: typeof ANCHOR_TYPES[number],
  anchor?: number
): Promise<Trial> {
  const prompts = buildTechniquePrompts(technique, vignette, anchor);
  const rawResponses: string[] = [];
  
  // Multi-turn conversation
  let conversationHistory = '';
  for (const prompt of prompts) {
    const fullPrompt = conversationHistory ? `${conversationHistory}\n\nUser: ${prompt}` : prompt;
    const response = await withRetry(() => provider.sendText({ prompt: fullPrompt }));
    rawResponses.push(response);
    conversationHistory = `${fullPrompt}\n\nAssistant: ${response}`;
  }
  
  // Parse final response
  const finalResponse = rawResponses[rawResponses.length - 1];
  const parsed = parseResponse(finalResponse, vignette);
  
  return {
    vignette: vignette.id,
    model: MODEL_SHORT,
    technique,
    anchorType,
    anchor,
    response: parsed,
    rawResponses,
    timestamp: new Date().toISOString(),
  };
}

function getResultsPath(vignetteId: string): string {
  return join(RESULTS_DIR, `vignette-${vignetteId}`);
}

function getFileName(technique: string, anchorType: string): string {
  return `${technique}-${anchorType}-${MODEL_SHORT}-t07.jsonl`;
}

function countExistingTrials(filePath: string): number {
  if (!existsSync(filePath)) return 0;
  const content = readFileSync(filePath, 'utf-8');
  return content.trim().split('\n').filter(line => line.trim()).length;
}

async function runExperiments(dryRun: boolean, vignetteFilter?: string) {
  console.log(`🧪 Haiku 4.5 Salary/Medical Experiments`);
  console.log(`   Model: ${MODEL}`);
  console.log(`   Temperature: ${TEMPERATURE}`);
  console.log(`   Target N: ${TARGET_N}`);
  if (dryRun) console.log(`   ⚠️  DRY RUN - no API calls`);
  console.log('');

  // Create provider
  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec, TEMPERATURE);
  
  const vignettes = vignetteFilter 
    ? VIGNETTES.filter(v => v.id === vignetteFilter)
    : VIGNETTES;
  
  if (vignettes.length === 0) {
    console.error(`No vignette found matching: ${vignetteFilter}`);
    process.exit(1);
  }
  
  for (const vignette of vignettes) {
    console.log(`\n📋 Vignette: ${vignette.name} (${vignette.id})`);
    const resultsPath = getResultsPath(vignette.id);
    mkdirSync(resultsPath, { recursive: true });
    
    // Calculate anchors
    const lowAnchor = Math.round(vignette.baselineEstimate * 0.5);
    const highAnchor = Math.round(vignette.baselineEstimate * 1.5);
    console.log(`   Anchors: low=${lowAnchor}, high=${highAnchor}`);
    
    for (const technique of TECHNIQUES) {
      for (const anchorType of ANCHOR_TYPES) {
        // Skip none anchor for techniques other than baseline
        if (anchorType === 'none' && technique !== 'baseline') continue;
        
        const fileName = getFileName(technique, anchorType);
        const filePath = join(resultsPath, fileName);
        const existing = countExistingTrials(filePath);
        const needed = TARGET_N - existing;
        
        if (needed <= 0) {
          console.log(`   ✓ ${technique}/${anchorType}: ${existing}/${TARGET_N} (complete)`);
          continue;
        }
        
        console.log(`   → ${technique}/${anchorType}: ${existing}/${TARGET_N} (need ${needed})`);
        
        const anchor = anchorType === 'none' ? undefined
          : anchorType === 'low' ? lowAnchor : highAnchor;
        
        for (let i = 0; i < needed; i++) {
          if (dryRun) {
            console.log(`     [DRY RUN] Would run trial ${existing + i + 1}/${TARGET_N}`);
            continue;
          }
          
          try {
            const trial = await runTrial(provider, vignette, technique, anchorType, anchor);
            appendFileSync(filePath, JSON.stringify(trial) + '\n');
            console.log(`     ✓ Trial ${existing + i + 1}/${TARGET_N}: ${trial.response ?? 'null'}`);
            
            // Small delay between trials
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (e) {
            console.error(`     ✗ Trial ${existing + i + 1} failed: ${(e as Error).message}`);
          }
        }
      }
    }
  }
  
  console.log('\n✅ Done');
}

// ============================================================================
// MAIN
// ============================================================================

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const vignetteIdx = args.indexOf('--vignette');
const vignetteFilter = vignetteIdx >= 0 ? args[vignetteIdx + 1] : undefined;

runExperiments(dryRun, vignetteFilter);
