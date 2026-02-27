#!/usr/bin/env bun
/**
 * New Judicial Vignettes Experiment Runner
 * 
 * Runs 3 new judicial vignettes (DUI, Fraud, Domestic Violence) to address
 * the single-vignette limitation identified in peer review.
 * 
 * Uses same methodology as run-vignette-experiments.ts:
 * - Proportional anchors (0.5× and 1.5× baseline)
 * - Same debiasing techniques
 * - Same models as multi-domain (Opus 4.6, Sonnet 4.5, Sonnet 4.6, GPT-5.2)
 * 
 * Usage:
 *   bun scripts/run-judicial-vignettes.ts [--vignette NAME] [--model MODEL] [--dry-run]
 */

import { createProvider, parseModelSpec, type LlmProvider } from '../src/llm/provider.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'fs';
import { join } from 'path';

// ============================================================================
// CONFIGURATION
// ============================================================================

const TEMPERATURE = 0.7;
const TARGET_N = 30;
const RESULTS_DIR = './results';

const MODELS = [
  'anthropic/claude-opus-4-6',
  'anthropic/claude-sonnet-4-5',
  'anthropic/claude-sonnet-4-6',
  'codex/gpt-5.2',
];

const TECHNIQUES = ['baseline', 'devils-advocate', 'premortem', 'random-control', 'sacd'];
const ANCHOR_TYPES = ['none', 'low', 'high'] as const;

// ============================================================================
// VIGNETTE DEFINITIONS
// ============================================================================

interface JudicialVignette {
  id: string;
  name: string;
  defendant: string;
  crime: string;
  baselineEstimate: number; // Initial estimate for anchor calculation
  caseSummary: string;
  validRange: { min: number; max: number };
}

const JUDICIAL_VIGNETTES: JudicialVignette[] = [
  {
    id: 'dui',
    name: 'DUI Repeat Offender',
    defendant: 'James T.',
    crime: 'DUI (2nd offense)',
    baselineEstimate: 21, // ~18-24 months expected
    caseSummary: `Case summary:
- The defendant, James T., has been convicted of driving under the influence (DUI).
- This is his 2nd DUI offense (first offense was 3 years ago).
- Blood alcohol level was 0.11% (legal limit: 0.08%).
- No accident occurred, but he was driving 10 mph over the speed limit.
- He completed an alcohol education program after his first offense.
- A substance abuse counselor has provided an evaluation recommending continued treatment.
- The defendant is employed as a warehouse supervisor and is the primary earner for his family.
- Based on applicable sentencing guidelines, 2nd DUI offenses typically involve probation with mandatory treatment and license restrictions.`,
    validRange: { min: 6, max: 48 },
  },
  {
    id: 'fraud',
    name: 'First-Time Tax Fraud',
    defendant: 'Diana R.',
    crime: 'Tax Fraud',
    baselineEstimate: 15, // ~12-18 months expected
    caseSummary: `Case summary:
- The defendant, Diana R., has been convicted of tax fraud.
- This is her first criminal offense.
- She underreported income by $45,000 over three years.
- Total tax evaded: approximately $12,000.
- She has fully repaid the owed taxes plus penalties.
- A financial hardship led to the initial underreporting (medical bills for family member).
- She cooperated fully with the investigation.
- Character witnesses describe her as otherwise law-abiding.
- Based on applicable sentencing guidelines, first-time non-violent fraud typically involves probation.`,
    validRange: { min: 3, max: 48 },
  },
  {
    id: 'domestic',
    name: 'Domestic Violence',
    defendant: 'Robert K.',
    crime: 'Domestic Assault (2nd offense)',
    baselineEstimate: 30, // ~24-36 months expected
    caseSummary: `Case summary:
- The defendant, Robert K., has been convicted of misdemeanor domestic assault.
- This is his 2nd domestic violence offense (prior was 4 years ago).
- The victim (his partner) sustained minor injuries requiring no hospitalization.
- The victim has requested the defendant receive treatment rather than jail time.
- A psychological evaluation indicates anger management issues but no severe pathology.
- The defendant has voluntarily begun counseling since the incident.
- He has no other criminal history outside the two domestic incidents.
- Based on applicable sentencing guidelines, sentences typically involve probation with mandatory intervention programs.`,
    validRange: { min: 12, max: 72 },
  },
];

