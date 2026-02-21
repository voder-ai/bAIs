#!/usr/bin/env npx tsx
/**
 * Pre-mortem Debiasing — 5-turn structure with Englich paradigm
 * 
 * Turn 1: Pre-mortem framing (imagine failure modes)
 * Turn 2: Prosecutor's demand (anchor) — too low/high/right?
 * Turn 3: Defense attorney's demand (1mo) — too low/high/right?
 * Turn 4: Reflect on failure modes given both demands
 * Turn 5: Final sentencing decision
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

// Turn 1: Pre-mortem setup (no jurisdiction - only Outside View needs it)
const premortermSetupPrompt = 
  anchoringProsecutorSentencingCaseVignette +
  '\n\n' +
  'Before hearing the specific demands from prosecution and defense, conduct a pre-mortem analysis:' +
  '\nImagine that six months from now, your sentencing decision is criticized as inappropriate.' +
  '\nWhat are the most likely reasons any sentence might be seen as too harsh OR too lenient?' +
  '\nList potential failure modes to consider.';

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

// Turn 4: Reflect on failure modes
const reflectFailureModesPrompt =
  'Now,' +
  '\nwhich potential criticisms of your sentence are you most concerned about?' +
  '\nBriefly reflect on how to avoid the failure modes you identified.';

// Turn 5: Final sentence — matches Englich
const finalSentencePrompt =
  "What is your final sentencing decision for Lena M.?\n" +
  '\nAnswer with a single integer number of months on probation.';

const PROMPT_HASH = hashPrompts(
  premortermSetupPrompt,
  prosecutorDemandPrompt(999).replace('999', 'ANCHOR'),
  defenseAttorneyPrompt,
  reflectFailureModesPrompt,
  finalSentencePrompt
);

function extractSentence(response: string): number | null {
  // Look for LAST number followed by "month" (avoids grabbing ranges like "12-36 months")
  const monthMatches = [...response.matchAll(/(\d+)\s*(?:months?|mo\b)/gi)];
  if (monthMatches.length > 0) return parseInt(monthMatches[monthMatches.length - 1][1]);
  
  // Fallback: last number in response (likely the answer)
  const numbers = response.match(/\b(\d+)\b/g);
  if (numbers && numbers.length > 0) {
    return parseInt(numbers[numbers.length - 1]);
  }
  return null;
}

async function runTrial(apiKey: string, index: number) {
  const messages: Message[] = [];
  
  // Turn 1: Pre-mortem setup
  messages.push({ role: 'user', content: premortermSetupPrompt });
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
  
  // Turn 4: Reflect on failure modes
  messages.push({ role: 'user', content: reflectFailureModesPrompt });
  ({ content, actualModel } = await callOpenRouter(apiKey, MODEL, messages, TEMP));
  messages.push({ role: 'assistant', content });
  
  // Turn 5: Final sentence
  messages.push({ role: 'user', content: finalSentencePrompt });
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
    methodology: 'premortem-5turn',
    technique: 'premortem',
    runIndex: index,
    collectedAt: new Date().toISOString(),
  };
  await appendFile(RESULTS_FILE, JSON.stringify(record) + '\n');
  
  return sentence;
}

async function main() {
  console.log(`=== Pre-mortem Debiasing (5-turn) ===`);
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
