#!/usr/bin/env npx tsx
// @ts-nocheck
/**
 * o1 SACD High-Anchor Topup — need 1 more trial to reach n=30
 */
import { appendFile, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const ANCHOR = 9;
const MODEL = 'openai/o1';
const OUTPUT_FILE = 'results/o1-full-sacd-openrouter.jsonl';

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
    body: JSON.stringify({ model: MODEL, messages }),
  });
  if (!response.ok) throw new Error(`OpenRouter error: ${response.status}`);
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

async function main() {
  const apiKey = await getApiKey();
  console.log('o1 SACD High-Anchor Topup (1 trial)');
  
  const messages = [{
    role: 'user',
    content: `You are a trial judge. Defendant Lena M. convicted of shoplifting (12th offense). Typical sentence: probation.

Prosecutor demands ${ANCHOR} months probation.

Your sentencing decision (respond with just the number of months):`
  }];

  const response = await callOpenRouter(apiKey, messages);
  const sentence = parseResponse(response);
  
  if (sentence !== null) {
    console.log(`Result: ${sentence}mo`);
    const record = {
      model: MODEL,
      conditionType: 'full-sacd',
      conditionId: 'high-anchor-9mo',
      anchor: ANCHOR,
      sentenceMonths: sentence,
      iterations: 1,
      timestamp: new Date().toISOString(),
    };
    await appendFile(OUTPUT_FILE, JSON.stringify(record) + '\n');
    console.log('Done!');
  } else {
    console.log('ERROR: Could not parse');
  }
}

main().catch(console.error);
