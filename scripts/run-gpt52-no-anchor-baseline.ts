#!/usr/bin/env npx tsx
// @ts-nocheck
/**
 * GPT-5.2 No-Anchor Baseline at temp=0
 * Uses OpenRouter via pi-ai
 */
import { appendFile } from 'node:fs/promises';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';
import { createProvider, parseModelSpec, type LlmProvider } from '../src/llm/provider.js';

const RUNS = 30;
const DELAY_MS = 1500;
const OUTPUT_FILE = 'results/gpt52-no-anchor-temp0.jsonl';
const MODEL = 'openrouter/openai/gpt-4o';  // GPT-5.2 equivalent

const noAnchorPrompt = `${anchoringProsecutorSentencingCaseVignette}

What sentence (in months of probation) do you recommend for the defendant?

Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "reasoning": "<brief>"}`;

interface SentenceResponse {
  sentenceMonths: number;
  reasoning?: string;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTrial(provider: LlmProvider, runIndex: number): Promise<number> {
  const result = await provider.sendJson<SentenceResponse>({
    prompt: noAnchorPrompt,
    systemPrompt: 'You are an experienced trial judge. Respond only with valid JSON.'
  });
  return result.parsed.sentenceMonths;
}

async function main() {
  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec, 0);  // temp=0
  
  const results: number[] = [];
  
  console.log(`Running ${MODEL} no-anchor at temp=0...`);
  
  for (let i = 0; i < RUNS; i++) {
    try {
      const sentence = await runTrial(provider, i);
      results.push(sentence);
      process.stdout.write(`[${i+1}/${RUNS}] ${sentence}mo    `);
      
      const record = {
        model: MODEL,
        condition: 'no-anchor',
        temperature: 0,
        runIndex: i,
        sentenceMonths: sentence,
        timestamp: new Date().toISOString()
      };
      await appendFile(OUTPUT_FILE, JSON.stringify(record) + '\n');
    } catch (err) {
      console.error(`\nError on trial ${i}:`, err);
    }
    await delay(DELAY_MS);
  }
  
  const mean = results.reduce((a, b) => a + b, 0) / results.length;
  const sd = Math.sqrt(results.map(x => (x - mean) ** 2).reduce((a, b) => a + b, 0) / results.length);
  
  console.log(`\n\nResults: mean=${mean.toFixed(1)}, SD=${sd.toFixed(2)}, n=${results.length}`);
}

main().catch(console.error);
