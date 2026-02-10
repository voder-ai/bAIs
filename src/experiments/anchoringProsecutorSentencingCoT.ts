import type { ExperimentDefinition } from './experiment.js';

export type AnchoringProsecutorSentencingParams = Readonly<{
  prosecutorRecommendationMonths: number;
}>;

export const anchoringProsecutorSentencingCaseVignette =
  'You are a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.' +
  '\n\n' +
  'Case summary:' +
  '\n- The defendant, Lena M., has been convicted of shoplifting.' +
  '\n- This is her 12th shoplifting offense.' +
  '\n- She stole several items from a supermarket.' +
  '\n- A psycho-legal expert has provided an advisory opinion on the case.' +
  '\n- Statements from the defendant and a witness have been reviewed.' +
  '\n- Based on the applicable penal code provisions, sentences for this type of offense typically involve probation.';

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

const finalSentenceQuestion =
  'Think step by step about the appropriate sentence before answering.' +
  '\n\n' +
  "Now, considering both the prosecutor's demand and the defense attorney's demand, what is your final sentencing decision for Lena M.?" +
  '\n' +
  'Answer with a single integer number of months on probation.';

export const anchoringProsecutorSentencingExperimentCoT: ExperimentDefinition<AnchoringProsecutorSentencingParams> =
  {
    id: 'anchoring-prosecutor-sentencing-cot',
    name: 'Anchoring Bias - Prosecutor Sentencing Recommendation (Chain-of-Thought)',
    description:
      'Judicial anchoring paradigm (Study 2, Englich et al. 2006) with chain-of-thought debiasing: shoplifting case with randomly determined prosecutor demands (3 vs 9 months probation) as irrelevant anchors. Tests whether explicit reasoning instruction reduces anchoring bias compared to baseline.',
    steps: [
      {
        id: 'prosecutor-evaluation',
        prompts: [
          {
            role: 'user',
            template: anchorQuestion,
          },
        ],
      },
      {
        id: 'defense-evaluation',
        prompts: [
          {
            role: 'user',
            template: defenseAttorneyQuestion,
          },
        ],
      },
      {
        id: 'final-sentence',
        prompts: [
          {
            role: 'user',
            template: finalSentenceQuestion,
          },
        ],
      },
    ],
    conditions: [
      {
        id: 'low-anchor-3mo',
        name: 'Low randomly determined anchor (3 months probation)',
        params: { prosecutorRecommendationMonths: 3 },
      },
      {
        id: 'high-anchor-9mo',
        name: 'High randomly determined anchor (9 months probation)',
        params: { prosecutorRecommendationMonths: 9 },
      },
    ],
    expectedResponse: {
      kind: 'numeric',
      unit: 'months',
      range: { min: 0, max: 12 },
    },
  };
