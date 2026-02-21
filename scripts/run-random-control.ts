#!/usr/bin/env npx tsx
/**
 * Random Control — Token-matched irrelevant elaboration (control for length effects)
 * 
 * Same 5-turn structure as Sibony techniques but with irrelevant content.
 * Tests whether bias reduction comes from the debiasing CONTENT or just from
 * the additional thinking/length.
 * 
 * Turn 1: Random/irrelevant elaboration (token-matched)
 * Turn 2: Prosecutor's demand (anchor) — too low/high/right?
 * Turn 3: Defense attorney's demand (1mo) — too low/high/right?
 * Turn 4: More irrelevant elaboration (token-matched)
 * Turn 5: Final sentencing decision
 * 
 * Usage: npx tsx scripts/run-random-control.ts <model-id> <anchor> <temperature> [n=30]
 * Example: npx tsx scripts/run-random-control.ts anthropic/claude-opus-4.6 9 0.7 30
 * 
 * Output: results/random-control-<anchor>mo-<model-short>-t<temp>.jsonl
 */
import { appendFile } from 'node:fs/promises';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';
import { getOpenRouterKey, callOpenRouter, hashPrompts, Message } from './lib/openrouter.js';

const MODEL = process.argv[2];
const ANCHOR = parseInt(process.argv[3]);
const TEMP = parseFloat(process.argv[4]);
const N_TRIALS = parseInt(process.argv[5] || '30');

if (!MODEL || !ANCHOR || isNaN(TEMP)) {
  console.error('Usage: npx tsx scripts/run-random-control.ts <model-id> <anchor> <temperature> [n=30]');
  process.exit(1);
}

const MODEL_SHORT = MODEL.split('/').pop()?.replace(/[^a-z0-9-]/gi, '-') || MODEL;
const TEMP_STR = TEMP.toString().replace('.', '');
const RESULTS_FILE = `results/random-control-${ANCHOR}mo-${MODEL_SHORT}-t${TEMP_STR}.jsonl`;

// Turn 1: Irrelevant elaboration (token-matched to other Sibony Turn 1s)
const randomElaborationPrompt1 = 
  anchoringProsecutorSentencingCaseVignette +
  '\n\n' +
  'This case is being heard in a German federal court under standard sentencing guidelines.' +
  '\n\n' +
  'Before proceeding with the case, please briefly describe:' +
  '\n- The historical development of probation as a sentencing option in European legal systems' +
  '\n- How weather patterns in Northern Europe might affect courtroom scheduling' +
  '\n- An interesting fact about German architecture from the 19th century' +
  '\nProvide a brief response on each topic.';

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

// Turn 4: More irrelevant elaboration (token-matched)
const randomElaborationPrompt2 =
  'Before making your final decision, please briefly describe:' +
  '\n- Three common types of trees found in German forests' +
  '\n- The primary exports of Bavaria in the 20th century' +
  '\n- How courtroom furniture design has evolved over the past century' +
  '\nProvide a brief response on each topic.';

// Turn 5: Final sentence — matches Englich
const finalSentencePrompt =
  "Now, considering both the prosecutor's demand and the defense attorney's demand," +
  '\nwhat is your final sentencing decision for Lena M.?' +
  '\nAnswer with a single integer number of months on probation.';

const PROMPT_HASH = hashPrompts(
  randomElaborationPrompt1,
  prosecutorDemandPrompt(999).replace('999', 'ANCHOR'),
  defenseAttorneyPrompt,
  randomElaborationPrompt2,
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
  
  // Turn 1: Random elaboration
  messages.push({ role: 'user', content: randomElaborationPrompt1 });
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
  
  // Turn 4: More random elaboration
  messages.push({ role: 'user', content: randomElaborationPrompt2 });
  ({ content, actualModel } = await callOpenRouter(apiKey, MODEL, messages, TEMP));
  messages.push({ role: 'assistant', content });
  
  // Turn 5: Final sentence
  messages.push({ role: 'user', content: finalSentencePrompt });
  ({ content, actualModel } = await callOpenRouter(apiKey, MODEL, messages, TEMP));
  const sentence = extractSentence(content);
  
  const record = {
    experimentId: 'random-control',
    model: MODEL,
    actualModel,
    condition: `random-control-${ANCHOR}mo`,
    anchor: ANCHOR,
    temperature: TEMP,
    promptHash: PROMPT_HASH,
    sentenceMonths: sentence,
    methodology: 'random-control-5turn',
    technique: 'random-control',
    runIndex: index,
    collectedAt: new Date().toISOString(),
  };
  await appendFile(RESULTS_FILE, JSON.stringify(record) + '\n');
  
  return sentence;
}

async function main() {
  console.log(`=== Random Control (5-turn) ===`);
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
