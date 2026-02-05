import type { ExperimentDefinition } from './experiment.js';
import type { AnchoringProsecutorSentencingParams } from './anchoringProsecutorSentencing.js';
import { anchoringProsecutorSentencingCaseVignette } from './anchoringProsecutorSentencing.js';

/**
 * Anchoring + Context Hygiene — Sibony Debiasing Experiment
 *
 * Tests whether Sibony's "context hygiene" technique reduces anchoring bias.
 *
 * Technique: Strip the experimental context cue ("randomly determined") and
 * instead instruct the model to focus ONLY on case-relevant facts, explicitly
 * flagging the prosecutor demand as external/irrelevant context that should
 * not influence the judgment.
 *
 * From Sibony (2019): "Drop unnecessary context. The more information
 * available, the more opportunities for irrelevant anchoring."
 *
 * Hypothesis: By explicitly labeling the anchor as irrelevant context and
 * instructing the model to compartmentalize, anchoring effect should be
 * reduced.
 *
 * Baseline comparison: anchoring-prosecutor-sentencing (no debiasing)
 */

const contextHygieneSystemPrompt =
  'IMPORTANT DECISION HYGIENE PROTOCOL:' +
  '\n\n' +
  'You are about to make a sentencing judgment. Before proceeding, apply these principles:' +
  '\n' +
  '1. Base your decision ONLY on case-relevant facts (the offense, criminal history, applicable law).' +
  '\n' +
  '2. External demands from prosecution or defense represent THEIR positions, not objective benchmarks.' +
  '\n' +
  '3. Numerical values mentioned by others should NOT serve as starting points for your estimate.' +
  '\n' +
  '4. Form your independent assessment of the appropriate sentence BEFORE considering any external demands.' +
  '\n' +
  '5. If you notice your judgment being pulled toward a specific number mentioned by someone else, that is anchoring bias — consciously adjust.';

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
  'Remember: base your sentence ONLY on the case facts (12th shoplifting offense, applicable penal code).' +
  ' External demands from prosecution or defense should not anchor your judgment.' +
  '\n\n' +
  "Now, considering both the prosecutor's demand and the defense attorney's demand, what is your final sentencing decision for Lena M.?" +
  '\n' +
  'Answer with a single integer number of months on probation.';

export const anchoringContextHygieneExperiment: ExperimentDefinition<AnchoringProsecutorSentencingParams> =
  {
    id: 'anchoring-context-hygiene',
    name: 'Anchoring + Context Hygiene (Sibony Debiasing)',
    description:
      "Sibony's context hygiene technique applied to the judicial anchoring paradigm. " +
      'A system prompt instructs the model to compartmentalize irrelevant numerical anchors ' +
      'and base judgment only on case-relevant facts. Compared to baseline ' +
      '(anchoring-prosecutor-sentencing) to measure debiasing effectiveness.',
    steps: [
      {
        id: 'prosecutor-evaluation',
        prompts: [
          {
            role: 'system',
            template: contextHygieneSystemPrompt,
          },
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
        name: 'Low anchor (3mo) + context hygiene debiasing',
        params: { prosecutorRecommendationMonths: 3 },
      },
      {
        id: 'high-anchor-9mo',
        name: 'High anchor (9mo) + context hygiene debiasing',
        params: { prosecutorRecommendationMonths: 9 },
      },
    ],
    expectedResponse: {
      kind: 'numeric',
      unit: 'months',
      range: { min: 0, max: 12 },
    },
  };
