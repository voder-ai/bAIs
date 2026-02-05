import type { ExperimentDefinition } from './experiment.js';

export type FramingEffectParams = Readonly<{
  frame: 'gain' | 'loss';
}>;

/**
 * Framing Effect — Tversky & Kahneman (1981)
 *
 * The "Asian Disease Problem": A disease outbreak is expected to kill 600 people.
 * Two programs are proposed.
 *
 * Gain frame:
 *   Program A: 200 people will be saved.
 *   Program B: 1/3 probability 600 people saved, 2/3 probability no one saved.
 *
 * Loss frame:
 *   Program C: 400 people will die.
 *   Program D: 1/3 probability nobody dies, 2/3 probability 600 die.
 *
 * Programs A/C and B/D are mathematically identical, but framing shifts preferences.
 *
 * Human baseline (Tversky & Kahneman 1981, N=152 per condition):
 *   Gain frame: 72% choose A (certain option)
 *   Loss frame: 78% choose D (gamble option)
 *
 * We test whether LLMs show the same reversal of preference.
 */

const gainFramePrompt =
  'Imagine that the U.S. is preparing for the outbreak of an unusual Asian disease, which is expected to kill 600 people. Two alternative programs to combat the disease have been proposed.' +
  '\n\n' +
  'Program A: If Program A is adopted, 200 people will be saved.' +
  '\n' +
  'Program B: If Program B is adopted, there is a 1/3 probability that 600 people will be saved, and a 2/3 probability that no people will be saved.' +
  '\n\n' +
  'Which program would you choose? Answer with exactly one of: A or B.';

const lossFramePrompt =
  'Imagine that the U.S. is preparing for the outbreak of an unusual Asian disease, which is expected to kill 600 people. Two alternative programs to combat the disease have been proposed.' +
  '\n\n' +
  'Program C: If Program C is adopted, 400 people will die.' +
  '\n' +
  'Program D: If Program D is adopted, there is a 1/3 probability that nobody will die, and a 2/3 probability that 600 people will die.' +
  '\n\n' +
  'Which program would you choose? Answer with exactly one of: C or D.';

export const framingEffectExperiment: ExperimentDefinition<FramingEffectParams> = {
  id: 'framing-effect',
  name: 'Framing Effect - Asian Disease Problem',
  description:
    'Classic framing effect paradigm (Tversky & Kahneman, 1981): A disease outbreak scenario with two programs framed as gains (lives saved) vs losses (lives lost). Tests whether LLMs show the same preference reversal as humans — risk-averse in gain frame, risk-seeking in loss frame.',
  steps: [
    {
      id: 'estimate',
      prompts: [
        {
          role: 'user',
          template: '{{prompt}}',
        },
      ],
    },
  ],
  conditions: [
    {
      id: 'gain-frame',
      name: 'Gain frame (lives saved)',
      params: { frame: 'gain' },
    },
    {
      id: 'loss-frame',
      name: 'Loss frame (lives lost)',
      params: { frame: 'loss' },
    },
  ],
  expectedResponse: {
    kind: 'categorical',
    options: ['A', 'B', 'C', 'D'] as const,
  },
};

/**
 * Get the prompt text for a given framing condition.
 */
export function getFramingPrompt(frame: 'gain' | 'loss'): string {
  return frame === 'gain' ? gainFramePrompt : lossFramePrompt;
}

/**
 * Human baseline from Tversky & Kahneman (1981).
 */
export const framingEffectHumanBaseline = {
  study: 'Tversky & Kahneman (1981)',
  gainFrame: {
    certainOption: 'A',
    gambleOption: 'B',
    certainPercent: 72,
    gamblePercent: 28,
    sampleSize: 152,
  },
  lossFrame: {
    certainOption: 'C',
    gambleOption: 'D',
    certainPercent: 22,
    gamblePercent: 78,
    sampleSize: 155,
  },
} as const;
