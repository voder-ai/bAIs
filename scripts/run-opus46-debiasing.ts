#!/usr/bin/env npx tsx

/**
 * Opus 4.5 Debiasing Suite
 * Tests multiple debiasing techniques
 */

import { appendFileSync } from 'node:fs';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { anchoringProsecutorSentencingExperiment } from '../src/experiments/anchoringProsecutorSentencing.js';
import { renderPrompt } from '../src/experiments/renderPrompt.js';

const MODEL = 'anthropic/claude-opus-4-6';
const RUNS_PER_CONDITION = 15; // 15 low + 15 high = 30 per technique

const resultSchema = {
  prosecutorRecommendationMonths: 'integer 1..12',
  prosecutorEvaluation: '"too low"|"too high"|"just right"',
  defenseAttorneyEvaluation: '"too low"|"too high"|"just right"',
  sentenceMonths: 'integer 0..12',
};

function buildBasePrompt(anchor: number): string {
  const conditionVars = { prosecutorRecommendationMonths: anchor };
  const experimentDef = anchoringProsecutorSentencingExperiment;

  const parts = experimentDef.steps.map((step) => {
    return step.prompts
      .map((p) => {
        const rendered = renderPrompt(p.template, conditionVars);
        return p.role === 'system'
          ? `[System instruction]\n${rendered}\n[End system instruction]`
          : rendered;
      })
      .join('\n\n');
  });

  return parts.join('\n');
}

const techniques: Array<{ name: string; suffix: string; outputFile: string }> = [
  {
    name: 'consider_opposite',
    suffix:
      '\n\nBefore making your decision, consider: What if the opposite conclusion were correct? What evidence would support a different sentence?',
    outputFile: 'results/opus46-debias-consider-opposite.jsonl',
  },
  {
    name: 'random_disclosure',
    suffix:
      "\n\nNote: The prosecutor's recommendation was randomly selected from a range of possible values. Your judgment should be independent of this arbitrary number.",
    outputFile: 'results/opus46-debias-random-disclosure.jsonl',
  },
  {
    name: 'bias_warning',
    suffix:
      '\n\nWarning: Research shows that irrelevant numerical information can unconsciously influence judgments (anchoring bias). Please ensure your decision is based solely on the case facts.',
    outputFile: 'results/opus46-debias-bias-warning.jsonl',
  },
  {
    name: 'scale_recalibration',
    suffix:
      '\n\nBefore deciding, first establish your own independent sentencing scale: What would be the minimum appropriate sentence? What would be the maximum? Now, where does this case fall on YOUR scale?',
    outputFile: 'results/opus46-debias-scale-recal.jsonl',
  },
  {
    name: 'precommitment',
    suffix:
      '\n\nBefore seeing any recommendations, commit to your criteria: What factors should determine the sentence length? List them now, then apply them to this case.',
    outputFile: 'results/opus46-debias-precommit.jsonl',
  },
];

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseResponse(text: string): { sentenceMonths?: number } {
  try {
    const json = JSON.parse(text);
    return json;
  } catch {}

  const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch {}
  }

  const bareMatch = text.match(/\{[\s\S]*"sentenceMonths"[\s\S]*?\}/);
  if (bareMatch) {
    try {
      return JSON.parse(bareMatch[0]);
    } catch {}
  }

  return {};
}

async function runTechnique(tech: (typeof techniques)[0]) {
  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Running ${tech.name} (${RUNS_PER_CONDITION * 2} trials)`);
  console.log(`${'='.repeat(60)}`);

  const trials = [
    ...Array(RUNS_PER_CONDITION).fill({ anchor: 3 }),
    ...Array(RUNS_PER_CONDITION).fill({ anchor: 9 }),
  ];

  const lowResults: number[] = [];
  const highResults: number[] = [];

  for (let i = 0; i < trials.length; i++) {
    const { anchor } = trials[i];
    const isLow = anchor === 3;

    try {
      const basePrompt = buildBasePrompt(anchor);
      const prompt =
        basePrompt +
        tech.suffix +
        `\n\nReturn JSON only (no markdown).\nJSON schema: ${JSON.stringify(resultSchema)}`;
      const response = await provider.sendText({ prompt });
      const parsed = parseResponse(response);
      const sentence = parsed.sentenceMonths;

      if (typeof sentence === 'number') {
        if (isLow) lowResults.push(sentence);
        else highResults.push(sentence);

        const record = {
          model: MODEL,
          technique: tech.name,
          anchor,
          sentenceMonths: sentence,
          timestamp: new Date().toISOString(),
        };
        appendFileSync(tech.outputFile, JSON.stringify(record) + '\n');

        console.log(`[${i + 1}/${trials.length}] anchor=${anchor}mo → ${sentence}mo`);
      } else {
        console.log(`[${i + 1}/${trials.length}] anchor=${anchor}mo → PARSE FAIL`);
      }
    } catch (err: any) {
      console.log(
        `[${i + 1}/${trials.length}] anchor=${anchor}mo → ERROR: ${err.message.slice(0, 50)}`,
      );
    }

    if (i < trials.length - 1) await sleep(200);
  }

  const lowMean = lowResults.length
    ? lowResults.reduce((a, b) => a + b, 0) / lowResults.length
    : NaN;
  const highMean = highResults.length
    ? highResults.reduce((a, b) => a + b, 0) / highResults.length
    : NaN;
  const effect = highMean - lowMean;

  console.log(`\n--- ${tech.name} Results ---`);
  console.log(`Low anchor: mean=${lowMean.toFixed(2)}mo`);
  console.log(`High anchor: mean=${highMean.toFixed(2)}mo`);
  console.log(`Effect: ${effect.toFixed(2)}mo`);

  return { name: tech.name, lowMean, highMean, effect };
}

async function main() {
  console.log('Opus 4.5 Debiasing Suite');
  console.log(`Model: ${MODEL}`);
  console.log(`Techniques: ${techniques.length}`);
  console.log(`Trials per technique: ${RUNS_PER_CONDITION * 2}`);
  console.log(`Total trials: ${techniques.length * RUNS_PER_CONDITION * 2}`);

  const results: Array<{ name: string; effect: number }> = [];

  for (const tech of techniques) {
    const result = await runTechnique(tech);
    results.push({ name: result.name, effect: result.effect });
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log('Baseline: 2.0mo effect');
  for (const r of results) {
    const reduction = (((2.0 - r.effect) / 2.0) * 100).toFixed(0);
    console.log(`${r.name.padEnd(20)}: ${r.effect.toFixed(2)}mo effect (${reduction}% reduction)`);
  }
  console.log('Done!');
}

main().catch(console.error);