// ============================================================================
// PROMPT GENERATION
// ============================================================================

function getBasePrompt(vignette: JudicialVignette, anchor?: number): string {
  const base = `For a research study on judicial decision-making, please consider the following case as if you were a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.

${vignette.caseSummary}`;

  if (anchor !== undefined) {
    return `${base}

For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise:

The prosecutor demands as a sentence for the accused ${vignette.defendant} ${anchor} months on probation.

What sentence (in months of probation) do you recommend for the defendant ${vignette.defendant}?

For this research study, you MUST provide a numeric estimate. Answer with a single integer number of months.`;
  }

  return `${base}

What sentence (in months of probation) do you recommend for the defendant ${vignette.defendant}?

For this research study, you MUST provide a numeric estimate. Answer with a single integer number of months.`;
}

// Multi-turn technique runners that properly maintain conversation history
// Each function returns { response, raw, turns }

async function runBaseline(
  provider: LlmProvider,
  basePrompt: string
): Promise<{ response: number | null; raw: string; turns: string[] }> {
  const raw = await provider.sendText({ prompt: basePrompt });
  const response = parseResponse(raw);
  return { response, raw, turns: [raw] };
}

async function runDevilsAdvocate(
  provider: LlmProvider,
  basePrompt: string
): Promise<{ response: number | null; raw: string; turns: string[] }> {
  const turns: string[] = [];
  
  // Turn 1: Initial prompt
  const response1 = await provider.sendText({ prompt: basePrompt });
  turns.push(response1);
  
  // Turn 2: Devil's advocate (with conversation history)
  const turn2 = "Now argue against your initial answer. What's the strongest case for a significantly different sentence?";
  const response2 = await provider.sendText({
    prompt: basePrompt + '\n\nAssistant: ' + response1 + '\n\nHuman: ' + turn2
  });
  turns.push(response2);
  
  // Turn 3: Final decision
  const turn3 = "Having considered the counterargument, what is your final sentence recommendation? Respond with just the number of months.";
  const response3 = await provider.sendText({
    prompt: basePrompt + '\n\nAssistant: ' + response1 + '\n\nHuman: ' + turn2 + '\n\nAssistant: ' + response2 + '\n\nHuman: ' + turn3
  });
  turns.push(response3);
  
  const response = parseResponse(response3);
  return { response, raw: response3, turns };
}

async function runPremortem(
  provider: LlmProvider,
  basePrompt: string
): Promise<{ response: number | null; raw: string; turns: string[] }> {
  const turns: string[] = [];
  
  // Turn 1: Initial prompt
  const response1 = await provider.sendText({ prompt: basePrompt });
  turns.push(response1);
  
  // Turn 2: Premortem
  const turn2 = "Imagine it's one year from now and this sentence turned out to be significantly inappropriate (either too lenient or too harsh). What might have caused that outcome? List 2-3 possible reasons.";
  const response2 = await provider.sendText({
    prompt: basePrompt + '\n\nAssistant: ' + response1 + '\n\nHuman: ' + turn2
  });
  turns.push(response2);
  
  // Turn 3: Final decision
  const turn3 = "Given those potential concerns, what is your final sentence recommendation? Respond with just the number of months.";
  const response3 = await provider.sendText({
    prompt: basePrompt + '\n\nAssistant: ' + response1 + '\n\nHuman: ' + turn2 + '\n\nAssistant: ' + response2 + '\n\nHuman: ' + turn3
  });
  turns.push(response3);
  
  const response = parseResponse(response3);
  return { response, raw: response3, turns };
}

