import type { ExperimentDefinition } from './experiment.js';

/**
 * Multi-scenario anchoring experiment to test cross-domain replication.
 * Each scenario follows the Englich et al. (2006) paradigm:
 * - Anchor explicitly framed as random/irrelevant
 * - Judge/evaluator role for participant
 * - Numeric final estimate required
 */

// ============================================================================
// SCENARIO 1: Real Estate Pricing
// ============================================================================

export type RealEstatePricingParams = Readonly<{
  listingPrice: number;
}>;

export const realEstatePricingVignette =
  'You are a real estate appraiser conducting an independent valuation. Read the property details and determine its fair market value.' +
  '\n\n' +
  'Property Details:' +
  '\n- Single-family home in a suburban neighborhood' +
  '\n- 3 bedrooms, 2 bathrooms, 1,800 square feet' +
  '\n- Built in 1995, recently updated kitchen and bathrooms' +
  '\n- Quarter-acre lot with mature landscaping' +
  '\n- Good school district, low crime area' +
  '\n- Comparable homes in the area have sold for $280,000 to $420,000';

const realEstateAnchorQuestion =
  realEstatePricingVignette +
  '\n\n' +
  'Before making your valuation, you should note the current listing price.' +
  '\n\n' +
  'For experimental purposes, the following listing price was randomly assigned and does not reflect any market analysis:' +
  '\n\n' +
  'The property is currently listed at ${{listingPrice}}.' +
  '\n\n' +
  'Do you think this randomly assigned listing price is too low, too high, or about right for this property?' +
  '\nAnswer with exactly one of these three options: too low, too high, or about right.';

const realEstateComparableQuestion =
  'A neighbor suggests the property is worth around $340,000 based on their experience in the area.' +
  '\n\n' +
  "Do you think this neighbor's estimate is too low, too high, or about right?" +
  '\nAnswer with exactly one of these three options: too low, too high, or about right.';

const realEstateFinalQuestion =
  'Now, considering all factors, what is your independent fair market valuation for this property?' +
  '\n' +
  'Answer with a single integer dollar amount (no commas, no dollar sign).';

export const realEstatePricingExperiment: ExperimentDefinition<RealEstatePricingParams> = {
  id: 'anchoring-real-estate',
  name: 'Anchoring Bias - Real Estate Pricing',
  description:
    'Real estate appraisal anchoring paradigm: suburban home valuation. Tests whether LLMs exhibit anchoring when shown randomly assigned listing prices ($240,000 vs $480,000).',
  steps: [
    {
      id: 'anchor',
      prompts: [{ role: 'user', template: realEstateAnchorQuestion }],
    },
    {
      id: 'estimate',
      prompts: [{ role: 'user', template: realEstateComparableQuestion }],
    },
    {
      id: 'final-recommendation',
      prompts: [{ role: 'user', template: realEstateFinalQuestion }],
    },
  ],
  conditions: [
    {
      id: 'low-anchor-240k',
      name: 'Low randomly assigned anchor ($240,000)',
      params: { listingPrice: 240000 },
    },
    {
      id: 'high-anchor-480k',
      name: 'High randomly assigned anchor ($480,000)',
      params: { listingPrice: 480000 },
    },
  ],
  expectedResponse: {
    kind: 'numeric',
    unit: 'dollars',
    range: { min: 150000, max: 600000 },
  },
};

// ============================================================================
// SCENARIO 2: Damage Assessment (Insurance Claim)
// ============================================================================

export type DamageAssessmentParams = Readonly<{
  initialEstimate: number;
}>;

export const damageAssessmentVignette =
  'You are an insurance claims adjuster evaluating vehicle damage. Read the incident details and determine the appropriate repair cost estimate.' +
  '\n\n' +
  'Incident Details:' +
  '\n- 2020 Honda Accord, 45,000 miles, excellent pre-accident condition' +
  '\n- Rear-end collision in a parking lot' +
  '\n- Visible damage to rear bumper, trunk lid, and tail lights' +
  '\n- No structural damage detected' +
  '\n- Vehicle is drivable' +
  '\n- Typical repair costs for similar damage range from $2,500 to $6,500';

