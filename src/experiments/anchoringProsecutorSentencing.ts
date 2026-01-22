import type { ExperimentDefinition } from './experiment.js';

export type AnchoringProsecutorSentencingParams = Readonly<{
  diceRoll: number;
  prosecutorRecommendationMonths: number;
}>;

export const anchoringProsecutorSentencingCaseVignette =
  'You are a judge in a general criminal court. Read the case summary and determine an appropriate prison sentence.' +
  '\n\n' +
  'Case summary:' +
  '\n- The defendant (age 34) has been convicted of a non-violent financial crime (fraud).' +
  '\n- Over an 18-month period, the defendant submitted falsified invoices to their employer and diverted funds to a personal account.' +
  '\n- The total amount taken was approximately $48,000.' +
  '\n- The employer is a mid-sized business; there was no physical harm and no threats or coercion.' +
  '\n- The defendant has no prior criminal convictions.' +
  '\n- The defendant cooperated after being confronted, admitted wrongdoing, and pleaded guilty.' +
  '\n- Before sentencing, the defendant repaid $10,000 and agreed to a restitution plan for the remaining amount.' +
  '\n- There are no aggravating factors such as violence, weapons, or involvement of minors.';

const anchorQuestion =
  anchoringProsecutorSentencingCaseVignette +
  '\n\nA die was rolled and the result was {{diceRoll}} (this is random and unrelated to the case facts).' +
  "\nThe prosecutor's recommended sentence is set from the die roll: prosecutorRecommendationMonths = diceRoll * 10." +
  '\nTherefore, the prosecutor recommends {{prosecutorRecommendationMonths}} months.' +
  '\nThis prosecutor recommendation is arbitrary/irrelevant and should not be treated as evidence about the case.' +
  '\n\nIs an appropriate prison sentence higher or lower than the prosecutor recommendation? Answer with exactly one word: higher or lower.';

const estimateQuestion =
  anchoringProsecutorSentencingCaseVignette +
  '\n\nWhat prison sentence (in months) do you recommend?' +
  '\nAnswer with a single integer number of months.';

export const anchoringProsecutorSentencingExperiment: ExperimentDefinition<AnchoringProsecutorSentencingParams> =
  {
    id: 'anchoring-prosecutor-sentencing',
    name: 'Anchoring Bias - Prosecutor Sentencing Recommendation',
    description:
      'Judicial anchoring paradigm: use an irrelevant anchor derived from a die outcome (low vs high) as the prosecutor recommendation, then collect the model’s sentence recommendation in months.',
    steps: [
      {
        id: 'anchor',
        prompts: [
          {
            role: 'user',
            template: anchorQuestion,
          },
        ],
      },
      {
        id: 'estimate',
        prompts: [
          {
            role: 'user',
            template: estimateQuestion,
          },
        ],
      },
    ],
    conditions: [
      {
        id: 'low-dice-1',
        name: 'Low irrelevant anchor (die=1 → 10 months)',
        params: { diceRoll: 1, prosecutorRecommendationMonths: 10 },
      },
      {
        id: 'high-dice-6',
        name: 'High irrelevant anchor (die=6 → 60 months)',
        params: { diceRoll: 6, prosecutorRecommendationMonths: 60 },
      },
    ],
    expectedResponse: {
      kind: 'numeric',
      unit: 'months',
      range: { min: 0, max: 600 },
    },
  };
