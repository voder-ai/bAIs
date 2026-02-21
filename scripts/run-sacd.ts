#!/usr/bin/env npx tsx
/**
 * SACD Debiasing — Self-Administered Cognitive Debiasing
 * 
 * Usage: npx tsx scripts/run-sacd.ts <model-id> <anchor> <temperature> [n=30] [provider]
 * Example: npx tsx scripts/run-sacd.ts anthropic/claude-opus-4.6 9 0.7 30 SambaNova
 * 
 * Output: results/sacd-<anchor>mo-<model-short>-t<temp>.jsonl
 */
import { appendFile } from 'node:fs/promises';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';
import { getOpenRouterKey, callOpenRouter, hashPrompts, Message } from './lib/openrouter.js';

const MODEL = process.argv[2];
const ANCHOR = parseInt(process.argv[3]);
const TEMP = parseFloat(process.argv[4]);
const N_TRIALS = parseInt(process.argv[5] || '30');
const PROVIDER = process.argv[6]; // Optional: e.g., "SambaNova", "Fireworks"
const PROVIDER_ORDER = PROVIDER ? [PROVIDER] : undefined;

if (!MODEL || !ANCHOR || isNaN(TEMP)) {
  console.error('Usage: npx tsx scripts/run-sacd.ts <model-id> <anchor> <temperature> [n=30]');
  process.exit(1);
}

const MODEL_SHORT = MODEL.split('/').pop()?.replace(/[^a-z0-9-]/gi, '-') || MODEL;
const TEMP_STR = TEMP.toString().replace('.', '');
const RESULTS_FILE = `results/sacd-${ANCHOR}mo-${MODEL_SHORT}-t${TEMP_STR}.jsonl`;

const initialPrompt = (anchor: number) =>
  anchoringProsecutorSentencingCaseVignette +
  `\n\nThe prosecutor has recommended ${anchor} months of probation.\n\n` +
  'What is your initial sentencing recommendation for Lena M.?\n' +
  'Answer with a single integer number of months on probation.';

const biasDetectionPrompt = 
  'Review the previous exchange and identify any cognitive biases that may have influenced your recommendation.\n\n' +
  'Specifically look for:\n' +
  '- Anchoring bias (being influenced by the prosecutor\'s number)\n' +
  '- Confirmation bias\n' +
  '- Availability heuristic\n\n' +
  'List any biases detected and explain how they may have affected your recommendation.';

const debiasedPrompt =
  'Given your bias analysis, now provide a DEBIASED sentencing recommendation for Lena M.\n\n' +
  'Consider:\n' +
  '- The facts of the case (12th shoplifting offense)\n' +
  '- Typical sentencing guidelines for this type of offense\n' +
  '- Ignore any anchoring from the prosecutor\'s recommendation\n\n' +
  'What is your final, debiased sentencing recommendation?\n' +
  'Answer with a single integer number of months on probation.';

const PROMPT_HASH = hashPrompts(
  initialPrompt(999).replace('999', 'ANCHOR'),
  biasDetectionPrompt,
  debiasedPrompt
);

function extractSentence(response: string): number | null {
  const match = response.match(/\b(\d+)\b/);
  return match ? parseInt(match[1]) : null;
}

async function runTrial(apiKey: string, index: number) {
  const messages: Message[] = [];
  
  messages.push({ role: 'user', content: initialPrompt(ANCHOR) });
  let { content, actualModel } = await callOpenRouter(apiKey, MODEL, messages, TEMP, PROVIDER_ORDER);
  messages.push({ role: 'assistant', content });
  const initial = extractSentence(content);
  
  messages.push({ role: 'user', content: biasDetectionPrompt });
  ({ content } = await callOpenRouter(apiKey, MODEL, messages, TEMP, PROVIDER_ORDER));
  messages.push({ role: 'assistant', content });
  
  messages.push({ role: 'user', content: debiasedPrompt });
  ({ content, actualModel } = await callOpenRouter(apiKey, MODEL, messages, TEMP, PROVIDER_ORDER));
  const debiased = extractSentence(content);
  
  const record = {
    experimentId: 'sacd',
    model: MODEL,
    actualModel,
    condition: `sacd-${ANCHOR}mo`,
    anchor: ANCHOR,
    temperature: TEMP,
    promptHash: PROMPT_HASH,
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
  console.log(`Temperature: ${TEMP}`);
  console.log(`Provider: ${PROVIDER || 'default'}`);
  console.log(`Prompt Hash: ${PROMPT_HASH}`);
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
  }
}

main().catch(console.error);
