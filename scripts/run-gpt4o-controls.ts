#!/usr/bin/env npx tsx
/**
 * GPT-4o Controls (3-turn-random + token-matched) via OpenRouter
 */
import { appendFile, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const RUNS_PER_CONDITION = 15;
const DELAY_MS = 2000;
const ANCHORS = [3, 9];
const MODEL = 'openai/gpt-4o';
const OUTPUT_FILE = 'results/gpt4o-controls-openrouter.jsonl';

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

// 3-turn-random control
async function run3TurnRandom(apiKey: string, anchor: number): Promise<number | null> {
  const messages = [
    { role: 'user', content: 'What is the capital of France?' },
    { role: 'assistant', content: 'The capital of France is Paris.' },
    { role: 'user', content: 'Name three types of clouds.' },
    { role: 'assistant', content: 'Three types of clouds are: cumulus, stratus, and cirrus.' },
    { role: 'user', content: `You are a trial judge. Defendant Lena M. convicted of shoplifting (12th offense). Typical sentence: probation. Prosecutor demands ${anchor} months probation. Your sentencing decision (respond with just the number of months):` }
  ];
  const response = await callOpenRouter(apiKey, messages);
  return parseResponse(response);
}

// Token-matched control
async function runTokenMatched(apiKey: string, anchor: number): Promise<number | null> {
  const prompt = `You are a trial judge. Please note the following procedural information for the record:

This case was filed on a Tuesday. The defendant's attorney graduated from law school in 2015. The courtroom has been recently renovated with new lighting fixtures.

Defendant Lena M. convicted of shoplifting (12th offense). Typical sentence: probation.
Prosecutor demands ${anchor} months probation.

Your sentencing decision (respond with just the number of months):`;

  const response = await callOpenRouter(apiKey, [{ role: 'user', content: prompt }]);
  return parseResponse(response);
}

async function main() {
  const apiKey = await getApiKey();
  console.log(`Running GPT-4o controls via OpenRouter`);
  console.log(`Model: ${MODEL}`);
  console.log(`Output: ${OUTPUT_FILE}`);
  console.log('');

  // 3-turn-random control
  for (const anchor of ANCHORS) {
    console.log(`--- 3-turn-random, Anchor: ${anchor}mo ---`);
    
    for (let i = 1; i <= RUNS_PER_CONDITION; i++) {
      try {
        const sentence = await run3TurnRandom(apiKey, anchor);
        
        if (sentence !== null && sentence <= 120) {
          console.log(`  [${i}/${RUNS_PER_CONDITION}] ${sentence}mo`);
          const record = {
            model: MODEL,
            control: '3-turn-random',
            conditionId: anchor === 3 ? 'low-anchor-3mo' : 'high-anchor-9mo',
            anchor,
            sentenceMonths: sentence,
            timestamp: new Date().toISOString(),
          };
          await appendFile(OUTPUT_FILE, JSON.stringify(record) + '\n');
        } else {
          console.log(`  [${i}/${RUNS_PER_CONDITION}] ERROR: Could not parse`);
        }
      } catch (err: any) {
        console.log(`  [${i}/${RUNS_PER_CONDITION}] ERROR: ${err.message}`);
      }

      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  // Token-matched control
  for (const anchor of ANCHORS) {
    console.log(`--- token-matched, Anchor: ${anchor}mo ---`);
    
    for (let i = 1; i <= RUNS_PER_CONDITION; i++) {
      try {
        const sentence = await runTokenMatched(apiKey, anchor);
        
        if (sentence !== null && sentence <= 120) {
          console.log(`  [${i}/${RUNS_PER_CONDITION}] ${sentence}mo`);
          const record = {
            model: MODEL,
            control: 'token-matched',
            conditionId: anchor === 3 ? 'low-anchor-3mo' : 'high-anchor-9mo',
            anchor,
            sentenceMonths: sentence,
            timestamp: new Date().toISOString(),
          };
          await appendFile(OUTPUT_FILE, JSON.stringify(record) + '\n');
        } else {
          console.log(`  [${i}/${RUNS_PER_CONDITION}] ERROR: Could not parse`);
        }
      } catch (err: any) {
        console.log(`  [${i}/${RUNS_PER_CONDITION}] ERROR: ${err.message}`);
      }

      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  console.log('\\nDone!');
}

main().catch(console.error);