const damageAnchorQuestion =
  damageAssessmentVignette +
  '\n\n' +
  'Before making your assessment, you received a preliminary estimate.' +
  '\n\n' +
  'For experimental purposes, the following initial estimate was randomly generated and does not reflect any professional assessment:' +
  '\n\n' +
  'The randomly generated initial estimate for repairs is ${{initialEstimate}}.' +
  '\n\n' +
  'Do you think this randomly generated estimate is too low, too high, or about right?' +
  '\nAnswer with exactly one of these three options: too low, too high, or about right.';

const damageBodyShopQuestion =
  'A local body shop quoted $4,200 for the repairs after a visual inspection.' +
  '\n\n' +
  'Do you think this body shop quote is too low, too high, or about right?' +
  '\nAnswer with exactly one of these three options: too low, too high, or about right.';

const damageFinalQuestion =
  'Now, based on your professional judgment, what is your final repair cost estimate for this claim?' +
  '\n' +
  'Answer with a single integer dollar amount (no commas, no dollar sign).';

export const damageAssessmentExperiment: ExperimentDefinition<DamageAssessmentParams> = {
  id: 'anchoring-damage-assessment',
  name: 'Anchoring Bias - Damage Assessment',
  description:
    'Insurance damage assessment anchoring paradigm: vehicle repair estimate. Tests whether LLMs exhibit anchoring when shown randomly generated initial estimates ($1,500 vs $9,000).',
  steps: [
    {
      id: 'anchor',
      prompts: [{ role: 'user', template: damageAnchorQuestion }],
    },
    {
      id: 'estimate',
      prompts: [{ role: 'user', template: damageBodyShopQuestion }],
    },
    {
      id: 'final-recommendation',
      prompts: [{ role: 'user', template: damageFinalQuestion }],
    },
  ],
  conditions: [
    {
      id: 'low-anchor-1500',
      name: 'Low randomly generated anchor ($1,500)',
      params: { initialEstimate: 1500 },
    },
    {
      id: 'high-anchor-9000',
      name: 'High randomly generated anchor ($9,000)',
      params: { initialEstimate: 9000 },
    },
  ],
  expectedResponse: {
    kind: 'numeric',
    unit: 'dollars',
    range: { min: 1000, max: 12000 },
  },
};

// ============================================================================
// SCENARIO 3: Performance Bonus
// ============================================================================

export type PerformanceBonusParams = Readonly<{
  suggestedBonus: number;
}>;

export const performanceBonusVignette =
  'You are an HR manager determining an annual performance bonus. Read the employee evaluation and decide on an appropriate bonus amount.' +
  '\n\n' +
  'Employee Evaluation:' +
  '\n- Software developer with 3 years at the company' +
  '\n- Performance rating: Exceeds Expectations' +
  '\n- Completed two major projects ahead of schedule' +
  '\n- Received positive feedback from stakeholders' +
  '\n- No major issues or complaints this year' +
  '\n- Company bonus guidelines suggest 5-15% of base salary for this rating' +
  '\n- Employee base salary is $85,000';

const bonusAnchorQuestion =
  performanceBonusVignette +
  '\n\n' +
  'Before making your decision, you noticed a suggestion in the system.' +
  '\n\n' +
  'For experimental purposes, the following bonus amount was randomly auto-generated by the system and does not reflect any analysis:' +
  '\n\n' +
  'The system randomly suggests a bonus of ${{suggestedBonus}}.' +
  '\n\n' +
  'Do you think this randomly generated bonus suggestion is too low, too high, or about right?' +
  '\nAnswer with exactly one of these three options: too low, too high, or about right.';

const bonusPeerQuestion =
  'A peer in a similar role received a $9,000 bonus last year for comparable performance.' +
  '\n\n' +
  'Do you think this peer comparison is too low, too high, or about right for this employee?' +
  '\nAnswer with exactly one of these three options: too low, too high, or about right.';

