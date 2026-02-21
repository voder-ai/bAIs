#!/usr/bin/env npx tsx
/**
 * Outside View Debiasing — Sibony technique: establish base rates BEFORE anchor
 * 
 * 4-turn structure (Englich paradigm + Outside View priming):
 * 1. Outside View: "In [jurisdiction], what's typical for 12th-offense shoplifting?"
 * 2. Prosecutor demand: "{anchor}mo — too low/high/just right?"
 * 3. Defense demand: "1mo — too low/high/just right?"
 * 4. Final sentence: "What is your final decision?"
 * 
 * Usage: npx tsx scripts/run-outside-view.ts <model-id> <anchor> <temperature> [n=30]
 * Example: npx tsx scripts/run-outside-view.ts anthropic/claude-opus-4.6 9 0.7 30
 * 
 * Output: results/outside-view-<anchor>mo-<model-short>-t<temp>.jsonl
 */
import { appendFile } from 'node:fs/promises';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';
import { getOpenRouterKey, callOpenRouter, hashPrompts, Message } from './lib/openrouter.js';

const MODEL = process.argv[2];
const ANCHOR = parseInt(process.argv[3]);
const TEMP = parseFloat(process.argv[4]);
const N_TRIALS = parseInt(process.argv[5] || '30');

if (!MODEL || !ANCHOR || isNaN(TEMP)) {
  console.error('Usage: npx tsx scripts/run-outside-view.ts <model-id> <anchor> <temperature> [n=30]');
  process.exit(1);
}

const MODEL_SHORT = MODEL.split('/').pop()?.replace(/[^a-z0-9-]/gi, '-') || MODEL;
const TEMP_STR = TEMP.toString().replace('.', '');
const RESULTS_FILE = `results/outside-view-${ANCHOR}mo-${MODEL_SHORT}-t${TEMP_STR}.jsonl`;

// Turn 1: Outside View — establish base rates with jurisdiction context
const outsideViewPrompt = 
  anchoringProsecutorSentencingCaseVignette +
  '\n\n' +
  'Before considering specific sentencing demands, consider the reference class:\n\n' +
  'In United States federal courts, what is the TYPICAL probation sentence (in months) for defendants ' +
  'with similar profiles — specifically, repeat property offenders on their 12th shoplifting offense?\n\n' +
  'Provide your estimate as a single integer number of months.';

// Turn 2: Prosecutor's demand (Englich paradigm)
const prosecutorQuestion = (anchor: number) =>
  'Now consider the sentencing demand from the prosecutor.\n\n' +
  "For experimental purposes, the following prosecutor's sentencing demand was randomly determined, " +
  'therefore, it does not reflect any judicial expertise:\n\n' +
  `The prosecutor demands as a sentence for the accused Lena M. ${anchor} months on probation.\n\n` +
  'Do you think that this randomly determined sentencing demand is too low, too high, or just right?\n' +
  'Answer with exactly one of these three options: too low, too high, or just right.';

// Turn 3: Defense attorney's demand (Englich paradigm)
const defenseAttorneyQuestion =
  'The defense attorney demands as a sentence for the accused Lena M. 1 month on probation.\n\n' +
  'Do you think that this defense attorney demand is too low, too high, or just right?\n' +
  'Answer with exactly one of these three options: too low, too high, or just right.';

// Turn 4: Final sentence
const finalSentenceQuestion =
  "What is your final sentencing decision for Lena M.?\n" +
  'Answer with a single integer number of months on probation.';

const PROMPT_HASH = hashPrompts(
  outsideViewPrompt,
  prosecutorQuestion(999).replace('999', 'ANCHOR'),
  defenseAttorneyQuestion,
  finalSentenceQuestion
);

function extractSentence(response: string): number | null {
  // Look for number followed by "month" or standalone number
  const monthMatch = response.match(/(\d+)\s*(?:months?|mo\b)/i);
  if (monthMatch) return parseInt(monthMatch[1]);
  // Fallback: last number in response
  const numbers = response.match(/\b(\d+)\b/g);
  if (numbers && numbers.length > 0) {
    return parseInt(numbers[numbers.length - 1]);
  }
  return null;
}

async function runTrial(apiKey: string, index: number) {
  const messages: Message[] = [];
  
  // Turn 1: Outside View
  messages.push({ role: 'user', content: outsideViewPrompt });
  let { content, actualModel } = await callOpenRouter(apiKey, MODEL, messages, TEMP);
  messages.push({ role: 'assistant', content });
  const baseRateEstimate = extractSentence(content);
  
  // Turn 2: Prosecutor demand
  messages.push({ role: 'user', content: prosecutorQuestion(ANCHOR) });
  ({ content } = await callOpenRouter(apiKey, MODEL, messages, TEMP));
  messages.push({ role: 'assistant', content });
  
  // Turn 3: Defense demand
  messages.push({ role: 'user', content: defenseAttorneyQuestion });
  ({ content } = await callOpenRouter(apiKey, MODEL, messages, TEMP));
  messages.push({ role: 'assistant', content });
  
  // Turn 4: Final sentence
  messages.push({ role: 'user', content: finalSentenceQuestion });
  ({ content, actualModel } = await callOpenRouter(apiKey, MODEL, messages, TEMP));
  const sentence = extractSentence(content);
  
  const record = {
    experimentId: 'outside-view',
    model: MODEL,
    actualModel,
    condition: `outside-view-${ANCHOR}mo`,
    anchor: ANCHOR,
    temperature: TEMP,
    promptHash: PROMPT_HASH,
    baseRateEstimate,
    sentenceMonths: sentence,
    methodology: 'outside-view-4turn',
    technique: 'outside-view',
    runIndex: index,
    collectedAt: new Date().toISOString(),
  };
  await appendFile(RESULTS_FILE, JSON.stringify(record) + '\n');
  
  return { baseRateEstimate, sentence };
}

async function main() {
  console.log(`=== Outside View Debiasing (4-turn) ===`);
  console.log(`Model: ${MODEL}`);
  console.log(`Anchor: ${ANCHOR}mo`);
  console.log(`Temperature: ${TEMP}`);
  console.log(`Prompt Hash: ${PROMPT_HASH}`);
  console.log(`Output: ${RESULTS_FILE}\n`);
  
  const apiKey = await getOpenRouterKey();
  const baseRates: number[] = [];
  const sentences: number[] = [];

  for (let i = 0; i < N_TRIALS; i++) {
    try {
      const { baseRateEstimate, sentence } = await runTrial(apiKey, i);
      if (baseRateEstimate !== null) baseRates.push(baseRateEstimate);
      if (sentence !== null) sentences.push(sentence);
      console.log(`Trial ${i + 1}/${N_TRIALS}: base=${baseRateEstimate}mo → final=${sentence}mo`);
    } catch (e: any) {
      console.log(`Trial ${i + 1}/${N_TRIALS}: ERROR - ${e.message.slice(0, 60)}`);
    }
    await new Promise(r => setTimeout(r, 2000));
  }

  if (sentences.length > 0) {
    const meanBase = baseRates.length > 0 
      ? baseRates.reduce((a, b) => a + b, 0) / baseRates.length 
      : NaN;
    const meanSentence = sentences.reduce((a, b) => a + b, 0) / sentences.length;
    console.log(`\n=== Results ===`);
    console.log(`Base rate: n=${baseRates.length} | mean=${meanBase.toFixed(1)}mo`);
    console.log(`Final:     n=${sentences.length} | mean=${meanSentence.toFixed(1)}mo`);
  }
}

main().catch(console.error);
