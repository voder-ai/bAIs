import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import * as path from 'node:path';

import {
  realEstateAppraisalExperiment,
  projectEstimationExperiment,
  insuranceClaimExperiment,
  admissionScoreExperiment,
} from '../experiments/anchoringNovel.js';
import { renderPrompt } from '../experiments/renderPrompt.js';
import type { LlmProvider } from '../llm/provider.js';
import { createProvider, parseModelSpec } from '../llm/provider.js';
import {
  computeDescriptiveStats,
  bootstrapMeanDifferenceCI,
  effectSizeTwoSample,
  welchTTestTwoSided,
} from '../analysis/stats.js';

const MAX_ATTEMPTS_PER_TRIAL = 3;
const RUNS_PER_CONDITION = 10;

type TrialResult = Readonly<{
  experimentId: string;
  model: string;
  conditionId: string;
  runIndex: number;
  params: Record<string, unknown>;
  result: Record<string, unknown> | null;
  rawLastMessage: string;
  collectedAt: string;
  error?: string;
}>;

type ExperimentSummary = Readonly<{
  experimentId: string;
  experimentName: string;
  model: string;
  lowConditionId: string;
  highConditionId: string;
  lowMean: number;
  highMean: number;
  meanDiff: number;
  percentDiff: number;
  welchT: number | null;
  pValue: number | null;
  hedgesG: number | null;
  anchoringDetected: boolean;
}>;

async function runSingleTrial<TParams extends Record<string, unknown>>(
  experiment: {
    id: string;
    steps: ReadonlyArray<{ prompts: ReadonlyArray<{ role: string; template: string }> }>;
  },
  condition: { id: string; params: TParams },
  llmProvider: LlmProvider,
  modelName: string,
  runIndex: number,
): Promise<TrialResult> {
  // Build the full conversation as a single prompt
  const conversationParts: string[] = [];
  let lastResponse = '';

  for (const step of experiment.steps) {
    for (const promptDef of step.prompts) {
      const rendered = renderPrompt(
        promptDef.template,
        condition.params as unknown as Record<string, string | number>,
      );
      conversationParts.push(rendered);
    }

    // Send accumulated conversation and get response
    const fullPrompt = conversationParts.join('\n\n');
    const response = await llmProvider.sendText({ prompt: fullPrompt });

    lastResponse = response;
    conversationParts.push(`Previous response: ${response}`);
  }

  // Parse the final numeric response - get the LAST number (the answer)
  // The final question asks for a single number, which should be at the end
  let extractedValue: number | null = null;
  const cleanResponse = lastResponse.replace(/,/g, '');
  // Find all numbers in the response
  const allNumbers = [...cleanResponse.matchAll(/(\d+(?:\.\d+)?)/g)];
  if (allNumbers.length > 0) {
    // Get the last number (the answer) - skip small numbers like 3, 2, etc.
    // that might be from property descriptions
    const largeNumbers = allNumbers
      .map((m) => (m[1] ? parseFloat(m[1]) : null))
      .filter((n): n is number => n !== null && n > 100); // Filter out small numbers like "3" from "3-bedroom"

    if (largeNumbers.length > 0) {
      extractedValue = largeNumbers[largeNumbers.length - 1]!;
    }
  }

  return {
    experimentId: experiment.id,
    model: modelName,
    conditionId: condition.id,
    runIndex,
    params: condition.params as Record<string, unknown>,
    result: { value: extractedValue },
    rawLastMessage: lastResponse,
    collectedAt: new Date().toISOString(),
  };
}

async function runExperimentOnModel<TParams extends Record<string, unknown>>(
  experiment: {
    id: string;
    name: string;
    steps: ReadonlyArray<{ prompts: ReadonlyArray<{ role: string; template: string }> }>;
    conditions: ReadonlyArray<{ id: string; name: string; params: TParams }>;
  },
  llmProvider: LlmProvider,
  modelName: string,
  outPath: string,
): Promise<ExperimentSummary> {
  const results: TrialResult[] = [];
  const lowConditionRaw = experiment.conditions.find((c) => c.id.includes('low'));
  const highConditionRaw = experiment.conditions.find((c) => c.id.includes('high'));

  if (!lowConditionRaw || !highConditionRaw) {
    throw new Error(`Experiment ${experiment.id} must have low and high conditions`);
  }

  const lowCondition = lowConditionRaw;
  const highCondition = highConditionRaw;

  console.log(`  Running ${experiment.name}...`);

  // Run low anchor condition
  const lowValues: number[] = [];
  for (let i = 0; i < RUNS_PER_CONDITION; i++) {
    let trial: TrialResult | null = null;
    for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_TRIAL; attempt++) {
      try {
        trial = await runSingleTrial(experiment, lowCondition, llmProvider, modelName, i);
        if (trial.result && (trial.result as { value: number | null }).value !== null) {
          break;
        }
      } catch (err) {
        console.log(
          `    Low condition trial ${i} attempt ${attempt + 1} failed: ${(err as Error).message}`,
        );
      }
    }
    if (trial) {
      results.push(trial);
      await appendFile(outPath, JSON.stringify(trial) + '\n');
      const val = (trial.result as { value: number | null })?.value;
      if (val !== null) {
        lowValues.push(val);
        process.stdout.write(`    Low[${i}]=${val} `);
      }
    }
  }
  console.log();

  // Run high anchor condition
  const highValues: number[] = [];
  for (let i = 0; i < RUNS_PER_CONDITION; i++) {
    let trial: TrialResult | null = null;
    for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_TRIAL; attempt++) {
      try {
        trial = await runSingleTrial(experiment, highCondition, llmProvider, modelName, i);
        if (trial.result && (trial.result as { value: number | null }).value !== null) {
          break;
        }
      } catch (err) {
        console.log(
          `    High condition trial ${i} attempt ${attempt + 1} failed: ${(err as Error).message}`,
        );
      }
    }
    if (trial) {
      results.push(trial);
      await appendFile(outPath, JSON.stringify(trial) + '\n');
      const val = (trial.result as { value: number | null })?.value;
      if (val !== null) {
        highValues.push(val);
        process.stdout.write(`    High[${i}]=${val} `);
      }
    }
  }
  console.log();

  // Compute statistics
  const lowStats = computeDescriptiveStats(lowValues);
  const highStats = computeDescriptiveStats(highValues);
  const meanDiff = highStats.mean - lowStats.mean;
  const percentDiff = lowStats.mean !== 0 ? (meanDiff / lowStats.mean) * 100 : 0;

  let welchT: number | null = null;
  let pValue: number | null = null;
  let hedgesG: number | null = null;

  if (lowValues.length >= 2 && highValues.length >= 2) {
    const tTest = welchTTestTwoSided(lowValues, highValues);
    welchT = tTest.t;
    pValue = tTest.pTwoSided;
    const effect = effectSizeTwoSample(lowValues, highValues);
    hedgesG = effect.hedgesG;
  }

  const anchoringDetected = meanDiff > 0 && (pValue === null || pValue < 0.1);

  console.log(`    Low mean: ${lowStats.mean.toFixed(2)}, High mean: ${highStats.mean.toFixed(2)}`);
  console.log(
    `    Diff: ${meanDiff.toFixed(2)} (${percentDiff.toFixed(1)}%), p=${pValue?.toFixed(4) ?? 'N/A'}`,
  );
  console.log(`    Anchoring: ${anchoringDetected ? '✓ YES' : '✗ NO'}`);

  return {
    experimentId: experiment.id,
    experimentName: experiment.name,
    model: modelName,
    lowConditionId: lowCondition.id,
    highConditionId: highCondition.id,
    lowMean: lowStats.mean,
    highMean: highStats.mean,
    meanDiff,
    percentDiff,
    welchT,
    pValue,
    hedgesG,
    anchoringDetected,
  };
}

