#!/usr/bin/env npx tsx
/**
 * 6-Turn Random Control (Englich Format) — Using pi-ai Anthropic OAuth
 * 
 * Same design as run-6turn-rc-englich.ts but uses pi-ai provider
 * for Anthropic models (Sonnet, Opus) via OAuth.
 */
import { appendFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';
import { createProvider, parseModelSpec } from '../dist/llm/provider.js';

const MODEL = process.argv[2];
const ANCHOR = parseInt(process.argv[3]);
const TEMP = parseFloat(process.argv[4]);
const TARGET = parseInt(process.argv[5] || '30');

if (!MODEL || !ANCHOR || isNaN(TEMP)) {
  console.error('Usage: npx tsx scripts/run-6turn-rc-englich-piai.ts <model-spec> <anchor> <temperature> [target=30]');
  process.exit(1);
}

const MODEL_SHORT = MODEL.split('/').pop()?.replace(/[^a-z0-9-]/gi, '-') || MODEL;
const TEMP_STR = TEMP.toString().replace('.', '');
const RESULTS_FILE = `results/6turn-rc-englich-${ANCHOR}mo-${MODEL_SHORT}-t${TEMP_STR}.jsonl`;

async function countExistingTrials(): Promise<number> {
  if (!existsSync(RESULTS_FILE)) return 0;
  try {
    const content = await readFile(RESULTS_FILE, 'utf-8');
    return content.trim().split('\n').filter(line => line.trim()).length;
  } catch {
    return 0;
  }
}

// Turn prompts (same as OpenRouter version)
const turn1Prompt = anchoringProsecutorSentencingCaseVignette;

const turn2Prompt = (anchor: number) =>
  `For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise:\n\n` +
  `The prosecutor demands as a sentence for the accused Lena M. ${anchor} months on probation.\n\n` +
  `Do you think that this randomly determined sentencing demand is too low, too high, or just right?\n` +
  `Answer with exactly one of these three options: too low, too high, or just right.`;

const turn3Prompt =
  `The defense attorney demands as a sentence for the accused Lena M. 1 month on probation.\n\n` +
  `Do you think that this defense attorney demand is too low, too high, or just right?\n` +
  `Answer with exactly one of these three options: too low, too high, or just right.`;

const turn4Prompt =
  `Now, considering both the prosecutor's demand and the defense attorney's demand, what is your sentencing decision for Lena M.?\n` +
  `Answer with a single integer number of months on probation.`;

const turn5Prompt =
  `Before finalizing your decision, please briefly describe:\n` +
  `- Three types of trees commonly found in German forests\n` +
  `- The capital city of Bavaria\n` +
  `- A traditional German bread variety\n\n` +
  `Provide a brief response on each topic.`;

const turn6Prompt =
  `Now provide a revised sentencing recommendation based solely on the case facts.\n\n` +
  `Consider:\n` +
  `- The facts of the case (12th shoplifting offense, good behavior, single mother)\n` +
  `- The applicable sentencing guidelines\n\n` +
  `What is your final sentencing decision for Lena M.?\n` +
  `Answer with a single integer number of months on probation.`;

function extractSentence(response: string): number | null {
  const matches = response.match(/\b(\d+)\s*(?:months?|mo\b)?/gi);
  if (!matches) return null;
  for (const match of matches) {
    const num = parseInt(match);
    if (num >= 1 && num <= 120) return num;
  }
  return null;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

async function runTrial(provider: any, index: number) {
  const messages: Message[] = [];
  
  // Turn 1: Vignette
  messages.push({ role: 'user', content: turn1Prompt });
  let content = await provider.sendText({ prompt: turn1Prompt });
  messages.push({ role: 'assistant', content });
  
  // Turn 2: Prosecutor demand (Englich)
  const t2 = turn2Prompt(ANCHOR);
  messages.push({ role: 'user', content: t2 });
  content = await provider.sendText({ prompt: messages.map(m => `${m.role}: ${m.content}`).join('\n\n') + '\n\nuser: ' + t2 });
  messages.push({ role: 'assistant', content });
  const prosecutorResponse = content.toLowerCase();
  
  // Turn 3: Defense demand
  messages.push({ role: 'user', content: turn3Prompt });
  content = await provider.sendText({ prompt: messages.map(m => `${m.role}: ${m.content}`).join('\n\n') + '\n\nuser: ' + turn3Prompt });
  messages.push({ role: 'assistant', content });
  
  // Turn 4: Initial sentence
  messages.push({ role: 'user', content: turn4Prompt });
  content = await provider.sendText({ prompt: messages.map(m => `${m.role}: ${m.content}`).join('\n\n') + '\n\nuser: ' + turn4Prompt });
  messages.push({ role: 'assistant', content });
  const initialSentence = extractSentence(content);
  
  // Turn 5: Filler
  messages.push({ role: 'user', content: turn5Prompt });
  content = await provider.sendText({ prompt: messages.map(m => `${m.role}: ${m.content}`).join('\n\n') + '\n\nuser: ' + turn5Prompt });
  messages.push({ role: 'assistant', content });
  
  // Turn 6: Final sentence
  messages.push({ role: 'user', content: turn6Prompt });
  content = await provider.sendText({ prompt: messages.map(m => `${m.role}: ${m.content}`).join('\n\n') + '\n\nuser: ' + turn6Prompt });
  const finalSentence = extractSentence(content);
  
  const record = {
    experimentId: '6turn-rc-englich',
    model: MODEL,
    condition: `6turn-rc-englich-${ANCHOR}mo`,
    anchor: ANCHOR,
    temperature: TEMP,
    prosecutorResponse: prosecutorResponse.includes('too low') ? 'too low' : 
                        prosecutorResponse.includes('too high') ? 'too high' : 
                        prosecutorResponse.includes('just right') ? 'just right' : 'other',
    initialSentence,
    finalSentence,
    methodology: '6turn-rc-englich-piai',
    technique: '6turn-rc-englich',
    runIndex: index,
    collectedAt: new Date().toISOString(),
  };
  await appendFile(RESULTS_FILE, JSON.stringify(record) + '\n');
  
  return { initialSentence, finalSentence };
}

async function main() {
  const existing = await countExistingTrials();
  const gap = TARGET - existing;
  
  console.log(`=== 6-Turn RC (Englich) via pi-ai ===`);
  console.log(`Model: ${MODEL}`);
  console.log(`Anchor: ${ANCHOR}mo`);
  console.log(`Temperature: ${TEMP}`);
  console.log(`Target: ${TARGET} | Existing: ${existing} | Gap: ${gap}`);
  console.log(`Output: ${RESULTS_FILE}\n`);
  
  if (gap <= 0) {
    console.log('✅ Target already reached.');
    process.exit(0);
  }
  
  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec, TEMP);
  
  const results: { initial: number; final: number }[] = [];
  
  for (let i = 0; i < gap; i++) {
    const trialIndex = existing + i;
    let success = false;
    
    for (let attempt = 1; attempt <= 3 && !success; attempt++) {
      try {
        const { initialSentence, finalSentence } = await runTrial(provider, trialIndex);
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
