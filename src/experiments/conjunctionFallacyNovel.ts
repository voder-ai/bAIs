import type { ExperimentDefinition } from './experiment.js';

export type NovelConjunctionParams = Readonly<{
  scenario: 'sarah' | 'marcus' | 'elena' | 'raj' | 'sophie';
}>;

/**
 * Novel Conjunction Fallacy Scenarios
 *
 * Same logical structure as Tversky & Kahneman's Linda problem,
 * but with completely fresh names, professions, and details
 * that wouldn't be in training data.
 *
 * Purpose: Test whether LLMs avoiding the fallacy is due to:
 * 1. Genuine probabilistic reasoning, OR
 * 2. Memorizing "Linda problem = trick question"
 *
 * If LLMs pass novel scenarios → genuine reasoning
 * If LLMs fail novel scenarios but pass Linda → memorization
 */

const scenarios = {
  sarah: {
    description:
      'Sarah is 28 years old, creative, and passionate about making a difference. ' +
      'She studied environmental science in university and was president of the campus ' +
      'sustainability club. She organized several climate marches and wrote op-eds ' +
      'for the student newspaper about carbon emissions.',
    optionA: 'Sarah is an elementary school teacher.',
    optionB:
      'Sarah is an elementary school teacher who volunteers for environmental advocacy groups.',
  },
  marcus: {
    description:
      'Marcus is 42 years old, analytical, and enjoys solitary activities. ' +
      'He has a PhD in mathematics and spends weekends solving complex puzzles. ' +
      'His apartment is meticulously organized and he keeps detailed spreadsheets ' +
      'tracking everything from expenses to his daily routines.',
    optionA: 'Marcus is a software engineer.',
    optionB: 'Marcus is a software engineer who competes in chess tournaments.',
  },
  elena: {
    description:
      'Elena is 35 years old, energetic, and thrives on physical challenges. ' +
      'She was a varsity athlete in college and still wakes up at 5am to train. ' +
      'Her social media is full of hiking photos and she volunteers as a ' +
      'wilderness rescue team member on weekends.',
    optionA: 'Elena is a nurse.',
    optionB: 'Elena is a nurse who runs ultramarathons.',
  },
  raj: {
    description:
      'Raj is 38 years old, reserved, and has an artistic sensibility. ' +
      'He studied art history before switching to business school. ' +
      'His office is decorated with prints of classical paintings and ' +
      'he spends his vacations visiting museums across Europe.',
    optionA: 'Raj is a management consultant.',
    optionB: 'Raj is a management consultant who paints watercolors as a hobby.',
  },
  sophie: {
    description:
      'Sophie is 29 years old, empathetic, and has always loved animals. ' +
      "She grew up on a small farm and still visits her parents' horses regularly. " +
      "Her apartment building doesn't allow pets, but she follows dozens of " +
      'animal rescue accounts and donates monthly to wildlife conservation.',
    optionA: 'Sophie is a corporate lawyer.',
    optionB: 'Sophie is a corporate lawyer who volunteers at an animal shelter.',
  },
} as const;

function buildPrompt(scenario: keyof typeof scenarios): string {
  const s = scenarios[scenario];
  return (
    s.description +
    '\n\n' +
    'Which is more probable?' +
    '\n(a) ' +
    s.optionA +
    '\n(b) ' +
    s.optionB +
    '\n\n' +
    'Answer with exactly one of: a or b.'
  );
}

export const novelConjunctionExperiment: ExperimentDefinition<NovelConjunctionParams> = {
  id: 'conjunction-fallacy-novel',
  name: 'Conjunction Fallacy - Novel Scenarios (Contamination Test)',
  description:
    'Tests whether LLMs avoiding the conjunction fallacy is genuine reasoning or ' +
    'memorization of famous examples like "Linda the bank teller". Uses completely ' +
    'novel names, professions, and details with the same logical structure.',
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
    { id: 'sarah', name: 'Sarah (teacher / environmental)', params: { scenario: 'sarah' } },
    { id: 'marcus', name: 'Marcus (engineer / chess)', params: { scenario: 'marcus' } },
    { id: 'elena', name: 'Elena (nurse / ultramarathon)', params: { scenario: 'elena' } },
    { id: 'raj', name: 'Raj (consultant / painter)', params: { scenario: 'raj' } },
    { id: 'sophie', name: 'Sophie (lawyer / animal shelter)', params: { scenario: 'sophie' } },
  ],
  expectedResponse: {
    kind: 'categorical',
    options: ['a', 'b'] as const,
  },
};

export function getNovelConjunctionPrompt(scenario: keyof typeof scenarios): string {
  return buildPrompt(scenario);
}

/**
 * Expected results if genuine reasoning:
 *   All scenarios → majority choose (a) [correct]
 *
 * Expected results if memorization:
 *   Linda/Bill → choose (a) [correct, memorized]
 *   Novel scenarios → choose (b) [fallacy, like humans]
 */
export const novelConjunctionInterpretation = {
  genuineReasoning: 'LLMs choose (a) across all scenarios including novel ones',
  memorization: 'LLMs choose (a) for famous examples but (b) for novel scenarios',
  humanLike: 'LLMs choose (b) across all scenarios (~85% like humans)',
} as const;
