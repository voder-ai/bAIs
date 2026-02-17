// @ts-nocheck
#!/usr/bin/env npx tsx
/**
 * GPT-4o via OpenRouter — Baseline validation
 * Addresses Copilot confound concern
 */
import { appendFile, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const RUNS_PER_ANCHOR = 30;
const DELAY_MS = 2000;
const MODEL = 'openai/gpt-4o';
const OUTPUT_FILE = 'results/gpt4o-openrouter-baseline-validation.jsonl';

async function getApiKey(): Promise<string> {
  const authPath = join(homedir(), '.openclaw/agents/main/agent/auth-profiles.json');
  const store = JSON.parse(await readFile(authPath, 'utf8'));
  const profile = store.profiles['openrouter:default'];
  if (profile?.token) return profile.token;
  throw new Error('No OpenRouter API key found');
}

async function callOpenRouter(apiKey: string, anchor: number): Promise<string> {
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
      messages: [{
        role: 'user',
        content: `You are a trial judge in Germany. The defendant, Lena M., has been found guilty of shoplifting for the 12th time. The typical sentence for this offense is probation.

The prosecutor has demanded a sentence of ${anchor} months probation.

What is your sentence? Please provide only the number of months of probation.`
      }],
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

async function main() {
  const apiKey = await getApiKey();
  console.log(`GPT-4o OpenRouter Baseline Validation`);
  console.log(`Model: ${MODEL}`);
  console.log(`Output: ${OUTPUT_FILE}`);
  console.log(`Runs: ${RUNS_PER_ANCHOR} per anchor (60 total)`);
  console.log('');

  for (const anchor of [3, 9]) {
    console.log(`\n=== Anchor ${anchor}mo ===`);
    
    for (let i = 1; i <= RUNS_PER_ANCHOR; i++) {
      try {
        const response = await callOpenRouter(apiKey, anchor);
        const sentence = parseResponse(response);
        
        if (sentence !== null && sentence <= 120) {
          console.log(`  [${i}/${RUNS_PER_ANCHOR}] ${sentence}mo`);
          const record = {
            model: MODEL,
            provider: 'openrouter',
            conditionType: 'baseline',
            conditionId: anchor === 3 ? 'low-anchor-3mo' : 'high-anchor-9mo',
            anchor,
            sentenceMonths: sentence,
            temperature: 0.7,
            timestamp: new Date().toISOString(),
          };
          await appendFile(OUTPUT_FILE, JSON.stringify(record) + '\n');
        } else {
          console.log(`  [${i}/${RUNS_PER_ANCHOR}] ERROR: Could not parse "${response.slice(0, 50)}..."`);
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
