#!/usr/bin/env npx tsx
/**
 * Sibony Debiasing Experiment
 * 
 * Three techniques: Outside View + Pre-mortem + Devil's Advocate
 * 
 * Usage: npx tsx scripts/run-sibony.ts <model-id> <anchor> [n=30]
 * Example: npx tsx scripts/run-sibony.ts anthropic/claude-opus-4.6 3 30
 * 
 * Output: results/sibony-<anchor>mo-<model-short>.jsonl
 */
import { appendFile } from 'node:fs/promises';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';
import { getOpenRouterKey, callOpenRouter, Message } from './lib/openrouter.js';

const MODEL = process.argv[2];
const ANCHOR = parseInt(process.argv[3]);
const N_TRIALS = parseInt(process.argv[4] || '30');

if (!MODEL || !ANCHOR) {
  console.error('Usage: npx tsx scripts/run-sibony.ts <model-id> <anchor> [n=30]');
  process.exit(1);
}

const MODEL_SHORT = MODEL.split('/').pop()?.replace(/[^a-z0-9-]/gi, '-') || MODEL;
const RESULTS_FILE = `results/sibony-${ANCHOR}mo-${MODEL_SHORT}.jsonl`;

// Step 1: Outside View (reference class / base rates)
const outsideViewPrompt = 
  anchoringProsecutorSentencingCaseVignette +
  '\n\n' +
  'Before considering any specific recommendation, answer this question:\n' +
  'What is the TYPICAL sentencing range (in months of probation) for defendants with similar profiles — ' +
  'specifically, repeat shoplifting offenders on their 12th offense?\n' +
  'Base your answer on what would be considered normal or expected in similar cases.';

// Step 2: Devil's Advocate
const devilsAdvocatePrompt = (anchor: number) =>
  `The prosecutor has recommended ${anchor} months of probation.\n\n` +
  'Playing devil\'s advocate: What are the strongest arguments AGAINST accepting the prosecutor\'s recommended sentence?\n' +
  'Consider factors that might justify a different sentence (either higher or lower).';

// Step 3: Pre-mortem
const premortermPrompt =
  'Imagine that six months from now, your sentencing decision is criticized as inappropriate.\n' +
  'What are the most likely reasons your sentence might be seen as too harsh OR too lenient?\n' +
  'List the potential failure modes.';

// Step 4: Final decision with all context
const finalDecisionPrompt =
  'Now, considering:\n' +
  '1. The typical sentencing range for similar cases (outside view)\n' +
  '2. The arguments against the prosecutor\'s recommendation (devil\'s advocate)\n' +
  '3. The potential failure modes you identified (pre-mortem)\n\n' +
  'What is your final sentencing decision for Lena M.?\n' +
  'Answer with a single integer number of months on probation.';

function extractSentence(response: string): number | null {
  const match = response.match(/\b(\d+)\b/);
  return match ? parseInt(match[1]) : null;
}

async function runTrial(apiKey: string, index: number) {
  const messages: Message[] = [];
  
  // Turn 1: Outside view
  messages.push({ role: 'user', content: outsideViewPrompt });
  let response = await callOpenRouter(apiKey, MODEL, messages);
  messages.push({ role: 'assistant', content: response });
  
  // Turn 2: Devil's advocate
  messages.push({ role: 'user', content: devilsAdvocatePrompt(ANCHOR) });
  response = await callOpenRouter(apiKey, MODEL, messages);
  messages.push({ role: 'assistant', content: response });
  
  // Turn 3: Pre-mortem
  messages.push({ role: 'user', content: premortermPrompt });
  response = await callOpenRouter(apiKey, MODEL, messages);
  messages.push({ role: 'assistant', content: response });
  
  // Turn 4: Final decision
  messages.push({ role: 'user', content: finalDecisionPrompt });
  response = await callOpenRouter(apiKey, MODEL, messages);
  const sentence = extractSentence(response);
  
  const record = {
    experimentId: 'sibony',
    model: MODEL,
    condition: `sibony-${ANCHOR}mo`,
    anchor: ANCHOR,
    sentenceMonths: sentence,
    methodology: 'sibony-4turn',
    techniques: ['outside-view', 'devils-advocate', 'premortem'],
    runIndex: index,
    collectedAt: new Date().toISOString(),
  };
  await appendFile(RESULTS_FILE, JSON.stringify(record) + '\n');
  
  return sentence;
}

async function main() {
  console.log(`=== Sibony Debiasing ===`);
  console.log(`Model: ${MODEL}`);
  console.log(`Anchor: ${ANCHOR}mo`);
  console.log(`Techniques: outside-view, devils-advocate, premortem`);
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
