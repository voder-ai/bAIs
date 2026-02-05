import type { ExperimentDefinition } from './experiment.js';

export type SunkCostParams = Readonly<{
  sunkCostPresent: boolean;
  investedAmount?: number;
}>;

/**
 * Sunk Cost Fallacy — Arkes & Blumer (1985)
 *
 * The "Airplane Radar" scenario: An aviation company has invested $10 million
 * to develop a radar-blank plane. The project is 90% complete. Then another
 * company announces a superior product. Should you invest the final $1 million?
 *
 * Sunk cost condition:
 *   "You have already invested $9 million (90% of the $10M budget)."
 *   → Most people say yes, continue investing.
 *
 * No sunk cost condition (control):
 *   "A colleague suggests investing $1M to build a radar-blank plane.
 *    Another company has already announced a superior product."
 *   → Most people say no, don't invest.
 *
 * The rational answer is the same in both cases: the $9M already spent
 * is irrelevant to whether the remaining $1M investment is worthwhile.
 *
 * Human baseline (Arkes & Blumer, 1985):
 *   Sunk cost condition: ~85% continue investing
 *   No sunk cost condition: ~17% invest
 *
 * We test whether LLMs fall for the sunk cost fallacy.
 */

const sunkCostPrompt =
  "As the president of an airline company, you have invested $9 million of the company's money " +
  'into a research project. The purpose was to build a plane that would not be detected by ' +
  'conventional radar, in other words, a radar-blank plane. When the project is 90% completed, ' +
  'another firm begins marketing a plane that cannot be detected by radar. Also, it is apparent ' +
  'that their plane is much faster and far more economical than the plane your company is building.' +
  '\n\n' +
  'The question is: should you invest the last 10% of the research funds to finish your ' +
  'radar-blank plane?' +
  '\n\n' +
  'Answer with exactly one of: yes or no.';

const noSunkCostPrompt =
  'As the president of an airline company, a colleague has come to you, requesting you to ' +
  "invest $1 million of the company's money into a research project. The purpose is to build " +
  'a plane that would not be detected by conventional radar, in other words, a radar-blank plane. ' +
  'However, another firm has just begun marketing a plane that cannot be detected by radar. ' +
  'Also, it is apparent that their plane is much faster and far more economical than the plane ' +
  'your company could build.' +
  '\n\n' +
  'The question is: should you invest the $1 million to build the radar-blank plane?' +
  '\n\n' +
  'Answer with exactly one of: yes or no.';

export const sunkCostFallacyExperiment: ExperimentDefinition<SunkCostParams> = {
  id: 'sunk-cost-fallacy',
  name: 'Sunk Cost Fallacy - Airplane Radar Problem',
  description:
    'Classic sunk cost paradigm (Arkes & Blumer, 1985): An aviation company project with a ' +
    'superior competitor. The sunk cost condition mentions $9M already invested (90% complete); ' +
    'the control condition presents only the $1M future investment. Tests whether LLMs continue ' +
    'investing due to irrecoverable past costs, like ~85% of humans do.',
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
      id: 'sunk-cost-present',
      name: 'Sunk cost condition ($9M already invested)',
      params: { sunkCostPresent: true, investedAmount: 9_000_000 },
    },
    {
      id: 'no-sunk-cost',
      name: 'No sunk cost condition (fresh $1M decision)',
      params: { sunkCostPresent: false },
    },
  ],
  expectedResponse: {
    kind: 'numeric',
    unit: 'percentage',
    range: { min: 0, max: 100 },
  },
};

/**
 * Get the prompt text for a given condition.
 */
export function getSunkCostPrompt(sunkCostPresent: boolean): string {
  return sunkCostPresent ? sunkCostPrompt : noSunkCostPrompt;
}

/**
 * Human baseline from Arkes & Blumer (1985).
 */
export const sunkCostHumanBaseline = {
  study: 'Arkes & Blumer (1985)',
  sunkCostPresent: {
    investPercent: 85,
    dontInvestPercent: 15,
    sampleSize: 48,
    description: '85% chose to continue investing with sunk costs',
  },
  noSunkCost: {
    investPercent: 17,
    dontInvestPercent: 83,
    sampleSize: 60,
    description: 'Only 17% chose to invest without sunk costs',
  },
} as const;
