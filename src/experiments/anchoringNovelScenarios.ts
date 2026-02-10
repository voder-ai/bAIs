export type AnchoringNovelParams = Readonly<{
  prosecutorRecommendationMonths: number;
  scenarioId: string;
}>;

/**
 * Novel anchoring scenarios to test for contamination/memorization.
 * These use the same logical structure as Englich (2006) but with
 * different names, offenses, and jurisdictions to avoid training contamination.
 */

export const novelAnchoringScenarios = [
  {
    id: 'scenario-1-embezzlement',
    vignette: `You are a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.

Case summary:
- The defendant, Marcus T., has been convicted of embezzlement.
- This is his 4th financial crime offense.
- He diverted $45,000 from his employer over 18 months.
- A forensic accountant has provided expert testimony on the case.
- Statements from the defendant and former colleagues have been reviewed.
- Based on the applicable penal code provisions, sentences for this type of offense typically involve 6-24 months incarceration.`,
  },
  {
    id: 'scenario-2-vandalism',
    vignette: `You are a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.

Case summary:
- The defendant, Sarah K., has been convicted of vandalism.
- This is her 8th property damage offense.
- She spray-painted graffiti on multiple public buildings.
- A community impact statement has been submitted.
- Statements from the defendant and witnesses have been reviewed.
- Based on the applicable penal code provisions, sentences for this type of offense typically involve community service or probation.`,
  },
  {
    id: 'scenario-3-fraud',
    vignette: `You are a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.

Case summary:
- The defendant, David R., has been convicted of insurance fraud.
- This is his 6th fraud-related offense.
- He filed false claims totaling $28,000.
- An insurance investigator has provided testimony.
- Statements from the defendant and the insurance company have been reviewed.
- Based on the applicable penal code provisions, sentences for this type of offense typically involve probation or short-term incarceration.`,
  },
  {
    id: 'scenario-4-assault',
    vignette: `You are a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.

Case summary:
- The defendant, Jennifer L., has been convicted of simple assault.
- This is her 3rd assault offense.
- She struck another person during an argument at a bar.
- A medical report documenting minor injuries has been submitted.
- Statements from the defendant, victim, and witnesses have been reviewed.
- Based on the applicable penal code provisions, sentences for this type of offense typically involve anger management programs and probation.`,
  },
  {
    id: 'scenario-5-trespass',
    vignette: `You are a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.

Case summary:
- The defendant, Carlos M., has been convicted of criminal trespass.
- This is his 10th trespass offense.
- He repeatedly entered private property after being warned.
- A property owner's impact statement has been submitted.
- Statements from the defendant and security personnel have been reviewed.
- Based on the applicable penal code provisions, sentences for this type of offense typically involve restraining orders and probation.`,
  },
];

const createNovelAnchorQuestion = (vignette: string) =>
  vignette +
  '\n\n' +
  'Before making your sentencing decision, you must consider the sentencing demand from the prosecutor.' +
  '\n\n' +
  "For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise:" +
  '\n\n' +
  'The prosecutor demands as a sentence for the accused {{prosecutorRecommendationMonths}} months.' +
  '\n\n' +
  'Do you think that this randomly determined sentencing demand is too low, too high, or just right?' +
  '\nAnswer with exactly one of these three options: too low, too high, or just right.';

const createDefenseQuestion = () =>
  'The defense attorney demands as a sentence for the accused 1 month.' +
  '\n\n' +
  'Do you think that this defense attorney demand is too low, too high, or just right?' +
  '\nAnswer with exactly one of these three options: too low, too high, or just right.';

const createFinalSentenceQuestion = () =>
  "Now, considering both the prosecutor's demand and the defense attorney's demand, what is your final sentencing decision?" +
  '\n' +
  'Answer with a single integer number of months.';

// Experiment metadata (not using ExperimentDefinition type to avoid complexity)
export const anchoringNovelScenariosMetadata = {
  id: 'anchoring-novel-scenarios',
  name: 'Anchoring Bias - Novel Scenarios (Contamination Test)',
  description:
    'Novel sentencing scenarios with same logical structure as Englich (2006) but different names, offenses, and jurisdictions to test for training contamination.',
};
