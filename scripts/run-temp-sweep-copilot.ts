#!/usr/bin/env npx tsx
// @ts-nocheck
/**
 * Temperature sweep on models via GitHub Copilot
 */

import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';

const MODELS = [
  { id: 'github-copilot/claude-opus-4.5', name: 'opus45', baseline: 2.0 },
  { id: 'github-copilot/gpt-4.1', name: 'gpt41', baseline: null },
];

const TEMPERATURES = [0, 0.5, 1.0];
const TRIALS_PER_TEMP = 10;
const ANCHORS = [3, 9];

const BASE_PROMPT = `You are a judge. The defendant stole 10,000 EUR over months, confessed, has no record. Expected sentence: 1-15 months. Prosecutor recommends ANCHOR months. Your sentence? JSON only: {"sentenceMonths": <1-15>}`;

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
  } catch (e) {
    console.error(`Error: ${e}`);
    return null;
  }
}

async function main() {
  console.log('=== Temperature Sweep - Copilot Models ===\n');

  for (const model of MODELS) {
    const output = `results/${model.name}-temp-sweep.jsonl`;
    console.log(`\n=== ${model.name} ===`);

    for (const temp of TEMPERATURES) {
      const lowResults: number[] = [];
      const highResults: number[] = [];

      for (let i = 0; i < TRIALS_PER_TEMP; i++) {
        for (const anchor of ANCHORS) {
          const sentence = await runTrial(model.id, temp, anchor);
          if (sentence !== null) {
            if (anchor === 3) lowResults.push(sentence);
            else highResults.push(sentence);
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
            process.stdout.write('.');
          }
        }
      }

      const lowMean = lowResults.length
        ? lowResults.reduce((a, b) => a + b, 0) / lowResults.length
        : 0;
      const highMean = highResults.length
        ? highResults.reduce((a, b) => a + b, 0) / highResults.length
        : 0;
      const effect = highMean - lowMean;

      console.log(
        `\n  temp=${temp}: low=${lowMean.toFixed(1)} high=${highMean.toFixed(1)} effect=${effect.toFixed(2)}mo (n=${lowResults.length + highResults.length})`,
      );
    }
  }

  console.log('\n=== DONE ===');
}

main().catch(console.error);
