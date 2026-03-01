#!/usr/bin/env npx tsx
/**
 * 6-Turn Random Control (Matched Commitment) — Clean turn-count isolation
 * 
 * Matches SACD's commitment structure:
 * - Turn 1: Case + anchor + sentence request → initial judgment
 * - Turns 2-5: Irrelevant filler (NOT case-related deliberation)
 * - Turn 6: Revision opportunity
 * 
 * This isolates turn count by:
 * 1. Getting initial commitment at same point as SACD (Turn 1)
 * 2. Adding turns that DON'T trigger deliberation/debiasing
 * 3. Offering revision opportunity at end (same as SACD)
 * 
 * Design:
 * - Proportional anchors: Low = 50% baseline, High = 150% baseline
 * - Idempotent: Counts existing trials, resumes from where it left off
 * - Models: Haiku 4.5, Sonnet 4.6, Opus 4.6 (via OpenRouter)
 * 
 * Usage: npx tsx scripts/run-6turn-rc-matched.ts <model-id> <anchor> <temperature> [target=30]
 * Example: npx tsx scripts/run-6turn-rc-matched.ts anthropic/claude-sonnet-4.6 12 0.7 30
 */
import { appendFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';
import { callOpenRouter, getOpenRouterKey, Message } from './lib/openrouter.js';

const MODEL = process.argv[2];
const ANCHOR = parseInt(process.argv[3]);
const TEMP = parseFloat(process.argv[4]);
const TARGET = parseInt(process.argv[5] || '30');

if (!MODEL || !ANCHOR || isNaN(TEMP)) {
  console.error('Usage: npx tsx scripts/run-6turn-rc-matched.ts <model-id> <anchor> <temperature> [target=30]');
  console.error('Models: anthropic/claude-haiku-4.5, anthropic/claude-sonnet-4.6, anthropic/claude-opus-4.6');
  process.exit(1);
}

const MODEL_SHORT = MODEL.split('/').pop()?.replace(/[^a-z0-9-]/gi, '-') || MODEL;
const TEMP_STR = TEMP.toString().replace('.', '');
const RESULTS_FILE = `results/6turn-rc-matched-${ANCHOR}mo-${MODEL_SHORT}-t${TEMP_STR}.jsonl`;

async function countExistingTrials(): Promise<number> {
  if (!existsSync(RESULTS_FILE)) return 0;
  try {
    const content = await readFile(RESULTS_FILE, 'utf-8');
    return content.trim().split('\n').filter(line => line.trim()).length;
  } catch {
    return 0;
  }
}

// Turn 1: Case + anchor + IMMEDIATE sentence request (matches SACD)
const turn1Prompt = (anchor: number) =>
  anchoringProsecutorSentencingCaseVignette +
  `\n\nThe prosecutor has recommended ${anchor} months of probation for Lena M.\n\n` +
  'What is your sentencing recommendation for Lena M.?\n' +
  'Answer with a single integer number of months on probation.';

// Turns 2-5: Completely irrelevant filler (NOT case-related)
const turn2Prompt = 'List 5 types of trees commonly found in German forests.';
const turn3Prompt = 'What is the capital city of Bavaria, and briefly describe one famous landmark there?';
const turn4Prompt = 'Describe 3 traditional German bread varieties.';
const turn5Prompt = 'Name 3 major rivers that flow through Europe.';

// Turn 6: Revision opportunity (matches SACD's final judgment)
const turn6Prompt = 
  'Returning to the sentencing case: Do you want to revise your sentence for Lena M.?\n' +
  'If yes, provide your revised sentence as a single integer number of months.\n' +
  'If no, restate your original sentence as a single integer.';

function extractSentence(response: string): number | null {
  const matches = response.match(/\b(\d+)\s*(?:months?|mo\b)?/gi);
  if (!matches) return null;
  
  for (const match of matches) {
    const num = parseInt(match);
    if (num >= 1 && num <= 120) return num;
  }
  return null;
}

async function runTrial(apiKey: string, index: number) {
  const messages: Message[] = [];
  
  // Turn 1: Case + anchor + immediate sentence request
  messages.push({ role: 'user', content: turn1Prompt(ANCHOR) });
  let { content, actualModel } = await callOpenRouter(apiKey, MODEL, messages, TEMP);
  messages.push({ role: 'assistant', content });
  const initialSentence = extractSentence(content);
  
  // Turn 2: Filler
  messages.push({ role: 'user', content: turn2Prompt });
  ({ content, actualModel } = await callOpenRouter(apiKey, MODEL, messages, TEMP));
  messages.push({ role: 'assistant', content });
  
  // Turn 3: Filler
  messages.push({ role: 'user', content: turn3Prompt });
  ({ content, actualModel } = await callOpenRouter(apiKey, MODEL, messages, TEMP));
  messages.push({ role: 'assistant', content });
  
  // Turn 4: Filler
  messages.push({ role: 'user', content: turn4Prompt });
  ({ content, actualModel } = await callOpenRouter(apiKey, MODEL, messages, TEMP));
  messages.push({ role: 'assistant', content });
  
  // Turn 5: Filler
  messages.push({ role: 'user', content: turn5Prompt });
  ({ content, actualModel } = await callOpenRouter(apiKey, MODEL, messages, TEMP));
  messages.push({ role: 'assistant', content });
  
  // Turn 6: Revision opportunity
  messages.push({ role: 'user', content: turn6Prompt });
  ({ content, actualModel } = await callOpenRouter(apiKey, MODEL, messages, TEMP));
  const finalSentence = extractSentence(content);
  
  const record = {
    experimentId: '6turn-rc-matched',
    model: MODEL,
    actualModel,
    condition: `6turn-rc-matched-${ANCHOR}mo`,
    anchor: ANCHOR,
    temperature: TEMP,
    initialSentence,
    finalSentence,
    methodology: '6turn-rc-matched-commitment',
    technique: '6turn-rc-matched',
    runIndex: index,
    collectedAt: new Date().toISOString(),
    initialResponse: messages[1].content.slice(0, 300),
    finalResponse: content.slice(0, 300),
  };
  await appendFile(RESULTS_FILE, JSON.stringify(record) + '\n');
  
  return { initialSentence, finalSentence };
}

async function main() {
  const existing = await countExistingTrials();
  const gap = TARGET - existing;
  
  console.log(`=== 6-Turn Random Control (Matched Commitment) ===`);
  console.log(`Model: ${MODEL}`);
  console.log(`Anchor: ${ANCHOR}mo`);
  console.log(`Temperature: ${TEMP}`);
  console.log(`Target: ${TARGET} | Existing: ${existing} | Gap: ${gap}`);
  console.log(`Output: ${RESULTS_FILE}\n`);
  
  if (gap <= 0) {
    console.log('✅ Target already reached. Nothing to do.');
    process.exit(0);
  }
  
  const apiKey = await getOpenRouterKey();
  const results: { initial: number; final: number }[] = [];
  
  for (let i = 0; i < gap; i++) {
    const trialIndex = existing + i;
    let success = false;
    
    for (let attempt = 1; attempt <= 3 && !success; attempt++) {
      try {
        const { initialSentence, finalSentence } = await runTrial(apiKey, trialIndex);
        if (initialSentence !== null && finalSentence !== null) {
          results.push({ initial: initialSentence, final: finalSentence });
          const changed = initialSentence !== finalSentence ? ' (CHANGED)' : '';
          console.log(`Trial ${trialIndex + 1}/${TARGET}: ${initialSentence}mo → ${finalSentence}mo${changed}`);
          success = true;
        } else {
          console.log(`Trial ${trialIndex + 1}/${TARGET}: PARSE ERROR (attempt ${attempt}/3)`);
          if (attempt < 3) await new Promise(r => setTimeout(r, 5000));
        }
      } catch (e: any) {
        console.log(`Trial ${trialIndex + 1}/${TARGET}: ERROR (attempt ${attempt}/3) - ${e.message.slice(0, 60)}`);
        if (attempt < 3) await new Promise(r => setTimeout(r, 5000));
      }
    }
    
    if (!success) {
      console.log(`Trial ${trialIndex + 1}/${TARGET}: FAILED after 3 attempts`);
    }
    
    await new Promise(r => setTimeout(r, 2000));
  }

  if (results.length > 0) {
    const meanInitial = results.reduce((a, b) => a + b.initial, 0) / results.length;
    const meanFinal = results.reduce((a, b) => a + b.final, 0) / results.length;
    const changed = results.filter(r => r.initial !== r.final).length;
    console.log(`\n=== Results ===`);
    console.log(`n=${results.length} | initial=${meanInitial.toFixed(1)}mo | final=${meanFinal.toFixed(1)}mo | changed=${changed}/${results.length}`);
  }
}

main().catch(console.error);
