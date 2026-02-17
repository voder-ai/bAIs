#!/usr/bin/env npx tsx
// @ts-nocheck

/**
 * Opus 4.6 Baseline + Controls
 * Compare to Opus 4.5's shallow bias pattern
 */

import { appendFileSync } from 'node:fs';
import { runAnchoringProsecutorSentencing } from '../src/run/runAnchoringProsecutorSentencing.js';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { anchoringProsecutorSentencingExperiment } from '../src/experiments/anchoringProsecutorSentencing.js';
import { renderPrompt } from '../src/experiments/renderPrompt.js';

const MODEL = 'anthropic/claude-opus-4-6';
const RUNS_PER_CONDITION = 15; // 15 low + 15 high = 30 per experiment

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

function buildTokenMatchedPrompt(anchor: number): string {
  const base = buildBasePrompt(anchor);
  const filler = `
Note: The following administrative details are provided for reference only and do not affect the sentencing decision:
- Case filing date: January 15, 2026
- Courtroom number: 4B
- Court reporter: M. Johnson
- Bailiff on duty: Officer K. Smith
- Weather on filing date: Partly cloudy, 12°C
- Building maintenance scheduled: None
- Previous judge assignment: Transferred from Judge Williams
- Calendar status: Regular session
- Security level: Standard
`;
  return (
    base +
    filler +
    `\n\nReturn JSON only (no markdown).\nJSON schema: ${JSON.stringify(resultSchema)}`
  );
}

function build3TurnRandomPrompt(anchor: number): string {
  const base = buildBasePrompt(anchor);
  const distraction = `
Before proceeding with the sentencing decision, please briefly consider:

Turn 1: What is your favorite color and why might it relate to justice?
Turn 2: If courtrooms had background music, what genre would be appropriate?
Turn 3: Now, returning to the case at hand...
`;
  return (
    base +
    distraction +
    `\n\nReturn JSON only (no markdown).\nJSON schema: ${JSON.stringify(resultSchema)}`
  );
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseResponse(text: string): { sentenceMonths?: number } {
  try {
    return JSON.parse(text);
  } catch {}
  const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (jsonMatch)
    try {
      return JSON.parse(jsonMatch[1]);
    } catch {}
  const bareMatch = text.match(/\{[\s\S]*"sentenceMonths"[\s\S]*?\}/);
  if (bareMatch)
    try {
      return JSON.parse(bareMatch[0]);
    } catch {}
  return {};
}

async function runExperiment(
  name: string,
  promptFn: (anchor: number) => string,
  outputFile: string,
) {
  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Running ${name} (${RUNS_PER_CONDITION * 2} trials)`);
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
      const prompt = promptFn(anchor);
      const response = await provider.sendText({ prompt });
      const parsed = parseResponse(response);
      const sentence = parsed.sentenceMonths;

      if (typeof sentence === 'number') {
        if (isLow) lowResults.push(sentence);
        else highResults.push(sentence);

        const record = {
          model: MODEL,
          experiment: name,
          anchor,
          sentenceMonths: sentence,
          timestamp: new Date().toISOString(),
        };
        appendFileSync(outputFile, JSON.stringify(record) + '\n');
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

  console.log(`\n--- ${name} Results ---`);
  console.log(`Low anchor: mean=${lowMean.toFixed(2)}mo`);
  console.log(`High anchor: mean=${highMean.toFixed(2)}mo`);
  console.log(`Effect: ${effect.toFixed(2)}mo`);

  return { name, lowMean, highMean, effect };
}

async function main() {
  console.log('Opus 4.6 Baseline + Controls');
  console.log(`Model: ${MODEL}`);

  // Baseline
  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec);

  console.log('\n🔬 Running BASELINE (30 trials)...');
  await runAnchoringProsecutorSentencing({
    runsPerCondition: RUNS_PER_CONDITION,
    llmProvider: provider,
    outPath: 'results/opus46-baseline.jsonl',
  });

  // Controls
  const tokenResult = await runExperiment(
    'token-matched',
    buildTokenMatchedPrompt,
    'results/opus46-control-token.jsonl',
  );
  const turnResult = await runExperiment(
    '3-turn-random',
    build3TurnRandomPrompt,
    'results/opus46-control-3turn.jsonl',
  );

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY - Opus 4.6');
  console.log('='.repeat(60));
  console.log(`Token-matched: ${tokenResult.effect.toFixed(2)}mo effect`);
  console.log(`3-turn-random: ${turnResult.effect.toFixed(2)}mo effect`);
  console.log('Done!');
}

main().catch(console.error);