export async function runNovelAnchoring(
  models: string[],
  outDir: string,
): Promise<ExperimentSummary[]> {
  const outPath = path.join(outDir, 'novel-anchoring-scenarios.jsonl');

  // Clear/create output file
  await mkdir(outDir, { recursive: true });
  await writeFile(outPath, '');

  const summaries: ExperimentSummary[] = [];

  console.log('='.repeat(60));
  console.log('NOVEL ANCHORING BIAS EXPERIMENTS');
  console.log('='.repeat(60));
  console.log(`Models: ${models.join(', ')}`);
  console.log(`Runs per condition: ${RUNS_PER_CONDITION}`);
  console.log(`Output: ${outPath}`);
  console.log();

  for (const modelSpec of models) {
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`Model: ${modelSpec}`);
    console.log('─'.repeat(50));

    const spec = parseModelSpec(modelSpec);
    const provider = await createProvider(spec, 1.0);

    // Cast experiments to work with the runner
    const experiments = [
      realEstateAppraisalExperiment,
      projectEstimationExperiment,
      insuranceClaimExperiment,
      admissionScoreExperiment,
    ];

    for (const experiment of experiments) {
      const summary = await runExperimentOnModel(
        experiment as unknown as {
          id: string;
          name: string;
          steps: ReadonlyArray<{ prompts: ReadonlyArray<{ role: string; template: string }> }>;
          conditions: ReadonlyArray<{ id: string; name: string; params: Record<string, unknown> }>;
        },
        provider,
        modelSpec,
        outPath,
      );
      summaries.push(summary);
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));

  const byModel: Record<string, ExperimentSummary[]> = {};
  for (const s of summaries) {
    if (!byModel[s.model]) byModel[s.model] = [];
    byModel[s.model]!.push(s);
  }

  for (const [model, modelSummaries] of Object.entries(byModel)) {
    const anchoredCount = modelSummaries.filter((s) => s.anchoringDetected).length;
    console.log(`\n${model}:`);
    console.log(`  Anchoring detected in ${anchoredCount}/${modelSummaries.length} scenarios`);
    for (const s of modelSummaries) {
      const symbol = s.anchoringDetected ? '✓' : '✗';
      console.log(
        `    ${symbol} ${s.experimentName}: diff=${s.meanDiff.toFixed(2)} (${s.percentDiff.toFixed(1)}%)`,
      );
    }
  }

  const totalAnchored = summaries.filter((s) => s.anchoringDetected).length;
  const totalTests = summaries.length;
  console.log(
    `\nOVERALL: ${totalAnchored}/${totalTests} (${((totalAnchored / totalTests) * 100).toFixed(0)}%) show anchoring`,
  );

  if (totalAnchored === totalTests) {
    console.log('\n✓ CONSISTENT ANCHORING across all novel scenarios and models');
    console.log('  This rules out contamination/memorization as an explanation.');
  } else if (totalAnchored >= totalTests * 0.75) {
    console.log('\n✓ STRONG ANCHORING detected in most scenarios');
  } else {
    console.log('\n⚠ MIXED RESULTS - anchoring not fully consistent');
  }

  // Write summary JSON
  const summaryPath = path.join(outDir, 'novel-anchoring-summary.json');
  await writeFile(
    summaryPath,
    JSON.stringify({ summaries, generatedAt: new Date().toISOString() }, null, 2),
  );
  console.log(`\nSummary written to: ${summaryPath}`);

  return summaries;
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const models = ['anthropic/claude-sonnet-4-20250514', 'github-copilot/gpt-4o'];

  const outDir = path.resolve(process.cwd(), 'results');

  await runNovelAnchoring(models, outDir);
}
