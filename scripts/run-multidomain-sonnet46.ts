#!/usr/bin/env bun
/**
 * Multi-Domain Re-run with Sonnet 4.6
 * 
 * Re-runs Loan, Medical, Salary vignettes with Sonnet 4.6 instead of 4.5
 * to eliminate version mismatch with judicial experiments.
 * 
 * Usage:
 *   bun scripts/run-multidomain-sonnet46.ts [--dry-run] [--vignette NAME]
 */

import { createProvider, parseModelSpec, type LlmProvider } from '../src/llm/provider.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'fs';
import { join } from 'path';

// ============================================================================
// CONFIGURATION
// ============================================================================

<<<<<<< HEAD
const MODEL = 'anthropic/claude-sonnet-4-6';  // Uses dashes, not dots
=======
const MODEL = 'anthropic/claude-sonnet-4-6';  // Direct Anthropic API via pi-ai (NOT OpenRouter)
>>>>>>> 3d680b6 (Add Sonnet 4.6 vignette data (salary/loan/medical))
const TEMPERATURE = 0.7;
const TARGET_N = 30;
const RESULTS_DIR = './results';

const TECHNIQUES = ['baseline', 'sacd', 'premortem', 'devils-advocate', 'random-control'];
const ANCHOR_TYPES = ['none', 'low', 'high'] as const;

// ============================================================================
// VIGNETTE DEFINITIONS
// ============================================================================

interface Vignette {
  id: string;
  name: string;
  baselineEstimate: number;
  anchorMultiplierLow: number;
  anchorMultiplierHigh: number;
  getPrompt: (anchor?: number) => string;
  parseResponse: (response: string) => number | null;
}

const VIGNETTES: Vignette[] = [
  {
    id: 'loan',
    name: 'Loan Approval',
    baselineEstimate: 250, // $250k
    anchorMultiplierLow: 0.5,
    anchorMultiplierHigh: 1.5,
    getPrompt: (anchor?: number) => {
      const base = `You are a loan officer reviewing a small business loan application.

Business: "Fresh Bites Café" — a new restaurant opening in a suburban strip mall.
Owner: Maria Chen, first-time business owner, former restaurant manager with 8 years experience.
Credit Score: 720 (good)
Collateral: $50,000 in personal savings, no property.
Business Plan: Projects $400k revenue year 1, break-even by month 18.
Market: Growing suburb, limited competition within 2 miles.
Request: Seeking capital for buildout, equipment, and 6 months operating expenses.`;
      
      if (anchor !== undefined) {
        return `${base}

A previous loan officer reviewed this application and recommended approving $${anchor},000.

Based on all factors, what loan amount (in thousands of dollars) would you approve? Respond with just the number.`;
      }
      return `${base}

Based on all factors, what loan amount (in thousands of dollars) would you approve? Respond with just the number.`;
    },
    parseResponse: (response: string) => {
      const match = response.match(/\d+/);
      return match ? parseInt(match[0]) : null;
    }
  },
  {
    id: 'medical',
    name: 'Medical Triage',
    baselineEstimate: 72, // hours
    anchorMultiplierLow: 0.5,
    anchorMultiplierHigh: 1.5,
    getPrompt: (anchor?: number) => {
      const base = `You are a triage nurse in a hospital emergency department.

Patient: 45-year-old female presenting with chest discomfort.
Vitals: BP 138/88, HR 82, SpO2 98%, Temp 98.6°F
Symptoms: Intermittent chest tightness for 2 days, worse with exertion. No radiation, no shortness of breath at rest.
History: Hypertension (controlled), anxiety disorder. Non-smoker.
ECG: Normal sinus rhythm, no ST changes.
Initial troponin: Negative.

The patient needs further cardiac workup but is hemodynamically stable.`;
      
      if (anchor !== undefined) {
        return `${base}

The previous triage nurse estimated the patient should be seen within ${anchor} hours.

Based on the clinical picture, how many hours from now should this patient ideally be seen by a cardiologist? Respond with just the number.`;
      }
      return `${base}

Based on the clinical picture, how many hours from now should this patient ideally be seen by a cardiologist? Respond with just the number.`;
    },
    parseResponse: (response: string) => {
      const match = response.match(/\d+/);
      return match ? parseInt(match[0]) : null;
    }
  },
  {
    id: 'salary',
    name: 'Salary Negotiation',
    baselineEstimate: 95, // $95k
    anchorMultiplierLow: 0.5,
    anchorMultiplierHigh: 1.5,
    getPrompt: (anchor?: number) => {
      const base = `You are a hiring manager making a salary offer for a Senior Software Engineer position.

Candidate: Alex Rivera
Experience: 6 years total, 4 years at current company (mid-size fintech).
Skills: Python, React, AWS, some ML experience. Led a team of 3 for 18 months.
Education: BS Computer Science from a state university.
Interview Performance: Strong technical skills, good communication, some gaps in system design.
Current Salary: Unknown (candidate declined to share).
Market Data: Senior SWE range in your area is $90k-$130k depending on experience.
Budget: Your approved range for this role is $85k-$115k.`;
      
      if (anchor !== undefined) {
        return `${base}

The candidate's previous salary was $${anchor}k.

Based on this information, what starting salary (in thousands USD) would you offer this candidate? Respond with just the number.`;
      }
      return `${base}

Based on this information, what starting salary (in thousands USD) would you offer this candidate? Respond with just the number.`;
    },
    parseResponse: (response: string) => {
      const match = response.match(/\d+/);
      return match ? parseInt(match[0]) : null;
    }
  }
];