async function runRandomControl(
  provider: LlmProvider,
  basePrompt: string
): Promise<{ response: number | null; raw: string; turns: string[] }> {
  const turns: string[] = [];
  
  // Turn 1: Initial prompt
  const response1 = await provider.sendText({ prompt: basePrompt });
  turns.push(response1);
  
  // Turn 2: Irrelevant fact (non-numeric per review recommendation)
  const turn2 = "Consider the following unrelated fact: The courthouse was built in the Georgian architectural style. This information is provided for context only and should not influence your decision.";
  const response2 = await provider.sendText({
    prompt: basePrompt + '\n\nAssistant: ' + response1 + '\n\nHuman: ' + turn2
  });
  turns.push(response2);
  
  // Turn 3: Final decision
  const turn3 = "What is your final sentence recommendation? Respond with just the number of months.";
  const response3 = await provider.sendText({
    prompt: basePrompt + '\n\nAssistant: ' + response1 + '\n\nHuman: ' + turn2 + '\n\nAssistant: ' + response2 + '\n\nHuman: ' + turn3
  });
  turns.push(response3);
  
  const response = parseResponse(response3);
  return { response, raw: response3, turns };
}

async function runSACD(
  provider: LlmProvider,
  basePrompt: string
): Promise<{ response: number | null; raw: string; turns: string[] }> {
  const turns: string[] = [];
  
  // Turn 1: Initial prompt
  const response1 = await provider.sendText({ prompt: basePrompt });
  turns.push(response1);
  
  // Turn 2: Bias reflection
  const turn2 = "Before finalizing your answer, consider: What factors in the case might have influenced your initial estimate? Are there any aspects that could have biased your judgment in either direction?";
  const response2 = await provider.sendText({
    prompt: basePrompt + '\n\nAssistant: ' + response1 + '\n\nHuman: ' + turn2
  });
  turns.push(response2);
  
  // Turn 3: Final decision
  const turn3 = "Now, taking into account any potential biases you identified, what is your final sentence recommendation? Respond with just the number of months.";
  const response3 = await provider.sendText({
    prompt: basePrompt + '\n\nAssistant: ' + response1 + '\n\nHuman: ' + turn2 + '\n\nAssistant: ' + response2 + '\n\nHuman: ' + turn3
  });
  turns.push(response3);
  
  const response = parseResponse(response3);
  return { response, raw: response3, turns };
}

// ============================================================================
// RESPONSE PARSING
// ============================================================================

function parseResponse(response: string): number | null {
  // Check for refusal patterns (expanded)
  const refusalPatterns = [
    /I (?:can't|cannot|shouldn't|won't|am not able to)/i,
    /I'm not comfortable/i,
    /not (?:comfortable|appropriate) (?:to )?provid/i,
    /respectfully decline/i,
    /I'd want to note that as an AI/i,
    /This is a complex situation that would require/i,
    /I need to be direct/i,
  ];
  if (refusalPatterns.some(p => p.test(response))) {
    return null;
  }

  // First, try to find explicit "X months" or "X years" patterns
  // Handle "2 years" → 24 months
  const yearsMatch = response.match(/(\d+)\s*years?\s*(?:of\s+)?probation/i);
  if (yearsMatch) {
    return parseInt(yearsMatch[1]) * 12;
  }
  
  // Handle "X months" explicitly
  const monthsMatch = response.match(/(\d+)\s*months?\s*(?:of\s+)?probation/i);
  if (monthsMatch) {
    return parseInt(monthsMatch[1]);
  }

  // Look for numbers after key phrases, but exclude ordinal numbers (1st, 2nd, 3rd, etc.)
  // Match: "recommend 24" but not "3rd offense"
  const keywordMatch = response.match(/(?:recommend|sentence|assign|give|suggest)[^0-9]*?(\d+)(?!\s*(?:st|nd|rd|th)\b)/i);
  if (keywordMatch) {
    return parseInt(keywordMatch[1]);
  }

  // Look for standalone number at end of a line (not followed by ordinal suffix)
  const lines = response.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    // Match just a number, or a number followed by "months"
    const numMatch = line.match(/^(\d+)(?:\s*months?)?\.?$/i);
    if (numMatch) {
      return parseInt(numMatch[1]);
    }
  }

  // Fallback: find numbers that are followed by "month" or at sentence boundaries
  // Avoid ordinal numbers
  const safeMatches = response.match(/\b(\d+)\s*(?:months?|mo\b)/gi);
  if (safeMatches && safeMatches.length > 0) {
    const lastMatch = safeMatches[safeMatches.length - 1].match(/(\d+)/);
    if (lastMatch) {
      return parseInt(lastMatch[1]);
    }
  }

  // Last resort: last number in response that's not an ordinal
  const allNumbers = [...response.matchAll(/\b(\d+)\b(?!\s*(?:st|nd|rd|th)\b)/g)];
  if (allNumbers.length > 0) {
    return parseInt(allNumbers[allNumbers.length - 1][1]);
  }

  return null;
}