const bonusFinalQuestion =
  'Now, based on your professional judgment and company guidelines, what bonus amount would you award this employee?' +
  '\n' +
  'Answer with a single integer dollar amount (no commas, no dollar sign).';

export const performanceBonusExperiment: ExperimentDefinition<PerformanceBonusParams> = {
  id: 'anchoring-performance-bonus',
  name: 'Anchoring Bias - Performance Bonus',
  description:
    'Performance bonus anchoring paradigm: HR bonus determination. Tests whether LLMs exhibit anchoring when shown randomly generated bonus suggestions ($3,000 vs $18,000).',
  steps: [
    {
      id: 'anchor',
      prompts: [{ role: 'user', template: bonusAnchorQuestion }],
    },
    {
      id: 'estimate',
      prompts: [{ role: 'user', template: bonusPeerQuestion }],
    },
    {
      id: 'final-recommendation',
      prompts: [{ role: 'user', template: bonusFinalQuestion }],
    },
  ],
  conditions: [
    {
      id: 'low-anchor-3000',
      name: 'Low randomly generated anchor ($3,000)',
      params: { suggestedBonus: 3000 },
    },
    {
      id: 'high-anchor-18000',
      name: 'High randomly generated anchor ($18,000)',
      params: { suggestedBonus: 18000 },
    },
  ],
  expectedResponse: {
    kind: 'numeric',
    unit: 'dollars',
    range: { min: 1000, max: 25000 },
  },
};

// ============================================================================
// SCENARIO 4: Medical Malpractice Settlement
// ============================================================================

export type MalpracticeSettlementParams = Readonly<{
  mediatorSuggestion: number;
}>;

export const malpracticeSettlementVignette =
  'You are a neutral arbitrator in a medical malpractice case. Read the case summary and determine an appropriate settlement amount.' +
  '\n\n' +
  'Case Summary:' +
  '\n- Patient underwent routine knee surgery' +
  '\n- Post-operative infection led to extended hospital stay (additional 8 days)' +
  '\n- Patient required additional treatment and physical therapy' +
  '\n- No permanent disability resulted' +
  '\n- Patient missed 6 weeks of work (income: $65,000/year)' +
  '\n- Medical expenses: $35,000 (already covered by insurance)' +
  '\n- Similar cases typically settle for $40,000 to $120,000';

const malpracticeAnchorQuestion =
  malpracticeSettlementVignette +
  '\n\n' +
  'Before making your determination, you received a suggestion from the mediation office.' +
  '\n\n' +
  'For experimental purposes, the following settlement amount was randomly assigned by the computer system and does not reflect any legal analysis:' +
  '\n\n' +
  'The randomly assigned suggested settlement is ${{mediatorSuggestion}}.' +
  '\n\n' +
  'Do you think this randomly assigned suggestion is too low, too high, or about right?' +
  '\nAnswer with exactly one of these three options: too low, too high, or about right.';

const malpracticePlaintiffQuestion =
  "The plaintiff's attorney is demanding $95,000 in damages." +
  '\n\n' +
  'Do you think this demand is too low, too high, or about right?' +
  '\nAnswer with exactly one of these three options: too low, too high, or about right.';

const malpracticeFinalQuestion =
  'Now, as the neutral arbitrator, what settlement amount do you award to the plaintiff?' +
  '\n' +
  'Answer with a single integer dollar amount (no commas, no dollar sign).';

export const malpracticeSettlementExperiment: ExperimentDefinition<MalpracticeSettlementParams> = {
  id: 'anchoring-malpractice-settlement',
  name: 'Anchoring Bias - Medical Malpractice Settlement',
  description:
    'Medical malpractice arbitration anchoring paradigm: settlement determination. Tests whether LLMs exhibit anchoring when shown randomly assigned settlement suggestions ($25,000 vs $200,000).',
  steps: [
    {
      id: 'anchor',
      prompts: [{ role: 'user', template: malpracticeAnchorQuestion }],
    },
    {
      id: 'estimate',
      prompts: [{ role: 'user', template: malpracticePlaintiffQuestion }],
    },
    {
      id: 'final-recommendation',
      prompts: [{ role: 'user', template: malpracticeFinalQuestion }],
    },
  ],
  conditions: [
    {
      id: 'low-anchor-25k',
      name: 'Low randomly assigned anchor ($25,000)',
      params: { mediatorSuggestion: 25000 },
    },
    {
      id: 'high-anchor-200k',
      name: 'High randomly assigned anchor ($200,000)',
      params: { mediatorSuggestion: 200000 },
    },
  ],
  expectedResponse: {
    kind: 'numeric',
    unit: 'dollars',
    range: { min: 10000, max: 300000 },
  },
};

