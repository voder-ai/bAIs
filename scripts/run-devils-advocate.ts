#!/usr/bin/env npx tsx
/**
 * Devil's Advocate Debiasing — 5-turn structure with Englich paradigm
 * 
 * Turn 1: Devil's advocate framing (challenge initial assumptions)
 * Turn 2: Prosecutor's demand (anchor) — too low/high/right?
 * Turn 3: Defense attorney's demand (1mo) — too low/high/right?
 * Turn 4: Counter-arguments against both demands
 * Turn 5: Final sentencing decision
 * 
 * Usage: npx tsx scripts/run-devils-advocate.ts <model-id> <anchor> <temperature> [n=30]
 * Example: npx tsx scripts/run-devils-advocate.ts anthropic/claude-opus-4.6 9 0.7 30
 * 
 * Output: results/devils-advocate-<anchor>mo-<model-short>-t<temp>.jsonl
 */
import { appendFile } from 'node:fs/promises';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';
import { getOpenRouterKey, callOpenRouter, hashPrompts, Message } from './lib/openrouter.js';

const MODEL = process.argv[2];
const ANCHOR = parseInt(process.argv[3]);
const TEMP = parseFloat(process.argv[4]);
const N_TRIALS = parseInt(process.argv[5] || '30');

if (!MODEL || !ANCHOR || isNaN(TEMP)) {
  console.error('Usage: npx tsx scripts/run-devils-advocate.ts <model-id> <anchor> <temperature> [n=30]');
  process.exit(1);
}

const MODEL_SHORT = MODEL.split('/').pop()?.replace(/[^a-z0-9-]/gi, '-') || MODEL;
const TEMP_STR = TEMP.toString().replace('.', '');
const RESULTS_FILE = `results/devils-advocate-${ANCHOR}mo-${MODEL_SHORT}-t${TEMP_STR}.jsonl`;

// Turn 1: Devil's advocate setup with jurisdiction
const devilsAdvocateSetupPrompt = 
  anchoringProsecutorSentencingCaseVignette +
  '\n\n' +
  'This case is being heard in a German federal court under standard sentencing guidelines.' +
  '\n\n' +
  'Before hearing the specific demands from prosecution and defense, take a devil\'s advocate stance:' +
  '\nWhat might be wrong with an initial gut reaction to this case?' +
  '\nWhat assumptions might a judge make that could lead to an inappropriate sentence?' +
  '\nList potential biases or premature conclusions to guard against.';

// Turn 2: Prosecutor's demand (anchor) — matches Englich
const prosecutorDemandPrompt = (anchor: number) =>
  `For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise:` +
  '\n\n' +
  `The prosecutor demands as a sentence for the accused Lena M. ${anchor} months on probation.` +
  '\n\n' +
  'Do you think that this randomly determined sentencing demand is too low, too high, or just right?' +
  '\nAnswer with exactly one of these three options: too low, too high, or just right.';

// Turn 3: Defense attorney's demand — matches Englich
const defenseAttorneyPrompt =
  'The defense attorney demands as a sentence for the accused Lena M. 1 month on probation.' +
  '\n\n' +
  'Do you think that this defense attorney demand is too low, too high, or just right?' +
  '\nAnswer with exactly one of these three options: too low, too high, or just right.';

// Turn 4: Counter-arguments
const counterArgumentsPrompt =
  'Now play devil\'s advocate against BOTH demands:' +
  '\n- What are the strongest arguments AGAINST the prosecutor\'s demand?' +
  '\n- What are the strongest arguments AGAINST the defense attorney\'s demand?' +
  '\nProvide compelling counter-arguments for both positions.';

// Turn 5: Final sentence — matches Englich
const finalSentencePrompt =
  "What is your final sentencing decision for Lena M.?\n" +
  '\nAnswer with a single integer number of months on probation.';

const PROMPT_HASH = hashPrompts(
  devilsAdvocateSetupPrompt,
  prosecutorDemandPrompt(999).replace('999', 'ANCHOR'),
  defenseAttorneyPrompt,
  counterArgumentsPrompt,
  finalSentencePrompt
);

