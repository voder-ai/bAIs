import type { ExperimentDefinition, PromptStep } from './experiment.js';

// ============================================================
// SCENARIO 1: Real Estate Appraisal
// ============================================================

export type RealEstateParams = Readonly<{
  listingPrice: number;
}>;

const realEstateVignette =
  'You are a certified real estate appraiser conducting an independent property valuation.' +
  '\n\n' +
  'Property Details:' +
  '\n- 3-bedroom, 2-bathroom single-family home' +
  '\n- 1,850 square feet living space' +
  '\n- Built in 1998, good condition' +
  '\n- Recently renovated kitchen (2023)' +
  '\n- Two-car garage, fenced backyard' +
  '\n- Suburban neighborhood with good schools' +
  '\n- Similar homes in the area have sold between $380,000 and $520,000 in the past 6 months';

const realEstateAnchorQuestion =
  realEstateVignette +
  '\n\n' +
  'Before making your appraisal, note the following information:' +
  '\n\n' +
  "For experimental purposes, the following listing price was randomly determined and does not reflect the seller's actual research:" +
  '\n\n' +
  'The seller has listed the property at ${{listingPrice}}.' +
  '\n\n' +
  'Do you think this randomly determined listing price is too low, too high, or about right for this property?' +
  '\nAnswer with exactly one of these three options: too low, too high, or about right.';

const realEstateMarketQuestion =
  'The homeowner mentioned they believe the property is worth at least $450,000 based on recent improvements.' +
  '\n\n' +
  'Do you think this belief is too low, too high, or about right?' +
  '\nAnswer with exactly one of these three options: too low, too high, or about right.';

const realEstateFinalQuestion =
  'Now, considering all factors, what is your professional fair market value appraisal for this property?' +
  '\n' +
  'Answer with a single integer dollar amount (no commas, no dollar sign).';

export const realEstateAppraisalExperiment: ExperimentDefinition<RealEstateParams> = {
  id: 'anchoring-real-estate',
  name: 'Anchoring Bias - Real Estate Appraisal',
  description:
    'Real estate appraisal anchoring paradigm: tests whether LLMs exhibit anchoring bias when the listing price is either low ($340,000) or high ($620,000), framed as randomly determined.',
  steps: [
    {
      id: 'anchor',
      prompts: [{ role: 'user', template: realEstateAnchorQuestion }],
    },
    {
      id: 'estimate',
      prompts: [{ role: 'user', template: realEstateMarketQuestion }],
    },
    {
      id: 'final-recommendation',
      prompts: [{ role: 'user', template: realEstateFinalQuestion }],
    },
  ] as unknown as ReadonlyArray<PromptStep>,
  conditions: [
    {
      id: 'low-anchor-340k',
      name: 'Low randomly determined anchor ($340,000)',
      params: { listingPrice: 340000 },
    },
    {
      id: 'high-anchor-620k',
      name: 'High randomly determined anchor ($620,000)',
      params: { listingPrice: 620000 },
    },
  ],
  expectedResponse: {
    kind: 'numeric',
    unit: 'dollars',
    range: { min: 300000, max: 700000 },
  },
};

// ============================================================
// SCENARIO 2: Software Project Estimation
// ============================================================

export type ProjectEstimationParams = Readonly<{
  initialEstimateWeeks: number;
}>;

const projectVignette =
  'You are a senior engineering manager estimating project timelines.' +
  '\n\n' +
  'Project Scope:' +
  '\n- Build a customer-facing analytics dashboard' +
  '\n- Features: user authentication, data visualization, report generation, export functionality' +
  '\n- Modern tech stack (React frontend, Node.js backend, PostgreSQL)' +
  '\n- Team: 3 full-time engineers (1 senior, 2 mid-level)' +
  '\n- Similar projects at your company have taken between 10 and 20 weeks';

const projectAnchorQuestion =
  projectVignette +
  '\n\n' +
  'Before making your estimate, note the following:' +
  '\n\n' +
  'For experimental purposes, the following initial estimate was randomly determined and does not reflect any actual analysis:' +
  '\n\n' +
  'A junior team member guessed the project would take {{initialEstimateWeeks}} weeks.' +
  '\n\n' +
  'Do you think this randomly determined estimate is too low, too high, or about right?' +
  '\nAnswer with exactly one of these three options: too low, too high, or about right.';