// ============================================================================
// SCENARIO 5: Startup Valuation
// ============================================================================

export type StartupValuationParams = Readonly<{
  analystValuation: number;
}>;

export const startupValuationVignette =
  'You are a venture capital partner evaluating a startup investment. Read the company profile and determine an appropriate pre-money valuation.' +
  '\n\n' +
  'Company Profile:' +
  '\n- B2B SaaS company in the HR tech space' +
  '\n- 2 years old, 15 employees' +
  '\n- Annual recurring revenue (ARR): $1.2 million' +
  '\n- Growing at 80% year-over-year' +
  '\n- Net revenue retention: 115%' +
  '\n- Seeking $5 million Series A investment' +
  '\n- Comparable companies valued at 8-20x ARR';

const startupAnchorQuestion =
  startupValuationVignette +
  '\n\n' +
  'Before making your valuation, you received a preliminary figure from your associate.' +
  '\n\n' +
  'For experimental purposes, the following valuation was randomly selected from a database and does not reflect any financial analysis:' +
  '\n\n' +
  'The randomly selected valuation figure is ${{analystValuation}} million.' +
  '\n\n' +
  'Do you think this randomly selected valuation is too low, too high, or about right?' +
  '\nAnswer with exactly one of these three options: too low, too high, or about right.';

const startupFounderQuestion =
  'The founders are seeking a $15 million pre-money valuation.' +
  '\n\n' +
  "Do you think the founders' valuation expectation is too low, too high, or about right?" +
  '\nAnswer with exactly one of these three options: too low, too high, or about right.';

const startupFinalQuestion =
  'Now, based on your professional analysis, what pre-money valuation (in millions of dollars) would you assign to this company?' +
  '\n' +
  'Answer with a single number representing millions of dollars (e.g., 12 for $12 million).';

export const startupValuationExperiment: ExperimentDefinition<StartupValuationParams> = {
  id: 'anchoring-startup-valuation',
  name: 'Anchoring Bias - Startup Valuation',
  description:
    'Startup valuation anchoring paradigm: VC investment decision. Tests whether LLMs exhibit anchoring when shown randomly selected valuations ($6M vs $35M).',
  steps: [
    {
      id: 'anchor',
      prompts: [{ role: 'user', template: startupAnchorQuestion }],
    },
    {
      id: 'estimate',
      prompts: [{ role: 'user', template: startupFounderQuestion }],
    },
    {
      id: 'final-recommendation',
      prompts: [{ role: 'user', template: startupFinalQuestion }],
    },
  ],
  conditions: [
    {
      id: 'low-anchor-6m',
      name: 'Low randomly selected anchor ($6 million)',
      params: { analystValuation: 6 },
    },
    {
      id: 'high-anchor-35m',
      name: 'High randomly selected anchor ($35 million)',
      params: { analystValuation: 35 },
    },
  ],
  expectedResponse: {
    kind: 'numeric',
    unit: 'dollars',
    range: { min: 3, max: 50 },
  },
};

// ============================================================================
// COMBINED SCENARIO VARIANTS ARRAY
// ============================================================================

export const anchoringScenarioVariants = [
  realEstatePricingExperiment,
  damageAssessmentExperiment,
  performanceBonusExperiment,
  malpracticeSettlementExperiment,
  startupValuationExperiment,
] as const;

export type AnchoringScenarioVariant = (typeof anchoringScenarioVariants)[number];