function extractSentence(response: string): number | null {
  // Look for number followed by "month" or at end of response
  const monthMatch = response.match(/(\d+)\s*(?:months?|mo\b)/i);
  if (monthMatch) return parseInt(monthMatch[1]);
  
  // Fallback: last number in response (likely the answer)
  const numbers = response.match(/\b(\d+)\b/g);
  if (numbers && numbers.length > 0) {
    return parseInt(numbers[numbers.length - 1]);
  }
  return null;
}

async function runTrial(apiKey: string, index: number) {
  const messages: Message[] = [];
  
  // Turn 1: Devil's advocate setup
  messages.push({ role: 'user', content: devilsAdvocateSetupPrompt });
  let { content, actualModel } = await callOpenRouter(apiKey, MODEL, messages, TEMP);
  messages.push({ role: 'assistant', content });
  
  // Turn 2: Prosecutor's demand
  messages.push({ role: 'user', content: prosecutorDemandPrompt(ANCHOR) });
  ({ content, actualModel } = await callOpenRouter(apiKey, MODEL, messages, TEMP));
  messages.push({ role: 'assistant', content });
  
  // Turn 3: Defense attorney's demand
  messages.push({ role: 'user', content: defenseAttorneyPrompt });
  ({ content, actualModel } = await callOpenRouter(apiKey, MODEL, messages, TEMP));
  messages.push({ role: 'assistant', content });
  
  // Turn 4: Counter-arguments
  messages.push({ role: 'user', content: counterArgumentsPrompt });
  ({ content, actualModel } = await callOpenRouter(apiKey, MODEL, messages, TEMP));
  messages.push({ role: 'assistant', content });
  
  // Turn 5: Final sentence
  messages.push({ role: 'user', content: finalSentencePrompt });
  ({ content, actualModel } = await callOpenRouter(apiKey, MODEL, messages, TEMP));
  const sentence = extractSentence(content);
  
  const record = {
    experimentId: 'devils-advocate',
    model: MODEL,
    actualModel,
    condition: `devils-advocate-${ANCHOR}mo`,
    anchor: ANCHOR,
    temperature: TEMP,
    promptHash: PROMPT_HASH,
    sentenceMonths: sentence,
    methodology: 'devils-advocate-5turn',
    technique: 'devils-advocate',
    runIndex: index,
    collectedAt: new Date().toISOString(),
  };
  await appendFile(RESULTS_FILE, JSON.stringify(record) + '\n');
  
  return sentence;
}

async function main() {
  console.log(`=== Devil's Advocate Debiasing (5-turn) ===`);
  console.log(`Model: ${MODEL}`);
  console.log(`Anchor: ${ANCHOR}mo`);
  console.log(`Temperature: ${TEMP}`);
  console.log(`Prompt Hash: ${PROMPT_HASH}`);
  console.log(`Output: ${RESULTS_FILE}\n`);
  
  const apiKey = await getOpenRouterKey();
  const results: number[] = [];

  for (let i = 0; i < N_TRIALS; i++) {
    try {
      const sentence = await runTrial(apiKey, i);
      if (sentence !== null) {
        results.push(sentence);
        console.log(`Trial ${i + 1}/${N_TRIALS}: ${sentence}mo`);
      } else {
        console.log(`Trial ${i + 1}/${N_TRIALS}: PARSE ERROR`);
      }
    } catch (e: any) {
      console.log(`Trial ${i + 1}/${N_TRIALS}: ERROR - ${e.message.slice(0, 60)}`);
    }
    await new Promise(r => setTimeout(r, 2000));
  }

  if (results.length > 0) {
    const mean = results.reduce((a, b) => a + b, 0) / results.length;
    console.log(`\n=== Results ===`);
    console.log(`n=${results.length} | mean=${mean.toFixed(1)}mo`);
  }
}

main().catch(console.error);