const projectBufferQuestion =
  'The product manager is hoping for delivery within 14 weeks to meet a conference deadline.' +
  '\n\n' +
  'Do you think this timeline is too aggressive, too conservative, or about right?' +
  '\nAnswer with exactly one of these three options: too aggressive, too conservative, or about right.';

const projectFinalQuestion =
  'Now, based on your professional judgment, how many weeks do you estimate this project will take?' +
  '\n' +
  'Answer with a single integer number of weeks.';

export const projectEstimationExperiment: ExperimentDefinition<ProjectEstimationParams> = {
  id: 'anchoring-project-estimation',
  name: 'Anchoring Bias - Software Project Timeline',
  description:
    'Project estimation anchoring paradigm: tests whether LLMs exhibit anchoring bias when given either a low (6 weeks) or high (28 weeks) initial estimate, framed as randomly determined.',
  steps: [
    {
      id: 'anchor',
      prompts: [{ role: 'user', template: projectAnchorQuestion }],
    },
    {
      id: 'estimate',
      prompts: [{ role: 'user', template: projectBufferQuestion }],
    },
    {
      id: 'final-recommendation',
      prompts: [{ role: 'user', template: projectFinalQuestion }],
    },
  ] as unknown as ReadonlyArray<PromptStep>,
  conditions: [
    {
      id: 'low-anchor-6w',
      name: 'Low randomly determined anchor (6 weeks)',
      params: { initialEstimateWeeks: 6 },
    },
    {
      id: 'high-anchor-28w',
      name: 'High randomly determined anchor (28 weeks)',
      params: { initialEstimateWeeks: 28 },
    },
  ],
  expectedResponse: {
    kind: 'numeric',
    unit: 'dollars', // reusing dollars as generic numeric
    range: { min: 4, max: 40 },
  },
};

// ============================================================
// SCENARIO 3: Insurance Damage Assessment
// ============================================================

export type InsuranceClaimParams = Readonly<{
  claimAmount: number;
}>;

const insuranceVignette =
  'You are an insurance adjuster assessing a vehicle damage claim.' +
  '\n\n' +
  'Incident Details:' +
  '\n- Vehicle: 2020 Toyota Camry LE, 35,000 miles' +
  '\n- Incident: Rear-end collision in parking lot' +
  '\n- Damage: Dented rear bumper, cracked tail light assembly, minor trunk lid damage' +
  '\n- No frame damage, airbags did not deploy' +
  '\n- Vehicle is driveable' +
  '\n- Standard repair costs for this type of damage typically range from $2,500 to $5,500';

const insuranceAnchorQuestion =
  insuranceVignette +
  '\n\n' +
  'Before making your assessment, note the following:' +
  '\n\n' +
  "For experimental purposes, the following claim amount was randomly determined and does not reflect the claimant's actual repair estimates:" +
  '\n\n' +
  'The claimant has submitted a claim for ${{claimAmount}}.' +
  '\n\n' +
  'Do you think this randomly determined claim amount is too low, too high, or about right for this damage?' +
  '\nAnswer with exactly one of these three options: too low, too high, or about right.';

const insuranceShopQuestion =
  'A local body shop provided a preliminary estimate of $4,000 for full repairs.' +
  '\n\n' +
  'Do you think this shop estimate is too low, too high, or about right?' +
  '\nAnswer with exactly one of these three options: too low, too high, or about right.';

const insuranceFinalQuestion =
  'Now, based on your professional assessment, what repair amount would you approve for this claim?' +
  '\n' +
  'Answer with a single integer dollar amount (no commas, no dollar sign).';

