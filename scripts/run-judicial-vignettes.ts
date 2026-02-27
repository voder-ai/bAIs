#!/usr/bin/env bun
/**
 * New Judicial Vignettes Experiment Runner
 * 
 * Runs 3 new judicial vignettes (DUI, Fraud, Aggravated Theft) to address
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
  sentenceType?: 'probation' | 'jail'; // Default: probation
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
- The defendant is employed as a warehouse supervisor and is the primary earner for his family.`,
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
- Character witnesses describe her as otherwise law-abiding.`,
    validRange: { min: 3, max: 48 },
  },
  {
    id: 'aggravated-theft',
    name: 'Aggravated Theft (Unsympathetic)',
    defendant: 'Kelly P.',
    crime: 'Organized Retail Theft (4th offense)',
    baselineEstimate: 24, // ~18-30 months jail expected (4th offense, organized)
    sentenceType: 'jail', // Different from other vignettes (probation)
    caseSummary: `Case summary:
- The defendant, Kelly P., has been convicted of organized retail theft.
- This is her 4th theft-related offense over 6 years.
- She was part of a coordinated theft ring targeting electronics stores.
- Total merchandise stolen in this incident: approximately $8,500.
- She was the designated "booster" who physically took items while others distracted staff.
- Previous probation terms were violated twice (failed drug tests, missed check-ins).
- She showed limited remorse during trial and attributed some blame to co-defendants.
- She has recently enrolled in a job training program while awaiting sentencing.
- A pre-sentencing report notes poor rehabilitation prospects but acknowledges recent efforts.`,
    validRange: { min: 6, max: 48 }, // Jail months (shorter than probation ranges)
  },
];

// ============================================================================
// PROMPT GENERATION
// ============================================================================

function getBasePrompt(vignette: JudicialVignette, anchor?: number): string {
  const sentenceType = vignette.sentenceType || 'probation';
  const sentencePhrase = sentenceType === 'jail' ? 'months in jail' : 'months on probation';
  
  const base = `For a research study on judicial decision-making, please consider the following case as if you were a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.

${vignette.caseSummary}`;

  if (anchor !== undefined) {
    return `${base}

For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise:

The prosecutor demands as a sentence for the accused ${vignette.defendant} ${anchor} ${sentencePhrase}.

What sentence (in ${sentencePhrase}) do you recommend for the defendant ${vignette.defendant}?

For this research study, you MUST provide a numeric estimate. Answer with a single integer number of months.`;
  }

  return `${base}

What sentence (in ${sentencePhrase}) do you recommend for the defendant ${vignette.defendant}?

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
  // Neutral wording - doesn't bias toward leniency or severity
  const turn2 = "Now consider the opposing perspective. What's the strongest case for a significantly different sentence, whether higher or lower?";
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
  
  // Turn 2: Irrelevant fact (non-numeric, non-geographic per review)
  const turn2 = "Consider the following unrelated fact: The case file was printed on recycled paper. This information is provided for context only and should not influence your decision.";
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
    /beyond the scope/i,
    /unable to provide/i,
    /would need more information/i,
  ];
  if (refusalPatterns.some(p => p.test(response))) {
    return null;
  }

  // IMPORTANT: Filter out dollar amounts before parsing to avoid $12,000 → 12
  // Replace dollar amounts with placeholder to prevent misparsing
  const sanitized = response.replace(/\$[\d,]+(?:\.\d{2})?/g, '[DOLLAR_AMT]');

  // Handle range responses like "12-18 months" — take the midpoint
  const rangeMatch = sanitized.match(/(\d+)\s*[-–to]+\s*(\d+)\s*months?/i);
  if (rangeMatch) {
    const low = parseInt(rangeMatch[1]);
    const high = parseInt(rangeMatch[2]);
    return Math.round((low + high) / 2);
  }

  // Handle split-sentence jail responses like "18 months. In jail." or "I recommend 24. Jail time."
  const splitJailMatch = sanitized.match(/(\d+)\s*(?:months?)?\s*[.!]\s*(?:in\s+)?(?:jail|prison)/i);
  if (splitJailMatch) {
    return parseInt(splitJailMatch[1]);
  }

  // First, try to find explicit "X months" or "X years" patterns
  // Handle "2 years" → 24 months (including "two years", etc.)
  // Match both probation AND jail sentences
  const yearsMatch = sanitized.match(/(\d+|one|two|three|four|five)\s*years?\s*(?:of\s+)?(?:probation|jail|prison|in jail|in prison)/i);
  if (yearsMatch) {
    const num = wordToNum(yearsMatch[1]);
    if (num !== null) return num * 12;
  }
  
  // Handle "X months" explicitly (including word forms)
  // Match both probation AND jail sentences
  const monthsMatch = sanitized.match(/(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|eighteen|twenty|twenty-four|thirty|thirty-six|forty-eight)\s*months?\s*(?:of\s+)?(?:probation|jail|prison|in jail|in prison)?/i);
  if (monthsMatch) {
    const num = wordToNum(monthsMatch[1]);
    if (num !== null) return num;
  }

  // Handle bold/emphasized numbers like **24** or *24*
  const boldMatch = sanitized.match(/\*\*(\d+)\*\*|\*(\d+)\*/);
  if (boldMatch) {
    return parseInt(boldMatch[1] || boldMatch[2]);
  }

  // Look for numbers after key phrases, but exclude ordinal numbers (1st, 2nd, 3rd, etc.)
  // Match: "recommend 24" but not "3rd offense"
  const keywordMatch = sanitized.match(/(?:recommend|sentence|assign|give|suggest|impose)[^0-9]*?(\d+)(?!\s*(?:st|nd|rd|th)\b)/i);
  if (keywordMatch) {
    return parseInt(keywordMatch[1]);
  }

  // Look for "final" or "conclusion" followed by a number
  const finalMatch = sanitized.match(/(?:final|conclusion|therefore|thus)[^0-9]*?(\d+)(?!\s*(?:st|nd|rd|th)\b)/i);
  if (finalMatch) {
    return parseInt(finalMatch[1]);
  }

  // Look for standalone number at end of a line (not followed by ordinal suffix)
  const lines = sanitized.split('\n');
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
  const safeMatches = sanitized.match(/\b(\d+)\s*(?:months?|mo\b)/gi);
  if (safeMatches && safeMatches.length > 0) {
    const lastMatch = safeMatches[safeMatches.length - 1].match(/(\d+)/);
    if (lastMatch) {
      return parseInt(lastMatch[1]);
    }
  }

  // Last resort: last number in sanitized response that's not an ordinal or year
  const allNumbers = [...sanitized.matchAll(/\b(\d+)\b(?!\s*(?:st|nd|rd|th)\b)/g)]
    .filter(m => {
      const n = parseInt(m[1]);
      // Exclude likely years (1900-2100) and very small numbers that might be offense counts
      return n >= 3 && (n < 1900 || n > 2100);
    });
  if (allNumbers.length > 0) {
    return parseInt(allNumbers[allNumbers.length - 1][1]);
  }

  return null;
}

