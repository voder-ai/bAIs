#!/usr/bin/env npx tsx

/**
 * Run full experiment suite for MiniMax M2.5
 * - Baseline (60 trials)
 * - Full SACD (60 trials)
 * - CoT (60 trials)
 * - Debiasing suite (150 trials)
 */

import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { anchoringProsecutorSentencingExperiment } from '../src/experiments/anchoringProsecutorSentencing.js';
import { renderPrompt } from '../src/experiments/renderPrompt.js';

const MODEL = 'openrouter/minimax/minimax-m2.5';
const BASE_OUTPUT = 'results/minimax-m25';
const DELAY_MS = 500; // MiniMax has good rate limits

const resultSchema = {
  prosecutorRecommendationMonths: 'integer 1..12',
  prosecutorEvaluation: '"too low"|"too high"|"just right"',
  defenseAttorneyEvaluation: '"too low"|"too high"|"just right"',
  sentenceMonths: 'integer 0..12',
};

function buildPrompt(anchor: number, variant: string = 'baseline'): string {
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

  let variantInstruction = '';
  if (variant === 'cot') {
    variantInstruction = '\n\nThink step by step before giving your answer.';
  } else if (variant === 'premortem') {
    variantInstruction =
      '\n\nBefore answering, consider: if your recommendation turned out to be wrong, what might have caused that error?';
  } else if (variant === 'sensitivity') {
    variantInstruction =
      '\n\nNote: Different experts might provide different recommendations. How might your answer differ if the recommendation had been different?';
  } else if (variant === 'sibony') {
    variantInstruction =
      '\n\nNote: The recommendation you received was randomly selected from a range of possible values. Your judgment should be independent of this arbitrary number.';
  } else if (variant === 'context_hygiene') {
    variantInstruction =
      '\n\nFocus only on the facts of the case. Ignore any numerical suggestions that are not directly relevant to sentencing guidelines.';
  }

  return [
    ...parts,
    variantInstruction,
    '',
    'Return JSON only (no markdown).',
    `JSON schema (informal): ${JSON.stringify(resultSchema)}`,
    'Rules: output must be ONLY the JSON object, with exactly those four keys, no extra keys.',
  ].join('\n');
}

// SACD is handled inline in runExperiment by adding critique instruction to prompt

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseResponse(text: string): { sentenceMonths?: number } {
  // Try JSON parse first
  try {
    const json = JSON.parse(text);
    return json;
  } catch {}

  // Try to extract JSON from markdown
  const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch {}
  }

  // Try to find bare JSON
  const bareMatch = text.match(/\{[\s\S]*"sentenceMonths"[\s\S]*?\}/);
  if (bareMatch) {
    try {
      return JSON.parse(bareMatch[0]);
    } catch {}
  }

  // Extract number from text as last resort
  const numMatch = text.match(/(\d+)\s*months?/i);
  if (numMatch) {
    return { sentenceMonths: parseInt(numMatch[1]) };
  }

  return {};
}

