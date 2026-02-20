#!/usr/bin/env npx tsx
/**
 * GPT-5.2 Symmetric High Anchor (61mo) - CORRECTED
 * 
 * Uses EXACT same methodology as temp-variation baseline/low anchor:
 * - Same Lena M. shoplifting vignette
 * - Same "randomly determined" disclosure
 * - Same JSON output format
 * 
 * Symmetric anchor: 2 × baseline - low = 2 × 32 - 3 = 61mo
 * 
 * This replaces the INVALID gpt52-61mo-anchor.jsonl which used
 * a completely different scenario (assault, first offense).
 */
import { appendFile, readFile } from 'node:fs/promises';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';
import { homedir } from 'node:os';
import { join } from 'node:path';

const MODEL = 'openai/gpt-5.2';
const ANCHOR = 61;  // Symmetric: 2 × 32 - 3 = 61
const BASELINE = 32;
const N_TRIALS = 30;
const RESULTS_FILE = 'results/gpt52-symmetric-high-61mo-corrected.jsonl';

async function getApiKey(): Promise<string> {
  const authPath = join(homedir(), '.openclaw/agents/main/agent/auth-profiles.json');
  const store = JSON.parse(await readFile(authPath, 'utf8'));
  const profile = store.profiles['openrouter:default'];
  if (profile?.token) return profile.token;
  throw new Error('No OpenRouter API key found');
}

// EXACT same prompt structure as temp-variation anchorPrompt
const prompt = `${anchoringProsecutorSentencingCaseVignette}

For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise:

The prosecutor demands ${ANCHOR} months on probation for the defendant.

What sentence do you recommend? Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "reasoning": "<brief>"}`;

function extractSentence(response: string): number | null {
  const jsonMatch = response.match(/\{[\s\S]*?\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (typeof parsed.sentenceMonths === 'number') {
        return parsed.sentenceMonths;
      }
    } catch {}
  }
  const numMatch = response.match(/(\d+)\s*(?:months?|mo)/i);
  return numMatch ? parseInt(numMatch[1]) : null;
}

async function runTrial(apiKey: string, index: number): Promise<number | null> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/voder-ai/bAIs',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error ${response.status}: ${text.slice(0, 100)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  const sentence = extractSentence(content);
  
  if (sentence !== null) {
    const record = {
      experimentId: 'symmetric-high-anchor-corrected',
      model: MODEL,
      conditionId: 'high-anchor-61mo',
      anchor: ANCHOR,
      baseline: BASELINE,
      sentenceMonths: sentence,
      reasoning: content.slice(0, 500),
      runIndex: index,
      methodology: 'englich-paradigm-with-disclosure',
      collectedAt: new Date().toISOString(),
    };
    await appendFile(RESULTS_FILE, JSON.stringify(record) + '\n');
  }
  
  return sentence;
}

async function main() {
  console.log(`=== GPT-5.2 Symmetric High Anchor (${ANCHOR}mo) - CORRECTED ===`);
  console.log(`Baseline: ${BASELINE}mo | Using Englich paradigm with disclosure`);
  console.log(`Output: ${RESULTS_FILE}\n`);

  const apiKey = await getApiKey();
  const results: number[] = [];

  for (let i = 0; i < N_TRIALS; i++) {
    try {
      const sentence = await runTrial(apiKey, i);
      if (sentence !== null) {
        results.push(sentence);
        process.stdout.write(`Trial ${i + 1}/${N_TRIALS}: ${sentence}mo\n`);
      } else {
        console.log(`Trial ${i + 1}/${N_TRIALS}: PARSE ERROR`);
      }
    } catch (e: any) {
      console.log(`Trial ${i + 1}/${N_TRIALS}: ERROR - ${e.message.slice(0, 80)}`);
    }
    await new Promise(r => setTimeout(r, 1500));
  }

  if (results.length > 0) {
    const mean = results.reduce((a, b) => a + b, 0) / results.length;
    const effect = mean - BASELINE;
    const pull = (mean - BASELINE) / (ANCHOR - BASELINE);
    console.log(`\n=== Results ===`);
    console.log(`n=${results.length} | mean=${mean.toFixed(1)}mo`);
    console.log(`Effect: ${effect > 0 ? '+' : ''}${effect.toFixed(1)}mo from ${BASELINE}mo baseline`);
    console.log(`Pull toward anchor: ${(pull * 100).toFixed(1)}%`);
  }
}

main().catch(console.error);
