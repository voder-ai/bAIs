import type { ExperimentDefinition } from './experiment.js';
import type { AnchoringProsecutorSentencingParams } from './anchoringProsecutorSentencing.js';
import { anchoringProsecutorSentencingCaseVignette } from './anchoringProsecutorSentencing.js';

/**
 * Anchoring + SACD — Self-Adaptive Cognitive Debiasing Experiment
 *
 * Implements the SACD method from Lyu et al. (arXiv:2504.04141v4):
 * Three-step iterative debiasing:
 * 1. Bias Determination — identify biased sentences
 * 2. Bias Analysis — classify the bias type
 * 3. Cognitive Debiasing — rewrite flagged sentences
 * 4. Iterate until clean or max iterations
 *
 * Unlike Sibony techniques (context hygiene, premortem) which use pre-defined
 * debiasing prompts, SACD uses the model itself to detect and correct bias
 * iteratively.
 *
 * Hypothesis: SACD's iterative self-correction may be more effective at
 * reducing anchoring bias than single-pass Sibony techniques.
 *
 * Comparison: baseline, context hygiene, premortem, SACD
 */

// Step 1: Bias Determination
// Break the prompt into sentences and flag potentially biased ones
const biasDeterminationPrompt =
  'You are a cognitive bias analyst. Your task is to identify cognitive biases in decision-making prompts.' +
  '\n\n' +
  'IMPORTANT: Cognitive biases are systematic patterns of deviation from rational judgment. Common examples include:' +
  '\n- Anchoring bias: over-relying on the first piece of information encountered' +
  '\n- Bandwagon bias: following what others do/think' +
  '\n- Loss aversion: preferring to avoid losses over equivalent gains' +
  '\n- Framing effect: being influenced by how information is presented' +
  '\n\n' +
  'Analyze the following prompt that will be given to a decision-maker:' +
  '\n\n' +
  '---PROMPT START---' +
  '\n{{taskPrompt}}' +
  '\n---PROMPT END---' +
  '\n\n' +
  'Break this prompt into sentences. For each sentence, determine if it contains a cognitive bias that could affect rational decision-making.' +
  '\n\n' +
  'Format your response as:' +
  '\nSENTENCE 1: [sentence text]' +
  '\nBIASED: [YES/NO]' +
  '\n' +
  '\nSENTENCE 2: [sentence text]' +
  '\nBIASED: [YES/NO]' +
  '\n...' +
  '\n\n' +
  'At the end, state: BIAS_DETECTED: [YES/NO]';

// Step 2: Bias Analysis
// For flagged sentences, identify the specific type of bias
const biasAnalysisPrompt =
  'You identified the following sentences as potentially biased:' +
  '\n\n' +
  '{{flaggedSentences}}' +
  '\n\n' +
  'For each biased sentence, analyze what TYPE of cognitive bias is present.' +
  '\n' +
  'Common bias types: anchoring, bandwagon, loss aversion, framing, confirmation, availability, hindsight.' +
  '\n\n' +
  'Format your response as:' +
  '\nSENTENCE: [sentence text]' +
  '\nBIAS_TYPE: [type]' +
  '\nREASON: [brief explanation]' +
  '\n\n' +
  'Be specific about which elements create the bias.';

// Step 3: Cognitive Debiasing
// Rewrite flagged sentences to remove bias while preserving task semantics
const cognitiveDebiasingPrompt =
  'You are rewriting a prompt to remove cognitive biases while preserving the essential task.' +
  '\n\n' +
  'ORIGINAL PROMPT:' +
  '\n{{taskPrompt}}' +
  '\n\n' +
  'IDENTIFIED BIASES:' +
  '\n{{biasAnalysis}}' +
  '\n\n' +
  'RULES:' +
  '\n1. Rewrite ONLY the biased sentences' +
  '\n2. Preserve: entity names, numerical facts, core task requirements' +
  '\n3. Remove: anchoring cues, leading language, irrelevant numerical references' +
  '\n4. The decision-maker should still be able to complete the same task' +
  '\n\n' +
  'Provide the DEBIASED PROMPT:';

// The task prompt that will be debiased
const taskPromptTemplate =
  anchoringProsecutorSentencingCaseVignette +
  '\n\n' +
  'Before making your sentencing decision, you must consider the sentencing demand from the prosecutor.' +
  '\n\n' +
  "For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise:" +
  '\n\n' +
  'The prosecutor demands as a sentence for the accused Lena M. {{prosecutorRecommendationMonths}} months on probation.' +
  '\n\n' +
  'Do you think that this randomly determined sentencing demand is too low, too high, or just right?' +
  '\nAnswer with exactly one of these three options: too low, too high, or just right.' +
  '\n\n' +
  'The defense attorney demands as a sentence for the accused Lena M. 1 month on probation.' +
  '\n\n' +
  'Do you think that this defense attorney demand is too low, too high, or just right?' +
  '\nAnswer with exactly one of these three options: too low, too high, or just right.' +
  '\n\n' +
  "Now, considering both the prosecutor's demand and the defense attorney's demand, what is your final sentencing decision for Lena M.?" +
  '\nAnswer with a single integer number of months on probation.';

