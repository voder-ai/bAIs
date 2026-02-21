#!/usr/bin/env npx tsx
/**
 * Low Anchor Experiment — Proportional (baseline / 2)
 * 
 * Usage: npx tsx scripts/run-low-anchor.ts <model-id> <anchor> [n=30]
 * Example: npx tsx scripts/run-low-anchor.ts anthropic/claude-opus-4.6 9 30
 * 
 * Note: Anchor must be calculated from baseline first (baseline / 2)
 * 
 * Output: results/low-anchor-<model-short>.jsonl
 */
import { appendFile } from 'node:fs/promises';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';
import { getOpenRouterKey, callOpenRouter, Message } from './lib/openrouter.js';

const MODEL = process.argv[2];
const ANCHOR = parseInt(process.argv[3]);
const N_TRIALS = parseInt(process.argv[4] || '30');

if (!MODEL || !ANCHOR) {
  console.error('Usage: npx tsx scripts/run-low-anchor.ts <model-id> <anchor> [n=30]');
  console.error('');
  console.error('Anchor should be baseline / 2 (proportional low)');
  console.error('Example: If baseline = 18mo, anchor = 9mo');
  process.exit(1);
}

const MODEL_SHORT = MODEL.split('/').pop()?.replace(/[^a-z0-9-]/gi, '-') || MODEL;
const RESULTS_FILE = `results/low-anchor-${MODEL_SHORT}.jsonl`;

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

function extractSentence(response: string): number | null {
  const match = response.match(/\b(\d+)\b/);
  return match ? parseInt(match[1]) : null;
}

async function runTrial(apiKey: string, index: number): Promise<number | null> {
  const messages: Message[] = [];
  
  // Turn 1: Prosecutor question
  messages.push({ role: 'user', content: prosecutorQuestion(ANCHOR) });
  let response = await callOpenRouter(apiKey, MODEL, messages);
  messages.push({ role: 'assistant', content: response });
  
  // Turn 2: Defense attorney question
  messages.push({ role: 'user', content: defenseAttorneyQuestion });
  response = await callOpenRouter(apiKey, MODEL, messages);
  messages.push({ role: 'assistant', content: response });
  
  // Turn 3: Final sentence question
  messages.push({ role: 'user', content: finalSentenceQuestion });
  response = await callOpenRouter(apiKey, MODEL, messages);
  
  const sentence = extractSentence(response);
  
  if (sentence !== null) {
    const record = {
      experimentId: 'low-anchor',
      model: MODEL,
      condition: `low-anchor-${ANCHOR}mo`,
      anchor: ANCHOR,
      anchorType: 'proportional-low',
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
  console.log(`=== Low Anchor Experiment (Proportional) ===`);
  console.log(`Model: ${MODEL}`);
  console.log(`Anchor: ${ANCHOR}mo (baseline / 2)`);
  console.log(`Trials: ${N_TRIALS}`);
  console.log(`Output: ${RESULTS_FILE}`);
  console.log('');

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
    console.log(`n=${results.length} | mean=${mean.toFixed(1)}mo | anchor=${ANCHOR}mo`);
  }
}

main().catch(console.error);
