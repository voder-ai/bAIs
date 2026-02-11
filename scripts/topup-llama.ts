#!/usr/bin/env npx tsx

/**
 * Top-up Llama 3.3 experiments to reach n=60
 * Uses 15s delay for free tier rate limiting
 */

import { appendFileSync } from 'node:fs';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { anchoringProsecutorSentencingExperiment } from '../src/experiments/anchoringProsecutorSentencing.js';
import { renderPrompt } from '../src/experiments/renderPrompt.js';

const MODEL = 'openrouter/meta-llama/llama-3.3-70b-instruct';
const OUTPUT = 'results/llama33-topup.jsonl';
const DELAY_MS = 2000;

// Need: 6 low, 5 high
const TRIALS = [
  { anchor: 3 },
  { anchor: 3 },
  { anchor: 3 },
  { anchor: 3 },
  { anchor: 3 },
  { anchor: 3 },
  { anchor: 9 },
  { anchor: 9 },
  { anchor: 9 },
  { anchor: 9 },
  { anchor: 9 },
];

const resultSchema = {
  prosecutorRecommendationMonths: 'integer 1..12',
  prosecutorEvaluation: '"too low"|"too high"|"just right"',
  defenseAttorneyEvaluation: '"too low"|"too high"|"just right"',
  sentenceMonths: 'integer 0..12',
};

function buildPrompt(anchor: number): string {
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

  return [
    ...parts,
    '',
    'Return JSON only (no markdown).',
    `JSON schema (informal): ${JSON.stringify(resultSchema)}`,
    'Rules: output must be ONLY the JSON object, with exactly those four keys, no extra keys.',
    'Consistency rule: prosecutorRecommendationMonths MUST match the value stated in the prompt.',
  ].join('\n\n');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const modelSpec = parseModelSpec(MODEL);
  const provider = await createProvider(modelSpec);

  console.error(`Llama 3.3 Top-up: ${TRIALS.length} trials (15s delay)`);
  console.error(`Output: ${OUTPUT}`);
  console.error('');

  for (let i = 0; i < TRIALS.length; i++) {
    const trial = TRIALS[i]!;
    const prompt = buildPrompt(trial.anchor);

    console.error(`Trial ${i + 1}/${TRIALS.length} (anchor=${trial.anchor}mo)...`);

    try {
      const result = await provider.sendText({ prompt });

      // Parse JSON response
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error(`  ERROR: No JSON in response`);
        continue;
      }

      const parsed = JSON.parse(jsonMatch[0]);

      const record = {
        model: MODEL,
        params: { prosecutorRecommendationMonths: trial.anchor },
        result: parsed,
        timestamp: new Date().toISOString(),
      };

      appendFileSync(OUTPUT, JSON.stringify(record) + '\n');
      console.error(`  OK: ${parsed.sentenceMonths}mo`);
    } catch (err) {
      console.error(`  ERROR: ${err}`);
      const record = {
        model: MODEL,
        params: { prosecutorRecommendationMonths: trial.anchor },
        error: String(err),
        timestamp: new Date().toISOString(),
      };
      appendFileSync(OUTPUT, JSON.stringify(record) + '\n');
    }

    // Delay before next trial (skip on last)
    if (i < TRIALS.length - 1) {
      console.error(`  Waiting ${DELAY_MS / 1000}s...`);
      await sleep(DELAY_MS);
    }
  }

  console.error('\nDone!');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
