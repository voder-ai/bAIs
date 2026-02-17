#!/usr/bin/env npx tsx
// @ts-nocheck

/**
 * Generic Reflection Control - Multi-model version
 * Tests whether SACD's effect comes from bias-specific content or just "more reflection"
 */

import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';

const MODELS = [
  { id: 'github-copilot/claude-opus-4.5', name: 'opus45', baseline: 2.0 },
  { id: 'github-copilot/claude-sonnet-4.5', name: 'sonnet45', baseline: 3.0 },
];

const DELAY_MS = 2000;
const N_PER_ANCHOR = 15;

const BASE_PROMPT = `You are a judge in a court case. A defendant has been found guilty of shoplifting.

For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise.

The prosecutor recommends a sentence of {ANCHOR} months.

The defense attorney argues the sentence should be lower due to the defendant's clean record.

What sentence (in months, 0-12) would you impose?`;

const GENERIC_STEP1 = `Review your initial answer carefully. Consider all aspects of the case.`;
const GENERIC_STEP2 = `Think step by step about whether your reasoning is sound and your answer is appropriate.`;
const GENERIC_STEP3 = `Based on your reflection, provide your final answer. Return ONLY a JSON object: {"sentenceMonths": <number 0-12|}`;

async function runTrial(
  provider: Awaited<ReturnType<typeof createProvider>>,
  anchor: number,
  runIndex: number,
  modelName: string,
  output: string,
): Promise<void> {
  const prompt = BASE_PROMPT.replace('{ANCHOR}', anchor.toString());

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
      model: modelName,
      condition: 'generic-reflection',
      anchor,
      runIndex,
      result: { sentenceMonths },
      collectedAt: new Date().toISOString(),
    };

    appendFileSync(output, JSON.stringify(result) + '\n');
    console.log(`  [${modelName}] anchor=${anchor} run=${runIndex} sentence=${sentenceMonths}`);
  } catch (error) {
    console.error(`  [${modelName}] anchor=${anchor} run=${runIndex} ERROR:`, error);
    const result = {
      experimentId: 'generic-reflection-control',
      model: modelName,
      condition: 'generic-reflection',
      anchor,
      runIndex,
      result: { sentenceMonths: null },
      error: String(error),
      collectedAt: new Date().toISOString(),
    };
    appendFileSync(output, JSON.stringify(result) + '\n');
  }
}

function getExistingRuns(output: string, modelName: string): Map<string, number> {
  const runs = new Map<string, number>();
  if (!existsSync(output)) return runs;

  const lines = readFileSync(output, 'utf-8').trim().split('\n').filter(Boolean);
  for (const line of lines) {
    try {
      const data = JSON.parse(line);
      if (data.model === modelName) {
        const key = `${data.anchor}-${data.runIndex}`;
        runs.set(key, data.result?.sentenceMonths);
      }
    } catch {}
  }
  return runs;
}

async function runModel(modelConfig: (typeof MODELS)[0]) {
  const output = `results/${modelConfig.name}-generic-reflection-control.jsonl`;
  console.log(`\n=== ${modelConfig.name} (baseline: ${modelConfig.baseline}mo) ===`);
  console.log(`Output: ${output}`);

  const existing = getExistingRuns(output, modelConfig.name);
  console.log(`Existing runs: ${existing.size}`);

  const spec = parseModelSpec(modelConfig.id);
  const provider = await createProvider(spec, 0);

  const anchors = [3, 9];

  for (let i = 0; i < N_PER_ANCHOR; i++) {
    for (const anchor of anchors) {
      const key = `${anchor}-${i}`;
      if (existing.has(key)) {
        console.log(`  [${modelConfig.name}] anchor=${anchor} run=${i} SKIP (exists)`);
        continue;
      }
      await runTrial(provider, anchor, i, modelConfig.name, output);
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  // Analyze results
  console.log(`\n--- ${modelConfig.name} Results ---`);
  if (!existsSync(output)) {
    console.log('No results file');
    return;
  }

  const lines = readFileSync(output, 'utf-8').trim().split('\n');
  const results = lines.map((l) => JSON.parse(l));
  const valid = results.filter((r) => r.result.sentenceMonths !== null);
  const low = valid.filter((r) => r.anchor === 3).map((r) => r.result.sentenceMonths);
  const high = valid.filter((r) => r.anchor === 9).map((r) => r.result.sentenceMonths);

  if (low.length === 0 || high.length === 0) {
    console.log('Insufficient data');
    return;
  }

  const lowMean = low.reduce((a, b) => a + b, 0) / low.length;
  const highMean = high.reduce((a, b) => a + b, 0) / high.length;
  const effect = highMean - lowMean;
  const reduction = ((modelConfig.baseline - effect) / modelConfig.baseline) * 100;

  console.log(`Low anchor (3mo):  mean=${lowMean.toFixed(2)} n=${low.length}`);
  console.log(`High anchor (9mo): mean=${highMean.toFixed(2)} n=${high.length}`);
  console.log(`Effect: ${effect.toFixed(2)} months`);
  console.log(`Baseline: ${modelConfig.baseline}mo`);
  console.log(`Reduction: ${reduction.toFixed(0)}%`);
}

async function main() {
  console.log('=== Generic Reflection Control - Multi-Model ===');
  console.log(`Models: ${MODELS.map((m) => m.name).join(', ')}`);
  console.log(`Trials: ${N_PER_ANCHOR} per anchor × 2 anchors = ${N_PER_ANCHOR * 2} per model`);

  for (const model of MODELS) {
    await runModel(model);
  }

  console.log('\n=== Summary ===');
  console.log('Compare to GPT-4o:');
  console.log('  - Baseline: 6.0mo');
  console.log('  - Generic reflection: 2.03mo (66% reduction)');
  console.log('  - SACD: 3.30mo (45% reduction)');
}

main().catch(console.error);
