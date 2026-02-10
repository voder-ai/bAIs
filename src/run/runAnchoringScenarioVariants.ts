#!/usr/bin/env node
import { appendFile, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  anchoringScenarioVariants,
  type AnchoringScenarioVariant,
} from '../experiments/anchoringScenarioVariants.js';
import { renderPrompt } from '../experiments/renderPrompt.js';
import type { LlmProvider } from '../llm/provider.js';
import { createProvider, parseModelSpec } from '../llm/provider.js';
import {
  computeDescriptiveStats,
  computeFiveNumberSummary,
  bootstrapMeanDifferenceCI,
  effectSizeTwoSample,
  welchTTestTwoSided,
} from '../analysis/stats.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================================
// Types
// ============================================================================

type ScenarioResult = Readonly<{
  anchorValue: number;
  anchorEvaluation: 'too low' | 'too high' | 'about right';
  secondEvaluation: 'too low' | 'too high' | 'about right';
  finalEstimate: number;
}>;

type ScenarioAnalysis = Readonly<{
  experimentId: string;
  experimentName: string;
  lowCondition: {
    id: string;
    anchorValue: number;
    n: number;
    mean: number;
    median: number;
    stdDev: number;
    fiveNumberSummary: { min: number; q1: number; median: number; q3: number; max: number };
    rawValues: number[];
  };
  highCondition: {
    id: string;
    anchorValue: number;
    n: number;
    mean: number;
    median: number;
    stdDev: number;
    fiveNumberSummary: { min: number; q1: number; median: number; q3: number; max: number };
    rawValues: number[];
  };
  comparison: {
    meanDifference: number;
    meanDiffCI95: { lower: number; upper: number } | null;
    welchT: { t: number; df: number; pValue: number } | null;
    effectSize: { hedgesG: number; cohensD: number } | null;
  };
}>;

type FullAnalysis = Readonly<{
  generatedAt: string;
  model: string;
  runsPerCondition: number;
  scenarios: ScenarioAnalysis[];
  summary: {
    totalScenarios: number;
    significantAnchoring: number;
    averageEffectSize: number | null;
    allEffectSizes: { scenario: string; hedgesG: number }[];
  };
}>;

// ============================================================================
// Runner Configuration
// ============================================================================

const maxAttemptsPerTrial = 3;

function getAnchorParamName(experiment: AnchoringScenarioVariant): string {
  const condition = experiment.conditions[0];
  if (!condition) throw new Error(`No conditions for ${experiment.id}`);
  const keys = Object.keys(condition.params);
  if (keys.length !== 1) throw new Error(`Expected single param for ${experiment.id}`);
  return keys[0]!;
}

function getAnchorValue(experiment: AnchoringScenarioVariant, conditionId: string): number {
  const condition = experiment.conditions.find((c) => c.id === conditionId);
  if (!condition) throw new Error(`Condition ${conditionId} not found`);
  const paramName = getAnchorParamName(experiment);
  const value = (condition.params as Record<string, unknown>)[paramName];
  if (typeof value !== 'number') throw new Error(`Invalid anchor value for ${conditionId}`);
  return value;
}

function buildPrompt(
  experiment: AnchoringScenarioVariant,
  conditionVars: Record<string, string | number>,
  range: { min: number; max: number },
): string {
  const parts = experiment.steps.map((step) => {
    return step.prompts
      .map((p) => {
        const rendered = renderPrompt(p.template, conditionVars);
        return p.role === 'system'
          ? `[System instruction]\n${rendered}\n[End system instruction]`
          : rendered;
      })
      .join('\n\n');
  });

  const anchorParamName = getAnchorParamName(experiment);
  const anchorValue = conditionVars[anchorParamName];

  return [
    ...parts,
    '',
    'Return JSON only (no markdown).',
    `JSON schema: {"anchorValue": number, "anchorEvaluation": "too low"|"too high"|"about right", "secondEvaluation": "too low"|"too high"|"about right", "finalEstimate": integer (${range.min}..${range.max})}`,
    'Rules: output must be ONLY the JSON object, with exactly those four keys, no extra keys.',
    `Consistency rule: anchorValue MUST equal ${anchorValue} (the value shown in the prompt).`,
  ].join('\n\n');
}

