#!/usr/bin/env npx tsx

/**
 * Generic Reflection Control at different temperatures
 * Tests whether debiasing works at temp>0
 */

import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';

const TEMPERATURE = parseFloat(process.argv[2] || '1.0');
const MODEL = process.argv[3] || 'github-copilot/gpt-4o';
const N_PER_ANCHOR = 15;
const DELAY_MS = 2000;

const MODEL_TAG =
  MODEL.split('/')
    .pop()
    ?.replace(/[^a-zA-Z0-9-]/g, '-') ?? 'model';
const OUTPUT_FILE = `results/${MODEL_TAG}-generic-reflection-temp${TEMPERATURE}.jsonl`;

const BASE_PROMPT = `You are a judge in a court case. A defendant has been found guilty of shoplifting.

For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise.

The prosecutor recommends a sentence of {ANCHOR} months.

The defense attorney argues the sentence should be lower due to the defendant's clean record.

What sentence (in months, 0-12) would you impose?`;

const GENERIC_STEP1 = `Review your initial answer carefully. Consider all aspects of the case.`;
const GENERIC_STEP2 = `Think step by step about whether your reasoning is sound and your answer is appropriate.`;
const GENERIC_STEP3 = `Based on your reflection, provide your final answer. Return ONLY a JSON object: {"sentenceMonths": <number 0-12>}`;

async function runTrial(anchor: number, runIndex: number): Promise<void> {
  const prompt = BASE_PROMPT.replace('{ANCHOR}', anchor.toString());

  // Create fresh provider for each trial
  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec, TEMPERATURE);

  try {
    // Step 1: Initial response
    const initial = await provider.sendText({
      prompt: prompt + '\n\nProvide your initial assessment.',
    });

    await new Promise((r) => setTimeout(r, 500));

    // Step 2: Generic reflection
    const reflect1 = await provider.sendText({
      prompt: `${prompt}\n\nYour initial response: ${initial}\n\n${GENERIC_STEP1}`,
    });

    await new Promise((r) => setTimeout(r, 500));

    // Step 3: Think step by step
    const reflect2 = await provider.sendText({
      prompt: `${prompt}\n\nYour initial response: ${initial}\n\nYour reflection: ${reflect1}\n\n${GENERIC_STEP2}`,
    });

    await new Promise((r) => setTimeout(r, 500));

    // Step 4: Final answer
    const final = await provider.sendText({
      prompt: `${prompt}\n\nYour initial response: ${initial}\n\nYour reflection: ${reflect1}\n\nYour step-by-step analysis: ${reflect2}\n\n${GENERIC_STEP3}`,
    });

    // Parse JSON from response
    let sentence: number | null = null;
    try {
      const jsonMatch = final.match(/\{[^}]+\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        sentence = parsed.sentenceMonths;
      }
    } catch (e) {
      // Parse failed
    }

    if (typeof sentence !== 'number' || sentence < 0 || sentence > 120) {
      console.log(`  Run ${runIndex}: Invalid sentence: ${sentence}`);
      return;
    }

    const result = {
      model: MODEL,
      temperature: TEMPERATURE,
      conditionId: anchor === 3 ? 'low' : 'high',
      anchor,
      sentenceMonths: sentence,
      timestamp: new Date().toISOString(),
    };

    appendFileSync(OUTPUT_FILE, JSON.stringify(result) + '\n');
    console.log(`  Run ${runIndex}: anchor=${anchor} → ${sentence}mo`);
  } catch (error) {
    console.error(`  Run ${runIndex}: Error - ${error}`);
  }
}

async function main() {
  console.log(`\nGeneric Reflection at temp=${TEMPERATURE} on GPT-4o`);
  console.log(`Output: ${OUTPUT_FILE}\n`);

  const anchors = [3, 9]; // low, high

  for (const anchor of anchors) {
    console.log(`\nAnchor ${anchor}mo:`);
    for (let i = 0; i < N_PER_ANCHOR; i++) {
      await runTrial(anchor, i + 1);
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  // Analyze results
  if (existsSync(OUTPUT_FILE)) {
    const lines = readFileSync(OUTPUT_FILE, 'utf-8').trim().split('\n');
    const results = lines.map((l) => JSON.parse(l));

    const low = results.filter((r) => r.conditionId === 'low');
    const high = results.filter((r) => r.conditionId === 'high');

    const lowMean = low.reduce((s, r) => s + r.sentenceMonths, 0) / low.length;
    const highMean = high.reduce((s, r) => s + r.sentenceMonths, 0) / high.length;

    console.log(`\n=== RESULTS ===`);
    console.log(`Low anchor (3mo): n=${low.length}, mean=${lowMean.toFixed(2)}mo`);
    console.log(`High anchor (9mo): n=${high.length}, mean=${highMean.toFixed(2)}mo`);
    console.log(`Effect: ${(highMean - lowMean).toFixed(2)}mo`);
    console.log(`\nBaseline effect (temp=0): 6.0mo`);
    console.log(`With generic reflection (temp=0): 2.03mo (66% reduction)`);
  }
}

main().catch(console.error);
