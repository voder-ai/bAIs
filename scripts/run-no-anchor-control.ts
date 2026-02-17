#!/usr/bin/env npx tsx
// @ts-nocheck
/**
 * Run the no-anchor control experiment across key models.
 *
 * This establishes baseline sentencing without any prosecutor recommendation,
 * enabling measurement of absolute anchoring magnitude.
 *
 * Models: GPT-4o, Llama 3.3, Claude Opus 4.5
 * Conditions: no-anchor, low-anchor (3mo), high-anchor (9mo)
 * Runs per condition: 10
 */

import { appendFile } from 'node:fs/promises';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { parseModelSpec, createProvider } from '../src/llm/provider.js';
import { anchoringNoAnchorCaseVignette } from '../src/experiments/anchoringNoAnchorControl.js';

const MODELS = [
  'github-copilot/gpt-4o',
  'openrouter/meta-llama/llama-3.3-70b-instruct',
  'anthropic/claude-opus-4-5',
];

const RUNS_PER_CONDITION = 10;
const DELAY_MS = 1500;
const OUTPUT_FILE = 'results/no-anchor-control.jsonl';

// Prompts for each condition
const noAnchorPrompt = () => `${anchoringNoAnchorCaseVignette}

What is your sentencing decision for Lena M.? Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "reasoning": "<brief>"}`;

const lowAnchorPrompt = () => `${anchoringNoAnchorCaseVignette}

For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise:

The prosecutor demands as a sentence for the accused Lena M. 3 months on probation.

What is your sentencing decision for Lena M.? Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "reasoning": "<brief>"}`;

const highAnchorPrompt = () => `${anchoringNoAnchorCaseVignette}

For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise:

The prosecutor demands as a sentence for the accused Lena M. 9 months on probation.

What is your sentencing decision for Lena M.? Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "reasoning": "<brief>"}`;

const CONDITIONS = [
  { name: 'no-anchor', promptFn: noAnchorPrompt },
  { name: 'low-anchor', promptFn: lowAnchorPrompt },
  { name: 'high-anchor', promptFn: highAnchorPrompt },
];

async function main() {
  console.log('🔬 No-Anchor Control Experiment');
  console.log('================================\n');
  console.log(`📁 Output: ${OUTPUT_FILE}`);
  console.log(
    `📊 ${MODELS.length} models × ${CONDITIONS.length} conditions × ${RUNS_PER_CONDITION} runs = ${MODELS.length * CONDITIONS.length * RUNS_PER_CONDITION} trials`,
  );
  console.log(`⏱️ ${DELAY_MS / 1000}s delay between calls\n`);

  // Clear output file if exists
  if (existsSync(OUTPUT_FILE)) {
    unlinkSync(OUTPUT_FILE);
  }

  for (const modelStr of MODELS) {
    console.log(`\n📊 Model: ${modelStr}`);

    const spec = parseModelSpec(modelStr);
    const provider = await createProvider(spec);

    for (const condition of CONDITIONS) {
      process.stdout.write(`  ${condition.name}: `);

      for (let run = 0; run < RUNS_PER_CONDITION; run++) {
        try {
          const result = await provider.sendJson<{ sentenceMonths: number; reasoning: string }>({
            prompt: condition.promptFn(),
          });

          const record = {
            model: modelStr,
            condition: condition.name,
            sentenceMonths: result.parsed.sentenceMonths,
            reasoning: result.parsed.reasoning,
            timestamp: new Date().toISOString(),
          };

          await appendFile(OUTPUT_FILE, JSON.stringify(record) + '\n');
          process.stdout.write(`${result.parsed.sentenceMonths} `);

          await new Promise((r) => setTimeout(r, DELAY_MS));
        } catch (e: any) {
          process.stdout.write(`ERR `);
          console.error(`\n❌ ${e.message}`);

          const errorRecord = {
            model: modelStr,
            condition: condition.name,
            sentenceMonths: null,
            reasoning: `ERROR: ${e.message}`,
            timestamp: new Date().toISOString(),
          };
          await appendFile(OUTPUT_FILE, JSON.stringify(errorRecord) + '\n');

          await new Promise((r) => setTimeout(r, DELAY_MS * 2));
        }
      }
      console.log();
    }
  }

  // Summary
  console.log('\n\n📈 Summary');
  console.log('==========\n');

  if (existsSync(OUTPUT_FILE)) {
    const data = readFileSync(OUTPUT_FILE, 'utf-8')
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l));

    for (const modelStr of MODELS) {
      console.log(`${modelStr}:`);

      for (const condition of CONDITIONS) {
        const condData = data.filter(
          (d) =>
            d.model === modelStr && d.condition === condition.name && d.sentenceMonths !== null,
        );

        if (condData.length > 0) {
          const months = condData.map((d) => d.sentenceMonths);
          const mean = months.reduce((a, b) => a + b, 0) / months.length;
          const min = Math.min(...months);
          const max = Math.max(...months);

          console.log(
            `  ${condition.name}: mean=${mean.toFixed(1)}mo [${min}-${max}], n=${months.length}`,
          );
        } else {
          console.log(`  ${condition.name}: NO VALID DATA`);
        }
      }

      // Calculate anchoring effects
      const noAnchor = data.filter(
        (d) => d.model === modelStr && d.condition === 'no-anchor' && d.sentenceMonths !== null,
      );
      const low = data.filter(
        (d) => d.model === modelStr && d.condition === 'low-anchor' && d.sentenceMonths !== null,
      );
      const high = data.filter(
        (d) => d.model === modelStr && d.condition === 'high-anchor' && d.sentenceMonths !== null,
      );

      if (noAnchor.length && low.length && high.length) {
        const noAnchorMean =
          noAnchor.map((d) => d.sentenceMonths).reduce((a, b) => a + b, 0) / noAnchor.length;
        const lowMean = low.map((d) => d.sentenceMonths).reduce((a, b) => a + b, 0) / low.length;
        const highMean = high.map((d) => d.sentenceMonths).reduce((a, b) => a + b, 0) / high.length;

        const relativeEffect = highMean - lowMean;
        const absoluteFromLow = noAnchorMean - lowMean;
        const absoluteFromHigh = highMean - noAnchorMean;

        console.log(`  ---`);
        console.log(`  Relative effect (high-low): ${relativeEffect.toFixed(1)}mo`);
        console.log(`  No-anchor baseline: ${noAnchorMean.toFixed(1)}mo`);
        console.log(`  Absolute shift from low anchor: ${absoluteFromLow.toFixed(1)}mo`);
        console.log(`  Absolute shift to high anchor: ${absoluteFromHigh.toFixed(1)}mo`);
      }

      console.log();
    }
  }

  console.log(`\n✅ Results saved to ${OUTPUT_FILE}`);
}

main().catch(console.error);
