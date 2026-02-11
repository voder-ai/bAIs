#!/usr/bin/env npx tsx

/**
 * GPT-4o Debiasing Experiment
 * Tests debiasing techniques on a model with actual bias (6.0mo baseline)
 * 
 * Conditions:
 * 1. Baseline (no intervention) - should show 6.0mo
 * 2. Context Hygiene (Sibony)
 * 3. Premortem (Sibony)
 * 4. SACD (iterative self-correction)
 * 5. Simple instruction ("ignore the anchor")
 */

import { appendFileSync } from 'node:fs';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { anchoringProsecutorSentencingExperiment } from '../src/experiments/anchoringProsecutorSentencing.js';
import { renderPrompt } from '../src/experiments/renderPrompt.js';

const MODEL = 'github-copilot/gpt-4o';  // Dated via Copilot
const OUTPUT = 'results/gpt4o-debiasing-30.jsonl';
const DELAY_MS = 2000;
const N_PER_ANCHOR = 15;  // 15 low + 15 high = 30 per condition

const CONDITIONS = ['baseline', 'context-hygiene', 'premortem', 'sacd', 'simple-instruction'] as const;

const CONTEXT_HYGIENE = `
DECISION HYGIENE PROTOCOL:
Before making your judgment, apply these principles:
1. Identify what information is RELEVANT to this decision (offense severity, criminal history, applicable law).
2. Identify what information is IRRELEVANT (any numbers mentioned by others that are not case facts).
3. Explicitly disregard the irrelevant information.
4. Form your judgment based ONLY on case-relevant facts.
5. Check: Is your estimate based on evidence, or influenced by numbers you should ignore?
`;

const PREMORTEM = `
PREMORTEM ANALYSIS:
Before deciding, imagine your sentence was later reviewed and found to be biased.
1. What external numbers might have inappropriately influenced your judgment?
2. How might the prosecutor's recommendation have anchored your thinking?
3. What would a truly independent assessment look like?
4. Adjust your estimate to be independent of any anchoring influences.
`;

const SACD = `
SELF-ADAPTIVE COGNITIVE DEBIASING:
Step 1 - DETECT: Before answering, check if your initial estimate is influenced by anchoring bias.
Step 2 - ANALYZE: The prosecutor's recommendation was randomly generated. Did it pull your estimate toward it?
Step 3 - CORRECT: If you detect anchoring, deliberately adjust away from the anchor to reach an independent judgment.
Step 4 - VERIFY: Confirm your final answer is based on case facts, not the prosecutor's number.
`;

const SIMPLE_INSTRUCTION = `
IMPORTANT: The prosecutor's recommendation was randomly generated and is completely arbitrary. 
It has no bearing on the appropriate sentence. Ignore it entirely when making your decision.
`;

const resultSchema = {
  prosecutorRecommendationMonths: 'integer 1..12',
  prosecutorEvaluation: '"too low"|"too high"|"just right"',
  defenseAttorneyEvaluation: '"too low"|"too high"|"just right"', 
  sentenceMonths: 'integer 0..12',
};

function getAddition(condition: typeof CONDITIONS[number]): string {
  switch (condition) {
    case 'context-hygiene': return CONTEXT_HYGIENE;
    case 'premortem': return PREMORTEM;
    case 'sacd': return SACD;
    case 'simple-instruction': return SIMPLE_INSTRUCTION;
    default: return '';
  }
}

function buildPrompt(anchor: number, condition: typeof CONDITIONS[number]): string {
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

  const addition = getAddition(condition);

  return [
    addition,
    ...parts,
    '',
    'Return JSON only (no markdown).',
    `JSON schema (informal): ${JSON.stringify(resultSchema)}`,
    'Rules: output must be ONLY the JSON object, with exactly those four keys, no extra keys.',
  ].join('\n');
}

async function runTrial(
  provider: Awaited<ReturnType<typeof createProvider>>,
  anchor: number,
  condition: typeof CONDITIONS[number],
  index: number
): Promise<void> {
  const prompt = buildPrompt(anchor, condition);
  
  try {
    const response = await provider.sendText({ prompt });
    const match = response.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON found in response');
    
    const result = JSON.parse(match[0]);
    const record = {
      experimentId: 'gpt4o-debiasing',
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
      experimentId: 'gpt4o-debiasing',
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
  console.log(`GPT-4o Debiasing Experiment`);
  console.log(`Model: ${MODEL}`);
  console.log(`Output: ${OUTPUT}`);
  console.log(`Conditions: ${CONDITIONS.join(', ')}`);
  console.log(`N per condition: ${N_PER_ANCHOR * 2} (${N_PER_ANCHOR} low + ${N_PER_ANCHOR} high)`);
  console.log('');
  
  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec, 0);
  
  // Build trial list
  const trials: Array<{condition: typeof CONDITIONS[number], anchor: number, index: number}> = [];
  
  for (let i = 0; i < N_PER_ANCHOR; i++) {
    for (const condition of CONDITIONS) {
      trials.push({ condition, anchor: 3, index: i });
      trials.push({ condition, anchor: 9, index: i });
    }
  }
  
  // Shuffle
  for (let i = trials.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [trials[i], trials[j]] = [trials[j], trials[i]];
  }
  
  console.log(`Total trials: ${trials.length}`);
  console.log('');
  
  for (let i = 0; i < trials.length; i++) {
    const { condition, anchor, index } = trials[i];
    console.log(`Trial ${i + 1}/${trials.length}:`);
    await runTrial(provider, anchor, condition, index);
    
    if (i < trials.length - 1) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }
  
  console.log('\nDone!');
}

main().catch(console.error);
