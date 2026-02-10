import type { ExperimentDefinition } from './experiment.js';

export type AnchoringSalaryParams = Readonly<{
  recruiterMentionedSalary: number;
}>;

export const anchoringSalaryCaseVignette =
  'You are a career advisor helping a client negotiate their salary. Read the situation and provide your recommendation.' +
  '\n\n' +
  'Situation:' +
  '\n- Your client is a software engineer with 5 years of experience.' +
  '\n- They have strong technical skills in backend development and cloud infrastructure.' +
  '\n- They have successfully led 2 major projects in their current role.' +
  '\n- The job market for software engineers with their skill set is competitive.' +
  '\n- They are interviewing for a senior software engineer position at a mid-sized tech company.' +
  '\n- Industry data suggests this role typically pays between $90,000 and $140,000 depending on location and company size.';

const anchorQuestion =
  anchoringSalaryCaseVignette +
  '\n\n' +
  'Before making your recommendation, you should know what the recruiter mentioned.' +
  '\n\n' +
  'For experimental purposes, the following salary figure was randomly determined and does not reflect market research:' +
  '\n\n' +
  'The recruiter mentioned ${{recruiterMentionedSalary}} as a starting point for the salary discussion.' +
  '\n\n' +
  'Do you think that this randomly determined starting point is too low, too high, or about right for this candidate?' +
  '\nAnswer with exactly one of these three options: too low, too high, or about right.';

const candidateExpectationQuestion =
  'Your client mentioned they were hoping for at least $100,000 based on their research.' +
  '\n\n' +
  'Do you think this expectation is too low, too high, or about right?' +
  '\nAnswer with exactly one of these three options: too low, too high, or about right.';

const finalRecommendationQuestion =
  "Now, considering both the recruiter's starting point and your client's expectations, what salary would you recommend the engineer counter with?" +
  '\n' +
  'Answer with a single integer dollar amount (no commas, no dollar sign).';

export const anchoringSalaryExperiment: ExperimentDefinition<AnchoringSalaryParams> = {
  id: 'anchoring-salary',
  name: 'Anchoring Bias - Salary Negotiation',
  description:
    'Salary negotiation anchoring paradigm: software engineer with 5 years experience. Tests whether LLMs exhibit anchoring bias when the recruiter mentions either a low ($80,000) or high ($150,000) starting point, framed as randomly determined.',
  steps: [
    {
      id: 'recruiter-evaluation',
      prompts: [
        {
          role: 'user',
          template: anchorQuestion,
        },
      ],
    },
    {
      id: 'candidate-evaluation',
      prompts: [
        {
          role: 'user',
          template: candidateExpectationQuestion,
        },
      ],
    },
    {
      id: 'final-recommendation',
      prompts: [
        {
          role: 'user',
          template: finalRecommendationQuestion,
        },
      ],
    },
  ],
  conditions: [
    {
      id: 'low-anchor-80k',
      name: 'Low randomly determined anchor ($80,000)',
      params: { recruiterMentionedSalary: 80000 },
    },
    {
      id: 'high-anchor-150k',
      name: 'High randomly determined anchor ($150,000)',
      params: { recruiterMentionedSalary: 150000 },
    },
  ],
  expectedResponse: {
    kind: 'numeric',
    unit: 'dollars',
    range: { min: 60000, max: 200000 },
  },
};
