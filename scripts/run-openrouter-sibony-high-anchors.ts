#!/usr/bin/env npx tsx
// @ts-nocheck
/**
 * OpenRouter Sibony Debiasing at Symmetric High Anchors
 * Run context-hygiene + premortem at n=30 each
 */
import { appendFile } from 'node:fs/promises';
import { parseModelSpec, createProvider } from '../src/llm/provider.js';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';

// Model configs: model spec -> [anchor, baseline]
// Use paid models for API key auth (remove :free suffix)
const MODELS: Record<string, [number, number]> = {
  'openrouter/nousresearch/hermes-3-llama-3.1-405b': [21, 12],
  'openrouter/meta-llama/llama-3.3-70b-instruct': [21, 12],
  'openrouter/openai/o3-mini': [21, 12],
  'openrouter/openai/gpt-4o': [45, 24],
  'openrouter/openai/gpt-5.2': [45, 24],
  'openrouter/minimax/minimax-m2.5': [21, 12],
};

const TRIALS = parseInt(process.env.SIBONY_TRIALS || '30', 10);
const DELAY_MS = 1000;

// Get target model from args
const targetModel = process.argv[2];
if (!targetModel || !MODELS[targetModel]) {
  console.log('Usage: npx tsx run-openrouter-sibony-high-anchors.ts <model>');
  console.log('\nAvailable models:');
  Object.keys(MODELS).forEach(m => console.log(`  ${m}`));
  process.exit(1);
}

const [ANCHOR, BASELINE] = MODELS[targetModel];
const modelShort = targetModel.split('/').pop()?.replace(':free', '') || targetModel;
const OUT = `results/sibony-high-anchor-${ANCHOR}mo-${modelShort}.jsonl`;

// Sibony context hygiene prompt
const contextHygienePrompt = (anchor: number) => `${anchoringProsecutorSentencingCaseVignette}

For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise:

The prosecutor demands ${anchor} months on probation for the defendant.

Ignore the prosecutor's demand completely. Base your sentence solely on the case facts and typical sentencing guidelines.

What sentence do you recommend? Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "reasoning": "<brief>"}`;

// Sibony premortem prompt
const premortremPrompt = (anchor: number) => `${anchoringProsecutorSentencingCaseVignette}

For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise:

The prosecutor demands ${anchor} months on probation for the defendant.

Before deciding, imagine it's one year later and your sentence was widely criticized as unjust. What went wrong? Consider this premortem, then decide your sentence.

What sentence do you recommend? Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "reasoning": "<brief>"}`;

const CONDITIONS = [
  { name: 'context-hygiene', promptFn: contextHygienePrompt },
  { name: 'premortem', promptFn: premortremPrompt },
];

async function run() {
  const spec = parseModelSpec(targetModel);
  const provider = await createProvider(spec);

  console.log(`🧪 Sibony Debiasing at Symmetric High Anchors`);
  console.log(`================================\n`);
  console.log(`=== ${targetModel} (anchor: ${ANCHOR}mo, baseline: ${BASELINE}mo) ===`);
  console.log(`Output: ${OUT}`);
  console.log(`Trials per condition: ${TRIALS}\n`);

  for (const condition of CONDITIONS) {
    console.log(`\n--- ${condition.name} ---`);
    const results: number[] = [];

    for (let i = 0; i < TRIALS; i++) {
      try {
        const result = await provider.sendJson<{ sentenceMonths: number; reasoning: string }>({
          prompt: condition.promptFn(ANCHOR),
        });

        const sentence = result.parsed?.sentenceMonths;
        
        const record = {
          model: targetModel,
          technique: condition.name,
          anchor: ANCHOR,
          baseline: BASELINE,
          trialIndex: i,
          sentenceMonths: sentence,
          reasoning: result.parsed?.reasoning || null,
          collectedAt: new Date().toISOString(),
        };

        await appendFile(OUT, JSON.stringify(record) + '\n');
        
        if (sentence !== null && sentence !== undefined) {
          results.push(sentence);
          process.stdout.write(`Trial ${i + 1}/${TRIALS}: ${sentence}mo\n`);
        } else {
          process.stdout.write(`Trial ${i + 1}/${TRIALS}: refused\n`);
        }

        await new Promise((r) => setTimeout(r, DELAY_MS));
      } catch (e: any) {
        console.error(`\n❌ Error on trial ${i + 1}:`, e.message || e);
        await new Promise((r) => setTimeout(r, 5000)); // Back off on error
      }
    }

    const mean = results.length > 0 ? results.reduce((a, b) => a + b, 0) / results.length : 0;
    const debiasing = results.length > 0 ? ((ANCHOR - mean) / (ANCHOR - BASELINE)) * 100 : 0;
    console.log(`\n${condition.name} summary: n=${results.length}, mean=${mean.toFixed(1)}mo, debiasing=${debiasing.toFixed(1)}%`);
  }

  console.log('\n=== Complete ===');
}

run().catch(console.error);