function assertValidResult(
  value: unknown,
  expectedAnchor: number,
  range: { min: number; max: number },
): asserts value is ScenarioResult {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid result: not an object');
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (
    keys.length !== 4 ||
    !keys.includes('anchorValue') ||
    !keys.includes('anchorEvaluation') ||
    !keys.includes('secondEvaluation') ||
    !keys.includes('finalEstimate')
  ) {
    throw new Error(
      'Invalid result: must contain exactly anchorValue, anchorEvaluation, secondEvaluation, finalEstimate',
    );
  }

  const anchorValue = record['anchorValue'];
  const anchorEvaluation = record['anchorEvaluation'];
  const secondEvaluation = record['secondEvaluation'];
  const finalEstimate = record['finalEstimate'];

  if (typeof anchorValue !== 'number') {
    throw new Error('Invalid result: anchorValue must be a number');
  }

  // Allow small floating point differences for anchor value
  if (Math.abs(anchorValue - expectedAnchor) > 0.01 * expectedAnchor) {
    throw new Error(
      `Invalid result: anchorValue ${anchorValue} doesn't match expected ${expectedAnchor}`,
    );
  }

  if (
    anchorEvaluation !== 'too low' &&
    anchorEvaluation !== 'too high' &&
    anchorEvaluation !== 'about right'
  ) {
    throw new Error(
      'Invalid result: anchorEvaluation must be "too low", "too high", or "about right"',
    );
  }

  if (
    secondEvaluation !== 'too low' &&
    secondEvaluation !== 'too high' &&
    secondEvaluation !== 'about right'
  ) {
    throw new Error(
      'Invalid result: secondEvaluation must be "too low", "too high", or "about right"',
    );
  }

  if (typeof finalEstimate !== 'number') {
    throw new Error('Invalid result: finalEstimate must be a number');
  }

  // Lenient range check (allow some flexibility)
  const lenientMin = range.min * 0.5;
  const lenientMax = range.max * 1.5;
  if (finalEstimate < lenientMin || finalEstimate > lenientMax) {
    throw new Error(
      `Invalid result: finalEstimate ${finalEstimate} outside reasonable range (${lenientMin}-${lenientMax})`,
    );
  }
}

async function runSingleTrial(options: {
  experiment: AnchoringScenarioVariant;
  conditionId: string;
  conditionVars: Record<string, string | number>;
  runIndex: number;
  llmProvider: LlmProvider;
}): Promise<
  | { ok: true; result: ScenarioResult; rawLastMessage: string }
  | { ok: false; error: string; rawLastMessage?: string }
> {
  const { experiment, conditionVars, llmProvider } = options;
  const range =
    experiment.expectedResponse.kind === 'numeric'
      ? experiment.expectedResponse.range
      : { min: 0, max: 1000000 };
  const expectedAnchor = getAnchorValue(experiment, options.conditionId);

  let lastRaw: string | undefined;
  let prompt = buildPrompt(experiment, conditionVars, range);

  for (let attempt = 1; attempt <= maxAttemptsPerTrial; attempt += 1) {
    try {
      const { parsed, rawResponse } = await llmProvider.sendJson<ScenarioResult>({
        prompt,
      });
      lastRaw = rawResponse;

      assertValidResult(parsed, expectedAnchor, range);
      return { ok: true, result: parsed, rawLastMessage: rawResponse };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      prompt = [
        buildPrompt(experiment, conditionVars, range),
        '',
        `Your previous output was invalid (attempt ${attempt}/${maxAttemptsPerTrial}).`,
        `Error: ${message}`,
        lastRaw ? `Previous output: ${JSON.stringify(lastRaw)}` : '',
        'Return ONLY the JSON object matching the schema. No other text.',
      ]
        .filter(Boolean)
        .join('\n\n');

      if (attempt === maxAttemptsPerTrial) {
        const errorResult: { ok: false; error: string; rawLastMessage?: string } = {
          ok: false,
          error: message,
        };
        if (lastRaw) errorResult.rawLastMessage = lastRaw;
        return errorResult;
      }
    }
  }

  return { ok: false, error: 'Unexpected runner state' };
}

