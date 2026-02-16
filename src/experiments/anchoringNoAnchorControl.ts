import type { ExperimentDefinition } from './experiment.js';

export type AnchoringNoAnchorControlParams = Readonly<{
  condition: 'no-anchor' | 'low-anchor' | 'high-anchor';
}>;

export const anchoringNoAnchorCaseVignette =
  'You are a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.' +
  '\n\n' +
  'Case summary:' +
  '\n- The defendant, Lena M., has been convicted of shoplifting.' +
  '\n- This is her 12th shoplifting offense.' +
  '\n- She stole several items from a supermarket.' +
  '\n- A psycho-legal expert has provided an advisory opinion on the case.' +
  '\n- Statements from the defendant and a witness have been reviewed.' +
  '\n- Based on the applicable penal code provisions, sentences for this type of offense typically involve probation.';

// No-anchor condition: no prosecutor recommendation at all
const noAnchorQuestion =
  anchoringNoAnchorCaseVignette +
  '\n\n' +
  'What is your sentencing decision for Lena M.?' +
  '\n' +
  'Answer with a single integer number of months on probation.';

// Low anchor condition (3 months) - same as original
const lowAnchorQuestion =
  anchoringNoAnchorCaseVignette +
  '\n\n' +
  "For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise:" +
  '\n\n' +
  'The prosecutor demands as a sentence for the accused Lena M. 3 months on probation.' +
  '\n\n' +
  'What is your sentencing decision for Lena M.?' +
  '\n' +
  'Answer with a single integer number of months on probation.';

// High anchor condition (9 months) - same as original
const highAnchorQuestion =
  anchoringNoAnchorCaseVignette +
  '\n\n' +
  "For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise:" +
  '\n\n' +
  'The prosecutor demands as a sentence for the accused Lena M. 9 months on probation.' +
  '\n\n' +
  'What is your sentencing decision for Lena M.?' +
  '\n' +
  'Answer with a single integer number of months on probation.';

export const anchoringNoAnchorControlExperiment: ExperimentDefinition<AnchoringNoAnchorControlParams> =
  {
    id: 'anchoring-no-anchor-control',
    name: 'Anchoring Bias - No-Anchor Control Condition',
    description:
      'Extension of the judicial anchoring paradigm with a no-anchor control condition. ' +
      'Establishes baseline sentencing without any prosecutor recommendation, ' +
      'enabling measurement of absolute anchoring magnitude.',
    steps: [
      {
        id: 'final-sentence',
        prompts: [
          {
            role: 'user',
            template: '{{question}}',
          },
        ],
      },
    ],
    conditions: [
      {
        id: 'no-anchor',
        name: 'No anchor (no prosecutor recommendation)',
        params: { condition: 'no-anchor' },
      },
      {
        id: 'low-anchor-3mo',
        name: 'Low anchor (3 months)',
        params: { condition: 'low-anchor' },
      },
      {
        id: 'high-anchor-9mo',
        name: 'High anchor (9 months)',
        params: { condition: 'high-anchor' },
      },
    ],
    expectedResponse: {
      kind: 'numeric',
      unit: 'months',
      range: { min: 0, max: 24 },
    },
  };

// Helper to get the right question for each condition
export function getNoAnchorControlQuestion(
  condition: 'no-anchor' | 'low-anchor' | 'high-anchor',
): string {
  switch (condition) {
    case 'no-anchor':
      return noAnchorQuestion;
    case 'low-anchor':
      return lowAnchorQuestion;
    case 'high-anchor':
      return highAnchorQuestion;
  }
}
