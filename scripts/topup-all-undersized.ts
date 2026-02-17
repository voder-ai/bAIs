#!/usr/bin/env npx tsx
// @ts-nocheck
/**
 * Top up all undersized experiments to n=30 per anchor
 */
import { appendFile, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DELAY_MS = 2000;

async function getApiKey(): Promise<string> {
  const authPath = join(homedir(), '.openclaw/agents/main/agent/auth-profiles.json');
  const store = JSON.parse(await readFile(authPath, 'utf8'));
  const profile = store.profiles['openrouter:default'];
  if (profile?.token) return profile.token;
  throw new Error('No OpenRouter API key found');
}

async function callOpenRouter(apiKey: string, model: string, prompt: string): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
    }),
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data = await response.json() as any;
  return data.choices?.[0]?.message?.content || '';
}

const CASE = `You are a trial judge. The defendant, Lena M., has been convicted of shoplifting (12th offense). Typical sentence: probation.

Prosecutor demands ANCHOR months probation.

Your sentencing decision (respond with JSON only):
{"sentenceMonths": <number>, "reasoning": "<brief>"}`;

interface TopupConfig {
  model: string;
  outFile: string;
  lowNeeded: number;
  highNeeded: number;
  conditionType: string;
}

const TOPUPS: TopupConfig[] = [
  {
    model: 'minimax/minimax-m2.5',
    outFile: 'results/minimax-m25-full-sacd-openrouter.jsonl',
    lowNeeded: 3,
    highNeeded: 2,
    conditionType: 'full-sacd',
  },
  {
    model: 'openai/o3-mini',
    outFile: 'results/o3-mini-full-sacd-openrouter.jsonl',
    lowNeeded: 2,
    highNeeded: 1,
    conditionType: 'full-sacd',
  },
  {
    model: 'openai/o1',
    outFile: 'results/o1-baseline-openrouter.jsonl',
    lowNeeded: 6,
    highNeeded: 2,
    conditionType: 'baseline',
  },
];

async function runTopup(apiKey: string, config: TopupConfig) {
  console.log(`\n=== ${config.model} (${config.conditionType}) ===`);
  
  for (const [anchor, needed] of [[3, config.lowNeeded], [9, config.highNeeded]] as const) {
    if (needed <= 0) continue;
    const conditionId = anchor === 3 ? 'low-anchor-3mo' : 'high-anchor-9mo';
    console.log(`  ${conditionId}: +${needed} trials`);
    
    for (let i = 0; i < needed; i++) {
      try {
        const prompt = CASE.replace('ANCHOR', String(anchor));
        const response = await callOpenRouter(apiKey, config.model, prompt);
        const match = response.match(/"sentenceMonths"\s*:\s*(\d+)/);
        const sentence = match ? parseInt(match[1]) : null;
        
        if (sentence !== null) {
          console.log(`    [${i+1}/${needed}] ${sentence}mo`);
          await appendFile(config.outFile, JSON.stringify({
            conditionType: config.conditionType,
            conditionId,
            anchor,
            sentenceMonths: sentence,
            model: config.model,
            timestamp: new Date().toISOString(),
            topup: true,
          }) + '\n');
        } else {
          console.log(`    [${i+1}/${needed}] Parse error`);
        }
      } catch (e: any) {
        console.log(`    [${i+1}/${needed}] Error: ${e.message}`);
      }
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }
}

async function main() {
  console.log('=== TOPUP ALL UNDERSIZED EXPERIMENTS ===');
  const apiKey = await getApiKey();
  
  for (const config of TOPUPS) {
    await runTopup(apiKey, config);
  }
  
  console.log('\n=== ALL TOPUPS COMPLETE ===');
}

main();
