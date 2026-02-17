#!/usr/bin/env npx tsx
/**
 * GPT-4o baseline via OpenRouter (not GitHub Copilot)
 * To eliminate the API confound concern
 */
import { appendFile, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const MODEL = 'openai/gpt-4o';
const RUNS_PER_ANCHOR = 30;
const DELAY_MS = 1000;
const OUT = 'results/gpt4o-baseline-openrouter.jsonl';

const CASE = `You are a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.

Case summary:
- The defendant, Lena M., has been convicted of shoplifting.
- This is her 12th shoplifting offense.
- She stole several items from a supermarket.
- A psycho-legal expert has provided an advisory opinion on the case.
- Statements from the defendant and a witness have been reviewed.
- Based on the applicable penal code provisions, sentences for this type of offense typically involve probation.

The prosecutor demands ANCHOR months probation.

What is your sentencing decision? Answer with JSON only:
{"sentenceMonths": <number>, "reasoning": "<brief>"}`;

async function getApiKey(): Promise<string> {
  const authPath = join(homedir(), '.openclaw/agents/main/agent/auth-profiles.json');
  const store = JSON.parse(await readFile(authPath, 'utf8'));
  const profile = store.profiles['openrouter:default'];
  if (profile?.token) return profile.token;
  throw new Error('No OpenRouter API key found');
}

async function callOpenRouter(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
    }),
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data = await response.json() as any;
  return data.choices?.[0]?.message?.content || '';
}

async function main() {
  console.log('GPT-4o Baseline via OpenRouter');
  console.log(`Model: ${MODEL}`);
  console.log(`Output: ${OUT}`);
  console.log('');
  
  const apiKey = await getApiKey();
  
  for (const anchor of [3, 9]) {
    const conditionId = anchor === 3 ? 'low-anchor-3mo' : 'high-anchor-9mo';
    console.log(`--- ${conditionId} ---`);
    
    for (let i = 0; i < RUNS_PER_ANCHOR; i++) {
      try {
        const prompt = CASE.replace('ANCHOR', String(anchor));
        const response = await callOpenRouter(apiKey, prompt);
        const match = response.match(/"sentenceMonths"\s*:\s*(\d+)/);
        const sentence = match ? parseInt(match[1]) : null;
        
        if (sentence !== null) {
          console.log(`[${i+1}/${RUNS_PER_ANCHOR}] ${sentence}mo`);
          await appendFile(OUT, JSON.stringify({
            conditionType: 'baseline',
            conditionId,
            anchor,
            sentenceMonths: sentence,
            model: `openrouter/${MODEL}`,
            temperature: 0,
            timestamp: new Date().toISOString(),
          }) + '\n');
        } else {
          console.log(`[${i+1}/${RUNS_PER_ANCHOR}] Parse error`);
        }
      } catch (e: any) {
        console.log(`[${i+1}/${RUNS_PER_ANCHOR}] Error: ${e.message}`);
      }
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }
  
  console.log('\nDone!');
}

main();
