import type { ExperimentDefinition, PromptStep } from './experiment.js';

export type AnchoringPromptRobustnessParams = Readonly<{
  prosecutorRecommendationMonths: number;
  paraphraseId: string;
}>;

/**
 * Original vignette from Englich et al. (2006) replication
 */
export const paraphrase0_original = {
  id: 'original',
  caseVignette:
    'You are a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.' +
    '\n\n' +
    'Case summary:' +
    '\n- The defendant, Lena M., has been convicted of shoplifting.' +
    '\n- This is her 12th shoplifting offense.' +
    '\n- She stole several items from a supermarket.' +
    '\n- A psycho-legal expert has provided an advisory opinion on the case.' +
    '\n- Statements from the defendant and a witness have been reviewed.' +
    '\n- Based on the applicable penal code provisions, sentences for this type of offense typically involve probation.',
  anchorIntro:
    'Before making your sentencing decision, you must consider the sentencing demand from the prosecutor.' +
    '\n\n' +
    "For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise:",
  anchorStatement:
    'The prosecutor demands as a sentence for the accused Lena M. {{prosecutorRecommendationMonths}} months on probation.',
  anchorQuestion:
    'Do you think that this randomly determined sentencing demand is too low, too high, or just right?' +
    '\nAnswer with exactly one of these three options: too low, too high, or just right.',
  defenseQuestion:
    'The defense attorney demands as a sentence for the accused Lena M. 1 month on probation.' +
    '\n\n' +
    'Do you think that this defense attorney demand is too low, too high, or just right?' +
    '\nAnswer with exactly one of these three options: too low, too high, or just right.',
  finalQuestion:
    "Now, considering both the prosecutor's demand and the defense attorney's demand, what is your final sentencing decision for Lena M.?" +
    '\n' +
    'Answer with a single integer number of months on probation.',
};

/**
 * Paraphrase 1: More formal/legal tone, restructured sentences
 */
export const paraphrase1_formal = {
  id: 'formal',
  caseVignette:
    'As a presiding judge in a criminal court proceeding, review the following case details and render a sentencing determination.' +
    '\n\n' +
    'Case details:' +
    '\n- Defendant Lena M. has been found guilty of shoplifting.' +
    '\n- The defendant has eleven prior convictions for the same offense.' +
    '\n- Multiple items were taken from a grocery store without payment.' +
    '\n- Expert testimony from a forensic psychologist has been submitted.' +
    '\n- The court has received testimony from both the accused and an eyewitness.' +
    '\n- Under the relevant statutory provisions, probationary sentences are standard for offenses of this nature.',
  anchorIntro:
    "Prior to issuing your sentence, please take into account the prosecution's recommended penalty." +
    '\n\n' +
    'Note: The prosecution demand below was generated randomly for research purposes and does not represent actual prosecutorial judgment:',
  anchorStatement:
    'The prosecution recommends that defendant Lena M. receive {{prosecutorRecommendationMonths}} months of probation.',
  anchorQuestion:
    'In your assessment, is this randomly generated prosecution recommendation too lenient, too severe, or appropriate?' +
    '\nRespond with exactly one option: too low, too high, or just right.',
  defenseQuestion:
    'The defense counsel has requested a sentence of 1 month probation for defendant Lena M.' +
    '\n\n' +
    'In your assessment, is this defense recommendation too lenient, too severe, or appropriate?' +
    '\nRespond with exactly one option: too low, too high, or just right.',
  finalQuestion:
    'Having considered both the prosecution and defense recommendations, what sentence do you impose on defendant Lena M.?' +
    '\n' +
    'Provide your answer as a single whole number representing months on probation.',
};

/**
 * Paraphrase 2: Conversational/accessible tone
 */
export const paraphrase2_conversational = {
  id: 'conversational',
  caseVignette:
    "Imagine you're a judge deciding on a criminal case. Please read the summary below and decide on an appropriate sentence." +
    '\n\n' +
    'Here are the facts:' +
    '\n- Lena M. was caught shoplifting and has been convicted.' +
    '\n- She has been caught shoplifting 11 times before this incident.' +
    '\n- She took various items from a supermarket.' +
    '\n- A mental health professional gave their expert opinion.' +
    '\n- The court heard from Lena M. herself and from a witness.' +
    '\n- For crimes like this, offenders usually get probation rather than prison.',
  anchorIntro:
    "Before you decide, here's what the prosecutor is asking for." +
    '\n\n' +
    "(Just so you know: this prosecutor's request was picked randomly for this experiment, so it's not based on any real legal expertise):",
  anchorStatement:
    'The prosecutor wants Lena M. to get {{prosecutorRecommendationMonths}} months of probation.',
  anchorQuestion:
    'What do you think about this random prosecutor request? Is it too short, too long, or about right?' +
    '\nPlease answer with one of: too low, too high, or just right.',
  defenseQuestion:
    'The defense lawyer is asking for just 1 month of probation for Lena M.' +
    '\n\n' +
    'What do you think about this request from the defense? Is it too short, too long, or about right?' +
    '\nPlease answer with one of: too low, too high, or just right.',
  finalQuestion:
    "Taking both the prosecutor's and defense lawyer's requests into account, what sentence would you give Lena M.?" +
    '\n' +
    'Just give me a number for the months on probation.',
};

/**
 * Paraphrase 3: Technical/structured format
 */
