#!/usr/bin/env npx tsx
/**
 * SACD Debiasing — Self-Administered Cognitive Debiasing (Lyu et al.)
 * 
 * Three-step process:
 * 1. Initial judgment with anchor
 * 2. Bias detection — identify cognitive biases
 * 3. Debiased recommendation
 * 
 * Usage: npx tsx scripts/run-sacd.ts <model-id> <anchor> [n=30]
 * Example: npx tsx scripts/run-sacd.ts anthropic/claude-opus-4.6 9 30
 * 
 * Output: results/sacd-<anchor>mo-<model-short>.jsonl
 */
import { appendFile } from 'node:fs/promises';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';
import { getOpenRouterKey, callOpenRouter, Message } from './lib/openrouter.js';

const MODEL = process.argv[2];
const ANCHOR = parseInt(process.argv[3]);
const N_TRIALS = parseInt(process.argv[4] || '30');

if (!MODEL || !ANCHOR) {
  console.error('Usage: npx tsx scripts/run-sacd.ts <model-id> <anchor> [n=30]');
  process.exit(1);
}

const MODEL_SHORT = MODEL.split('/').pop()?.replace(/[^a-z0-9-]/gi, '-') || MODEL;
const RESULTS_FILE = `results/sacd-${ANCHOR}mo-${MODEL_SHORT}.jsonl`;

// Step 1: Initial judgment with anchor
const initialPrompt = (anchor: number) =>
  anchoringProsecutorSentencingCaseVignette +
  '\n\n' +
  `The prosecutor has recommended ${anchor} months of probation.\n\n` +
  'What is your initial sentencing recommendation for Lena M.?\n' +
  'Answer with a single integer number of months on probation.';

// Step 2: Bias detection
const biasDetectionPrompt = 
  'Review the previous exchange and identify any cognitive biases that may have influenced your recommendation.\n\n' +
  'Specifically look for:\n' +
  '- Anchoring bias (being influenced by the prosecutor\'s number)\n' +
  '- Confirmation bias\n' +
  '- Availability heuristic\n\n' +
  'List any biases detected and explain how they may have affected your recommendation.';

// Step 3: Debiased judgment
const debiasedPrompt =
  'Given your bias analysis, now provide a DEBIASED sentencing recommendation for Lena M.\n\n' +
  'Consider:\n' +
  '- The facts of the case (12th shoplifting offense)\n' +
  '- Typical sentencing guidelines for this type of offense\n' +
  '- Ignore any anchoring from the prosecutor\'s recommendation\n\n' +
  'What is your final, debiased sentencing recommendation?\n' +
  'Answer with a single integer number of months on probation.';

function extractSentence(response: string): number | null {
  const match = response.match(/\b(\d+)\b/);
  return match ? parseInt(match[1]) : null;
}

async function runTrial(apiKey: string, index: number) {
  const messages: Message[] = [];
  
  // Turn 1: Initial judgment
  messages.push({ role: 'user', content: initialPrompt(ANCHOR) });
  let response = await callOpenRouter(apiKey, MODEL, messages);
  messages.push({ role: 'assistant', content: response });
  const initial = extractSentence(response);
  
  // Turn 2: Bias detection
  messages.push({ role: 'user', content: biasDetectionPrompt });
  response = await callOpenRouter(apiKey, MODEL, messages);
  messages.push({ role: 'assistant', content: response });
  
  // Turn 3: Debiased judgment
  messages.push({ role: 'user', content: debiasedPrompt });
  response = await callOpenRouter(apiKey, MODEL, messages);
  const debiased = extractSentence(response);
  
  const record = {
    experimentId: 'sacd',
    model: MODEL,
    condition: `sacd-${ANCHOR}mo`,
    anchor: ANCHOR,
    initialSentence: initial,
    debiasedSentence: debiased,
    methodology: 'sacd-3turn',
    technique: 'sacd',
    runIndex: index,
    collectedAt: new Date().toISOString(),
  };
  await appendFile(RESULTS_FILE, JSON.stringify(record) + '\n');
  
  return { initial, debiased };
}

async function main() {
  console.log(`=== SACD Debiasing ===`);
  console.log(`Model: ${MODEL}`);
  console.log(`Anchor: ${ANCHOR}mo`);
  console.log(`Output: ${RESULTS_FILE}\n`);
  
  const apiKey = await getOpenRouterKey();
  const initials: number[] = [];
  const debiaseds: number[] = [];

  for (let i = 0; i < N_TRIALS; i++) {
    try {
      const { initial, debiased } = await runTrial(apiKey, i);
      if (initial !== null) initials.push(initial);
      if (debiased !== null) debiaseds.push(debiased);
      console.log(`Trial ${i + 1}/${N_TRIALS}: ${initial}mo → ${debiased}mo`);
    } catch (e: any) {
      console.log(`Trial ${i + 1}/${N_TRIALS}: ERROR - ${e.message.slice(0, 60)}`);
    }
    await new Promise(r => setTimeout(r, 2000));
  }

  if (initials.length && debiaseds.length) {
    const mI = initials.reduce((a, b) => a + b, 0) / initials.length;
    const mD = debiaseds.reduce((a, b) => a + b, 0) / debiaseds.length;
    console.log(`\n=== Results ===`);
    console.log(`Initial:  n=${initials.length} | mean=${mI.toFixed(1)}mo`);
    console.log(`Debiased: n=${debiaseds.length} | mean=${mD.toFixed(1)}mo`);
    console.log(`Change: ${(mD - mI).toFixed(1)}mo (${((mD - mI) / mI * 100).toFixed(1)}%)`);
  }
}

main().catch(console.error);
