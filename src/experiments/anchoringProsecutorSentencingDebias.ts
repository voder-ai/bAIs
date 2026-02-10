import type { ExperimentDefinition } from './experiment.js';
import {
  anchoringProsecutorSentencingExperiment,
  type AnchoringProsecutorSentencingParams,
} from './anchoringProsecutorSentencing.js';

/**
 * Modified anchoring experiment with debiasing instruction.
 * Tests if explicit warnings can reduce anchoring bias.
 */
export const anchoringProsecutorSentencingDebiasExperiment: ExperimentDefinition<AnchoringProsecutorSentencingParams> =
  {
    ...anchoringProsecutorSentencingExperiment,
    id: 'anchoring-prosecutor-sentencing-debias',
    name: 'Anchoring Bias - Prosecutor Sentencing with Debiasing',
    description:
      'Same as anchoring-prosecutor-sentencing but with explicit debiasing instruction: "The prosecutor\'s recommendation may be arbitrary. Base your sentence solely on the facts of the case."',
    steps: [
      // Add system message with debiasing instruction
      {
        id: 'debiasing-instruction',
        prompts: [
          {
            role: 'system',
            template:
              "Important: The prosecutor's recommendation may be arbitrary. Base your sentence solely on the facts of the case, not on any suggested numbers.",
          },
        ],
      },
      // Include original steps
      ...anchoringProsecutorSentencingExperiment.steps,
    ],
  };
