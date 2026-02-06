import { appendFile, writeFile } from 'node:fs/promises';

import { anchoringSACDExperiment, sacdTemplates } from '../experiments/anchoringSACD.js';
import type { LlmProvider } from '../llm/provider.js';
import {
  computeDescriptiveStats,
  computeFiveNumberSummary,
  bootstrapMeanDifferenceCI,
  effectSizeTwoSample,
  welchTTestTwoSided,
} from '../analysis/stats.js';

/**
 * SACD Runner — Self-Adaptive Cognitive Debiasing
 *
 * Implements the iterative 3-step debiasing process:
 * 1. Bias Determination — identify biased sentences
 * 2. Bias Analysis — classify bias types
 * 3. Cognitive Debiasing — rewrite biased sentences
 * 4. Iterate until clean or max iterations
 *
 * Then extracts the final sentence recommendation.
 */

const MAX_SACD_ITERATIONS = 3;

export type RunAnchoringSACDOptions = Readonly<{
  runsPerCondition: number;
  llmProvider: LlmProvider;
  outPath?: string;
}>;

type SACDTrialResult = Readonly<{
  prosecutorRecommendationMonths: number;
  sentenceMonths: number;
  sacdIterations: number;
  debiasedPrompt: string;
  biasesDetected: string[];
}>;

/**
 * Runs the SACD orchestration and extracts the debiased prompt
 */
async function runSACDOrchestration(
  llmProvider: LlmProvider,
  taskPrompt: string,
  iteration: number,
): Promise<{
  debiasedPrompt: string;
  requiresIteration: boolean;
  biasesDetected: string[];
  rawOutput: string;
}> {
  const orchestratorPrompt = sacdTemplates.sacdOrchestratorPrompt.replace(
    '{{taskPrompt}}',
    taskPrompt,
  );

  const systemPrompt =
    'You are an expert in cognitive bias mitigation. Execute the SACD protocol precisely. ' +
    `This is iteration ${iteration} of the debiasing process.`;

  const fullPrompt = `${systemPrompt}\n\n${orchestratorPrompt}`;

  const rawOutput = await llmProvider.sendText({ prompt: fullPrompt });

  // Parse the output to extract:
  // 1. Debiased prompt (after "DEBIASED PROMPT:" or similar)
  // 2. Whether iteration is needed (REQUIRES_ITERATION vs DEBIASING_COMPLETE)
  // 3. Biases detected

  // Extract debiased prompt
  let debiasedPrompt = taskPrompt; // Default to original if parsing fails

  // Look for common patterns in SACD output
  const debiasedMatch = rawOutput.match(
    /(?:DEBIASED PROMPT|Debiased Prompt|debiased prompt)[:\s]*\n?([\s\S]*?)(?:ITERATION_COMPLETE|$)/i,
  );

  if (debiasedMatch && debiasedMatch[1]) {
    debiasedPrompt = debiasedMatch[1].trim();
  } else {
    // Try to find the last substantial block of text that looks like a prompt
    const lines = rawOutput.split('\n');
    const promptStart = lines.findIndex(
      (line) =>
        line.toLowerCase().includes('trial judge') || line.toLowerCase().includes('case summary'),
    );
    if (promptStart >= 0) {
      debiasedPrompt = lines.slice(promptStart).join('\n').trim();
    }
  }

  // Check for iteration signals
  const requiresIteration =
    rawOutput.includes('REQUIRES_ITERATION') && !rawOutput.includes('DEBIASING_COMPLETE');

  // Extract detected biases
  const biasesDetected: string[] = [];
  const biasPatterns = [
    /anchoring/gi,
    /bandwagon/gi,
    /loss aversion/gi,
    /framing/gi,
    /confirmation/gi,
  ];

  for (const pattern of biasPatterns) {
    if (pattern.test(rawOutput)) {
      const biasName = pattern.source.replace(/\\s/g, ' ');
      if (!biasesDetected.includes(biasName)) {
        biasesDetected.push(biasName);
      }
    }
  }

  return {
    debiasedPrompt,
    requiresIteration,
    biasesDetected,
    rawOutput,
  };
}

/**
 * Extracts the final sentencing decision from a prompt response
 */
