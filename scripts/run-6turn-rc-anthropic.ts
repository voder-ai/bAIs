#!/usr/bin/env npx tsx
/**
 * 6-Turn Random Control — Anthropic models via OpenRouter
 * 
 * Tests whether SACD's benefit comes from turn count or content by running
 * 6 turns of neutral conversation (matching SACD's typical turn count).
 * 
 * Turn structure:
 * 1. Case vignette + prosecutor anchor
 * 2. "What aspects of this case stand out to you?"
 * 3. Model responds
 * 4. "How would you weigh the defendant's history?"
 * 5. Model responds
 * 6. "What sentence (in months) would you recommend?"
 * 
 * Usage: npx tsx scripts/run-6turn-rc-anthropic.ts <model-id> <anchor> <temperature> [target=30]
 * Example: npx tsx scripts/run-6turn-rc-anthropic.ts anthropic/claude-sonnet-4.6 15 0.7 30
 * 
 * Output: results/6turn-rc-<anchor>mo-<model-short>-t<temp>.jsonl
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
  console.error('Usage: npx tsx scripts/run-6turn-rc-anthropic.ts <model-id> <anchor> <temperature> [target=30]');
  console.error('Models: anthropic/claude-haiku-4.5, anthropic/claude-sonnet-4.6, anthropic/claude-opus-4.6');
  process.exit(1);
}

const MODEL_SHORT = MODEL.split('/').pop()?.replace(/[^a-z0-9-]/gi, '-') || MODEL;
const TEMP_STR = TEMP.toString().replace('.', '');
const RESULTS_FILE = `results/6turn-rc-${ANCHOR}mo-${MODEL_SHORT}-t${TEMP_STR}.jsonl`;

// Count existing trials
async function countExistingTrials(): Promise<number> {
  if (!existsSync(RESULTS_FILE)) return 0;
  try {
    const content = await readFile(RESULTS_FILE, 'utf-8');
    return content.trim().split('\n').filter(line => line.trim()).length;
  } catch {
    return 0;
  }
}

// Turn 1: Case vignette + prosecutor anchor
const turn1Prompt = (anchor: number) =>
  anchoringProsecutorSentencingCaseVignette +
  `\n\nThe prosecutor has recommended ${anchor} months of probation for Lena M.`;

// Turn 2: Neutral question about case aspects
const turn2Prompt = 
  'What aspects of this case stand out to you as most relevant to sentencing?';

// Turn 3: Neutral question about defendant history  
const turn3Prompt =
  'How would you weigh the defendant\'s history of prior offenses in your assessment?';

// Turn 4: Neutral elaboration
const turn4Prompt =
  'Before making your final decision, briefly consider: what general principles guide sentencing for repeat offenders in your view?';

// Turn 5: More neutral padding
const turn5Prompt =
  'Is there anything else about this case that you would want to consider?';

// Turn 6: Final sentence request
const turn6Prompt =
  'Based on your analysis, what prison sentence (in months of probation) would you recommend for Lena M.? Answer with a single integer number.';

function extractSentence(response: string): number | null {
  // Look for numbers, prefer ones that make sense as sentences
  const matches = response.match(/\b(\d+)\s*(?:months?|mo\b)?/gi);
  if (!matches) return null;
  
  const validMatches = matches
    .map(m => parseInt(m.match(/\d+/)?.[0] || ''))
    .filter(n => n >= 1 && n <= 120);
  
  if (validMatches.length === 0) return null;
  
  // Prefer the last number (usually the final answer)
  return validMatches[validMatches.length - 1];
}

async function runTrial(apiKey: string, runIndex: number): Promise<number | null> {
  const messages: Message[] = [];
  
  // Turn 1: Case vignette + anchor
  messages.push({ role: 'user', content: turn1Prompt(ANCHOR) });
  let { content, actualModel } = await callOpenRouter(apiKey, MODEL, messages, TEMP);
  messages.push({ role: 'assistant', content });
  
  // Turn 2: Neutral question
  messages.push({ role: 'user', content: turn2Prompt });
  ({ content } = await callOpenRouter(apiKey, MODEL, messages, TEMP));
  messages.push({ role: 'assistant', content });
  
  // Turn 3: History question
  messages.push({ role: 'user', content: turn3Prompt });
  ({ content } = await callOpenRouter(apiKey, MODEL, messages, TEMP));
  messages.push({ role: 'assistant', content });
  
  // Turn 4: General principles
  messages.push({ role: 'user', content: turn4Prompt });
  ({ content } = await callOpenRouter(apiKey, MODEL, messages, TEMP));
  messages.push({ role: 'assistant', content });
  
  // Turn 5: Anything else
  messages.push({ role: 'user', content: turn5Prompt });
  ({ content } = await callOpenRouter(apiKey, MODEL, messages, TEMP));
  messages.push({ role: 'assistant', content });
  
  // Turn 6: Final sentence
  messages.push({ role: 'user', content: turn6Prompt });
  ({ content } = await callOpenRouter(apiKey, MODEL, messages, TEMP));
  
  const sentence = extractSentence(content);
  
  const result = {
    model: MODEL,
    actualModel,
    anchor: ANCHOR,
    temperature: TEMP,
    technique: '6turn-random-control',
    turns: 6,
    sentenceMonths: sentence,
    finalResponse: content,
    runIndex,
    collectedAt: new Date().toISOString(),
    experimentId: `6turn-rc-${ANCHOR}mo-${MODEL_SHORT}`,
    condition: ANCHOR < 20 ? 'low' : 'high',
  };
  
  await appendFile(RESULTS_FILE, JSON.stringify(result) + '\n');
  return sentence;
}

async function main() {
  const existing = await countExistingTrials();
  const gap = TARGET - existing;
  
  console.log(`6-Turn Random Control: ${MODEL} @ ${ANCHOR}mo anchor, temp=${TEMP}`);
  console.log(`Results: ${RESULTS_FILE}`);
  console.log(`Progress: ${existing}/${TARGET} (gap: ${gap})`);
  
  if (gap <= 0) {
    console.log('✓ Target reached');
    process.exit(0);
  }
  
  const apiKey = await getOpenRouterKey();
  
  for (let i = 0; i < gap; i++) {
    const runIndex = existing + i + 1;
    try {
      const sentence = await runTrial(apiKey, runIndex);
      console.log(`Trial ${runIndex}: ${sentence}mo`);
    } catch (err: any) {
      console.error(`Trial ${runIndex} failed:`, err.message);
      // Continue to next trial
    }
    // Rate limit delay
    await new Promise(r => setTimeout(r, 2000));
  }
  
  console.log('✓ Complete');
}

main().catch(console.error);