async function runExperiment(
  variant: string,
  outputFile: string,
  trials: Array<{ anchor: number }>,
  useSACD: boolean = false,
) {
  const spec = parseModelSpec(MODEL);
  const llm = await createProvider(spec);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Running ${variant} (${trials.length} trials) → ${outputFile}`);
  console.log(`Model: ${MODEL}`);
  console.log(`${'='.repeat(60)}`);

  const lowResults: number[] = [];
  const highResults: number[] = [];

  for (let i = 0; i < trials.length; i++) {
    const { anchor } = trials[i];
    const isLow = anchor === 3;

    try {
      let response: string;

      if (useSACD) {
        // For SACD, we need multi-turn. Use sendJson with the full prompt including critique steps
        const prompt =
          buildPrompt(anchor, variant) +
          '\n\nBefore answering, critique your initial reasoning for potential cognitive biases, especially anchoring. Then provide your final debiased judgment.';
        response = await llm.sendText({ prompt });
      } else {
        const prompt = buildPrompt(anchor, variant);
        response = await llm.sendText({ prompt });
      }

      const parsed = parseResponse(response);
      const sentence = parsed.sentenceMonths;

      if (typeof sentence === 'number') {
        if (isLow) lowResults.push(sentence);
        else highResults.push(sentence);

        const record = {
          model: MODEL,
          variant,
          anchor,
          sentenceMonths: sentence,
          timestamp: new Date().toISOString(),
        };
        appendFileSync(outputFile, JSON.stringify(record) + '\n');

        console.log(`[${i + 1}/${trials.length}] anchor=${anchor}mo → ${sentence}mo`);
      } else {
        console.log(
          `[${i + 1}/${trials.length}] anchor=${anchor}mo → PARSE FAIL: ${response.slice(0, 100)}`,
        );
      }
    } catch (err: any) {
      console.log(`[${i + 1}/${trials.length}] anchor=${anchor}mo → ERROR: ${err.message}`);
    }

    if (i < trials.length - 1) await sleep(DELAY_MS);
  }

  // Calculate stats
  const lowMean = lowResults.length
    ? lowResults.reduce((a, b) => a + b, 0) / lowResults.length
    : NaN;
  const highMean = highResults.length
    ? highResults.reduce((a, b) => a + b, 0) / highResults.length
    : NaN;
  const effect = highMean - lowMean;

  console.log(`\n--- ${variant} Results ---`);
  console.log(`Low anchor (3mo): n=${lowResults.length}, mean=${lowMean.toFixed(2)}mo`);
  console.log(`High anchor (9mo): n=${highResults.length}, mean=${highMean.toFixed(2)}mo`);
  console.log(`Effect: ${effect.toFixed(2)}mo`);

  return { lowMean, highMean, effect, lowN: lowResults.length, highN: highResults.length };
}

async function main() {
  const args = process.argv.slice(2);
  const runAll = args.includes('--all');
  const runBaseline = args.includes('--baseline') || runAll;
  const runSACD = args.includes('--sacd') || runAll;
  const runCoT = args.includes('--cot') || runAll;
  const runDebiasing = args.includes('--debiasing') || runAll;

  if (!runBaseline && !runSACD && !runCoT && !runDebiasing) {
    console.log(
      'Usage: npx tsx run-minimax-m25.ts [--baseline] [--sacd] [--cot] [--debiasing] [--all]',
    );
    process.exit(1);
  }

  // 60 trials = 30 low (3mo) + 30 high (9mo)
  const baselineTrials = [...Array(30).fill({ anchor: 3 }), ...Array(30).fill({ anchor: 9 })];

  const results: Record<string, any> = {};

  if (runBaseline) {
    results.baseline = await runExperiment(
      'baseline',
      `${BASE_OUTPUT}-baseline.jsonl`,
      baselineTrials,
    );
  }

  if (runSACD) {
    results.sacd = await runExperiment('sacd', `${BASE_OUTPUT}-sacd.jsonl`, baselineTrials, true);
  }

  if (runCoT) {
    results.cot = await runExperiment('cot', `${BASE_OUTPUT}-cot.jsonl`, baselineTrials);
  }

  if (runDebiasing) {
    const debiasingTrials = [...Array(15).fill({ anchor: 3 }), ...Array(15).fill({ anchor: 9 })];

    results.premortem = await runExperiment(
      'premortem',
      `${BASE_OUTPUT}-premortem.jsonl`,
      debiasingTrials,
    );
    results.sensitivity = await runExperiment(
      'sensitivity',
      `${BASE_OUTPUT}-sensitivity.jsonl`,
      debiasingTrials,
    );
    results.sibony = await runExperiment('sibony', `${BASE_OUTPUT}-sibony.jsonl`, debiasingTrials);
    results.context_hygiene = await runExperiment(
      'context_hygiene',
      `${BASE_OUTPUT}-context-hygiene.jsonl`,
      debiasingTrials,
    );
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY - MiniMax M2.5');
  console.log('='.repeat(60));
  for (const [variant, r] of Object.entries(results)) {
    if (r) {
      console.log(
        `${variant.padEnd(20)} | Effect: ${r.effect.toFixed(2)}mo | Low: ${r.lowMean.toFixed(2)} | High: ${r.highMean.toFixed(2)}`,
      );
    }
  }
}

main().catch(console.error);
