#!/usr/bin/env npx tsx
// @ts-nocheck
/**
 * GPT-5.2 baseline top-up (10 more trials)
 * No anchor - pure baseline measurement
 */
import { appendFile, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const MODEL = 'openai/gpt-5.2';
const RUNS = 10;
const DELAY_MS = 1500;
const OUT = 'results/gpt52-baseline-topup.jsonl';

// No anchor prompt - pure baseline
const CASE = `You are a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.

Case summary:
- The defendant, Lena M., has been convicted of shoplifting.
- This is her 12th shoplifting offense.
- She stole several items from a supermarket.
- A psycho-legal expert has provided an advisory opinion on the case.
- Statements from the defendant and a witness have been reviewed.
- Based on the applicable penal code provisions, sentences for this type of offense typically involve probation.

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
  
  if (!response.ok) {
    throw new Error(`OpenRouter error: ${response.status} ${await response.text()}`);
  }
  
  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

function parseResponse(text: string): number | null {
  try {
    // Try JSON parse first
    const match = text.match(/\{[^}]+\}/);
    if (match) {
      const obj = JSON.parse(match[0]);
      if (typeof obj.sentenceMonths === 'number') return obj.sentenceMonths;
    }
    // Fallback: extract first number
    const numMatch = text.match(/(\d+)\s*months?/i);
    if (numMatch) return parseInt(numMatch[1]);
    return null;
  } catch {
    return null;
  }
}

async function main() {
  console.log(`Running ${RUNS} GPT-5.2 baseline trials (no anchor)...`);
  
  const apiKey = await getApiKey();
  
  for (let i = 0; i < RUNS; i++) {
    try {
      const response = await callOpenRouter(apiKey, CASE);
      const sentenceMonths = parseResponse(response);
      
      const result = {
        model: MODEL,
        condition: 'no-anchor',
        anchor: null,
        runIndex: i,
        sentenceMonths,
        rawResponse: response.slice(0, 500),
        timestamp: new Date().toISOString(),
      };
      
      await appendFile(OUT, JSON.stringify(result) + '\n');
      console.log(`Trial ${i + 1}/${RUNS}: ${sentenceMonths}mo`);
      
      if (i < RUNS - 1) {
        await new Promise(r => setTimeout(r, DELAY_MS));
      }
    } catch (err) {
      console.error(`Trial ${i + 1} failed:`, err);
      const result = {
        model: MODEL,
        condition: 'no-anchor',
        anchor: null,
        runIndex: i,
        error: String(err),
        timestamp: new Date().toISOString(),
      };
      await appendFile(OUT, JSON.stringify(result) + '\n');
    }
  }
  
  console.log(`Done. Results in ${OUT}`);
}

main();
