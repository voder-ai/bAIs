#!/usr/bin/env npx tsx
// @ts-nocheck

/**
 * Topup MiniMax anchoring to n=30
 * Need 13 more trials (7 low anchor, 6 high anchor)
 */

import { appendFileSync } from 'node:fs';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { anchoringProsecutorSentencingExperiment } from '../src/experiments/anchoringProsecutorSentencing.js';
import { renderPrompt } from '../src/experiments/renderPrompt.js';

const MODEL = 'openrouter/minimax/minimax-m2.5';
const OUTPUT = 'results/minimax-m25-anchoring-topup.jsonl';
const DELAY_MS = 1000;

const resultSchema = {
  prosecutorRecommendationMonths: 'integer 1..12',
  prosecutorEvaluation: '"too low"|"too high"|"just right"',
  defenseAttorneyEvaluation: '"too low"|"too high"|"just right"',
  sentenceMonths: 'integer 0..24',
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

  return parts.join('\n\n---\n\n');
}

async function runTrial(anchor: number, runIndex: number) {
  const spec = parseModelSpec(MODEL);
  const provider = createProvider(spec);

  const prompt = buildPrompt(anchor);
  const conditionId = anchor === 3 ? 'low-anchor-3mo' : 'high-anchor-9mo';

  try {
    const response = await provider.generateText({
      model: spec.model,
      prompt,
      system: 'You are a trial judge. Respond with just the evaluations and sentence.',
      maxTokens: 256,
      temperature: 0,
      resultSchema,
    });

    const result = {
      experimentId: 'anchoring-topup',
      model: MODEL,
      conditionId,
      runIndex,
      params: { prosecutorRecommendationMonths: anchor },
      result: response.result || { sentenceMonths: null },
      rawResponse: response.text?.slice(0, 200),
      collectedAt: new Date().toISOString(),
    };

    appendFileSync(OUTPUT, JSON.stringify(result) + '\n');
    console.log(`✅ ${conditionId} #${runIndex}: ${result.result?.sentenceMonths}mo`);
    return result;
  } catch (err) {
    console.error(`❌ ${conditionId} #${runIndex}: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log('MiniMax Anchoring Topup — targeting n=30');
  console.log('Running 7 low anchor + 6 high anchor trials...\n');

  // 7 low anchor trials
  for (let i = 0; i < 7; i++) {
    await runTrial(3, i);
    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  // 6 high anchor trials
  for (let i = 0; i < 6; i++) {
    await runTrial(9, i);
    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  console.log('\nDone. Check results/minimax-m25-anchoring-topup.jsonl');
}

main().catch(console.error);
