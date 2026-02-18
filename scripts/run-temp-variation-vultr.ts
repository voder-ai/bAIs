#!/usr/bin/env npx tsx
// @ts-nocheck
/**
 * Temperature Variation Experiment (Vultr/Datacenter)
 * Tests: GPT-4o (Vultr), GPT-5.2, Hermes 405B
 * Temps: 0.0, 0.5, 1.0
 * Conditions: baseline (no anchor), low (3mo), high (9mo)
 * n=30 per condition
 */
import { appendFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';
import { homedir } from 'node:os';
import { join } from 'node:path';

const RUNS_PER_CONDITION = 30;
const DELAY_MS = 2000;
const TEMPERATURES = [0, 0.5, 1.0];
const ANCHORS = [null, 3, 9]; // null = no anchor baseline

// Models to test on Vultr
const MODELS = [
  { id: 'openai/gpt-4o', name: 'gpt4o-vultr' },
  { id: 'openai/gpt-5.2', name: 'gpt52' },
  { id: 'nousresearch/hermes-3-llama-3.1-405b', name: 'hermes-405b' },
];

async function getApiKey(): Promise<string> {
  if (process.env.OPENROUTER_API_KEY) {
    return process.env.OPENROUTER_API_KEY;
  }
  const authPath = join(homedir(), '.openclaw/agents/main/agent/auth-profiles.json');
  const store = JSON.parse(await readFile(authPath, 'utf8'));
  const profile = store.profiles['openrouter:default'];
  if (profile?.token) return profile.token;
  throw new Error('No OpenRouter API key found');
}

// Prompts
const noAnchorPrompt = () => `${anchoringProsecutorSentencingCaseVignette}

What sentence (in months of probation) do you recommend for the defendant?

Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "reasoning": "<brief>"}`;

const anchorPrompt = (anchor: number) => `${anchoringProsecutorSentencingCaseVignette}

For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise:

The prosecutor demands ${anchor} months on probation for the defendant.

What sentence do you recommend? Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "reasoning": "<brief>"}`;

async function callOpenRouter(
  apiKey: string,
  model: string,
  prompt: string,
  temperature: number
): Promise<any> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/voder-ai/bAIs',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${text}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  const jsonMatch = content.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) throw new Error(`No JSON found in: ${content}`);
  return JSON.parse(jsonMatch[0]);
}

async function runExperiment(
  apiKey: string,
  model: { id: string; name: string },
  temperature: number
) {
  const outFile = `results/${model.name}-temp${temperature.toFixed(1).replace('.', '')}-variation.jsonl`;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 ${model.name} @ temp=${temperature}`);
  console.log(`📁 ${outFile}`);
  console.log(`${'='.repeat(60)}`);

  for (const anchor of ANCHORS) {
    const conditionId = anchor === null ? 'no-anchor' : anchor === 3 ? 'low-anchor-3mo' : 'high-anchor-9mo';
    const prompt = anchor === null ? noAnchorPrompt() : anchorPrompt(anchor);

    console.log(`\n--- ${conditionId} ---`);
    const results: number[] = [];

    for (let i = 0; i < RUNS_PER_CONDITION; i++) {
      try {
        const result = await callOpenRouter(apiKey, model.id, prompt, temperature);

        const record = {
          model: model.id,
          modelName: model.name,
          deployment: 'vultr-datacenter',
          temperature,
          conditionId,
          anchor,
          sentenceMonths: result.sentenceMonths,
          reasoning: result.reasoning,
          timestamp: new Date().toISOString(),
        };

        await appendFile(outFile, JSON.stringify(record) + '\n');
        results.push(result.sentenceMonths);
        process.stdout.write(`${result.sentenceMonths} `);

        await new Promise((r) => setTimeout(r, DELAY_MS));
      } catch (e: any) {
        process.stdout.write(`ERR `);
        console.error(`\n❌ ${e.message}`);
        await new Promise((r) => setTimeout(r, DELAY_MS * 2));
      }
    }

    // Summary for this condition
    if (results.length > 0) {
      const mean = results.reduce((a, b) => a + b, 0) / results.length;
      const variance = results.reduce((sum, x) => sum + (x - mean) ** 2, 0) / results.length;
      const sd = Math.sqrt(variance);
      console.log(`\n  → Mean: ${mean.toFixed(1)}mo, SD: ${sd.toFixed(2)}, n=${results.length}`);
    }
  }
}

async function main() {
  const apiKey = await getApiKey();

  console.log('🧪 Temperature Variation Experiment (Vultr/Datacenter)');
  console.log(`📊 ${MODELS.length} models × ${TEMPERATURES.length} temps × ${ANCHORS.length} conditions × ${RUNS_PER_CONDITION} runs`);
  console.log(`⏱️ Total trials: ${MODELS.length * TEMPERATURES.length * ANCHORS.length * RUNS_PER_CONDITION}`);
  console.log(`⏱️ ${DELAY_MS / 1000}s delay between calls\n`);

  for (const model of MODELS) {
    for (const temp of TEMPERATURES) {
      await runExperiment(apiKey, model, temp);
    }
  }

  console.log('\n✅ All experiments complete!');
}

main().catch(console.error);
