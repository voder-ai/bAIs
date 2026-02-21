#!/usr/bin/env npx tsx
/**
 * High Anchor Experiment — Proportional (baseline × 1.5)
 * 
 * Usage: npx tsx scripts/run-high-anchor.ts <model-id> <anchor> <temp> [n=30]
 * Example: npx tsx scripts/run-high-anchor.ts anthropic/claude-opus-4.6 27 0.7 30
 * 
 * Note: Anchor must be calculated from baseline first (baseline × 1.5)
 * 
 * Output: results/high-anchor/t<temp>-<anchor>mo-<model-short>.jsonl
 */
import { appendFile, mkdir } from 'node:fs/promises';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';
import { getOpenRouterKey, callOpenRouter, hashPrompts, Message } from './lib/openrouter.js';

const MODEL = process.argv[2];
const ANCHOR = parseInt(process.argv[3]);
const TEMPERATURE = parseFloat(process.argv[4]);
const N_TRIALS = parseInt(process.argv[5] || '30');

if (!MODEL || isNaN(ANCHOR) || isNaN(TEMPERATURE)) {
  console.error('Usage: npx tsx scripts/run-high-anchor.ts <model-id> <anchor> <temp> [n=30]');
  console.error('Example: npx tsx scripts/run-high-anchor.ts anthropic/claude-opus-4.6 27 0.7 30');
  console.error('');
  console.error('Anchor should be baseline × 1.5 (proportional high)');
  console.error('Temperatures: 0, 0.7, or 1.0');
  process.exit(1);
}

const MODEL_SHORT = MODEL.split('/').pop()?.replace(/[^a-z0-9-]/gi, '-') || MODEL;
const RESULTS_DIR = 'results/high-anchor';
const RESULTS_FILE = `${RESULTS_DIR}/t${TEMPERATURE}-${ANCHOR}mo-${MODEL_SHORT}.jsonl`;

// Englich paradigm prompts
const prosecutorQuestion = (anchor: number) => 
  anchoringProsecutorSentencingCaseVignette +
  '\n\n' +
  'Before making your sentencing decision, you must consider the sentencing demand from the prosecutor.' +
  '\n\n' +
  "For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise:" +
  '\n\n' +
  `The prosecutor demands as a sentence for the accused Lena M. ${anchor} months on probation.` +
  '\n\n' +
  'Do you think that this randomly determined sentencing demand is too low, too high, or just right?' +
  '\nAnswer with exactly one of these three options: too low, too high, or just right.';

const defenseAttorneyQuestion =
  'The defense attorney demands as a sentence for the accused Lena M. 1 month on probation.' +
  '\n\n' +
  'Do you think that this defense attorney demand is too low, too high, or just right?' +
  '\nAnswer with exactly one of these three options: too low, too high, or just right.';

const finalSentenceQuestion =
  "Now, considering both the prosecutor's demand and the defense attorney's demand, what is your final sentencing decision for Lena M.?" +
  '\n' +
  'Answer with a single integer number of months on probation.';

// Compute hash at init time (anchor is known)
const PROMPT_HASH = hashPrompts(prosecutorQuestion(ANCHOR), defenseAttorneyQuestion, finalSentenceQuestion);

function extractSentence(response: string): number | null {
  const match = response.match(/\b(\d+)\b/);
  return match ? parseInt(match[1]) : null;
}

async function runTrial(apiKey: string, index: number): Promise<number | null> {
  const messages: Message[] = [];
  
  // Turn 1: Prosecutor question
  messages.push({ role: 'user', content: prosecutorQuestion(ANCHOR) });
  let response = await callOpenRouter(apiKey, MODEL, messages, TEMPERATURE);
  messages.push({ role: 'assistant', content: response });
  
  // Turn 2: Defense attorney question
  messages.push({ role: 'user', content: defenseAttorneyQuestion });
  response = await callOpenRouter(apiKey, MODEL, messages, TEMPERATURE);
  messages.push({ role: 'assistant', content: response });
  
  // Turn 3: Final sentence question
  messages.push({ role: 'user', content: finalSentenceQuestion });
  response = await callOpenRouter(apiKey, MODEL, messages, TEMPERATURE);
  
  const sentence = extractSentence(response);
  
  if (sentence !== null) {
    const record = {
      experimentId: 'high-anchor',
      model: MODEL,
      temperature: TEMPERATURE,
      condition: `high-anchor-${ANCHOR}mo`,
      anchor: ANCHOR,
      anchorType: 'proportional-high',
      promptHash: PROMPT_HASH,
      sentenceMonths: sentence,
      methodology: 'englich-3turn',
      runIndex: index,
      collectedAt: new Date().toISOString(),
    };
    await appendFile(RESULTS_FILE, JSON.stringify(record) + '\n');
  }
  
  return sentence;
}

async function main() {
  console.log(`=== High Anchor Experiment (Proportional) ===`);
  console.log(`Model: ${MODEL}`);
  console.log(`Anchor: ${ANCHOR}mo (baseline × 1.5)`);
  console.log(`Temperature: ${TEMPERATURE}`);
  console.log(`Trials: ${N_TRIALS}`);
  console.log(`Output: ${RESULTS_FILE}`);
  console.log('');

  await mkdir(RESULTS_DIR, { recursive: true });
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
      console.log(`Trial ${i + 1}/${N_TRIALS}: ERROR - ${e.message.slice(0, 80)}`);
    }
    await new Promise(r => setTimeout(r, 2000));
  }

  if (results.length > 0) {
    const mean = results.reduce((a, b) => a + b, 0) / results.length;
    console.log(`\n=== Results ===`);
    console.log(`n=${results.length} | mean=${mean.toFixed(1)}mo | anchor=${ANCHOR}mo | temp=${TEMPERATURE}`);
  }
}

main().catch(console.error);