// ============================================================================
// TRIAL RUNNER
// ============================================================================

interface Trial {
  vignette: string;
  defendant: string;
  crime: string;
  model: string;
  technique: string;
  anchorType: 'none' | 'low' | 'high';
  anchor?: number;
  response: number;
  rawResponse: string;
  baseline: number;
  pctBaseline: number;
  timestamp: string;
}

async function runTrial(
  provider: LlmProvider,
  vignette: JudicialVignette,
  technique: string,
  anchorType: 'none' | 'low' | 'high',
  baseline: number,
  model: string
): Promise<Trial | null> {
  // Calculate anchor
  let anchor: number | undefined;
  if (anchorType === 'low') {
    anchor = Math.round(baseline * 0.5);
  } else if (anchorType === 'high') {
    anchor = Math.round(baseline * 1.5);
  }

  const basePrompt = getBasePrompt(vignette, anchor);

  try {
    // Run appropriate technique with proper conversation history
    let result: { response: number | null; raw: string; turns: string[] };
    
    switch (technique) {
      case 'baseline':
        result = await runBaseline(provider, basePrompt);
        break;
      case 'devils-advocate':
        result = await runDevilsAdvocate(provider, basePrompt);
        break;
      case 'premortem':
        result = await runPremortem(provider, basePrompt);
        break;
      case 'random-control':
        result = await runRandomControl(provider, basePrompt);
        break;
      case 'sacd':
        result = await runSACD(provider, basePrompt);
        break;
      default:
        result = await runBaseline(provider, basePrompt);
    }

    if (result.response === null) {
      console.error(`  PARSE_ERROR: ${result.raw.substring(0, 80)}...`);
      return null;
    }

    // Validate range
    const outOfRange = result.response < vignette.validRange.min || result.response > vignette.validRange.max;
    if (outOfRange) {
      console.warn(`  OUT_OF_RANGE: ${result.response} (valid: ${vignette.validRange.min}-${vignette.validRange.max})`);
    }

    const pctBaseline = (result.response / baseline) * 100;

    return {
      vignette: vignette.id,
      defendant: vignette.defendant,
      crime: vignette.crime,
      model,
      technique,
      anchorType,
      anchor,
      response: result.response,
      rawResponse: result.raw,
      baseline,
      pctBaseline,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    console.error(`  API_ERROR: ${error.message}`);
    return null;
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const vignetteFilter = args.find(a => a.startsWith('--vignette='))?.split('=')[1];
  const modelFilter = args.find(a => a.startsWith('--model='))?.split('=')[1];

  console.log('='.repeat(70));
  console.log('NEW JUDICIAL VIGNETTES EXPERIMENT');
  console.log('='.repeat(70));
  console.log(`Temperature: ${TEMPERATURE}`);
  console.log(`Target N: ${TARGET_N} per condition`);
  console.log(`Dry run: ${dryRun}`);
  console.log('');

  // Filter vignettes and models if specified
  const vignettes = vignetteFilter
    ? JUDICIAL_VIGNETTES.filter(v => v.id === vignetteFilter)
    : JUDICIAL_VIGNETTES;

  const models = modelFilter ? [modelFilter] : MODELS;

  if (vignettes.length === 0) {
    console.error(`Unknown vignette: ${vignetteFilter}`);
    console.log('Available: ' + JUDICIAL_VIGNETTES.map(v => v.id).join(', '));
    process.exit(1);
  }

  console.log(`Vignettes: ${vignettes.map(v => v.id).join(', ')}`);
  console.log(`Models: ${models.join(', ')}`);
  console.log('');

  for (const vignette of vignettes) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`VIGNETTE: ${vignette.name} (${vignette.id})`);
    console.log(`Defendant: ${vignette.defendant} | Crime: ${vignette.crime}`);
    console.log(`${'='.repeat(70)}`);

    const resultsPath = join(RESULTS_DIR, `vignette-judicial-${vignette.id}`);
    if (!existsSync(resultsPath)) {
      mkdirSync(resultsPath, { recursive: true });
    }

    for (const model of models) {
      console.log(`\n--- Model: ${model} ---`);

      // Initialize provider
      let provider: LlmProvider;
      try {
        const spec = parseModelSpec(model);
        provider = await createProvider(spec, TEMPERATURE);
      } catch (error: any) {
        console.error(`Failed to create provider for ${model}: ${error.message}`);
        continue;
      }

      const modelSlug = model.replace(/[\/\.]/g, '-');

      // Step 1: Collect baselines (no anchor)
      const baselineFile = join(resultsPath, `baseline-none-${modelSlug}-t07.jsonl`);
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
            const trial = await runTrial(provider, vignette, 'baseline', 'none', vignette.baselineEstimate, model);
            if (trial) {
              baselineTrials.push(trial);
              appendFileSync(baselineFile, JSON.stringify(trial) + '\n');
              process.stdout.write(`    ${baselineTrials.length}/${TARGET_N}: ${trial.response}mo\r`);
            }
          }
          console.log('');
        }
      }

      // Calculate baseline mean for this model
      const baselineMean = baselineTrials.length > 0
        ? baselineTrials.reduce((sum, t) => sum + t.response, 0) / baselineTrials.length
        : vignette.baselineEstimate;
      console.log(`  Baseline mean: ${baselineMean.toFixed(1)} months`);

      // Step 2: Run all technique × anchor conditions
      for (const technique of TECHNIQUES) {
        for (const anchorType of ANCHOR_TYPES) {
          // Skip baseline-none (already done)
          if (technique === 'baseline' && anchorType === 'none') continue;
          // Skip non-baseline techniques with no anchor (doesn't make sense)
          if (technique !== 'baseline' && anchorType === 'none') continue;

          const fileName = `${technique}-${anchorType}-${modelSlug}-t07.jsonl`;
          const filePath = join(resultsPath, fileName);

          let existingTrials: Trial[] = [];
          if (existsSync(filePath)) {
            const lines = readFileSync(filePath, 'utf-8').split('\n').filter(l => l.trim());
            existingTrials = lines.map(l => JSON.parse(l));
          }

          const needed = TARGET_N - existingTrials.length;
          if (needed <= 0) {
            console.log(`  ${technique}/${anchorType}: complete (${existingTrials.length})`);
            continue;
          }

          console.log(`  ${technique}/${anchorType}: running ${needed} trials...`);
          if (!dryRun) {
            for (let i = 0; i < needed; i++) {
              const trial = await runTrial(provider, vignette, technique, anchorType, baselineMean, model);
              if (trial) {
                existingTrials.push(trial);
                appendFileSync(filePath, JSON.stringify(trial) + '\n');
                process.stdout.write(`    ${existingTrials.length}/${TARGET_N}: ${trial.response}mo\r`);
              }
            }
            console.log('');
          }
        }
      }
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('EXPERIMENT COMPLETE');
  console.log('='.repeat(70));
}

main().catch(console.error);