async function extractSentence(
  llmProvider: LlmProvider,
  debiasedPrompt: string,
): Promise<{ sentenceMonths: number; rawOutput: string }> {
  const finalPrompt =
    'You are a trial judge. Based ONLY on the case facts, provide your sentencing decision.\n\n' +
    debiasedPrompt +
    '\n\n' +
    'What is your final sentencing decision for Lena M.?\n' +
    'Answer with ONLY a single integer number of months on probation (e.g., "6").';

  const rawOutput = await llmProvider.sendText({ prompt: finalPrompt });

  // Extract the integer from the response
  const match = rawOutput.match(/\b([0-9]|1[0-2])\b/);
  const sentenceMonths = match ? parseInt(match[1] ?? '0', 10) : 6; // Default to 6 if parsing fails

  return { sentenceMonths, rawOutput };
}

/**
 * Runs a single SACD trial with full iteration
 */
async function runSACDTrial(
  llmProvider: LlmProvider,
  prosecutorRecommendationMonths: number,
): Promise<{ ok: true; result: SACDTrialResult } | { ok: false; error: string }> {
  try {
    // Build the initial task prompt with the anchor
    let taskPrompt = sacdTemplates.taskPromptTemplate.replace(
      /\{\{prosecutorRecommendationMonths\}\}/g,
      String(prosecutorRecommendationMonths),
    );

    let iterations = 0;
    let allBiasesDetected: string[] = [];
    let finalDebiasedPrompt = taskPrompt;
    let requiresIteration = true;

    // SACD iteration loop
    while (requiresIteration && iterations < MAX_SACD_ITERATIONS) {
      iterations += 1;

      const sacdResult = await runSACDOrchestration(llmProvider, taskPrompt, iterations);

      finalDebiasedPrompt = sacdResult.debiasedPrompt;
      requiresIteration = sacdResult.requiresIteration;
      allBiasesDetected = [...allBiasesDetected, ...sacdResult.biasesDetected];

      // Use debiased prompt for next iteration (if needed)
      taskPrompt = finalDebiasedPrompt;
    }

    // Extract final sentence from debiased prompt
    const sentenceResult = await extractSentence(llmProvider, finalDebiasedPrompt);

    return {
      ok: true,
      result: {
        prosecutorRecommendationMonths,
        sentenceMonths: sentenceResult.sentenceMonths,
        sacdIterations: iterations,
        debiasedPrompt: finalDebiasedPrompt,
        biasesDetected: [...new Set(allBiasesDetected)],
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function runAnchoringSACD(options: RunAnchoringSACDOptions): Promise<void> {
  const { runsPerCondition, llmProvider, outPath } = options;
  const experiment = anchoringSACDExperiment;

  const collected: Record<string, { ok: number[]; errorN: number; iterations: number[] }> = {};
  for (const condition of experiment.conditions) {
    collected[condition.id] = { ok: [], errorN: 0, iterations: [] };
  }

  for (const condition of experiment.conditions) {
    const prosecutorRecommendationMonths = (condition.params as Record<string, unknown>)[
      'prosecutorRecommendationMonths'
    ];

    if (typeof prosecutorRecommendationMonths !== 'number') {
      throw new Error(`Invalid condition params for ${condition.id}`);
    }

    for (let runIndex = 0; runIndex < runsPerCondition; runIndex += 1) {
      const trial = await runSACDTrial(llmProvider, prosecutorRecommendationMonths);

      if (trial.ok) {
        const entry = collected[condition.id];
        if (entry) {
          entry.ok.push(trial.result.sentenceMonths);
          entry.iterations.push(trial.result.sacdIterations);
        }
      } else {
        const entry = collected[condition.id];
        if (entry) entry.errorN += 1;
      }

      const record = {
        experimentId: experiment.id,
        model: llmProvider.name,
        conditionId: condition.id,
        runIndex,
        params: condition.params,
        result: trial.ok ? trial.result : null,
        error: trial.ok ? undefined : trial.error,
        collectedAt: new Date().toISOString(),
      };

      const line = JSON.stringify(record) + '\n';

      if (outPath) {
        await appendFile(outPath, line, 'utf8');
      } else {
        process.stdout.write(line);
      }
    }
  }

  // Build analysis artifact
  const conditions: Record<string, unknown> = {};
  for (const condition of experiment.conditions) {
    const prosecutorRecommendationMonths = (condition.params as Record<string, unknown>)[
      'prosecutorRecommendationMonths'
    ] as number;

    const entry = collected[condition.id];
    if (!entry || entry.ok.length < 1) {
      continue;
    }

    const stats = computeDescriptiveStats(entry.ok);
    const iterStats = computeDescriptiveStats(entry.iterations);

    conditions[condition.id] = {
      conditionName: condition.name,
      prosecutorRecommendationMonths,
      okN: stats.n,
      errorN: entry.errorN,
      sentenceMonths: {
        mean: stats.mean,
        median: stats.median,
        sampleStdDev: stats.sampleStdDev,
        standardError: stats.standardError,
      },
      sentenceMonthsRaw: [...entry.ok],
      sentenceMonthsFiveNumberSummary: computeFiveNumberSummary(entry.ok),
      sacdIterations: {
        mean: iterStats.mean,
        median: iterStats.median,
      },
    };
  }

  // Compare conditions
  const sortedConditions = [...experiment.conditions].sort((a, b) => {
    const aVal = (a.params as Record<string, unknown>)['prosecutorRecommendationMonths'] as number;
    const bVal = (b.params as Record<string, unknown>)['prosecutorRecommendationMonths'] as number;
    return aVal - bVal;
  });

  const low = sortedConditions[0];
  const high = sortedConditions[sortedConditions.length - 1];

  if (!low || !high) {
    throw new Error('No conditions available for comparison');
  }

  const lowEntry = collected[low.id];
  const highEntry = collected[high.id];

  if (!lowEntry || !highEntry || lowEntry.ok.length < 2 || highEntry.ok.length < 2) {
    process.stderr.write('Insufficient data for statistical comparison\n');
    return;
  }

  const lowStats = computeDescriptiveStats(lowEntry.ok);
  const highStats = computeDescriptiveStats(highEntry.ok);
  const meanDiff = highStats.mean - lowStats.mean;

  let bootstrapCI = null;
  let welchT = null;
  let effectSize = null;

  try {
    bootstrapCI = bootstrapMeanDifferenceCI({ high: highEntry.ok, low: lowEntry.ok });
  } catch {
    /* skip */
  }

  try {
    const t = welchTTestTwoSided(highEntry.ok, lowEntry.ok);
    welchT = { t: t.t, df: t.df, pTwoSided: t.pTwoSided };
  } catch {
    /* skip */
  }

  try {
    const e = effectSizeTwoSample(highEntry.ok, lowEntry.ok);
    effectSize = { cohensD: e.cohensD, hedgesG: e.hedgesG };
  } catch {
    /* skip */
  }

  const analysis = {
    experimentId: experiment.id,
    technique: 'SACD',
    generatedAt: new Date().toISOString(),
    runConfig: {
      model: llmProvider.name,
      runsPerCondition,
      maxSACDIterations: MAX_SACD_ITERATIONS,
    },
    conditions,
    comparison: {
      lowConditionId: low.id,
      highConditionId: high.id,
      meanDiffHighMinusLow: meanDiff,
      meanDiffHighMinusLowCI95: bootstrapCI,
      welchTTest: welchT,
      effectSize,
    },
    // Human baseline for comparison
    humanBaseline: {
      study: 'Englich et al. (2006), Study 2',
      meanDiffHighMinusLow: 2.05,
    },
    // Comparison to existing Sibony techniques
    sibonyBaselines: {
      contextHygiene: { meanDiffHighMinusLow: 2.67 },
      premortem: { meanDiffHighMinusLow: 2.8 },
      baseline: { meanDiffHighMinusLow: 3.67 },
    },
    comparisonToSibony: {
      sacdMeanDiff: meanDiff,
      vsContextHygiene: meanDiff - 2.67,
      vsPremortem: meanDiff - 2.8,
      vsBaseline: meanDiff - 3.67,
      interpretation:
        meanDiff < 2.67
          ? 'SACD outperforms both Sibony techniques'
          : meanDiff < 2.8
            ? 'SACD outperforms premortem but not context hygiene'
            : meanDiff < 3.67
              ? 'SACD reduces bias but less effectively than Sibony techniques'
              : 'SACD does not reduce bias compared to baseline',
    },
  };

  if (outPath) {
    const analysisPath = `${outPath}.analysis.json`;
    await writeFile(analysisPath, JSON.stringify(analysis, null, 2) + '\n', 'utf8');
    process.stderr.write(`Wrote analysis: ${analysisPath}\n`);
  } else {
    process.stderr.write('=== BEGIN ANALYSIS JSON ===\n');
    process.stderr.write(JSON.stringify(analysis, null, 2) + '\n');
    process.stderr.write('=== END ANALYSIS JSON ===\n');
  }
}
