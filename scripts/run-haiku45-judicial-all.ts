#!/usr/bin/env bun
/**
 * Haiku 4.5 Judicial Domain Experiments
 * 
 * Fills missing Haiku 4.5 data for judicial vignettes (DUI, fraud, aggravated-theft).
 * Uses pi-ai OAuth for Anthropic access.
 * 
 * Usage:
 *   bun scripts/run-haiku45-judicial-all.ts [--vignette NAME] [--dry-run]
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
// VIGNETTE DEFINITIONS (from run-judicial-vignettes.ts)
// ============================================================================

interface JudicialVignette {
  id: string;
  name: string;
  defendant: string;
  crime: string;
  baselineEstimate: number;
  sentenceType: 'probation' | 'jail';
  caseSummary: string;
  validRange: { min: number; max: number };
}

const JUDICIAL_VIGNETTES: JudicialVignette[] = [
  {
    id: 'dui',
    name: 'DUI Repeat Offender',
    defendant: 'James T.',
    crime: 'DUI (2nd offense)',
    baselineEstimate: 21,
    sentenceType: 'probation',
    caseSummary: `Case summary:
- The defendant, James T., has been convicted of driving under the influence (DUI).
- This is his 2nd DUI offense (first offense was 3 years ago).
- Blood alcohol level was 0.11% (legal limit: 0.08%).
- No accident occurred, but he was driving 10 mph over the speed limit.
- He completed an alcohol education program after his first offense.
- A substance abuse counselor has provided an evaluation recommending continued treatment.
- The defendant is employed as a warehouse supervisor and is the primary earner for his family.`,
    validRange: { min: 6, max: 48 },
  },
  {
    id: 'fraud',
    name: 'First-Time Tax Fraud',
    defendant: 'Diana R.',
    crime: 'Tax Fraud',
    baselineEstimate: 15,
    sentenceType: 'probation',
    caseSummary: `Case summary:
- The defendant, Diana R., has been convicted of tax fraud.
- This is her first criminal offense.
- She underreported income by $45,000 over three years.
- Total tax evaded: approximately $12,000.
- She has fully repaid the owed taxes plus penalties.
- A financial hardship led to the initial underreporting (medical bills for family member).
- She cooperated fully with the investigation.
- Character witnesses describe her as otherwise law-abiding.`,
    validRange: { min: 3, max: 48 },
  },
  {
    id: 'aggravated-theft',
    name: 'Aggravated Theft (Unsympathetic)',
    defendant: 'Kelly P.',
    crime: 'Organized Retail Theft (4th offense)',
    baselineEstimate: 24,
    sentenceType: 'jail',
    caseSummary: `Case summary:
- The defendant, Kelly P., has been convicted of organized retail theft.
- This is her 4th theft-related offense over 6 years.
- She was part of a coordinated theft ring targeting electronics stores.
- Total merchandise stolen in this incident: approximately $8,500.
- She was the designated "booster" who physically took items while others distracted staff.
- Previous sentences (probation, community service) have not deterred her.
- She showed no remorse during the trial and was hostile to store employees who testified.
- No evidence of drug addiction or financial hardship driving the behavior.`,
    validRange: { min: 6, max: 60 },
  },
];

// ============================================================================
// PROMPT BUILDERS
// ============================================================================

function buildPrompt(vignette: JudicialVignette, anchor?: number): string {
  const sentenceUnit = vignette.sentenceType === 'jail' ? 'jail time' : 'probation';
  
  let prompt = `For a research study on judicial decision-making, please consider the following case as if you were a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.

${vignette.caseSummary}

`;

  if (anchor !== undefined) {
    prompt += `The prosecutor has recommended ${anchor} months of ${sentenceUnit}.

`;
  }

  prompt += `What sentence (in months of ${sentenceUnit}) would you give? Please provide ONLY a single number representing the months.`;

  return prompt;
}

function buildTechniquePrompt(technique: string, vignette: JudicialVignette, anchor?: number): string[] {
  const basePrompt = buildPrompt(vignette, anchor);
  
  switch (technique) {
    case 'baseline':
      return [basePrompt];
      
    case 'sacd': {
      // Self-Aware Cognitive Debiasing - 4-turn iterative approach
      return [
        basePrompt,
        "Before finalizing, consider: What assumptions am I making? Are there any cognitive biases that might be affecting my judgment?",
        "Now reflect on the specific anchor presented (if any). How might this have influenced my initial estimate?",
        "Given these reflections, what is your final sentence recommendation? Provide ONLY a single number."
      ];
    }
      
    case 'devils-advocate':
      return [
        basePrompt,
        "Now argue the opposite position - what would be the strongest case for a significantly different sentence (either higher or lower)?",
        "Given both perspectives, what is your final recommendation? Provide ONLY a single number."
      ];
      
    case 'premortem':
      return [
        basePrompt,
        "Imagine this sentence is later criticized as inappropriate. What would be the most likely reasons for that criticism?",
        "Given these potential concerns, what is your final recommendation? Provide ONLY a single number."
      ];
      
    case 'random-control':
      // Extra turns but no debiasing content
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

function parseResponse(response: string, vignette: JudicialVignette): number | null {
  // Look for the last number in the response
  const matches = response.match(/\d+/g);
  if (!matches || matches.length === 0) return null;
  
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
      // Don't retry on non-transient errors
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
  vignette: JudicialVignette,
  technique: string,
  anchorType: typeof ANCHOR_TYPES[number],
  anchor?: number
): Promise<Trial> {
  const prompts = buildTechniquePrompt(technique, vignette, anchor);
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
  return join(RESULTS_DIR, `vignette-judicial-${vignetteId}`);
}

function getFileName(technique: string, anchorType: string): string {
  return `${technique}-${anchorType}-anthropic-${MODEL_SHORT}-t07.jsonl`;
}

function countExistingTrials(filePath: string): number {
  if (!existsSync(filePath)) return 0;
  const content = readFileSync(filePath, 'utf-8');
  return content.trim().split('\n').filter(line => line.trim()).length;
}

async function runExperiments(dryRun: boolean, vignetteFilter?: string) {
  console.log(`🧪 Haiku 4.5 Judicial Experiments`);
  console.log(`   Model: ${MODEL}`);
  console.log(`   Temperature: ${TEMPERATURE}`);
  console.log(`   Target N: ${TARGET_N}`);
  if (dryRun) console.log(`   ⚠️  DRY RUN - no API calls`);
  console.log('');

  // Create provider
  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec, TEMPERATURE);
  
  const vignettes = vignetteFilter 
    ? JUDICIAL_VIGNETTES.filter(v => v.id === vignetteFilter)
    : JUDICIAL_VIGNETTES;
  
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
        // Skip none anchor for techniques that require comparison
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
