import type { ExperimentDefinition } from './experiment.js';

export type ConjunctionFallacyParams = Readonly<{
  scenario: 'linda' | 'bill';
}>;

/**
 * Conjunction Fallacy — Tversky & Kahneman (1983)
 *
 * The "Linda Problem": Participants read a description of a person that
 * stereotypically matches a particular category, then judge whether a
 * conjunction (A ∧ B) is more probable than one of its constituents (B).
 *
 * By the conjunction rule of probability, P(A ∧ B) ≤ P(B), always.
 * Yet humans systematically rate the conjunction as more probable.
 *
 * Linda scenario:
 *   Linda is 31 years old, single, outspoken, and very bright. She majored
 *   in philosophy. As a student, she was deeply concerned with issues of
 *   discrimination and social justice, and also participated in anti-nuclear
 *   demonstrations.
 *
 *   Which is more probable?
 *   (a) Linda is a bank teller.
 *   (b) Linda is a bank teller and is active in the feminist movement.
 *
 * Human baseline (Tversky & Kahneman 1983):
 *   ~85% choose (b) — the conjunction — violating probability rules.
 *
 * Bill scenario (replication with different content):
 *   Bill is 34 years old. He is intelligent, but unimaginative, compulsive,
 *   and generally lifeless. In school, he was strong in mathematics but weak
 *   in social studies and humanities.
 *
 *   Which is more probable?
 *   (a) Bill is an accountant.
 *   (b) Bill is an accountant who plays jazz for a hobby.
 *
 * We test whether LLMs commit the same fallacy.
 */

const lindaDescription =
  'Linda is 31 years old, single, outspoken, and very bright. She majored in philosophy. ' +
  'As a student, she was deeply concerned with issues of discrimination and social justice, ' +
  'and also participated in anti-nuclear demonstrations.';

const lindaPrompt =
  lindaDescription +
  '\n\n' +
  'Which is more probable?' +
  '\n(a) Linda is a bank teller.' +
  '\n(b) Linda is a bank teller and is active in the feminist movement.' +
  '\n\n' +
  'Answer with exactly one of: a or b.';

const billDescription =
  'Bill is 34 years old. He is intelligent, but unimaginative, compulsive, and generally lifeless. ' +
  'In school, he was strong in mathematics but weak in social studies and humanities.';

const billPrompt =
  billDescription +
  '\n\n' +
  'Which is more probable?' +
  '\n(a) Bill is an accountant.' +
  '\n(b) Bill is an accountant who plays jazz for a hobby.' +
  '\n\n' +
  'Answer with exactly one of: a or b.';

export const conjunctionFallacyExperiment: ExperimentDefinition<ConjunctionFallacyParams> = {
  id: 'conjunction-fallacy',
  name: 'Conjunction Fallacy - Linda/Bill Problem',
  description:
    'Classic conjunction fallacy paradigm (Tversky & Kahneman, 1983): A personality description ' +
    'stereotypically associated with a conjunction (e.g., bank teller AND feminist), then asked ' +
    'which is more probable — the constituent alone or the conjunction. Tests whether LLMs ' +
    'violate the conjunction rule of probability like ~85% of humans do.',
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
      id: 'linda',
      name: 'Linda scenario (bank teller / feminist)',
      params: { scenario: 'linda' },
    },
    {
      id: 'bill',
      name: 'Bill scenario (accountant / jazz player)',
      params: { scenario: 'bill' },
    },
  ],
  expectedResponse: {
    kind: 'categorical',
    options: ['a', 'b'] as const,
  },
};

/**
 * Get the prompt text for a given scenario.
 */
export function getConjunctionPrompt(scenario: 'linda' | 'bill'): string {
  return scenario === 'linda' ? lindaPrompt : billPrompt;
}

/**
 * Human baseline from Tversky & Kahneman (1983).
 */
export const conjunctionFallacyHumanBaseline = {
  study: 'Tversky & Kahneman (1983)',
  linda: {
    conjunctionPercent: 85,
    correctPercent: 15,
    sampleSize: 142,
    description: '85% chose conjunction (b) over constituent (a)',
  },
  bill: {
    conjunctionPercent: 72,
    correctPercent: 28,
    sampleSize: 94,
    description: '72% chose conjunction (b) over constituent (a)',
  },
} as const;
