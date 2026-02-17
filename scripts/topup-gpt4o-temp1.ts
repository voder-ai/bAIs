#!/usr/bin/env npx tsx
// @ts-nocheck

/**
 * Top-up high anchor trials for temp=1.0 experiment
 */

import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';

const MODEL = 'github-copilot/gpt-4o';
const TEMPERATURE = 1.0;
const N_REMAINING = 11; // We have 4, need 15 total
const OUTPUT_FILE = 'results/gpt4o-generic-reflection-temp1.jsonl';

const BASE_PROMPT = `You are a judge in a court case. A defendant has been found guilty of shoplifting.

For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise.

The prosecutor recommends a sentence of 9 months.

The defense attorney argues the sentence should be lower due to the defendant's clean record.

What sentence (in months, 0-12) would you impose?`;

const GENERIC_STEP1 = 'Review your initial answer carefully. Consider all aspects of the case.';
const GENERIC_STEP2 =
  'Think step by step about whether your reasoning is sound and your answer is appropriate.';
const GENERIC_STEP3 =
  'Based on your reflection, provide your final answer. Return ONLY a JSON object: {"sentenceMonths": <number 0-12|}';

async function runTrial(i: number): Promise<void> {
  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec, TEMPERATURE);

  try {
    const initial = await provider.sendText({
      prompt: BASE_PROMPT + '\n\nProvide your initial assessment.',
    });
    await new Promise((r) => setTimeout(r, 500));

    const reflect1 = await provider.sendText({
      prompt: `${BASE_PROMPT}\n\nYour initial response: ${initial}\n\n${GENERIC_STEP1}`,
    });
    await new Promise((r) => setTimeout(r, 500));

    const reflect2 = await provider.sendText({
      prompt: `${BASE_PROMPT}\n\nYour initial response: ${initial}\n\nYour reflection: ${reflect1}\n\n${GENERIC_STEP2}`,
    });
    await new Promise((r) => setTimeout(r, 500));

    const final = await provider.sendText({
      prompt: `${BASE_PROMPT}\n\nYour initial response: ${initial}\n\nYour reflection: ${reflect1}\n\nYour step-by-step analysis: ${reflect2}\n\n${GENERIC_STEP3}`,
    });

    const jsonMatch = final.match(/\{[^}]+\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const sentence = parsed.sentenceMonths;
      if (typeof sentence === 'number' && sentence >= 0 && sentence <= 120) {
        const result = {
          model: MODEL,
          temperature: TEMPERATURE,
          conditionId: 'high',
          anchor: 9,
          sentenceMonths: sentence,
          timestamp: new Date().toISOString(),
        };
        appendFileSync(OUTPUT_FILE, JSON.stringify(result) + '\n');
        console.log(`Run ${i}: anchor=9 → ${sentence}mo`);
      } else {
        console.log(`Run ${i}: Invalid sentence: ${sentence}`);
      }
    } else {
      console.log(`Run ${i}: No JSON found`);
    }
  } catch (e: any) {
    console.log(`Run ${i}: Error - ${e.message}`);
  }
  await new Promise((r) => setTimeout(r, 2000));
}

async function main() {
  console.log(`Completing high anchor trials (n=${N_REMAINING} more)...\n`);
  for (let i = 1; i <= N_REMAINING; i++) {
    await runTrial(i);
  }

  // Analyze
  const lines = readFileSync(OUTPUT_FILE, 'utf-8')
    .trim()
    .split('\n')
    .map((l) => JSON.parse(l));
  const low = lines.filter((r: any) => r.conditionId === 'low');
  const high = lines.filter((r: any) => r.conditionId === 'high');

  const lowMean = low.reduce((s: number, r: any) => s + r.sentenceMonths, 0) / low.length;
  const highMean = high.reduce((s: number, r: any) => s + r.sentenceMonths, 0) / high.length;

  console.log('\n=== RESULTS ===');
  console.log(`Low anchor: n=${low.length}, mean=${lowMean.toFixed(2)}mo`);
  console.log(`High anchor: n=${high.length}, mean=${highMean.toFixed(2)}mo`);
  console.log(`Effect: ${(highMean - lowMean).toFixed(2)}mo`);
  console.log('\nCompare to temp=0:');
  console.log('Baseline temp=0: 6.0mo effect');
  console.log('With CoT temp=0: 2.03mo effect (66% reduction)');
}

main().catch(console.error);
