#!/usr/bin/env npx tsx

/**
 * Opus 4.5 Controls Experiment
 * - Token-matched control (irrelevant tokens)
 * - 3-turn random control (distraction)
 */

import { appendFileSync } from 'node:fs';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { anchoringProsecutorSentencingExperiment } from '../src/experiments/anchoringProsecutorSentencing.js';
import { renderPrompt } from '../src/experiments/renderPrompt.js';

const MODEL = 'anthropic/claude-opus-4-5-20251101';
const OUTPUT_TOKEN = 'results/opus45-control-token.jsonl';
const OUTPUT_3TURN = 'results/opus45-control-3turn.jsonl';
const RUNS_PER_CONDITION = 15; // 15 low + 15 high = 30 per control

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
  // Add irrelevant filler to match SACD token count (~200 extra tokens)
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
  // Add random distraction turns
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

async function runControl(name: string, promptFn: (anchor: number) => string, outputFile: string) {
  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Running ${name} control (${RUNS_PER_CONDITION * 2} trials)`);
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
          control: name,
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

  return { lowMean, highMean, effect };
}

async function main() {
  console.log('Opus 4.5 Controls Experiment');
  console.log(`Model: ${MODEL}`);

  const tokenResult = await runControl('token-matched', buildTokenMatchedPrompt, OUTPUT_TOKEN);
  const turnResult = await runControl('3-turn-random', build3TurnRandomPrompt, OUTPUT_3TURN);

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Token-matched: ${tokenResult.effect.toFixed(2)}mo effect`);
  console.log(`3-turn-random: ${turnResult.effect.toFixed(2)}mo effect`);
  console.log(`Baseline: 2.0mo effect`);
  console.log('Done!');
}

main().catch(console.error);