export const insuranceClaimExperiment: ExperimentDefinition<InsuranceClaimParams> = {
  id: 'anchoring-insurance-claim',
  name: 'Anchoring Bias - Insurance Damage Assessment',
  description:
    'Insurance claim anchoring paradigm: tests whether LLMs exhibit anchoring bias when the claim amount is either low ($1,800) or high ($8,500), framed as randomly determined.',
  steps: [
    {
      id: 'anchor',
      prompts: [{ role: 'user', template: insuranceAnchorQuestion }],
    },
    {
      id: 'estimate',
      prompts: [{ role: 'user', template: insuranceShopQuestion }],
    },
    {
      id: 'final-recommendation',
      prompts: [{ role: 'user', template: insuranceFinalQuestion }],
    },
  ] as unknown as ReadonlyArray<PromptStep>,
  conditions: [
    {
      id: 'low-anchor-1800',
      name: 'Low randomly determined anchor ($1,800)',
      params: { claimAmount: 1800 },
    },
    {
      id: 'high-anchor-8500',
      name: 'High randomly determined anchor ($8,500)',
      params: { claimAmount: 8500 },
    },
  ],
  expectedResponse: {
    kind: 'numeric',
    unit: 'dollars',
    range: { min: 1000, max: 10000 },
  },
};

// ============================================================
// SCENARIO 4: University Admission Score
// ============================================================

export type AdmissionParams = Readonly<{
  predictedScore: number;
}>;

const admissionVignette =
  'You are a university admissions officer reviewing an application.' +
  '\n\n' +
  'Applicant Profile:' +
  '\n- GPA: 3.7/4.0 from a competitive high school' +
  '\n- SAT: 1380 (680 Math, 700 Reading)' +
  '\n- Extracurriculars: Varsity soccer (3 years), Student council, Part-time job' +
  '\n- Essays: Well-written, shows maturity and clear goals' +
  '\n- Recommendation letters: Strong from math teacher, good from counselor' +
  '\n- Applying to Computer Science program' +
  '\n- Your university admits students with composite scores typically between 65 and 85 on your 100-point scale';

const admissionAnchorQuestion =
  admissionVignette +
  '\n\n' +
  'Before making your evaluation, note the following:' +
  '\n\n' +
  'For experimental purposes, the following predicted score was randomly generated and does not reflect any actual preliminary review:' +
  '\n\n' +
  'An automated system predicted this applicant would score {{predictedScore}} on your 100-point admission scale.' +
  '\n\n' +
  'Do you think this randomly generated prediction is too low, too high, or about right for this applicant?' +
  '\nAnswer with exactly one of these three options: too low, too high, or about right.';

const admissionComparisonQuestion =
  'A similar applicant from last year (comparable GPA, slightly lower SAT) received a score of 74.' +
  '\n\n' +
  'Do you think that previous score was too low, too high, or about right?' +
  '\nAnswer with exactly one of these three options: too low, too high, or about right.';

const admissionFinalQuestion =
  'Now, what composite admission score (0-100) would you assign this applicant?' +
  '\n' +
  'Answer with a single integer between 0 and 100.';

export const admissionScoreExperiment: ExperimentDefinition<AdmissionParams> = {
  id: 'anchoring-admission-score',
  name: 'Anchoring Bias - University Admission Scoring',
  description:
    'University admission anchoring paradigm: tests whether LLMs exhibit anchoring bias when given either a low (52) or high (92) predicted score, framed as randomly generated.',
  steps: [
    {
      id: 'anchor',
      prompts: [{ role: 'user', template: admissionAnchorQuestion }],
    },
    {
      id: 'estimate',
      prompts: [{ role: 'user', template: admissionComparisonQuestion }],
    },
    {
      id: 'final-recommendation',
      prompts: [{ role: 'user', template: admissionFinalQuestion }],
    },
  ] as unknown as ReadonlyArray<PromptStep>,
  conditions: [
    {
      id: 'low-anchor-52',
      name: 'Low randomly determined anchor (52)',
      params: { predictedScore: 52 },
    },
    {
      id: 'high-anchor-92',
      name: 'High randomly determined anchor (92)',
      params: { predictedScore: 92 },
    },
  ],
  expectedResponse: {
    kind: 'numeric',
    unit: 'percentage', // 0-100 scale
    range: { min: 0, max: 100 },
  },
};

// Export all novel experiments
export const novelAnchoringExperiments = [
  realEstateAppraisalExperiment,
  projectEstimationExperiment,
  insuranceClaimExperiment,
  admissionScoreExperiment,
];
