#!/usr/bin/env npx tsx
/**
 * Pre-mortem Debiasing — Imagine failure before deciding
 * 
 * Usage: npx tsx scripts/run-premortem.ts <model-id> <anchor> <temperature> [n=30]
 * Example: npx tsx scripts/run-premortem.ts anthropic/claude-opus-4.6 9 0.7 30
 * 
 * Output: results/premortem-<anchor>mo-<model-short>-t<temp>.jsonl
 */
import { appendFile } from 'node:fs/promises';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';
import { getOpenRouterKey, callOpenRouter, hashPrompts, Message } from './lib/openrouter.js';

const MODEL = process.argv[2];
const ANCHOR = parseInt(process.argv[3]);
const TEMP = parseFloat(process.argv[4]);
const N_TRIALS = parseInt(process.argv[5] || '30');

if (!MODEL || !ANCHOR || isNaN(TEMP)) {
  console.error('Usage: npx tsx scripts/run-premortem.ts <model-id> <anchor> <temperature> [n=30]');
  process.exit(1);
}

const MODEL_SHORT = MODEL.split('/').pop()?.replace(/[^a-z0-9-]/gi, '-') || MODEL;
const TEMP_STR = TEMP.toString().replace('.', '');
const RESULTS_FILE = `results/premortem-${ANCHOR}mo-${MODEL_SHORT}-t${TEMP_STR}.jsonl`;

const caseWithAnchorPrompt = (anchor: number) =>
  anchoringProsecutorSentencingCaseVignette +
  `\n\nThe prosecutor has recommended ${anchor} months of probation.`;

const premortermPrompt =
  'Before making your decision, conduct a pre-mortem analysis:\n\n' +
  'Imagine that six months from now, your sentencing decision is criticized as inappropriate.\n' +
  'What are the most likely reasons your sentence might be seen as too harsh OR too lenient?\n' +
  'List the potential failure modes for any sentence you might give.';

const finalDecisionPrompt =
  'Now, considering the potential failure modes you identified, ' +
  'what is your final sentencing decision for Lena M.?\n' +
  'Answer with a single integer number of months on probation.';

const PROMPT_HASH = hashPrompts(
  caseWithAnchorPrompt(999).replace('999', 'ANCHOR'),
  premortermPrompt,
  finalDecisionPrompt
);

function extractSentence(response: string): number | null {
  const match = response.match(/\b(\d+)\b/);
  return match ? parseInt(match[1]) : null;
}

async function runTrial(apiKey: string, index: number) {
  const messages: Message[] = [];
  
  messages.push({ role: 'user', content: caseWithAnchorPrompt(ANCHOR) });
  let { content, actualModel } = await callOpenRouter(apiKey, MODEL, messages, TEMP);
  messages.push({ role: 'assistant', content });
  
  messages.push({ role: 'user', content: premortermPrompt });
  ({ content } = await callOpenRouter(apiKey, MODEL, messages, TEMP));
  messages.push({ role: 'assistant', content });
  
  messages.push({ role: 'user', content: finalDecisionPrompt });
  ({ content, actualModel } = await callOpenRouter(apiKey, MODEL, messages, TEMP));
  const sentence = extractSentence(content);
  
  const record = {
    experimentId: 'premortem',
    model: MODEL,
    actualModel,
    condition: `premortem-${ANCHOR}mo`,
    anchor: ANCHOR,
    temperature: TEMP,
    promptHash: PROMPT_HASH,
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