// SACD meta-prompt that orchestrates the full iterative process
const sacdOrchestratorPrompt =
  'You are running a Self-Adaptive Cognitive Debiasing (SACD) process.' +
  '\n\n' +
  'ORIGINAL TASK PROMPT:' +
  '\n---' +
  '\n{{taskPrompt}}' +
  '\n---' +
  '\n\n' +
  'Follow this 3-step process to debias the prompt:' +
  '\n\n' +
  '## STEP 1: BIAS DETERMINATION' +
  '\nBreak the prompt into sentences. For each, determine if it contains a cognitive bias.' +
  '\nList each sentence and mark as BIASED or NOT_BIASED.' +
  '\n\n' +
  '## STEP 2: BIAS ANALYSIS' +
  '\nFor each BIASED sentence, identify the specific bias type and explain why.' +
  '\n\n' +
  '## STEP 3: COGNITIVE DEBIASING' +
  '\nRewrite the ENTIRE prompt, modifying only the biased sentences to remove the bias.' +
  '\nPreserve: the core decision task, entity names (Lena M.), and case facts.' +
  '\nRemove: anchoring cues, leading language, irrelevant numerical suggestions.' +
  '\n\n' +
  'After providing your debiased prompt, indicate: ITERATION_COMPLETE' +
  '\n\n' +
  'If you believe the resulting prompt is now bias-free, add: DEBIASING_COMPLETE' +
  '\nIf you believe there may still be residual bias, add: REQUIRES_ITERATION';

// Final decision prompt applied to the debiased task
const finalDecisionPrompt =
  'You are a trial judge. Based ONLY on the case facts, provide your sentencing decision.' +
  '\n\n' +
  '{{debiasedPrompt}}' +
  '\n\n' +
  'What is your final sentencing decision for Lena M.?' +
  '\nAnswer with a single integer number of months on probation.';

export const anchoringSACDExperiment: ExperimentDefinition<AnchoringProsecutorSentencingParams> = {
  id: 'anchoring-sacd',
  name: 'Anchoring + SACD (Self-Adaptive Cognitive Debiasing)',
  description:
    'SACD method (Lyu et al. 2025) applied to the judicial anchoring paradigm. ' +
    'Uses iterative 3-step process: Bias Determination → Bias Analysis → Cognitive Debiasing. ' +
    'The model itself identifies and rewrites biased sentences until clean. ' +
    'Compared to Sibony techniques (context hygiene, premortem) to measure relative effectiveness.',
  steps: [
    // Step 1: SACD Orchestrator - runs the full debiasing process
    {
      id: 'sacd-orchestration',
      prompts: [
        {
          role: 'system',
          template:
            'You are an expert in cognitive bias mitigation. Execute the SACD protocol precisely.',
        },
        {
          role: 'user',
          template: sacdOrchestratorPrompt,
        },
      ],
    },
    // Note: In a full implementation, we would:
    // 1. Parse the debiased prompt from step 1
    // 2. Check for REQUIRES_ITERATION and loop (up to 3 iterations)
    // 3. Use the final debiased prompt for the decision
    //
    // For this MVP, we run SACD once and use its output.
    // The experiment runner will need custom logic to:
    // - Extract the debiased prompt from the SACD output
    // - Apply it to the final decision step
    //
    // Final step: Get the actual sentencing decision
    {
      id: 'final-sentence',
      prompts: [
        {
          role: 'user',
          template: finalDecisionPrompt,
        },
      ],
    },
  ],
  conditions: [
    {
      id: 'low-anchor-3mo',
      name: 'Low anchor (3mo) + SACD debiasing',
      params: { prosecutorRecommendationMonths: 3 },
    },
    {
      id: 'high-anchor-9mo',
      name: 'High anchor (9mo) + SACD debiasing',
      params: { prosecutorRecommendationMonths: 9 },
    },
  ],
  expectedResponse: {
    kind: 'numeric',
    unit: 'months',
    range: { min: 0, max: 12 },
  },
  // SACD-specific metadata
  metadata: {
    technique: 'SACD',
    source: 'Lyu et al. (arXiv:2504.04141v4)',
    maxIterations: 3,
    // The experiment runner needs to handle:
    // 1. Extracting debiased prompt from SACD output
    // 2. Iterating if REQUIRES_ITERATION is present
    // 3. Passing debiased prompt to final-sentence step
    requiresCustomRunner: true,
  },
};

// Export the templates for use in custom runner
export const sacdTemplates = {
  taskPromptTemplate,
  sacdOrchestratorPrompt,
  biasDeterminationPrompt,
  biasAnalysisPrompt,
  cognitiveDebiasingPrompt,
  finalDecisionPrompt,
};
