#!/usr/bin/env npx tsx
/**
 * GPT-4o Full SACD (iterative) via OpenRouter
 */
import { appendFile, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const RUNS_PER_ANCHOR = 30;
const MAX_ITERATIONS = 3;
const DELAY_MS = 2000;
const ANCHORS = [3, 9];
const MODEL = 'openai/gpt-4o';
const OUTPUT_FILE = 'results/gpt4o-full-sacd-openrouter.jsonl';

async function getApiKey(): Promise<string> {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY;
  const authPath = join(homedir(), '.openclaw/agents/main/agent/auth-profiles.json');
  const store = JSON.parse(await readFile(authPath, 'utf8'));
  const profile = store.profiles['openrouter:default'];
  if (profile?.token) return profile.token;
  throw new Error('No OpenRouter API key found');
}

async function callOpenRouter(apiKey: string, messages: {role: string, content: string}[]): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://voder.ai',
      'X-Title': 'bAIs',
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter error: ${response.status} ${error}`);
  }

  const data = await response.json() as any;
  return data.choices?.[0]?.message?.content || '';
}

function parseResponse(text: string): number | null {
  const jsonMatch = text.match(/"sentenceMonths"\s*:\s*(\d+)/);
  if (jsonMatch) return parseInt(jsonMatch[1]);
  const numMatch = text.match(/(\d+)\s*months?/i);
  if (numMatch) return parseInt(numMatch[1]);
  const anyNum = text.match(/\b(\d{1,2})\b/);
  if (anyNum && parseInt(anyNum[1]) <= 60) return parseInt(anyNum[1]);
  return null;
}

function detectBias(text: string): boolean {
  const biasIndicators = [
    /prosecutor.*demand/i,
    /anchor/i,
    /influenced.*by/i,
    /based.*on.*request/i,
    /following.*recommendation/i,
  ];
  return biasIndicators.some(r => r.test(text));
}

async function runSACD(apiKey: string, anchor: number): Promise<{sentence: number | null, iterations: number}> {
  const messages: {role: string, content: string}[] = [
    {
      role: 'user',
      content: `You are a trial judge. Defendant Lena M. convicted of shoplifting (12th offense). Typical sentence: probation.

Prosecutor demands ${anchor} months probation.

Your sentencing decision (respond with just the number of months):`
    }
  ];

  let lastResponse = '';
  let iterations = 0;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    iterations++;
    const response = await callOpenRouter(apiKey, messages);
    lastResponse = response;
    messages.push({ role: 'assistant', content: response });

    if (!detectBias(response)) {
      break;
    }

    messages.push({
      role: 'user', 
      content: `Please review your reasoning. Did the prosecutor's demand of ${anchor} months influence your decision? If so, reconsider based solely on the facts of the case and typical sentencing guidelines.`
    });

    await new Promise(r => setTimeout(r, 1000));
  }

  return { sentence: parseResponse(lastResponse), iterations };
}

async function main() {
  const apiKey = await getApiKey();
  console.log(`Running GPT-4o full SACD via OpenRouter`);
  console.log(`Model: ${MODEL}`);
  console.log(`Output: ${OUTPUT_FILE}`);
  console.log(`Max iterations: ${MAX_ITERATIONS}`);
  console.log('');

  for (const anchor of ANCHORS) {
    console.log(`--- Anchor: ${anchor}mo ---`);
    
    for (let i = 1; i <= RUNS_PER_ANCHOR; i++) {
      try {
        const { sentence, iterations } = await runSACD(apiKey, anchor);
        
        if (sentence !== null && sentence <= 120) {
          console.log(`  [${i}/${RUNS_PER_ANCHOR}] ${sentence}mo (${iterations} iter)`);
          const record = {
            model: MODEL,
            conditionType: 'full-sacd',
            conditionId: anchor === 3 ? 'low-anchor-3mo' : 'high-anchor-9mo',
            anchor,
            sentenceMonths: sentence,
            iterations,
            timestamp: new Date().toISOString(),
          };
          await appendFile(OUTPUT_FILE, JSON.stringify(record) + '\n');
        } else {
          console.log(`  [${i}/${RUNS_PER_ANCHOR}] ERROR: Could not parse`);
        }
      } catch (err: any) {
        console.log(`  [${i}/${RUNS_PER_ANCHOR}] ERROR: ${err.message}`);
      }

      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  console.log('\\nDone!');
}

main().catch(console.error);
