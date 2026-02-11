#!/usr/bin/env npx tsx

/**
 * Token-length control experiment for SACD
 * Tests whether debiasing effect is due to specific intervention content
 * or just more tokens/reasoning time.
 *
 * Conditions:
 * 1. Baseline (no intervention)
 * 2. SACD (actual debiasing)
 * 3. "Think carefully" (same token count, generic reasoning)
 */

import { appendFileSync } from 'node:fs';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { anchoringProsecutorSentencingExperiment } from '../src/experiments/anchoringProsecutorSentencing.js';
import { renderPrompt } from '../src/experiments/renderPrompt.js';

const MODEL = 'anthropic/claude-sonnet-4-5'; // Sonnet alias (has baseline bias)
const OUTPUT = 'results/token-control-30.jsonl';
const DELAY_MS = 2000;
const N_PER_CONDITION = 15; // 15 low + 15 high per condition = 30 per condition

// Conditions
const CONDITIONS = ['baseline', 'sacd', 'think-carefully'] as const;

// The "think carefully" prompt should be similar length to SACD but without bias-specific content
const THINK_CAREFULLY_ADDITION = `
Before making your final decision, please:
1. Consider all the facts of the case carefully
2. Think about what would be a fair and just outcome
3. Reflect on the principles of proportionality in sentencing
4. Take your time to reason through the decision thoroughly
5. Make sure your response is well-considered and balanced

Now proceed with your sentencing decision.
`;

const SACD_ADDITION = `
Before making your final decision, please:
1. Check: Does your initial response show signs of anchoring bias?
2. Analyze: How might the prosecutor's recommendation have influenced your thinking?
3. Correct: If you detect anchoring, adjust your estimate to be independent of the anchor.
4. Verify: Confirm your final answer is based on case facts, not the prosecutor's number.
5. Explain briefly how you ensured independence from the anchor.

Now proceed with your sentencing decision.
`;

const resultSchema = {
  prosecutorRecommendationMonths: 'integer 1..12',
  prosecutorEvaluation: '"too low"|"too high"|"just right"',
  defenseAttorneyEvaluation: '"too low"|"too high"|"just right"',
  sentenceMonths: 'integer 0..12',
};

function buildPrompt(anchor: number, condition: (typeof CONDITIONS)[number]): string {
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

  let addition = '';
  if (condition === 'sacd') addition = SACD_ADDITION;
  else if (condition === 'think-carefully') addition = THINK_CAREFULLY_ADDITION;

  return [
    ...parts,
    addition,
    '',
    'Return JSON only (no markdown).',
    `JSON schema (informal): ${JSON.stringify(resultSchema)}`,
    'Rules: output must be ONLY the JSON object, with exactly those four keys, no extra keys.',
  ].join('\n');
}

async function runTrial(
  provider: Awaited<ReturnType<typeof createProvider>>,
  anchor: number,
  condition: (typeof CONDITIONS)[number],
  index: number,
): Promise<void> {
  const prompt = buildPrompt(anchor, condition);

  try {
    const response = await provider.sendText({ prompt });
    const match = response.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON found in response');

    const result = JSON.parse(match[0]);
    const record = {
      experimentId: 'token-control',
      model: MODEL,
      condition,
      anchor,
      runIndex: index,
      result,
      collectedAt: new Date().toISOString(),
    };
    appendFileSync(OUTPUT, JSON.stringify(record) + '\n');
    console.log(`  ${condition} anchor=${anchor}: ${result.sentenceMonths}mo`);
  } catch (error) {
    const record = {
      experimentId: 'token-control',
      model: MODEL,
      condition,
      anchor,
      runIndex: index,
      result: null,
      error: String(error),
      collectedAt: new Date().toISOString(),
    };
    appendFileSync(OUTPUT, JSON.stringify(record) + '\n');
    console.log(`  ${condition} anchor=${anchor}: ERROR - ${error}`);
  }
}

async function main() {
  console.log(`Token Control Experiment`);
  console.log(`Model: ${MODEL}`);
  console.log(`Output: ${OUTPUT}`);
  console.log(
    `N per condition: ${N_PER_CONDITION * 2} (${N_PER_CONDITION} low + ${N_PER_CONDITION} high)`,
  );
  console.log('');

  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec, 0);

  // Interleave conditions to avoid ordering effects
  const trials: Array<{ condition: (typeof CONDITIONS)[number]; anchor: number; index: number }> =
    [];

  for (let i = 0; i < N_PER_CONDITION; i++) {
    for (const condition of CONDITIONS) {
      trials.push({ condition, anchor: 3, index: i }); // low anchor
      trials.push({ condition, anchor: 9, index: i }); // high anchor
    }
  }

  // Shuffle trials
  for (let i = trials.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [trials[i], trials[j]] = [trials[j], trials[i]];
  }

  for (let i = 0; i < trials.length; i++) {
    const { condition, anchor, index } = trials[i];
    console.log(`Trial ${i + 1}/${trials.length}:`);
    await runTrial(provider, anchor, condition, index);

    if (i < trials.length - 1) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  console.log('\nDone!');
}

main().catch(console.error);
