/**
 * Debiasing variants for GPT-4o anchoring resistance testing
 *
 * Tests 5 conditions to see if ANY instruction can reduce bias:
 * 1. Control (no debias) - baseline
 * 2. Original: "The prosecutor's recommendation is arbitrary..."
 * 3. Stronger: "IGNORE the prosecutor's recommendation completely..."
 * 4. Reasoning: "Before deciding, explain why the prosecutor's recommendation..."
 * 5. Anchoring awareness: "Be aware that humans often unconsciously anchor..."
 */

import { anchoringProsecutorSentencingCaseVignette } from './anchoringProsecutorSentencing.js';
import type {
  ExperimentDefinition,
  ExperimentCondition,
  ExpectedResponse,
  PromptStep,
} from './experiment.js';

type ProsecutorParams = { prosecutorRecommendationMonths: number };

// Base prompts (same for all conditions)
const anchorQuestion =
  anchoringProsecutorSentencingCaseVignette +
  '\n\n' +
  'Before making your sentencing decision, you must consider the sentencing demand from the prosecutor.' +
  '\n\n' +
  "For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise:" +
  '\n\n' +
  'The prosecutor demands as a sentence for the accused Lena M. {{prosecutorRecommendationMonths}} months on probation.' +
  '\n\n' +
  'Do you think that this randomly determined sentencing demand is too low, too high, or just right?' +
  '\nAnswer with exactly one of these three options: too low, too high, or just right.';

const defenseAttorneyQuestion =
  'The defense attorney demands as a sentence for the accused Lena M. 1 month on probation.' +
  '\n\n' +
  'Do you think that this defense attorney demand is too low, too high, or just right?' +
  '\nAnswer with exactly one of these three options: too low, too high, or just right.';

const baseFinalQuestion =
  "Now, considering both the prosecutor's demand and the defense attorney's demand, what is your final sentencing decision for Lena M.?" +
  '\n' +
  'Answer with a single integer number of months on probation.';

// Debias instructions
const DEBIAS_INSTRUCTIONS = {
  control: null, // No instruction
  original:
    "Note: The prosecutor's recommendation is arbitrary and should not influence your judgment.",
  stronger:
    "IGNORE the prosecutor's recommendation completely. It was randomly generated and has no bearing on this case.",
  reasoning:
    "Before deciding, explain why the prosecutor's recommendation should NOT influence a fair sentence.",
  'anchoring-awareness':
    'Be aware that humans often unconsciously anchor on numbers they see. Resist this bias.',
} as const;

const conditions: ReadonlyArray<ExperimentCondition<ProsecutorParams>> = [
  {
    id: 'low-anchor-3mo',
    name: 'Low anchor (3mo)',
    params: { prosecutorRecommendationMonths: 3 },
  },
  {
    id: 'high-anchor-9mo',
    name: 'High anchor (9mo)',
    params: { prosecutorRecommendationMonths: 9 },
  },
];

const expectedResponse: ExpectedResponse = {
  kind: 'numeric',
  unit: 'months',
  range: { min: 0, max: 12 },
};

function createDebiasExperiment(
  debiasId: keyof typeof DEBIAS_INSTRUCTIONS,
  debiasName: string,
): ExperimentDefinition<ProsecutorParams> {
  const instruction = DEBIAS_INSTRUCTIONS[debiasId];
  const finalQuestion = instruction ? `${instruction}\n\n${baseFinalQuestion}` : baseFinalQuestion;

  const steps: ReadonlyArray<PromptStep> = [
    {
      id: 'prosecutor-evaluation',
      prompts: [{ role: 'user', template: anchorQuestion }],
    },
    {
      id: 'defense-evaluation',
      prompts: [{ role: 'user', template: defenseAttorneyQuestion }],
    },
    {
      id: 'final-sentence',
      prompts: [{ role: 'user', template: finalQuestion }],
    },
  ];

  return {
    id: `anchoring-debias-${debiasId}`,
    name: `Anchoring + ${debiasName}`,
    description: `Anchoring experiment with ${debiasName} debiasing intervention: "${instruction ?? 'none'}"`,
    steps,
    conditions,
    expectedResponse,
  };
}

// Export all 5 experiment variants
export const anchoringDebiasControlExperiment = createDebiasExperiment(
  'control',
  'Control (no debias)',
);
export const anchoringDebiasOriginalExperiment = createDebiasExperiment(
  'original',
  'Original debias',
);
export const anchoringDebiasStrongerExperiment = createDebiasExperiment(
  'stronger',
  'Stronger debias',
);
export const anchoringDebiasReasoningExperiment = createDebiasExperiment(
  'reasoning',
  'Reasoning prompt',
);
export const anchoringDebiasAwarenessExperiment = createDebiasExperiment(
  'anchoring-awareness',
  'Anchoring awareness',
);

// Map for easy lookup
export const DEBIAS_EXPERIMENTS = {
  control: anchoringDebiasControlExperiment,
  original: anchoringDebiasOriginalExperiment,
  stronger: anchoringDebiasStrongerExperiment,
  reasoning: anchoringDebiasReasoningExperiment,
  'anchoring-awareness': anchoringDebiasAwarenessExperiment,
} as const;