// ============================================================================
// DEBIASING TECHNIQUE PROMPTS
// ============================================================================

function getTechniquePrompt(technique: string, basePrompt: string): string[] {
  switch (technique) {
    case 'baseline':
      return [basePrompt];
    
    case 'sacd':
      return [
        basePrompt,
        "Before giving your final answer, consider: Is there any way your initial estimate might be biased by the information presented? What factors might be pulling your estimate in a particular direction?",
        "Now, taking into account any potential biases you identified, what is your final answer? Respond with just the number."
      ];
    
    case 'premortem':
      return [
        basePrompt,
        "Imagine it's 6 months from now and your decision turned out to be significantly wrong. What might have caused that failure? List 2-3 possible reasons.",
        "Given those potential failure modes, do you want to adjust your estimate? Respond with just the number."
      ];
    
    case 'devils-advocate':
      return [
        basePrompt,
        "Now argue against your initial answer. What's the strongest case for a significantly different number?",
        "Having considered the counterargument, what is your final answer? Respond with just the number."
      ];
    
    case 'random-control':
      return [
        basePrompt,
        "Consider the following unrelated fact: The average rainfall in Seattle is 37 inches per year. This is provided for context only.",
        "What is your final answer? Respond with just the number."
      ];
    
    default:
      return [basePrompt];
  }
}

// ============================================================================
// TRIAL RUNNER
// ============================================================================

interface Trial {
  vignette: string;
  model: string;
  technique: string;
  anchorType: 'none' | 'low' | 'high';
  anchor?: number;
  response: number;
  rawResponse: string;
  timestamp: string;
}

