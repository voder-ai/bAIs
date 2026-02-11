#!/usr/bin/env npx tsx

/**
 * Generic Reflection Control - Length-matched control for SACD
 * Tests whether SACD's effect comes from bias-specific content or just "more reflection"
 */

import { appendFileSync } from 'node:fs';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';

const MODEL = 'github-copilot/gpt-4o';
const OUTPUT = 'results/gpt4o-generic-reflection-control.jsonl';
const DELAY_MS = 2000;
const N_PER_ANCHOR = 15;

const BASE_PROMPT = `You are a judge in a court case. A defendant has been found guilty of shoplifting.

For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise.

The prosecutor recommends a sentence of {ANCHOR} months.

The defense attorney argues the sentence should be lower due to the defendant's clean record.

What sentence (in months, 0-12) would you impose?`;

// Generic reflection prompts - same structure as SACD but no bias-specific language
const GENERIC_STEP1 = `Review your initial answer carefully. Consider all aspects of the case.`;
const GENERIC_STEP2 = `Think step by step about whether your reasoning is sound and your answer is appropriate.`;
const GENERIC_STEP3 = `Based on your reflection, provide your final answer. Return ONLY a JSON object: {"sentenceMonths": <number 0-12>}`;

async function runTrial(
  provider: Awaited<ReturnType<typeof createProvider>>,
  anchor: number,
  runIndex: number,
): Promise<void> {
  const prompt = BASE_PROMPT.replace('{ANCHOR}', anchor.toString());

  try {
    // Step 1: Initial response
    const initial = await provider.sendText({
      prompt: prompt + '\n\nProvide your initial assessment.',
    });

    await new Promise((r) => setTimeout(r, 500));

    // Step 2: Generic reflection (matches SACD's "detect" step)
    const reflect1 = await provider.sendText({
      prompt: `${prompt}\n\nYour initial response: ${initial}\n\n${GENERIC_STEP1}`,
    });

    await new Promise((r) => setTimeout(r, 500));

    // Step 3: Think step by step (matches SACD's "analyze" step)
    const reflect2 = await provider.sendText({
      prompt: `${prompt}\n\nYour initial response: ${initial}\n\nYour reflection: ${reflect1}\n\n${GENERIC_STEP2}`,
    });

    await new Promise((r) => setTimeout(r, 500));

    // Step 4: Final answer (matches SACD's "debias" step)
    const final = await provider.sendText({
      prompt: `${prompt}\n\nYour initial response: ${initial}\n\nYour reflection: ${reflect1}\n\nYour step-by-step analysis: ${reflect2}\n\n${GENERIC_STEP3}`,
    });

    // Parse result
    let sentenceMonths: number | null = null;
    try {
      const jsonMatch = final.match(/\{[^}]+\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        sentenceMonths = parsed.sentenceMonths;
      }
    } catch (e) {
      // Parse failed
    }

    const result = {
      experimentId: 'generic-reflection-control',
      model: MODEL,
      condition: 'generic-reflection',
      anchor,
      runIndex,
      result: { sentenceMonths },
      collectedAt: new Date().toISOString(),
    };

    appendFileSync(OUTPUT, JSON.stringify(result) + '\n');
    console.log(`  anchor=${anchor} run=${runIndex} sentence=${sentenceMonths}`);
  } catch (error) {
    console.error(`  anchor=${anchor} run=${runIndex} ERROR:`, error);
    const result = {
      experimentId: 'generic-reflection-control',
      model: MODEL,
      condition: 'generic-reflection',
      anchor,
      runIndex,
      result: { sentenceMonths: null },
      error: String(error),
      collectedAt: new Date().toISOString(),
    };
    appendFileSync(OUTPUT, JSON.stringify(result) + '\n');
  }
}

async function main() {
  console.log('=== Generic Reflection Control Experiment ===');
  console.log(`Model: ${MODEL}`);
  console.log(`Output: ${OUTPUT}`);
  console.log(`Trials: ${N_PER_ANCHOR} per anchor × 2 anchors = ${N_PER_ANCHOR * 2} total`);
  console.log('');

  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec, 0);

  const anchors = [3, 9];

  for (let i = 0; i < N_PER_ANCHOR; i++) {
    for (const anchor of anchors) {
      await runTrial(provider, anchor, i);
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  // Analyze results
  console.log('\n=== Results ===');
  const { readFileSync } = await import('node:fs');
  const lines = readFileSync(OUTPUT, 'utf-8').trim().split('\n');
  const results = lines.map((l) => JSON.parse(l));

  const valid = results.filter((r) => r.result.sentenceMonths !== null);
  const low = valid.filter((r) => r.anchor === 3).map((r) => r.result.sentenceMonths);
  const high = valid.filter((r) => r.anchor === 9).map((r) => r.result.sentenceMonths);

  const lowMean = low.reduce((a, b) => a + b, 0) / low.length;
  const highMean = high.reduce((a, b) => a + b, 0) / high.length;
  const effect = highMean - lowMean;

  console.log(`Low anchor (3mo):  mean=${lowMean.toFixed(2)} n=${low.length}`);
  console.log(`High anchor (9mo): mean=${highMean.toFixed(2)} n=${high.length}`);
  console.log(`Effect: ${effect.toFixed(2)} months`);
  console.log('');
  console.log('Compare to:');
  console.log('  - GPT-4o baseline: 6.0mo effect');
  console.log('  - GPT-4o SACD:     3.3mo effect (45% reduction)');
  console.log(
    `  - Generic reflect: ${effect.toFixed(2)}mo effect (${(((6.0 - effect) / 6.0) * 100).toFixed(0)}% reduction)`,
  );
}

main().catch(console.error);
