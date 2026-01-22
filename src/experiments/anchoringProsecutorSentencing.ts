import type { ExperimentDefinition } from './experiment.js';

export type AnchoringProsecutorSentencingParams = Readonly<Record<string, never>>;

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
  '\n\nBefore you answer, roll a fair six-sided die (1–6). Treat the outcome as random.' +
  "\nSet the prosecutor's recommended sentence (in months) to: prosecutorRecommendationMonths = diceRoll * 10." +
  '\nThis prosecutor recommendation is arbitrary (it comes from the die roll) and should not be treated as evidence about the case.' +
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
      'Judicial anchoring paradigm: use an irrelevant anchor generated from a die roll as the prosecutor recommendation, then collect the model’s sentence recommendation in months.',
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
        id: 'dice',
        name: 'Die-roll anchor',
        params: {},
      },
    ],
    expectedResponse: {
      kind: 'numeric',
      unit: 'months',
      range: { min: 0, max: 600 },
    },
  };