// ============================================================================
// Main Runner
// ============================================================================

async function main(): Promise<void> {
  const modelSpec = process.argv[2] ?? 'anthropic/claude-sonnet-4-20250514';
  const runsPerCondition = parseInt(process.argv[3] ?? '10', 10);
  const outPath =
    process.argv[4] ?? path.join(__dirname, '../../results/sonnet4-anchoring-scenarios.jsonl');

  console.error(`Model: ${modelSpec}`);
  console.error(`Runs per condition: ${runsPerCondition}`);
  console.error(`Output: ${outPath}`);
  console.error(`Scenarios: ${anchoringScenarioVariants.length}`);
  console.error('');

  const spec = parseModelSpec(modelSpec);
  const llmProvider = await createProvider(spec);

  // Storage for analysis
  const collectedResults: Record<string, Record<string, { ok: number[]; errorN: number }>> = {};

  for (const experiment of anchoringScenarioVariants) {
    collectedResults[experiment.id] = {};
    for (const condition of experiment.conditions) {
      collectedResults[experiment.id]![condition.id] = { ok: [], errorN: 0 };
    }
  }

  // Run all trials
  let totalTrials = 0;
  let completedTrials = 0;

  for (const experiment of anchoringScenarioVariants) {
    totalTrials += experiment.conditions.length * runsPerCondition;
  }

  for (const experiment of anchoringScenarioVariants) {
    console.error(`\n=== ${experiment.name} ===`);

    for (const condition of experiment.conditions) {
      const anchorValue = getAnchorValue(experiment, condition.id);

      for (let runIndex = 0; runIndex < runsPerCondition; runIndex += 1) {
        completedTrials += 1;
        const progress = ((completedTrials / totalTrials) * 100).toFixed(1);
        process.stderr.write(
          `\r[${progress}%] ${experiment.id} / ${condition.id} / run ${runIndex + 1}/${runsPerCondition}`,
        );

        const trial = await runSingleTrial({
          experiment,
          conditionId: condition.id,
          conditionVars: condition.params as Record<string, string | number>,
          runIndex,
          llmProvider,
        });

        if (trial.ok) {
          collectedResults[experiment.id]![condition.id]!.ok.push(trial.result.finalEstimate);
        } else {
          collectedResults[experiment.id]![condition.id]!.errorN += 1;
        }

        // Write JSONL record
        const record = {
          experimentId: experiment.id,
          experimentName: experiment.name,
          model: llmProvider.name,
          conditionId: condition.id,
          anchorValue,
          runIndex,
          result: trial.ok ? trial.result : null,
          error: trial.ok ? undefined : trial.error,
          rawLastMessage: trial.rawLastMessage,
          collectedAt: new Date().toISOString(),
        };

        await appendFile(outPath, JSON.stringify(record) + '\n', 'utf8');
      }
    }
    console.error('');
  }

  // ============================================================================
  // Analysis
  // ============================================================================

  console.error('\n=== ANALYSIS ===\n');

  const scenarioAnalyses: ScenarioAnalysis[] = [];
  const allEffectSizes: { scenario: string; hedgesG: number }[] = [];

  for (const experiment of anchoringScenarioVariants) {
    const conditions = experiment.conditions;
    if (conditions.length !== 2) continue;

    // Determine low vs high condition by anchor value
    const anchorParam = getAnchorParamName(experiment);
    const sortedConditions = [...conditions].sort((a, b) => {
      const aVal = (a.params as Record<string, unknown>)[anchorParam] as number;
      const bVal = (b.params as Record<string, unknown>)[anchorParam] as number;
      return aVal - bVal;
    });

    const lowCond = sortedConditions[0]!;
    const highCond = sortedConditions[1]!;

    const lowResults = collectedResults[experiment.id]![lowCond.id]!.ok;
    const highResults = collectedResults[experiment.id]![highCond.id]!.ok;

    if (lowResults.length < 2 || highResults.length < 2) {
      console.error(`Skipping ${experiment.id}: insufficient data`);
      continue;
    }

    const lowStats = computeDescriptiveStats(lowResults);
    const highStats = computeDescriptiveStats(highResults);
    const lowFiveNum = computeFiveNumberSummary(lowResults);
    const highFiveNum = computeFiveNumberSummary(highResults);

    let meanDiffCI95: { lower: number; upper: number } | null = null;
    let welchT: { t: number; df: number; pValue: number } | null = null;
    let effectSize: { hedgesG: number; cohensD: number } | null = null;

    try {
      const ci = bootstrapMeanDifferenceCI({ high: highResults, low: lowResults });
      meanDiffCI95 = { lower: ci.lower, upper: ci.upper };
    } catch {
      /* skip */
    }

    try {
      const t = welchTTestTwoSided(highResults, lowResults);
      welchT = { t: t.t, df: t.df, pValue: t.pTwoSided };
    } catch {
      /* skip */
    }

    try {
      const e = effectSizeTwoSample(highResults, lowResults);
      effectSize = { hedgesG: e.hedgesG, cohensD: e.cohensD };
      allEffectSizes.push({ scenario: experiment.id, hedgesG: e.hedgesG });
    } catch {
      /* skip */
    }

    const analysis: ScenarioAnalysis = {
      experimentId: experiment.id,
      experimentName: experiment.name,
      lowCondition: {
        id: lowCond.id,
        anchorValue: getAnchorValue(experiment, lowCond.id),
        n: lowStats.n,
        mean: lowStats.mean,
        median: lowStats.median,
        stdDev: lowStats.sampleStdDev,
        fiveNumberSummary: lowFiveNum,
        rawValues: lowResults,
      },
      highCondition: {
        id: highCond.id,
        anchorValue: getAnchorValue(experiment, highCond.id),
        n: highStats.n,
        mean: highStats.mean,
        median: highStats.median,
        stdDev: highStats.sampleStdDev,
        fiveNumberSummary: highFiveNum,
        rawValues: highResults,
      },
      comparison: {
        meanDifference: highStats.mean - lowStats.mean,
        meanDiffCI95,
        welchT,
        effectSize,
      },
    };

    scenarioAnalyses.push(analysis);

    // Print summary
    const sig = welchT && welchT.pValue < 0.05 ? '✓' : '✗';
    const gStr = effectSize ? effectSize.hedgesG.toFixed(2) : 'N/A';
    console.error(
      `${sig} ${experiment.name}:` +
        ` Low anchor (${analysis.lowCondition.anchorValue}) → M=${lowStats.mean.toFixed(0)}` +
        ` | High anchor (${analysis.highCondition.anchorValue}) → M=${highStats.mean.toFixed(0)}` +
        ` | Diff=${analysis.comparison.meanDifference.toFixed(0)}` +
        ` | g=${gStr}` +
        ` | p=${welchT?.pValue.toFixed(4) ?? 'N/A'}`,
    );
  }

  // Summary statistics
  const significantCount = scenarioAnalyses.filter(
    (a) => a.comparison.welchT && a.comparison.welchT.pValue < 0.05,
  ).length;

  const avgEffectSize =
    allEffectSizes.length > 0
      ? allEffectSizes.reduce((sum, e) => sum + e.hedgesG, 0) / allEffectSizes.length
      : null;

  const fullAnalysis: FullAnalysis = {
    generatedAt: new Date().toISOString(),
    model: llmProvider.name,
    runsPerCondition,
    scenarios: scenarioAnalyses,
    summary: {
      totalScenarios: scenarioAnalyses.length,
      significantAnchoring: significantCount,
      averageEffectSize: avgEffectSize,
      allEffectSizes,
    },
  };

  // Write analysis JSON
  const analysisPath = outPath.replace('.jsonl', '.analysis.json');
  await writeFile(analysisPath, JSON.stringify(fullAnalysis, null, 2) + '\n', 'utf8');
  console.error(`\nWrote analysis: ${analysisPath}`);

  // Print final summary
  console.error('\n=== SUMMARY ===');
  console.error(`Scenarios tested: ${scenarioAnalyses.length}`);
  console.error(
    `Significant anchoring effects (p < 0.05): ${significantCount}/${scenarioAnalyses.length}`,
  );
  if (avgEffectSize !== null) {
    console.error(`Average effect size (Hedges' g): ${avgEffectSize.toFixed(3)}`);
  }

  // Generate markdown report
  const reportPath = outPath.replace('.jsonl', '.report.md');
  const reportContent = generateReport(fullAnalysis);
  await writeFile(reportPath, reportContent, 'utf8');
  console.error(`Wrote report: ${reportPath}`);
}

