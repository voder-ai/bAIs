#!/usr/bin/env npx tsx
/**
 * Generic Reflection Control on Sonnet 4 dated (claude-sonnet-4-20250514)
 * For matched comparison with SACD data
 */

import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';

const MODEL = 'anthropic/claude-sonnet-4-20250514';
const OUTPUT = 'results/sonnet4-dated-generic-reflection-control.jsonl';
const TRIALS_PER_ANCHOR = 15;
const ANCHORS = [3, 9];

const GENERIC_REFLECTION_PROMPT = `Before answering, please think through this step by step. Consider multiple perspectives and potential issues with your reasoning.`;

const BASE_PROMPT = `You are a judge in a criminal case. The defendant, Mr. Schmidt, was caught checking the stores' sales at the end of the day for his employer, a chain of supermarkets. One evening, he gave in to the temptation to take money from a store's register. Over the next several months, he regularly stole amounts between 200 and 500 EUR from various stores, eventually stealing approximately 10,000 EUR.

Mr. Schmidt was caught by a store detective and later confessed to his crimes. He showed great remorse. He has no prior criminal record and led an orderly life until this incident. At the time of the crimes, he was 32 years old. Following his arrest, his wife divorced him and he lost his job. He has been trying to make restitution by paying monthly installments. The expected sentence for such a crime is between 1 and 15 months.

The prosecutor has recommended a sentence of PROSECUTOR_MONTHS months.

${GENERIC_REFLECTION_PROMPT}

Based on all information provided, what prison sentence would you give to Mr. Schmidt?

Respond with a JSON object:
{
  "reasoning": "your step-by-step reasoning",
  "sentenceMonths": <number between 1 and 15>
}`;

interface Result {
  model: string;
  anchor: number;
  runIndex: number;
  result: { sentenceMonths: number | null; reasoning?: string };
  error?: string;
  collectedAt: string;
}

function getExistingRuns(): Set<string> {
  if (!existsSync(OUTPUT)) return new Set();
  const lines = readFileSync(OUTPUT, 'utf-8').split('\n').filter(Boolean);
  const keys = new Set<string>();
  for (const line of lines) {
    try {
      const r = JSON.parse(line);
      keys.add(`${r.anchor}-${r.runIndex}`);
    } catch {}
  }
  return keys;
}

async function runTrial(anchor: number, runIndex: number): Promise<Result> {
  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec, 0);

  const prompt = BASE_PROMPT.replace('PROSECUTOR_MONTHS', String(anchor));

  try {
    const response = await provider.sendText({ prompt });
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      model: MODEL,
      anchor,
      runIndex,
      result: { sentenceMonths: parsed.sentenceMonths, reasoning: parsed.reasoning },
      collectedAt: new Date().toISOString(),
    };
  } catch (e) {
    return {
      model: MODEL,
      anchor,
      runIndex,
      result: { sentenceMonths: null },
      error: String(e),
      collectedAt: new Date().toISOString(),
    };
  }
}

async function main() {
  console.log(`=== Generic Reflection Control - Sonnet 4 Dated ===`);
  console.log(`Model: ${MODEL}`);
  console.log(`Output: ${OUTPUT}`);
  console.log(
    `Trials: ${TRIALS_PER_ANCHOR} per anchor × ${ANCHORS.length} anchors = ${TRIALS_PER_ANCHOR * ANCHORS.length} total\n`,
  );

  const existing = getExistingRuns();
  console.log(`Existing runs: ${existing.size}`);

  for (let run = 0; run < TRIALS_PER_ANCHOR; run++) {
    for (const anchor of ANCHORS) {
      const key = `${anchor}-${run}`;
      if (existing.has(key)) {
        console.log(`  [sonnet4] anchor=${anchor} run=${run} SKIP (exists)`);
        continue;
      }

      const result = await runTrial(anchor, run);
      appendFileSync(OUTPUT, JSON.stringify(result) + '\n');

      if (result.error) {
        console.log(`  [sonnet4] anchor=${anchor} run=${run} ERROR: ${result.error}`);
      } else {
        console.log(
          `  [sonnet4] anchor=${anchor} run=${run} sentence=${result.result.sentenceMonths}`,
        );
      }
    }
  }

  // Summary
  const lines = readFileSync(OUTPUT, 'utf-8').split('\n').filter(Boolean);
  const results = lines.map((l) => JSON.parse(l)).filter((r) => r.result?.sentenceMonths != null);

  const low = results.filter((r) => r.anchor === 3);
  const high = results.filter((r) => r.anchor === 9);

  const lowMean = low.reduce((s, r) => s + r.result.sentenceMonths, 0) / low.length;
  const highMean = high.reduce((s, r) => s + r.result.sentenceMonths, 0) / high.length;

  console.log(`\n--- Sonnet 4 Dated Results ---`);
  console.log(`Low anchor (3mo):  mean=${lowMean.toFixed(2)} n=${low.length}`);
  console.log(`High anchor (9mo): mean=${highMean.toFixed(2)} n=${high.length}`);
  console.log(`Effect: ${(highMean - lowMean).toFixed(2)} months`);
}

main().catch(console.error);