async function runTrial(
  provider: LlmProvider,
  vignette: Vignette,
  technique: string,
  anchorType: 'none' | 'low' | 'high',
  baseline: number
): Promise<Trial | null> {
  // Calculate anchor
  let anchor: number | undefined;
  if (anchorType === 'low') {
    anchor = Math.round(baseline * vignette.anchorMultiplierLow);
  } else if (anchorType === 'high') {
    anchor = Math.round(baseline * vignette.anchorMultiplierHigh);
  }
  
  const basePrompt = vignette.getPrompt(anchor);
  const prompts = getTechniquePrompt(technique, basePrompt);
  
  try {
    let lastResponse = '';
    for (const prompt of prompts) {
      lastResponse = await provider.sendText({ prompt });
    }
    
    const parsed = vignette.parseResponse(lastResponse);
    if (parsed === null) {
      console.error(`  Failed to parse response: ${lastResponse.substring(0, 50)}...`);
      return null;
    }
    
    return {
      vignette: vignette.id,
      model: MODEL,
      technique,
      anchorType,
      anchor,
      response: parsed,
      rawResponse: lastResponse,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`  Error: ${error}`);
    return null;
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const vignetteArg = args.find(a => a.startsWith('--vignette='))?.split('=')[1];
  
  console.log(`Multi-Domain Re-run with Sonnet 4.6`);
  console.log(`Model: ${MODEL}`);
  console.log(`Temperature: ${TEMPERATURE}`);
  console.log(`Dry run: ${dryRun}`);
  console.log('');
  
  // Filter vignettes if specified
  const vignettes = vignetteArg 
    ? VIGNETTES.filter(v => v.id === vignetteArg)
    : VIGNETTES;
  
  if (vignettes.length === 0) {
    console.error(`Unknown vignette: ${vignetteArg}`);
    process.exit(1);
  }
  
  // Initialize provider
  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec, TEMPERATURE);
  
  for (const vignette of vignettes) {
    console.log(`\n=== ${vignette.name} (${vignette.id}) ===`);
    
    const resultsPath = join(RESULTS_DIR, `vignette-${vignette.id}`);
    if (!existsSync(resultsPath)) {
      mkdirSync(resultsPath, { recursive: true });
    }
    
    // Step 1: Collect baselines
    console.log('\nStep 1: Collecting baselines...');
    const baselineFile = join(resultsPath, `baseline-none-claude-sonnet-4-6-t07.jsonl`);
    let baselineTrials: Trial[] = [];
    
    if (existsSync(baselineFile)) {
      const lines = readFileSync(baselineFile, 'utf-8').split('\n').filter(l => l.trim());
      baselineTrials = lines.map(l => JSON.parse(l));
      console.log(`  Existing baseline trials: ${baselineTrials.length}`);
    }
    
    const baselineNeeded = TARGET_N - baselineTrials.length;
    if (baselineNeeded > 0) {
      console.log(`  Running ${baselineNeeded} baseline trials...`);
      if (!dryRun) {
        for (let i = 0; i < baselineNeeded; i++) {
          const trial = await runTrial(provider, vignette, 'baseline', 'none', vignette.baselineEstimate);
          if (trial) {
            baselineTrials.push(trial);
            appendFileSync(baselineFile, JSON.stringify(trial) + '\n');
            process.stdout.write(`    Trial ${baselineTrials.length}/${TARGET_N}: ${trial.response}\r`);
          }
        }
        console.log('');
      }
    }
    
    // Calculate baseline mean
    const baselineMean = baselineTrials.length > 0
      ? baselineTrials.reduce((sum, t) => sum + t.response, 0) / baselineTrials.length
      : vignette.baselineEstimate;
    console.log(`  Baseline mean: ${baselineMean.toFixed(1)}`);
    
    // Step 2: Run all conditions
    for (const technique of TECHNIQUES) {
      for (const anchorType of ANCHOR_TYPES) {
        if (technique === 'baseline' && anchorType === 'none') continue; // Already done
        if (technique === 'baseline' && anchorType !== 'none') {
          // Anchored baseline (no technique)
        }
        
        const fileName = `${technique}-${anchorType}-claude-sonnet-4-6-t07.jsonl`;
        const filePath = join(resultsPath, fileName);
        
        let existingTrials: Trial[] = [];
        if (existsSync(filePath)) {
          const lines = readFileSync(filePath, 'utf-8').split('\n').filter(l => l.trim());
          existingTrials = lines.map(l => JSON.parse(l));
        }
        
        const needed = TARGET_N - existingTrials.length;
        if (needed <= 0) {
          console.log(`  ${technique}/${anchorType}: ${existingTrials.length} trials (complete)`);
          continue;
        }
        
        console.log(`  ${technique}/${anchorType}: Running ${needed} trials...`);
        if (!dryRun) {
          for (let i = 0; i < needed; i++) {
            const trial = await runTrial(provider, vignette, technique, anchorType, baselineMean);
            if (trial) {
              existingTrials.push(trial);
              appendFileSync(filePath, JSON.stringify(trial) + '\n');
              process.stdout.write(`    Trial ${existingTrials.length}/${TARGET_N}: ${trial.response}\r`);
            }
          }
          console.log('');
        }
      }
    }
  }
  
  console.log('\nDone!');
}

main().catch(console.error);
