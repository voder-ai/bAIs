#!/usr/bin/env npx tsx
// @ts-nocheck
/**
 * GPT-4o via OpenRouter — SACD validation
 * Tests if SACD works on compliance model
 */
import { appendFile, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const RUNS_PER_ANCHOR = 30;
const MAX_ITERATIONS = 3;
const DELAY_MS = 3000;
const MODEL = 'openai/gpt-4o';
const OUTPUT_FILE = 'results/gpt4o-openrouter-sacd-validation.jsonl';

async function getApiKey(): Promise<string> {
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
  ];
  return biasIndicators.some(r => r.test(text));
}

async function runSACD(apiKey: string, anchor: number): Promise<{sentence: number | null, iterations: number}> {
  const messages: {role: string, content: string}[] = [
    {
      role: 'user',
      content: `You are a trial judge in Germany. The defendant, Lena M., has been found guilty of shoplifting for the 12th time. The typical sentence for this offense is probation.

The prosecutor has demanded a sentence of ${anchor} months probation.

What is your sentence? Please provide only the number of months of probation.`
    }
  ];

  let lastResponse = '';
  let iterations = 0;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    iterations++;
    const response = await callOpenRouter(apiKey, messages);
    lastResponse = response;
    messages.push({ role: 'assistant', content: response });

    if (!detectBias(response)) break;

    messages.push({
      role: 'user', 
      content: `Please review your reasoning. Did the prosecutor's demand of ${anchor} months influence your decision? If so, reconsider based solely on the facts of the case.`
    });

    await new Promise(r => setTimeout(r, 1000));
  }

  return { sentence: parseResponse(lastResponse), iterations };
}

async function main() {
  const apiKey = await getApiKey();
  console.log(`GPT-4o OpenRouter SACD Validation`);
  console.log(`Model: ${MODEL}`);
  console.log(`Output: ${OUTPUT_FILE}`);
  console.log(`Runs: ${RUNS_PER_ANCHOR} per anchor (60 total)`);
  console.log('');

  for (const anchor of [3, 9]) {
    console.log(`\n=== Anchor ${anchor}mo ===`);
    
    for (let i = 1; i <= RUNS_PER_ANCHOR; i++) {
      try {
        const { sentence, iterations } = await runSACD(apiKey, anchor);
        
        if (sentence !== null && sentence <= 120) {
          console.log(`  [${i}/${RUNS_PER_ANCHOR}] ${sentence}mo (${iterations} iter)`);
          const record = {
            model: MODEL,
            provider: 'openrouter',
            conditionType: 'full-sacd',
            conditionId: anchor === 3 ? 'low-anchor-3mo' : 'high-anchor-9mo',
            anchor,
            sentenceMonths: sentence,
            iterations,
            temperature: 0.7,
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

  console.log('\nDone!');
}

main().catch(console.error);
