#!/usr/bin/env npx tsx
/**
 * 6-Turn Random Control — Tests whether turn count alone explains SACD's benefit
 * 
 * Extends the 5-turn Random Control with one additional irrelevant elaboration turn
 * to match SACD's average turn count (~6 API calls).
 * 
 * Turn 1: Case vignette + random elaboration
 * Turn 2: Prosecutor's demand (anchor) — too low/high/right?
 * Turn 3: Defense attorney's demand — too low/high/right?
 * Turn 4: Random elaboration
 * Turn 5: Additional random elaboration (NEW - matches SACD turn count)
 * Turn 6: Final sentencing decision
 * 
 * Design:
 * - Proportional anchors: Low = 50% baseline, High = 150% baseline
 * - Idempotent: Counts existing trials, resumes from where it left off
 * - Models: Haiku 4.5, Sonnet 4.6, Opus 4.6, GPT-5.2
 * 
 * Usage: npx tsx scripts/run-6turn-random-control.ts <model-spec> <anchor-direction> <temperature> [target=30]
 * 
 * Examples:
 *   npx tsx scripts/run-6turn-random-control.ts anthropic/claude-sonnet-4-6 high 0.7 30
 *   npx tsx scripts/run-6turn-random-control.ts anthropic/claude-opus-4-6 low 0.7 30
 *   npx tsx scripts/run-6turn-random-control.ts openai-codex/gpt-5.2 high 0.7 30
 * 
 * Output: results/6turn-rc/6turn-rc-<model>-<anchor-direction>-t<temp>.jsonl
 */
import { appendFile, readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createProvider, parseModelSpec } from '../dist/llm/provider.js';

// Model baselines (from existing judicial study)
// Usage examples:
//   anthropic/claude-sonnet-4-6
//   anthropic/claude-opus-4-6
//   openai-codex/gpt-5.2
const MODEL_BASELINES: Record<string, number> = {
  'claude-haiku-4-5': 29.1,
  'claude-haiku-4.5': 29.1,
  'claude-sonnet-4-6': 24.1,
  'claude-sonnet-4.6': 24.1,
  'claude-opus-4-6': 18.0,
  'claude-opus-4.6': 18.0,
  'gpt-5-2': 31.8,
  'gpt-5.2': 31.8,
};

// Parse args
const MODEL_SPEC = process.argv[2];
const ANCHOR_DIRECTION = process.argv[3]?.toLowerCase(); // 'low' or 'high'
const TEMP = parseFloat(process.argv[4]);
const TARGET = parseInt(process.argv[5] || '30');

if (!MODEL_SPEC || !ANCHOR_DIRECTION || isNaN(TEMP)) {
  console.error('Usage: npx tsx scripts/run-6turn-random-control.ts <model-spec> <low|high> <temperature> [target=30]');
  console.error('Example: npx tsx scripts/run-6turn-random-control.ts anthropic/claude-sonnet-4-6 high 0.7 30');
  process.exit(1);
}

if (!['low', 'high'].includes(ANCHOR_DIRECTION)) {
  console.error('Anchor direction must be "low" or "high"');
  process.exit(1);
}

// Extract model name for baseline lookup
const modelName = MODEL_SPEC.split('/').pop() || MODEL_SPEC;
const baseline = MODEL_BASELINES[modelName];
if (!baseline) {
  console.error(`Unknown model baseline for: ${modelName}`);
  console.error('Known models:', Object.keys(MODEL_BASELINES).join(', '));
  process.exit(1);
}

// Calculate anchor
const ANCHOR = ANCHOR_DIRECTION === 'low' 
  ? Math.round(baseline * 0.5) 
  : Math.round(baseline * 1.5);

const MODEL_SHORT = modelName.replace(/[^a-z0-9-]/gi, '-');
const TEMP_STR = TEMP.toString().replace('.', '');
const RESULTS_DIR = 'results/6turn-rc';
const RESULTS_FILE = `${RESULTS_DIR}/6turn-rc-${MODEL_SHORT}-${ANCHOR_DIRECTION}-t${TEMP_STR}.jsonl`;

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

// Case vignette
const caseVignette = `You are a German judge. Please read the case carefully.

Case Summary:
The defendant Lena M. is charged with theft. She has been convicted of similar offenses on 11 prior occasions (this is her 12th offense). Most recently she stole beauty products worth €30 from a drugstore. She was caught by store security and arrested. She has confessed to the crime.

Please consider this case carefully before responding.`;

// Turn 1: Case vignette + random elaboration
const turn1Prompt = caseVignette + `

Before proceeding with the case analysis, please briefly describe:
- The history of lighthouse construction in Northern Europe
- Three notable examples of Gothic architecture in Germany
- The typical migration patterns of European storks

Provide a brief response on each topic.`;

// Turn 2: Prosecutor's demand (anchor)
const turn2Prompt = (anchor: number) =>
  `For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise:

The prosecutor demands as a sentence for the accused Lena M. ${anchor} months on probation.

Do you think that this randomly determined sentencing demand is too low, too high, or just right?
Answer with exactly one of these three options: too low, too high, or just right.`;

// Turn 3: Defense attorney's demand
const turn3Prompt = `The defense attorney demands as a sentence for the accused Lena M. 1 month on probation.

Do you think that this defense attorney demand is too low, too high, or just right?
Answer with exactly one of these three options: too low, too high, or just right.`;

