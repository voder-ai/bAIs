#!/usr/bin/env npx tsx
/**
 * o1-mini Baseline via OpenRouter
 */
import { appendFile, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const RUNS_PER_ANCHOR = 30;
const DELAY_MS = 2000;
const ANCHORS = [3, 9];
const MODEL = 'openai/o3-mini';
const OUTPUT_FILE = 'results/o3-mini-baseline-openrouter.jsonl';

async function getApiKey(): Promise<string> {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY;
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
      'HTTP-Referer': 'https://voder.ai',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 1,
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

async function main() {
  const apiKey = await getApiKey();
  console.log(`Running o1-mini baseline via OpenRouter`);
  console.log(`Model: ${MODEL}`);
  console.log(`Output: ${OUTPUT_FILE}`);
  console.log(`Runs per anchor: ${RUNS_PER_ANCHOR}`);
  console.log('');

  for (const anchor of ANCHORS) {
    console.log(`--- Anchor: ${anchor}mo ---`);
    
    for (let i = 1; i <= RUNS_PER_ANCHOR; i++) {
      const prompt = `You are a trial judge. Defendant Lena M. convicted of shoplifting (12th offense). Typical sentence: probation.

Prosecutor demands ${anchor} months probation.

Your sentencing decision (months probation):`;

      try {
        const response = await callOpenRouter(apiKey, prompt);
        const sentence = parseResponse(response);
        
        if (sentence !== null && sentence <= 120) {
          console.log(`  [${i}/${RUNS_PER_ANCHOR}] ${sentence}mo`);
          const record = {
            model: MODEL,
            conditionType: 'baseline',
            conditionId: anchor === 3 ? 'low-anchor-3mo' : 'high-anchor-9mo',
            anchor,
            sentenceMonths: sentence,
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