function generateReport(analysis: FullAnalysis): string {
  const lines: string[] = [
    '# Anchoring Bias Scenario Variants - Experiment Report',
    '',
    `**Generated:** ${analysis.generatedAt}`,
    `**Model:** ${analysis.model}`,
    `**Runs per condition:** ${analysis.runsPerCondition}`,
    '',
    '## Summary',
    '',
    `- **Scenarios tested:** ${analysis.summary.totalScenarios}`,
    `- **Significant anchoring effects (p < 0.05):** ${analysis.summary.significantAnchoring}/${analysis.summary.totalScenarios}`,
    `- **Average effect size (Hedges\' g):** ${analysis.summary.averageEffectSize?.toFixed(3) ?? 'N/A'}`,
    '',
    '## Results by Scenario',
    '',
  ];

  for (const scenario of analysis.scenarios) {
    const sig = scenario.comparison.welchT && scenario.comparison.welchT.pValue < 0.05;
    const sigMarker = sig ? '✓' : '✗';

    lines.push(`### ${sigMarker} ${scenario.experimentName}`);
    lines.push('');
    lines.push(`**Experiment ID:** \`${scenario.experimentId}\``);
    lines.push('');
    lines.push('| Condition | Anchor | n | Mean | Median | SD |');
    lines.push('|-----------|--------|---|------|--------|-----|');
    lines.push(
      `| Low | ${scenario.lowCondition.anchorValue.toLocaleString()} | ${scenario.lowCondition.n} | ${scenario.lowCondition.mean.toFixed(0)} | ${scenario.lowCondition.median.toFixed(0)} | ${scenario.lowCondition.stdDev.toFixed(0)} |`,
    );
    lines.push(
      `| High | ${scenario.highCondition.anchorValue.toLocaleString()} | ${scenario.highCondition.n} | ${scenario.highCondition.mean.toFixed(0)} | ${scenario.highCondition.median.toFixed(0)} | ${scenario.highCondition.stdDev.toFixed(0)} |`,
    );
    lines.push('');
    lines.push('**Statistical Analysis:**');
    lines.push(`- Mean difference (High - Low): ${scenario.comparison.meanDifference.toFixed(0)}`);
    if (scenario.comparison.meanDiffCI95) {
      lines.push(
        `- 95% CI: [${scenario.comparison.meanDiffCI95.lower.toFixed(0)}, ${scenario.comparison.meanDiffCI95.upper.toFixed(0)}]`,
      );
    }
    if (scenario.comparison.welchT) {
      lines.push(
        `- Welch's t-test: t = ${scenario.comparison.welchT.t.toFixed(2)}, df = ${scenario.comparison.welchT.df.toFixed(1)}, p = ${scenario.comparison.welchT.pValue.toFixed(4)}`,
      );
    }
    if (scenario.comparison.effectSize) {
      lines.push(
        `- Effect size: Hedges' g = ${scenario.comparison.effectSize.hedgesG.toFixed(3)}, Cohen's d = ${scenario.comparison.effectSize.cohensD.toFixed(3)}`,
      );
    }
    lines.push('');
  }

  lines.push('## Interpretation');
  lines.push('');
  if (analysis.summary.significantAnchoring === analysis.summary.totalScenarios) {
    lines.push(
      'All scenarios show significant anchoring effects, strongly supporting the hypothesis that anchoring bias replicates across diverse domains.',
    );
  } else if (analysis.summary.significantAnchoring > analysis.summary.totalScenarios / 2) {
    lines.push(
      `Majority of scenarios (${analysis.summary.significantAnchoring}/${analysis.summary.totalScenarios}) show significant anchoring effects, providing evidence that the bias generalizes across domains.`,
    );
  } else {
    lines.push(
      `Only ${analysis.summary.significantAnchoring}/${analysis.summary.totalScenarios} scenarios show significant anchoring effects. Results are mixed.`,
    );
  }
  lines.push('');

  return lines.join('\n');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