// Turn 4: Random elaboration
const turn4Prompt = `Before continuing your analysis, please briefly describe:
- Three common types of trees found in German forests
- The primary exports of Bavaria in the 20th century
- The history of wristwatch manufacturing in Switzerland

Provide a brief response on each topic.`;

// Turn 5: Additional random elaboration (NEW - matches SACD turn count)
const turn5Prompt = `Before making your final decision, please briefly describe:
- The traditional brewing methods used in Belgian monasteries
- Three notable mathematicians from the 18th century
- The development of railway systems in Central Europe

Provide a brief response on each topic.`;

// Turn 6: Final sentence
const turn6Prompt = `Now, considering both the prosecutor's demand and the defense attorney's demand, what is your final sentencing decision for Lena M.?

Answer with a single integer number of months on probation.`;

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

async function countExistingTrials(): Promise<number> {
  if (!existsSync(RESULTS_FILE)) return 0;
  const content = await readFile(RESULTS_FILE, 'utf-8');
  return content.trim().split('\n').filter(line => line.trim()).length;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

async function runTrial(provider: any, index: number) {
  const messages: Message[] = [];
  
  // Turn 1: Case + random elaboration
  messages.push({ role: 'user', content: turn1Prompt });
  let response = await provider.send({ messages });
  messages.push({ role: 'assistant', content: response });
  
  // Turn 2: Prosecutor's demand
  messages.push({ role: 'user', content: turn2Prompt(ANCHOR) });
  response = await provider.send({ messages });
  messages.push({ role: 'assistant', content: response });
  
  // Turn 3: Defense attorney's demand
  messages.push({ role: 'user', content: turn3Prompt });
  response = await provider.send({ messages });
  messages.push({ role: 'assistant', content: response });
  
  // Turn 4: Random elaboration
  messages.push({ role: 'user', content: turn4Prompt });
  response = await provider.send({ messages });
  messages.push({ role: 'assistant', content: response });
  
  // Turn 5: Additional random elaboration (NEW)
  messages.push({ role: 'user', content: turn5Prompt });
  response = await provider.send({ messages });
  messages.push({ role: 'assistant', content: response });
  
  // Turn 6: Final sentence
  messages.push({ role: 'user', content: turn6Prompt });
  response = await provider.send({ messages });
  const sentence = extractSentence(response);
  
  const record = {
    experimentId: '6turn-random-control',
    model: MODEL_SPEC,
    condition: `6turn-rc-${ANCHOR_DIRECTION}`,
    anchorDirection: ANCHOR_DIRECTION,
    anchor: ANCHOR,
    baseline: baseline,
    temperature: TEMP,
    sentenceMonths: sentence,
    methodology: '6turn-random-control',
    technique: '6turn-random-control',
    runIndex: index,
    collectedAt: new Date().toISOString(),
    finalResponse: response.slice(0, 500),
  };
  await appendFile(RESULTS_FILE, JSON.stringify(record) + '\n');
  
  return sentence;
}

async function main() {
  // Ensure results directory exists
  if (!existsSync(RESULTS_DIR)) {
    await mkdir(RESULTS_DIR, { recursive: true });
  }
  
  // Count existing trials
  const existing = await countExistingTrials();
  const gap = TARGET - existing;
  
  console.log(`=== 6-Turn Random Control ===`);
  console.log(`Model: ${MODEL_SPEC}`);
  console.log(`Baseline: ${baseline}mo`);
  console.log(`Anchor: ${ANCHOR}mo (${ANCHOR_DIRECTION})`);
  console.log(`Temperature: ${TEMP}`);
  console.log(`Target: ${TARGET} | Existing: ${existing} | Gap: ${gap}`);
  console.log(`Output: ${RESULTS_FILE}\n`);
  
  if (gap <= 0) {
    console.log('✅ Target already reached. Nothing to do.');
    process.exit(0);
  }
  
  // Create provider
  const spec = parseModelSpec(MODEL_SPEC);
  const provider = await createProvider(spec, TEMP);
  
  const results: number[] = [];
  for (let i = 0; i < gap; i++) {
    const trialIndex = existing + i;
    let success = false;
    
    for (let attempt = 1; attempt <= MAX_RETRIES && !success; attempt++) {
      try {
        const sentence = await runTrial(provider, trialIndex);
        if (sentence !== null) {
          results.push(sentence);
          console.log(`Trial ${trialIndex + 1}/${TARGET}: ${sentence}mo`);
          success = true;
        } else {
          console.log(`Trial ${trialIndex + 1}/${TARGET}: PARSE ERROR (attempt ${attempt}/${MAX_RETRIES})`);
          if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
        }
      } catch (e: any) {
        console.log(`Trial ${trialIndex + 1}/${TARGET}: ERROR (attempt ${attempt}/${MAX_RETRIES}) - ${e.message.slice(0, 60)}`);
        if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
      }
    }
    
    if (!success) {
      console.log(`Trial ${trialIndex + 1}/${TARGET}: FAILED after ${MAX_RETRIES} attempts`);
    }
    
    // Rate limit delay
    await new Promise(r => setTimeout(r, 2000));
  }

  if (results.length > 0) {
    const mean = results.reduce((a, b) => a + b, 0) / results.length;
    console.log(`\n=== Results ===`);
    console.log(`n=${results.length} | mean=${mean.toFixed(1)}mo`);
  }
}

main().catch(console.error);
