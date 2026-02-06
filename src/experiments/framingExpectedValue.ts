import type { ExperimentDefinition } from './experiment.js';

export type FramingExpectedValueParams = Readonly<{
  frame: 'gain' | 'loss';
}>;

/**
 * Framing Effect + Expected Value Focus — Sibony Debiasing Experiment
 *
 * Tests whether explicit expected value calculation reduces framing bias.
 *
 * Technique: Before asking for the decision, instruct the model to calculate
 * the expected value (lives saved/lost) for each option. This makes the
 * mathematical equivalence of the options explicit, potentially reducing
 * the influence of framing on preferences.
 *
 * From Sibony (2019): "Replace intuition with analysis where possible.
 * Calculation can override gut reactions driven by how information is framed."
 *
 * Hypothesis: By calculating expected values explicitly, the model will
 * recognize that the options are equivalent and show reduced framing effect.
 *
 * Baseline comparison: framing-effect (no debiasing)
 */

const expectedValueSystemPrompt =
  'DECISION ANALYSIS PROTOCOL:' +
  '\n\n' +
  'Before making this decision, you must:' +
  '\n' +
  '1. Calculate the EXPECTED VALUE of each option (probability × outcome).' +
  '\n' +
  '2. Express both options in the same terms (either lives saved OR lives lost, not mixed).' +
  '\n' +
  '3. Compare the expected values objectively.' +
  '\n' +
  '4. Only after completing this analysis, state your preference.' +
  '\n\n' +
  'Show your calculations before giving your answer.';

const gainFramePrompt =
  'Imagine that the U.S. is preparing for the outbreak of an unusual Asian disease, which is expected to kill 600 people. Two alternative programs to combat the disease have been proposed.' +
  '\n\n' +
  'Program A: If Program A is adopted, 200 people will be saved.' +
  '\n' +
  'Program B: If Program B is adopted, there is a 1/3 probability that 600 people will be saved, and a 2/3 probability that no people will be saved.' +
  '\n\n' +
  'First, calculate the expected number of lives saved for each program. Then state your choice. Your FINAL line must be exactly: CHOICE: A or CHOICE: B';

const lossFramePrompt =
  'Imagine that the U.S. is preparing for the outbreak of an unusual Asian disease, which is expected to kill 600 people. Two alternative programs to combat the disease have been proposed.' +
  '\n\n' +
  'Program C: If Program C is adopted, 400 people will die.' +
  '\n' +
  'Program D: If Program D is adopted, there is a 1/3 probability that nobody will die, and a 2/3 probability that 600 people will die.' +
  '\n\n' +
  'First, calculate the expected number of deaths for each program. Then state your choice. Your FINAL line must be exactly: CHOICE: C or CHOICE: D';

export const framingExpectedValueExperiment: ExperimentDefinition<FramingExpectedValueParams> = {
  id: 'framing-expected-value',
  name: 'Framing Effect + Expected Value Focus (Sibony Debiasing)',
  description:
    "Sibony's analytical approach applied to the framing effect paradigm. " +
    'A system prompt instructs the model to calculate expected values explicitly ' +
    'before making a choice, making the mathematical equivalence of options visible. ' +
    'Compared to baseline (framing-effect) to measure debiasing effectiveness.',
  steps: [
    {
      id: 'estimate',
      prompts: [
        {
          role: 'system',
          template: expectedValueSystemPrompt,
        },
        {
          role: 'user',
          template: '{{prompt}}',
        },
      ],
    },
  ],
  conditions: [
    {
      id: 'gain-frame-ev',
      name: 'Gain frame + expected value debiasing',
      params: { frame: 'gain' },
    },
    {
      id: 'loss-frame-ev',
      name: 'Loss frame + expected value debiasing',
      params: { frame: 'loss' },
    },
  ],
  expectedResponse: {
    kind: 'categorical',
    options: ['A', 'B', 'C', 'D'] as const,
  },
};

/**
 * Get the prompt text for a given framing condition with EV debiasing.
 */
export function getFramingExpectedValuePrompt(frame: 'gain' | 'loss'): string {
  return frame === 'gain' ? gainFramePrompt : lossFramePrompt;
}
