import type { ExperimentDefinition } from './experiment.js';

export type NovelFramingParams = Readonly<{
  scenario: 'layoffs' | 'scholarships' | 'pollution' | 'servers';
  frame: 'gain' | 'loss';
}>;

/**
 * Novel Framing Effect Scenarios
 *
 * Same logical structure as Tversky & Kahneman's "Asian disease" problem,
 * but with completely fresh contexts that wouldn't be in training data.
 *
 * Purpose: Test whether LLM framing effects are:
 * 1. Genuine susceptibility to framing (like humans), OR
 * 2. Memorization of "Asian disease = choose A for gains, D for losses"
 *
 * Classic contaminated examples:
 * - Asian disease (600 lives)
 * - Medical treatment decisions
 *
 * These novel scenarios test the same cognitive bias with fresh details.
 *
 * The core structure:
 * - Gain frame: X will be saved (certain) vs. 1/3 chance all saved (risky)
 * - Loss frame: X will be lost (certain) vs. 2/3 chance all lost (risky)
 *
 * Human pattern (T&K): Prefer certainty in gains (~72%), prefer risk in losses (~78%)
 */

const scenarios = {
  layoffs: {
    context: `A manufacturing company is facing financial difficulties and must lay off some of its 600 employees. Two restructuring plans have been proposed.`,
    gainOptions: {
      A: 'If Plan A is adopted, 200 jobs will be saved.',
      B: 'If Plan B is adopted, there is a 1/3 probability that all 600 jobs will be saved, and a 2/3 probability that no jobs will be saved.',
    },
    lossOptions: {
      C: 'If Plan C is adopted, 400 workers will lose their jobs.',
      D: 'If Plan D is adopted, there is a 1/3 probability that nobody will lose their job, and a 2/3 probability that all 600 workers will lose their jobs.',
    },
  },

  scholarships: {
    context: `A university foundation has funding that must be allocated before year-end. There are 600 qualified students awaiting scholarship decisions. Two allocation strategies are available.`,
    gainOptions: {
      A: 'If Strategy A is adopted, 200 students will receive full scholarships.',
      B: 'If Strategy B is adopted, there is a 1/3 probability that all 600 students will receive scholarships, and a 2/3 probability that no students will receive scholarships.',
    },
    lossOptions: {
      C: 'If Strategy C is adopted, 400 students will not receive scholarships.',
      D: 'If Strategy D is adopted, there is a 1/3 probability that no students will miss out, and a 2/3 probability that all 600 students will miss out on scholarships.',
    },
  },

  pollution: {
    context: `An environmental agency must respond to an industrial spill threatening 600 hectares of wetland. Two cleanup approaches are being considered.`,
    gainOptions: {
      A: 'If Approach A is adopted, 200 hectares will be fully protected.',
      B: 'If Approach B is adopted, there is a 1/3 probability that all 600 hectares will be fully protected, and a 2/3 probability that no hectares will be protected.',
    },
    lossOptions: {
      C: 'If Approach C is adopted, 400 hectares will be destroyed.',
      D: 'If Approach D is adopted, there is a 1/3 probability that no hectares will be destroyed, and a 2/3 probability that all 600 hectares will be destroyed.',
    },
  },

  servers: {
    context: `A tech company's data center experienced a major outage affecting 600 critical servers. The ops team has two recovery strategies.`,
    gainOptions: {
      A: 'If Strategy A is adopted, 200 servers will be restored immediately.',
      B: 'If Strategy B is adopted, there is a 1/3 probability that all 600 servers will be restored, and a 2/3 probability that no servers will be restored.',
    },
    lossOptions: {
      C: 'If Strategy C is adopted, 400 servers will remain offline.',
      D: 'If Strategy D is adopted, there is a 1/3 probability that no servers will remain offline, and a 2/3 probability that all 600 servers will remain offline.',
    },
  },
} as const;

function buildPrompt(scenario: keyof typeof scenarios, frame: 'gain' | 'loss'): string {
  const s = scenarios[scenario];

  if (frame === 'gain') {
    return (
      s.context +
      '\n\n' +
      s.gainOptions.A +
      '\n\n' +
      s.gainOptions.B +
      '\n\n' +
      'Which plan do you prefer? Answer with exactly one of: A or B.'
    );
  } else {
    return (
      s.context +
      '\n\n' +
      s.lossOptions.C +
      '\n\n' +
      s.lossOptions.D +
      '\n\n' +
      'Which plan do you prefer? Answer with exactly one of: C or D.'
    );
  }
}

export const novelFramingExperiment: ExperimentDefinition<NovelFramingParams> = {
  id: 'framing-effect-novel',
  name: 'Framing Effect - Novel Scenarios (Contamination Test)',
  description:
    'Tests whether LLM framing effects are genuine cognitive bias or memorization of ' +
    'famous "Asian disease" example. Uses novel scenarios with same logical structure.',
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
    // Gain frame conditions
    {
      id: 'layoffs-gain',
      name: 'Layoffs (gain frame)',
      params: { scenario: 'layoffs', frame: 'gain' },
    },
    {
      id: 'layoffs-loss',
      name: 'Layoffs (loss frame)',
      params: { scenario: 'layoffs', frame: 'loss' },
    },
    {
      id: 'scholarships-gain',
      name: 'Scholarships (gain frame)',
      params: { scenario: 'scholarships', frame: 'gain' },
    },
    {
      id: 'scholarships-loss',
      name: 'Scholarships (loss frame)',
      params: { scenario: 'scholarships', frame: 'loss' },
    },
    {
      id: 'pollution-gain',
      name: 'Pollution (gain frame)',
      params: { scenario: 'pollution', frame: 'gain' },
    },
    {
      id: 'pollution-loss',
      name: 'Pollution (loss frame)',
      params: { scenario: 'pollution', frame: 'loss' },
    },
    {
      id: 'servers-gain',
      name: 'Servers (gain frame)',
      params: { scenario: 'servers', frame: 'gain' },
    },
    {
      id: 'servers-loss',
      name: 'Servers (loss frame)',
      params: { scenario: 'servers', frame: 'loss' },
    },
  ],
  expectedResponse: {
    kind: 'categorical',
    options: ['A', 'B', 'C', 'D'] as const,
  },
};

export function getNovelFramingPrompt(
  scenario: keyof typeof scenarios,
  frame: 'gain' | 'loss',
): string {
  return buildPrompt(scenario, frame);
}

/**
 * Interpretation:
 *
 * FRAMING EFFECT = Preference reversal between gain and loss frames
 * - Gain frame: Prefer A (certain) over B (risky) — risk aversion
 * - Loss frame: Prefer D (risky) over C (certain) — risk seeking
 *
 * Human pattern (T&K): ~72% A in gain, ~78% D in loss
 *
 * If LLMs show reversal on novel scenarios → genuine framing susceptibility
 * If LLMs show consistent pattern (no reversal) → rational/unbiased
 * If LLMs show reversal on Asian disease but not novel → memorization
 */
export const novelFramingInterpretation = {
  genuineBias: 'LLMs show preference reversal on novel scenarios — genuine framing effect',
  rational: 'LLMs choose consistently across frames — no framing bias',
  memorization: 'LLMs show reversal on Asian disease but not novel scenarios — memorized pattern',
} as const;
