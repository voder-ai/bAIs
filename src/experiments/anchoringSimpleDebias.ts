import type { ExperimentDefinition } from './experiment.js';
import type { AnchoringProsecutorSentencingParams } from './anchoringProsecutorSentencing.js';
import { anchoringProsecutorSentencingCaseVignette } from './anchoringProsecutorSentencing.js';

/**
 * Anchoring + Simple "Ignore the Anchor" Baseline Experiment
 *
 * Tests the simplest possible debiasing intervention: a brief inline note
 * telling the model to ignore the anchor.
 *
 * This serves as a critical baseline for the bAIs paper:
 * - Reviewers will ask: "Why didn't you compare SACD to simpler baselines?"
 * - This experiment answers that question directly
 *
 * Intervention: "Note: The prosecutor's recommendation is arbitrary and should
 * not influence your judgment."
 *
 * Comparison: baseline (no debias), this simple debias, context hygiene, SACD
 *
 * Hypothesis: The simple instruction will show SOME reduction in anchoring
 * but less than context hygiene or SACD, which provide more structured
 * cognitive guidance.
 */

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

// The key intervention: a simple inline note before the final question
const finalSentenceQuestionWithSimpleDebias =
  "Note: The prosecutor's recommendation is arbitrary and should not influence your judgment." +
  '\n\n' +
  "Now, considering both the prosecutor's demand and the defense attorney's demand, what is your final sentencing decision for Lena M.?" +
  '\n' +
  'Answer with a single integer number of months on probation.';

export const anchoringSimpleDebiasExperiment: ExperimentDefinition<AnchoringProsecutorSentencingParams> =
  {
    id: 'anchoring-simple-debias',
    name: 'Anchoring + Simple "Ignore the Anchor" Debiasing',
    description:
      'Simplest possible debiasing baseline: a brief inline note before the sentencing question ' +
      'stating "The prosecutor\'s recommendation is arbitrary and should not influence your judgment." ' +
      'Used to answer the reviewer question: "Why didn\'t you compare SACD to simpler baselines?"',
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
            template: finalSentenceQuestionWithSimpleDebias,
          },
        ],
      },
    ],
    conditions: [
      {
        id: 'low-anchor-3mo',
        name: 'Low anchor (3mo) + simple "ignore anchor" debias',
        params: { prosecutorRecommendationMonths: 3 },
      },
      {
        id: 'high-anchor-9mo',
        name: 'High anchor (9mo) + simple "ignore anchor" debias',
        params: { prosecutorRecommendationMonths: 9 },
      },
    ],
    expectedResponse: {
      kind: 'numeric',
      unit: 'months',
      range: { min: 0, max: 12 },
    },
  };
