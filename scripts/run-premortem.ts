#!/usr/bin/env npx tsx
/**
 * Pre-mortem Debiasing — Imagine failure before deciding
 * 
 * Usage: npx tsx scripts/run-premortem.ts <model-id> <anchor> [n=30]
 * Example: npx tsx scripts/run-premortem.ts anthropic/claude-opus-4.6 9 30
 * 
 * Output: results/premortem-<anchor>mo-<model-short>.jsonl
 */
import { appendFile } from 'node:fs/promises';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';
import { getOpenRouterKey, callOpenRouter, Message } from './lib/openrouter.js';

const MODEL = process.argv[2];
const ANCHOR = parseInt(process.argv[3]);
const N_TRIALS = parseInt(process.argv[4] || '30');

if (!MODEL || !ANCHOR) {
  console.error('Usage: npx tsx scripts/run-premortem.ts <model-id> <anchor> [n=30]');
  process.exit(1);
}

const MODEL_SHORT = MODEL.split('/').pop()?.replace(/[^a-z0-9-]/gi, '-') || MODEL;
const RESULTS_FILE = `results/premortem-${ANCHOR}mo-${MODEL_SHORT}.jsonl`;

// Step 1: Present case with anchor
const caseWithAnchorPrompt = (anchor: number) =>
  anchoringProsecutorSentencingCaseVignette +
  '\n\n' +
  `The prosecutor has recommended ${anchor} months of probation.`;

// Step 2: Pre-mortem
const premortermPrompt =
  'Before making your decision, conduct a pre-mortem analysis:\n\n' +
  'Imagine that six months from now, your sentencing decision is criticized as inappropriate.\n' +
  'What are the most likely reasons your sentence might be seen as too harsh OR too lenient?\n' +
  'List the potential failure modes for any sentence you might give.';

// Step 3: Final decision
const finalDecisionPrompt =
  'Now, considering the potential failure modes you identified, ' +
  'what is your final sentencing decision for Lena M.?\n' +
  'Answer with a single integer number of months on probation.';

function extractSentence(response: string): number | null {
  const match = response.match(/\b(\d+)\b/);
  return match ? parseInt(match[1]) : null;
}

async function runTrial(apiKey: string, index: number) {
  const messages: Message[] = [];
  
  // Turn 1: Case with anchor
  messages.push({ role: 'user', content: caseWithAnchorPrompt(ANCHOR) });
  let response = await callOpenRouter(apiKey, MODEL, messages);
  messages.push({ role: 'assistant', content: response });
  
  // Turn 2: Pre-mortem
  messages.push({ role: 'user', content: premortermPrompt });
  response = await callOpenRouter(apiKey, MODEL, messages);
  messages.push({ role: 'assistant', content: response });
  
  // Turn 3: Final decision
  messages.push({ role: 'user', content: finalDecisionPrompt });
  response = await callOpenRouter(apiKey, MODEL, messages);
  const sentence = extractSentence(response);
  
  const record = {
    experimentId: 'premortem',
    model: MODEL,
    condition: `premortem-${ANCHOR}mo`,
    anchor: ANCHOR,
    sentenceMonths: sentence,
    methodology: 'premortem-3turn',
    technique: 'premortem',
    runIndex: index,
    collectedAt: new Date().toISOString(),
  };
  await appendFile(RESULTS_FILE, JSON.stringify(record) + '\n');
  
  return sentence;
}

async function main() {
  console.log(`=== Pre-mortem Debiasing ===`);
  console.log(`Model: ${MODEL}`);
  console.log(`Anchor: ${ANCHOR}mo`);
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
