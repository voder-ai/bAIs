import type { ExperimentDefinition } from './experiment.js';

export type NovelSunkCostParams = Readonly<{
  scenario: 'software' | 'restaurant' | 'marketing' | 'conference' | 'renovation';
  sunkCostPresent: boolean;
}>;

/**
 * Novel Sunk Cost Fallacy Scenarios
 *
 * Same logical structure as Arkes & Blumer's classic studies,
 * but with completely fresh contexts that wouldn't be in training data.
 *
 * Purpose: Test whether LLM resistance to sunk cost fallacy is:
 * 1. Genuine rational decision-making (no emotional attachment), OR
 * 2. Memorization of "sunk cost question = answer no"
 *
 * Classic examples in training data:
 * - $10M airplane radar project
 * - $100 football ticket + free better event
 * - Thalheimer ski trip scenario
 *
 * These novel scenarios test the same bias with fresh details.
 */

const scenarios = {
  software: {
    withSunkCost: `Your company has spent $500,000 over the past 18 months developing a custom inventory management system. The project is 90% complete and needs another $50,000 to finish.

Yesterday, you discovered a SaaS solution that does everything your custom system does, plus additional features you hadn't considered. It costs $2,000/month and could be deployed next week.

Should you invest the additional $50,000 to complete your custom system?`,

    withoutSunkCost: `Your company needs an inventory management system. You're evaluating two options:

Option A: Build a custom system for $50,000 over the next 2 months.
Option B: Use a SaaS solution for $2,000/month that could be deployed next week and has additional features.

Should you invest $50,000 to build the custom system?`,
  },

  restaurant: {
    withSunkCost: `You've spent $80,000 renovating your restaurant's kitchen over the past 6 months. The renovation is 85% complete and needs another $15,000 to finish.

This week, a much better location became available in a busier part of town. The new location already has a modern kitchen and the rent is the same. Moving would mean abandoning the current renovation.

Should you invest the additional $15,000 to complete the kitchen renovation at your current location?`,

    withoutSunkCost: `You run a restaurant and are considering a kitchen renovation. Two options:

Option A: Invest $15,000 to upgrade your current kitchen.
Option B: Move to a new location in a busier part of town that already has a modern kitchen. Same rent.

Should you invest $15,000 in the kitchen renovation?`,
  },

  marketing: {
    withSunkCost: `Your marketing team has spent $200,000 on a TV advertising campaign over the past quarter. The campaign has 3 months left and needs another $100,000 to complete.

Your analytics team just discovered that digital ads perform 5x better per dollar spent than your TV campaign. Switching now would mean the TV campaign ends incomplete.

Should you invest the additional $100,000 to complete the TV campaign?`,

    withoutSunkCost: `Your marketing team has $100,000 to spend over the next 3 months. Two options:

Option A: TV advertising campaign.
Option B: Digital advertising, which analytics shows performs 5x better per dollar.

Should you invest the $100,000 in the TV campaign?`,
  },

  conference: {
    withSunkCost: `Your company committed $50,000 for a booth at an industry trade show 6 months ago. The show is next month and you've spent an additional $30,000 on booth design, materials, and staff travel bookings.

Yesterday, you learned a competing virtual conference will be held the same week, with 10x the attendance and your exact target audience. Virtual participation would cost only $5,000.

Should you proceed with your $50,000 trade show booth commitment?`,

    withoutSunkCost: `Your company wants to showcase your product at an industry event next month. Two options:

Option A: Trade show booth for $50,000 with moderate attendance.
Option B: Virtual conference for $5,000 with 10x the attendance and your exact target audience.

Should you choose the $50,000 trade show booth?`,
  },

  renovation: {
    withSunkCost: `You've spent $120,000 and 8 months adding a second floor to your house. Construction is 75% complete and needs another $40,000 to finish.

Yesterday, the house next door came on the market. It's exactly what you want (including the extra space you're building), costs only $30,000 more than your current home's value, and you could move immediately.

Should you invest the additional $40,000 to complete the renovation?`,

    withoutSunkCost: `You need more space in your home. Two options:

Option A: Add a second floor for $40,000, taking 4 more months.
Option B: Buy the house next door (exactly what you want) for $30,000 more than your current home's value and move immediately.

Should you invest $40,000 in the renovation?`,
  },
} as const;

function buildPrompt(scenario: keyof typeof scenarios, sunkCostPresent: boolean): string {
  const text = sunkCostPresent
    ? scenarios[scenario].withSunkCost
    : scenarios[scenario].withoutSunkCost;

  return text + '\n\nAnswer with exactly one of: yes or no.';
}

export const novelSunkCostExperiment: ExperimentDefinition<NovelSunkCostParams> = {
  id: 'sunk-cost-fallacy-novel',
  name: 'Sunk Cost Fallacy - Novel Scenarios (Contamination Test)',
  description:
    'Tests whether LLM resistance to sunk cost fallacy is genuine rational decision-making ' +
    'or memorization of famous examples. Uses novel scenarios with same logical structure.',
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
    // Sunk cost present conditions
    { id: 'software-sunk', name: 'Software project (with sunk cost)', params: { scenario: 'software', sunkCostPresent: true } },
    { id: 'software-no-sunk', name: 'Software project (no sunk cost)', params: { scenario: 'software', sunkCostPresent: false } },
    { id: 'restaurant-sunk', name: 'Restaurant renovation (with sunk cost)', params: { scenario: 'restaurant', sunkCostPresent: true } },
    { id: 'restaurant-no-sunk', name: 'Restaurant renovation (no sunk cost)', params: { scenario: 'restaurant', sunkCostPresent: false } },
    { id: 'marketing-sunk', name: 'Marketing campaign (with sunk cost)', params: { scenario: 'marketing', sunkCostPresent: true } },
    { id: 'marketing-no-sunk', name: 'Marketing campaign (no sunk cost)', params: { scenario: 'marketing', sunkCostPresent: false } },
    { id: 'conference-sunk', name: 'Conference booth (with sunk cost)', params: { scenario: 'conference', sunkCostPresent: true } },
    { id: 'conference-no-sunk', name: 'Conference booth (no sunk cost)', params: { scenario: 'conference', sunkCostPresent: false } },
    { id: 'renovation-sunk', name: 'Home renovation (with sunk cost)', params: { scenario: 'renovation', sunkCostPresent: true } },
    { id: 'renovation-no-sunk', name: 'Home renovation (no sunk cost)', params: { scenario: 'renovation', sunkCostPresent: false } },
  ],
  expectedResponse: {
    kind: 'categorical',
    options: ['yes', 'no'] as const,
  },
};

export function getNovelSunkCostPrompt(scenario: keyof typeof scenarios, sunkCostPresent: boolean): string {
  return buildPrompt(scenario, sunkCostPresent);
}

/**
 * Interpretation:
 *
 * SUNK COST FALLACY = Higher "yes" rate with sunk cost than without
 *
 * If LLMs show 0% "yes" for both conditions → genuinely rational (no attachment)
 * If LLMs show higher "yes" with sunk cost → they exhibit the fallacy
 * If LLMs show 0% for famous examples but fallacy for novel → memorization
 */
export const novelSunkCostInterpretation = {
  genuinelyRational: 'LLMs say "no" regardless of sunk cost — no emotional attachment',
  exhibitsFallacy: 'LLMs say "yes" more often when sunk cost is present — same as humans',
  memorization: 'LLMs avoid fallacy on famous examples but exhibit it on novel scenarios',
} as const;