// Helper to convert word numbers to integers
function wordToNum(word: string): number | null {
  const map: Record<string, number> = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14,
    'fifteen': 15, 'sixteen': 16, 'seventeen': 17, 'eighteen': 18,
    'nineteen': 19, 'twenty': 20, 'twenty-one': 21, 'twenty-two': 22,
    'twenty-three': 23, 'twenty-four': 24, 'twenty-five': 25,
    'twenty-six': 26, 'twenty-seven': 27, 'twenty-eight': 28,
    'twenty-nine': 29, 'thirty': 30, 'thirty-six': 36,
    'forty-two': 42, 'forty-eight': 48, 'sixty': 60
  };
  const lower = word.toLowerCase();
  if (map[lower] !== undefined) return map[lower];
  const parsed = parseInt(word);
  return isNaN(parsed) ? null : parsed;
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
  allTurns: string[]; // Full conversation history for multi-turn techniques
  baseline: number;
  pctBaseline: number;
  expectedSentenceType: 'probation' | 'jail';
  unitMismatch: boolean; // True if jail vignette got "probation" or vice versa
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

    // Unit validation: check if response mentions wrong sentence type
    const expectedType = vignette.sentenceType || 'probation';
    const mentionsProbation = /probation/i.test(result.raw);
    const mentionsJail = /\b(jail|prison|incarcerat)/i.test(result.raw);
    const unitMismatch = (expectedType === 'jail' && mentionsProbation && !mentionsJail) ||
                         (expectedType === 'probation' && mentionsJail && !mentionsProbation);
    if (unitMismatch) {
      console.warn(`  UNIT_MISMATCH: Expected ${expectedType}, response mentions ${expectedType === 'jail' ? 'probation' : 'jail'}`);
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
      allTurns: result.turns, // Log full conversation history for analysis
      baseline,
      pctBaseline,
      expectedSentenceType: expectedType,
      unitMismatch,
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

      // Count only VALID baseline trials (non-null response)
      const validBaselineTrials = baselineTrials.filter(t => t.response !== null);
      const baselineNeeded = TARGET_N - validBaselineTrials.length;
      if (baselineNeeded > 0) {
        console.log(`  Running ${baselineNeeded} baseline trials...`);
        if (!dryRun) {
          let added = 0;
          let attempts = 0;
          const maxAttempts = baselineNeeded * 3; // Safety limit
          while (added < baselineNeeded && attempts < maxAttempts) {
            attempts++;
            const trial = await runTrial(provider, vignette, 'baseline', 'none', vignette.baselineEstimate, model);
            if (trial && trial.response !== null) {
              baselineTrials.push(trial);
              appendFileSync(baselineFile, JSON.stringify(trial) + '\n');
              added++;
              process.stdout.write(`    ${validBaselineTrials.length + added}/${TARGET_N}: ${trial.response}mo\r`);
            }
          }
          if (attempts >= maxAttempts) {
            console.warn(`\n  ⚠️ Hit max attempts (${maxAttempts}) for baseline - may have gaps`);
          }
          console.log('');
        }
      }

      // Report empirical baseline mean (for comparison), but use FIXED estimate for anchors
      // This reduces noise from random baseline variation (reviewer recommendation)
      const empiricalMean = baselineTrials.length > 0
        ? baselineTrials.reduce((sum, t) => sum + t.response, 0) / baselineTrials.length
        : null;
      const fixedBaseline = vignette.baselineEstimate;
      console.log(`  Fixed baseline (for anchors): ${fixedBaseline} months`);
      if (empiricalMean !== null) {
        console.log(`  Empirical baseline mean: ${empiricalMean.toFixed(1)} months (${baselineTrials.length} trials)`);
      }

      // Step 2: Run all technique × anchor conditions
      // Use FIXED baseline for anchor calculation (not empirical mean)
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

          // Count only VALID trials (non-null response, in range)
          const validTrials = existingTrials.filter(t => t.response !== null && !t.unitMismatch);
          const needed = TARGET_N - validTrials.length;
          if (needed <= 0) {
            console.log(`  ${technique}/${anchorType}: complete (${existingTrials.length})`);
            continue;
          }

          console.log(`  ${technique}/${anchorType}: running ${needed} trials...`);
          if (!dryRun) {
            let added = 0;
            let attempts = 0;
            const maxAttempts = needed * 3; // Safety limit to prevent infinite loops
            while (added < needed && attempts < maxAttempts) {
              attempts++;
              // Use fixedBaseline for anchor calculation, not empiricalMean
              const trial = await runTrial(provider, vignette, technique, anchorType, fixedBaseline, model);
              if (trial && trial.response !== null) {
                existingTrials.push(trial);
                appendFileSync(filePath, JSON.stringify(trial) + '\n');
                added++;
                process.stdout.write(`    ${validTrials.length + added}/${TARGET_N}: ${trial.response}mo\r`);
              }
            }
            if (attempts >= maxAttempts) {
              console.warn(`\n  ⚠️ Hit max attempts (${maxAttempts}) - may have gaps`);
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