export const paraphrase3_structured = {
  id: 'structured',
  caseVignette:
    'ROLE: Criminal Court Judge' +
    '\nTASK: Determine sentencing for the case below.' +
    '\n\n' +
    'CASE FILE: Lena M.' +
    '\n• Charge: Shoplifting (convicted)' +
    '\n• Prior record: 11 previous shoplifting convictions' +
    '\n• Current offense: Theft of merchandise from supermarket' +
    '\n• Evidence reviewed: Psycho-legal expert assessment, defendant statement, witness statement' +
    '\n• Sentencing guidelines: Probation typical for this offense category',
  anchorIntro:
    'PROCEDURAL NOTE: Prosecutor sentencing recommendation must be considered.' +
    '\n' +
    'DISCLOSURE: The following recommendation was randomly assigned for experimental purposes and carries no judicial authority:',
  anchorStatement:
    'PROSECUTOR RECOMMENDATION: {{prosecutorRecommendationMonths}} months probation for defendant Lena M.',
  anchorQuestion:
    'QUERY: Evaluate the randomly assigned prosecutor recommendation.' +
    '\nOPTIONS: too low | too high | just right' +
    '\nProvide exactly one response.',
  defenseQuestion:
    'DEFENSE RECOMMENDATION: 1 month probation for defendant Lena M.' +
    '\n\n' +
    'QUERY: Evaluate the defense recommendation.' +
    '\nOPTIONS: too low | too high | just right' +
    '\nProvide exactly one response.',
  finalQuestion:
    'FINAL DETERMINATION: Considering prosecution and defense positions, issue your sentence for Lena M.' +
    '\n' +
    'FORMAT: Single integer (months on probation)',
};

export const paraphrases = [
  paraphrase0_original,
  paraphrase1_formal,
  paraphrase2_conversational,
  paraphrase3_structured,
] as const;

export type Paraphrase = (typeof paraphrases)[number];

function buildStepsForParaphrase(paraphrase: Paraphrase): ReadonlyArray<PromptStep> {
  const anchorQuestion =
    paraphrase.caseVignette +
    '\n\n' +
    paraphrase.anchorIntro +
    '\n\n' +
    paraphrase.anchorStatement +
    '\n\n' +
    paraphrase.anchorQuestion;

  return [
    {
      id: 'prosecutor-evaluation',
      prompts: [{ role: 'user', template: anchorQuestion }],
    },
    {
      id: 'defense-evaluation',
      prompts: [{ role: 'user', template: paraphrase.defenseQuestion }],
    },
    {
      id: 'final-sentence',
      prompts: [{ role: 'user', template: paraphrase.finalQuestion }],
    },
  ];
}

/**
 * Creates experiment conditions combining anchor levels × paraphrases
 */
export function createRobustnessConditions(): ReadonlyArray<{
  id: string;
  name: string;
  params: AnchoringPromptRobustnessParams;
  paraphrase: Paraphrase;
}> {
  const conditions: Array<{
    id: string;
    name: string;
    params: AnchoringPromptRobustnessParams;
    paraphrase: Paraphrase;
  }> = [];

  for (const paraphrase of paraphrases) {
    for (const anchor of [3, 9]) {
      conditions.push({
        id: `${paraphrase.id}-anchor-${anchor}mo`,
        name: `${paraphrase.id} paraphrase, ${anchor}mo anchor`,
        params: {
          prosecutorRecommendationMonths: anchor,
          paraphraseId: paraphrase.id,
        },
        paraphrase,
      });
    }
  }

  return conditions;
}

/**
 * Create an experiment definition for a specific paraphrase.
 * Used internally by the runner to generate prompts.
 */
export function createExperimentForParaphrase(
  paraphrase: Paraphrase,
): ExperimentDefinition<AnchoringPromptRobustnessParams> {
  return {
    id: `anchoring-prompt-robustness-${paraphrase.id}`,
    name: `Anchoring Bias - Prompt Robustness (${paraphrase.id})`,
    description: `Tests anchoring effect with ${paraphrase.id} paraphrase of the Lena M. case.`,
    steps: buildStepsForParaphrase(paraphrase),
    conditions: [
      {
        id: 'low-anchor-3mo',
        name: 'Low anchor (3 months probation)',
        params: { prosecutorRecommendationMonths: 3, paraphraseId: paraphrase.id },
      },
      {
        id: 'high-anchor-9mo',
        name: 'High anchor (9 months probation)',
        params: { prosecutorRecommendationMonths: 9, paraphraseId: paraphrase.id },
      },
    ],
    expectedResponse: {
      kind: 'numeric',
      unit: 'months',
      range: { min: 0, max: 12 },
    },
  };
}

export const anchoringPromptRobustnessExperiment: ExperimentDefinition<AnchoringPromptRobustnessParams> =
  {
    id: 'anchoring-prompt-robustness',
    name: 'Anchoring Bias - Prompt Robustness Test',
    description:
      'Tests whether anchoring effect holds across 4 paraphrases of the Lena M. shoplifting case. ' +
      'Each paraphrase preserves the core scenario (12th offense shoplifter, 3mo vs 9mo anchor) ' +
      'but varies in tone: original, formal, conversational, and structured.',
    steps: buildStepsForParaphrase(paraphrase0_original), // Default steps for metadata
    conditions: createRobustnessConditions().map((c) => ({
      id: c.id,
      name: c.name,
      params: c.params,
    })),
    expectedResponse: {
      kind: 'numeric',
      unit: 'months',
      range: { min: 0, max: 12 },
    },
    metadata: {
      paraphraseCount: paraphrases.length,
      paraphraseIds: paraphrases.map((p) => p.id),
    },
  };
