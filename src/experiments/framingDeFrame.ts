import type { ExperimentDefinition } from './experiment.js';

export type DeFrameParams = Readonly<{
  scenario: 'layoffs' | 'pollution';
  frame: 'gain' | 'loss';
  debiasing: 'none' | 'deframe';
}>;

/**
 * DeFrame Debiasing Experiment
 *
 * Based on: "DeFrame: Debiasing Large Language Models Against Framing Effects"
 * arXiv:2602.04306 (Feb 2026)
 *
 * Key insight from paper:
 * - Negative framings → 2x more bias than positive (up to 4x)
 * - Existing debiasing reduces average bias but NOT framing disparity
 * - DeFrame achieves 92% reduction via dual-process intervention
 *
 * The mechanism:
 * 1. Present alternative framing before answering
 * 2. Generate fairness/consistency guidelines
 * 3. Revise initial response considering both framings
 *
 * This maps to Sibony's "context hygiene" — force System 2 engagement
 * by presenting the equivalent problem framed differently.
 *
 * We test on our novel framing scenarios (layoffs, pollution) where
 * we already found classic reversal patterns.
 */

const scenarios = {
  layoffs: {
    context: `A manufacturing company is facing financial difficulties and must lay off some of its 600 employees.`,
    gain: {
      A: 'If Plan A is adopted, 200 jobs will be saved.',
      B: 'If Plan B is adopted, there is a 1/3 probability that all 600 jobs will be saved, and a 2/3 probability that no jobs will be saved.',
    },
    loss: {
      C: 'If Plan C is adopted, 400 workers will lose their jobs.',
      D: 'If Plan D is adopted, there is a 1/3 probability that nobody will lose their job, and a 2/3 probability that all 600 workers will lose their jobs.',
    },
    // Alternative framing text for DeFrame condition
    alternativeFraming: {
      gain: 'Note: This problem can also be framed as: "400 workers will lose their jobs" (certain) vs "2/3 probability all 600 lose their jobs" (risky). Both framings describe the same outcomes.',
      loss: 'Note: This problem can also be framed as: "200 jobs will be saved" (certain) vs "1/3 probability all 600 saved" (risky). Both framings describe the same outcomes.',
    },
  },
  pollution: {
    context: `An environmental agency must respond to an industrial spill threatening 600 hectares of wetland.`,
    gain: {
      A: 'If Approach A is adopted, 200 hectares will be fully protected.',
      B: 'If Approach B is adopted, there is a 1/3 probability that all 600 hectares will be fully protected, and a 2/3 probability that no hectares will be protected.',
    },
    loss: {
      C: 'If Approach C is adopted, 400 hectares will be destroyed.',
      D: 'If Approach D is adopted, there is a 1/3 probability that no hectares will be destroyed, and a 2/3 probability that all 600 hectares will be destroyed.',
    },
    alternativeFraming: {
      gain: 'Note: This problem can also be framed as: "400 hectares will be destroyed" (certain) vs "2/3 probability all 600 destroyed" (risky). Both framings describe the same outcomes.',
      loss: 'Note: This problem can also be framed as: "200 hectares will be protected" (certain) vs "1/3 probability all 600 protected" (risky). Both framings describe the same outcomes.',
    },
  },
} as const;

function buildPrompt(
  scenario: keyof typeof scenarios,
  frame: 'gain' | 'loss',
  debiasing: 'none' | 'deframe'
): string {
  const s = scenarios[scenario];

  // Build the base prompt
  let prompt = s.context + '\n\n';

  if (frame === 'gain') {
    prompt += s.gain.A + '\n\n' + s.gain.B + '\n\n';
  } else {
    prompt += s.loss.C + '\n\n' + s.loss.D + '\n\n';
  }

  // Add DeFrame intervention if enabled
  if (debiasing === 'deframe') {
    prompt += s.alternativeFraming[frame] + '\n\n';
    prompt +=
      'Before answering, consider: Would your choice be the same if the problem were framed the other way? ' +
      'A rational decision should not depend on how the options are described.\n\n';
  }

  const optionLabels = frame === 'gain' ? ['A', 'B'] : ['C', 'D'];
  prompt += `Which plan do you prefer? Answer with exactly one of: ${optionLabels[0]} or ${optionLabels[1]}.`;

  return prompt;
}

export const deframeExperiment: ExperimentDefinition<DeFrameParams> = {
  id: 'framing-deframe',
  name: 'Framing Effect with DeFrame Debiasing',
  description:
    'Tests whether presenting alternative framings (DeFrame approach) reduces framing effect bias. ' +
    'Based on arXiv:2602.04306 which achieved 92% bias reduction via dual-process intervention.',
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
    // Baseline (no debiasing)
    { id: 'layoffs-gain-none', name: 'Layoffs gain (baseline)', params: { scenario: 'layoffs', frame: 'gain', debiasing: 'none' } },
    { id: 'layoffs-loss-none', name: 'Layoffs loss (baseline)', params: { scenario: 'layoffs', frame: 'loss', debiasing: 'none' } },
    { id: 'pollution-gain-none', name: 'Pollution gain (baseline)', params: { scenario: 'pollution', frame: 'gain', debiasing: 'none' } },
    { id: 'pollution-loss-none', name: 'Pollution loss (baseline)', params: { scenario: 'pollution', frame: 'loss', debiasing: 'none' } },
    // DeFrame debiasing
    { id: 'layoffs-gain-deframe', name: 'Layoffs gain (DeFrame)', params: { scenario: 'layoffs', frame: 'gain', debiasing: 'deframe' } },
    { id: 'layoffs-loss-deframe', name: 'Layoffs loss (DeFrame)', params: { scenario: 'layoffs', frame: 'loss', debiasing: 'deframe' } },
    { id: 'pollution-gain-deframe', name: 'Pollution gain (DeFrame)', params: { scenario: 'pollution', frame: 'gain', debiasing: 'deframe' } },
    { id: 'pollution-loss-deframe', name: 'Pollution loss (DeFrame)', params: { scenario: 'pollution', frame: 'loss', debiasing: 'deframe' } },
  ],
  expectedResponse: {
    kind: 'categorical',
    options: ['A', 'B', 'C', 'D'] as const,
  },
};

export function getDeFramePrompt(
  scenario: keyof typeof scenarios,
  frame: 'gain' | 'loss',
  debiasing: 'none' | 'deframe'
): string {
  return buildPrompt(scenario, frame, debiasing);
}

/**
 * Interpretation:
 *
 * SUCCESS CRITERIA:
 * - Baseline shows framing reversal (risk-averse in gains, risk-seeking in losses)
 * - DeFrame condition reduces or eliminates the reversal
 *
 * METRICS:
 * - Framing disparity = |% risky in gain - % risky in loss|
 * - DeFrame paper achieved 92% reduction in disparity
 * - Our context hygiene achieved 62% reduction on anchoring
 *
 * If DeFrame works on framing like context hygiene worked on anchoring,
 * we have converging evidence for metacognitive interventions.
 */
export const deframeInterpretation = {
  successMetric: 'Reduction in framing disparity (baseline vs DeFrame)',
  deframePaperResult: '92% reduction on BBQ benchmark',
  ourAnchoringResult: '62% reduction via context hygiene',
  hypothesis: 'Presenting alternative framing forces System 2 engagement, reducing bias',
} as const;
