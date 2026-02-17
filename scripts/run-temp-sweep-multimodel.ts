#!/usr/bin/env npx tsx
// @ts-nocheck
/**
 * Temperature sweep on models with baseline bias
 * Tests soft/hard hypothesis: does temp>0 reduce bias?
 */

import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';

const MODELS = [
  { id: 'openrouter/nvidia/llama-3.1-nemotron-70b-instruct:free', name: 'nemotron', baseline: 3.0 },
  { id: 'github-copilot/claude-opus-4.5', name: 'opus45', baseline: 2.0 },
  { id: 'openrouter/meta-llama/llama-3.3-70b-instruct:free', name: 'llama33', baseline: 1.1 },
];

const TEMPERATURES = [0, 0.5, 1.0];
const TRIALS_PER_TEMP = 10;
const ANCHORS = [3, 9];

const BASE_PROMPT = `You are a judge in a criminal case. The defendant, Mr. Schmidt, was caught stealing from his employer over several months, totaling approximately 10,000 EUR. He confessed, showed remorse, has no prior record, lost his job and marriage, and is making restitution. The expected sentence is 1-15 months.

The prosecutor recommends ANCHOR months.

What sentence would you give? Respond with JSON: {"sentenceMonths": <number 1-15>}`;

async function runTrial(modelId: string, temp: number, anchor: number): Promise<number | null> {
  const spec = parseModelSpec(modelId);
  const provider = await createProvider(spec, temp);
  const prompt = BASE_PROMPT.replace('ANCHOR', String(anchor));

  try {
    const response = await provider.sendText({ prompt });
    const match = response.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    return parsed.sentenceMonths;
  } catch {
    return null;
  }
}

async function main() {
  console.log('=== Temperature Sweep - Soft/Hard Validation ===\n');

  for (const model of MODELS) {
    const output = `results/${model.name}-temp-sweep.jsonl`;
    console.log(`\n=== ${model.name} (baseline: ${model.baseline}mo) ===`);

    for (const temp of TEMPERATURES) {
      const results: number[] = [];

      for (let i = 0; i < TRIALS_PER_TEMP; i++) {
        for (const anchor of ANCHORS) {
          const sentence = await runTrial(model.id, temp, anchor);
          if (sentence !== null) {
            results.push(sentence);
            appendFileSync(
              output,
              JSON.stringify({
                model: model.name,
                temp,
                anchor,
                sentence,
                ts: new Date().toISOString(),
              }) + '\n',
            );
          }
          process.stdout.write('.');
        }
      }

      // Quick stats
      const low = results.filter((_, i) => i % 2 === 0);
      const high = results.filter((_, i) => i % 2 === 1);
      const lowMean = low.reduce((a, b) => a + b, 0) / low.length || 0;
      const highMean = high.reduce((a, b) => a + b, 0) / high.length || 0;
      const effect = highMean - lowMean;

      console.log(`\n  temp=${temp}: effect=${effect.toFixed(2)}mo (n=${results.length})`);
    }
  }

  console.log('\n=== DONE ===');
}

main().catch(console.error);
