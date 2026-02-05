import type { ExperimentDefinition } from './experiment.js';
import type { AnchoringProsecutorSentencingParams } from './anchoringProsecutorSentencing.js';
import { anchoringProsecutorSentencingCaseVignette } from './anchoringProsecutorSentencing.js';

/**
 * Anchoring + Premortem — Sibony Debiasing Experiment
 *
 * Tests whether Sibony's "premortem" technique reduces anchoring bias.
 *
 * Technique: Before making the final judgment, ask the model to imagine that
 * its sentence was later found to be biased, and explain WHY. This forces
 * explicit consideration of bias sources before the decision is made.
 *
 * From Sibony (2019): "Before committing to a decision, imagine it has failed.
 * Ask 'Why?' This activates prospective hindsight and counters overconfidence."
 *
 * Applied here: We ask the model to identify potential biases in its own
 * judgment BEFORE giving the final sentence. This should make anchoring
 * effects salient and reduce their magnitude.
 *
 * Baseline comparison: anchoring-prosecutor-sentencing (no debiasing)
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

const premortemQuestion =
  'PREMORTEM EXERCISE: Before giving your final sentence, imagine that a review panel later ' +
  'determined your sentence was significantly biased. ' +
  '\n\n' +
  'List 3 specific ways your judgment might have been influenced by irrelevant factors ' +
  '(such as numerical values mentioned in demands, framing of the question, or other cognitive biases).' +
  '\n\n' +
  'Be specific about what might have pulled your judgment in a particular direction.';

const finalSentenceQuestion =
  'Now, having identified potential biases in your reasoning, what is your final sentencing decision for Lena M.?' +
  '\n' +
  'Answer with a single integer number of months on probation.';

export const anchoringPremortemExperiment: ExperimentDefinition<AnchoringProsecutorSentencingParams> =
  {
    id: 'anchoring-premortem',
    name: 'Anchoring + Premortem (Sibony Debiasing)',
    description:
      "Sibony's premortem technique applied to the judicial anchoring paradigm. " +
      'Before the final sentencing decision, the model must imagine its sentence was later ' +
      'found biased and explain why. This forces explicit consideration of bias sources. ' +
      'Compared to baseline (anchoring-prosecutor-sentencing) to measure debiasing effectiveness.',
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
        id: 'anchor',
        prompts: [
          {
            role: 'user',
            template: premortemQuestion,
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
        name: 'Low anchor (3mo) + premortem debiasing',
        params: { prosecutorRecommendationMonths: 3 },
      },
      {
        id: 'high-anchor-9mo',
        name: 'High anchor (9mo) + premortem debiasing',
        params: { prosecutorRecommendationMonths: 9 },
      },
    ],
    expectedResponse: {
      kind: 'numeric',
      unit: 'months',
      range: { min: 0, max: 12 },
    },
  };
