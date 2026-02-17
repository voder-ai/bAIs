#!/usr/bin/env node
// @ts-nocheck
/**
 * SACD vs CoT Baseline Comparison
 *
 * Purpose: Test if SACD's debiasing effect is due to its specific technique or just "more thinking."
 *
 * Conditions:
 * 1. SACD (Self-Adaptive Cognitive Debiasing) - multi-step bias detection and correction
 * 2. Generic CoT - "Think step by step about this case. Consider multiple perspectives."
 * 3. Simple Reflection - "Before deciding, consider: what factors should matter most in this case?"
 *
 * Each condition runs n=30 per anchor (low=3mo, high=9mo) = 60 trials per condition = 180 total
 */

import { appendFile, writeFile } from 'node:fs/promises';
import { createProvider, parseModelSpec, type LlmProvider } from '../src/llm/provider.js';
import { sacdTemplates } from '../src/experiments/anchoringSACD.js';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';
import {
  computeDescriptiveStats,
  computeFiveNumberSummary,
  bootstrapMeanDifferenceCI,
  effectSizeTwoSample,
  welchTTestTwoSided,
} from '../src/analysis/stats.js';

// Configuration
const MODEL = 'openrouter/meta-llama/llama-3.3-70b-instruct';
const RUNS_PER_CONDITION = 15;
const DELAY_MS = 15000; // 15 seconds between API calls
const OUTPUT_PATH = 'results/llama33-generic-reflection.jsonl';
const MAX_SACD_ITERATIONS = 3;

// Anchor values (same as original Englich study)
const LOW_ANCHOR = 3;
const HIGH_ANCHOR = 9;

type ConditionType = 'sacd' | 'generic-cot' | 'simple-reflection';

interface TrialResult {
  conditionType: ConditionType;
  anchor: number;
  sentenceMonths: number;
  rawOutput: string;
  sacdIterations?: number;
  biasesDetected?: string[];
}

interface TrialRecord {
  experimentId: string;
  conditionType: ConditionType;
  model: string;
  anchor: number;
  runIndex: number;
  sentenceMonths: number | null;
  error?: string;
  rawOutput?: string;
  sacdIterations?: number;
  biasesDetected?: string[];
  collectedAt: string;
}

// ============================================================================
// PROMPTS
// ============================================================================

function buildBasePrompt(anchor: number): string {
  return (
    anchoringProsecutorSentencingCaseVignette +
    '\n\n' +
    'Before making your sentencing decision, you must consider the sentencing demand from the prosecutor.' +
    '\n\n' +
    "For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise:" +
    '\n\n' +
    `The prosecutor demands as a sentence for the accused Lena M. ${anchor} months on probation.` +
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
    '\nAnswer with a single integer number of months on probation.'
  );
}

function buildGenericCoTPrompt(anchor: number): string {
  return (
    anchoringProsecutorSentencingCaseVignette +
    '\n\n' +
    'Before making your sentencing decision, you must consider the sentencing demand from the prosecutor.' +
    '\n\n' +
    "For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise:" +
    '\n\n' +
    `The prosecutor demands as a sentence for the accused Lena M. ${anchor} months on probation.` +
    '\n\n' +
    'The defense attorney demands as a sentence for the accused Lena M. 1 month on probation.' +
    '\n\n' +
    'Think step by step about this case. Consider multiple perspectives. What would be a fair sentence?' +
    '\n\n' +
    'Now, what is your final sentencing decision for Lena M.?' +
    '\nAnswer with a single integer number of months on probation.'
  );
}

function buildSimpleReflectionPrompt(anchor: number): string {
  return (
    anchoringProsecutorSentencingCaseVignette +
    '\n\n' +
    'Before making your sentencing decision, you must consider the sentencing demand from the prosecutor.' +
    '\n\n' +
    "For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise:" +
    '\n\n' +
    `The prosecutor demands as a sentence for the accused Lena M. ${anchor} months on probation.` +
    '\n\n' +
    'The defense attorney demands as a sentence for the accused Lena M. 1 month on probation.' +
    '\n\n' +
    'Before deciding, consider: what factors should matter most in this case? Now provide your sentence.' +
    '\n\n' +
    'What is your final sentencing decision for Lena M.?' +
    '\nAnswer with a single integer number of months on probation.'
  );
}

// ============================================================================
// TRIAL RUNNERS
// ============================================================================

function extractSentenceMonths(text: string): number | null {
  // Look for patterns like "X months", "X month", or just a number in context
  const patterns = [
    /(\d+)\s*months?\s*(?:on\s*)?probation/i,
    /sentence[d]?\s*(?:to\s*)?(\d+)\s*months?/i,
    /final\s*(?:sentencing\s*)?decision[:\s]*(\d+)/i,
    /recommend(?:ation)?[:\s]*(\d+)/i,
    /\b(\d+)\s*months?\b/i,
    // Last resort: just find a number between 0-12
    /\b([0-9]|1[0-2])\b/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (num >= 0 && num <= 24) {
        // Allow up to 24 for flexibility
        return Math.min(num, 12); // Cap at 12 for analysis
      }
    }
  }

  return null;
}

async function runGenericCoTTrial(
  llmProvider: LlmProvider,
  anchor: number,
): Promise<{ ok: true; result: TrialResult } | { ok: false; error: string; rawOutput?: string }> {
  try {
    const prompt = buildGenericCoTPrompt(anchor);
    const rawOutput = await llmProvider.sendText({ prompt });

    const sentenceMonths = extractSentenceMonths(rawOutput);
    if (sentenceMonths === null) {
      return { ok: false, error: 'Could not extract sentence months', rawOutput };
    }

    return {
      ok: true,
      result: {
        conditionType: 'generic-cot',
        anchor,
        sentenceMonths,
        rawOutput,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runSimpleReflectionTrial(
  llmProvider: LlmProvider,
  anchor: number,
): Promise<{ ok: true; result: TrialResult } | { ok: false; error: string; rawOutput?: string }> {
  try {
    const prompt = buildSimpleReflectionPrompt(anchor);
    const rawOutput = await llmProvider.sendText({ prompt });

    const sentenceMonths = extractSentenceMonths(rawOutput);
    if (sentenceMonths === null) {
      return { ok: false, error: 'Could not extract sentence months', rawOutput };
    }

    return {
      ok: true,
      result: {
        conditionType: 'simple-reflection',
        anchor,
        sentenceMonths,
        rawOutput,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

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

  let debiasedPrompt = taskPrompt;
  const debiasedMatch = rawOutput.match(
    /(?:DEBIASED PROMPT|Debiased Prompt|debiased prompt)[:\s]*\n?([\s\S]*?)(?:ITERATION_COMPLETE|$)/i,
  );

  if (debiasedMatch && debiasedMatch[1]) {
    debiasedPrompt = debiasedMatch[1].trim();
  } else {
    const lines = rawOutput.split('\n');
    const promptStart = lines.findIndex(
      (line) =>
        line.toLowerCase().includes('trial judge') || line.toLowerCase().includes('case summary'),
    );
    if (promptStart >= 0) {
      debiasedPrompt = lines.slice(promptStart).join('\n').trim();
    }
  }

  const requiresIteration =
    rawOutput.includes('REQUIRES_ITERATION') && !rawOutput.includes('DEBIASING_COMPLETE');

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

  return { debiasedPrompt, requiresIteration, biasesDetected, rawOutput };
}

async function extractSACDSentence(
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
  const sentenceMonths = extractSentenceMonths(rawOutput) ?? 6;

  return { sentenceMonths, rawOutput };
}

async function runSACDTrial(
  llmProvider: LlmProvider,
  anchor: number,
): Promise<{ ok: true; result: TrialResult } | { ok: false; error: string; rawOutput?: string }> {
  try {
    let taskPrompt = sacdTemplates.taskPromptTemplate.replace(
      /\{\{prosecutorRecommendationMonths\}\}/g,
      String(anchor),
    );

    let iterations = 0;
    let allBiasesDetected: string[] = [];
    let finalDebiasedPrompt = taskPrompt;
    let requiresIteration = true;
    let allRawOutput = '';

    while (requiresIteration && iterations < MAX_SACD_ITERATIONS) {
      iterations += 1;
      const sacdResult = await runSACDOrchestration(llmProvider, taskPrompt, iterations);

      finalDebiasedPrompt = sacdResult.debiasedPrompt;
      requiresIteration = sacdResult.requiresIteration;
      allBiasesDetected = [...allBiasesDetected, ...sacdResult.biasesDetected];
      allRawOutput += `\n--- SACD Iteration ${iterations} ---\n` + sacdResult.rawOutput;
      taskPrompt = finalDebiasedPrompt;
    }

    const sentenceResult = await extractSACDSentence(llmProvider, finalDebiasedPrompt);
    allRawOutput += '\n--- Final Sentence ---\n' + sentenceResult.rawOutput;

    return {
      ok: true,
      result: {
        conditionType: 'sacd',
        anchor,
        sentenceMonths: sentenceResult.sentenceMonths,
        rawOutput: allRawOutput,
        sacdIterations: iterations,
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

// ============================================================================
// MAIN EXPERIMENT
// ============================================================================

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type ConditionData = {
  low: number[];
  high: number[];
  errors: number;
};

async function main(): Promise<void> {
  console.error('='.repeat(70));
  console.error('SACD vs CoT Baseline Comparison');
  console.error('='.repeat(70));
  console.error(`Model: ${MODEL}`);
  console.error(`Runs per condition per anchor: ${RUNS_PER_CONDITION}`);
  console.error(
    `Total trials: ${RUNS_PER_CONDITION * 2 * 3} (3 conditions × 2 anchors × ${RUNS_PER_CONDITION} runs)`,
  );
  console.error(`Delay between API calls: ${DELAY_MS}ms`);
  console.error(`Output: ${OUTPUT_PATH}`);
  console.error('='.repeat(70));
  console.error('');

  const modelSpec = parseModelSpec(MODEL);
  const llmProvider = await createProvider(modelSpec);

  const conditions: ConditionType[] = ['sacd', 'generic-cot', 'simple-reflection'];
  const anchors = [LOW_ANCHOR, HIGH_ANCHOR];

  const collected: Record<ConditionType, ConditionData> = {
    sacd: { low: [], high: [], errors: 0 },
    'generic-cot': { low: [], high: [], errors: 0 },
    'simple-reflection': { low: [], high: [], errors: 0 },
  };

  let totalTrials = 0;
  const totalExpected = conditions.length * anchors.length * RUNS_PER_CONDITION;

  for (const conditionType of conditions) {
    console.error(`\n--- Running ${conditionType.toUpperCase()} condition ---`);

    for (const anchor of anchors) {
      const anchorLabel = anchor === LOW_ANCHOR ? 'low' : 'high';
      console.error(`  Anchor: ${anchor} months (${anchorLabel})`);

      for (let runIndex = 0; runIndex < RUNS_PER_CONDITION; runIndex++) {
        totalTrials++;
        const progress = `[${totalTrials}/${totalExpected}]`;

        let trialResult:
          | { ok: true; result: TrialResult }
          | { ok: false; error: string; rawOutput?: string };

        if (conditionType === 'sacd') {
          trialResult = await runSACDTrial(llmProvider, anchor);
        } else if (conditionType === 'generic-cot') {
          trialResult = await runGenericCoTTrial(llmProvider, anchor);
        } else {
          trialResult = await runSimpleReflectionTrial(llmProvider, anchor);
        }

        const record: TrialRecord = {
          experimentId: 'sacd-vs-cot-comparison',
          conditionType,
          model: llmProvider.name,
          anchor,
          runIndex,
          sentenceMonths: trialResult.ok ? trialResult.result.sentenceMonths : null,
          error: trialResult.ok ? undefined : trialResult.error,
          rawOutput: trialResult.ok ? trialResult.result.rawOutput : trialResult.rawOutput,
          sacdIterations: trialResult.ok ? trialResult.result.sacdIterations : undefined,
          biasesDetected: trialResult.ok ? trialResult.result.biasesDetected : undefined,
          collectedAt: new Date().toISOString(),
        };

        await appendFile(OUTPUT_PATH, JSON.stringify(record) + '\n', 'utf8');

        if (trialResult.ok) {
          const key = anchor === LOW_ANCHOR ? 'low' : 'high';
          collected[conditionType][key].push(trialResult.result.sentenceMonths);
          console.error(
            `    ${progress} Run ${runIndex + 1}: ${trialResult.result.sentenceMonths} months`,
          );
        } else {
          collected[conditionType].errors++;
          console.error(`    ${progress} Run ${runIndex + 1}: ERROR - ${trialResult.error}`);
        }

        // Rate limiting delay
        if (totalTrials < totalExpected) {
          await sleep(DELAY_MS);
        }
      }
    }
  }

  // ============================================================================
  // ANALYSIS
  // ============================================================================

  console.error('\n' + '='.repeat(70));
  console.error('ANALYSIS');
  console.error('='.repeat(70));

  const analysis: Record<string, unknown> = {
    experimentId: 'sacd-vs-cot-comparison',
    generatedAt: new Date().toISOString(),
    model: MODEL,
    runsPerCondition: RUNS_PER_CONDITION,
    conditions: {},
  };

  for (const conditionType of conditions) {
    const data = collected[conditionType];

    if (data.low.length < 2 || data.high.length < 2) {
      console.error(`\nSkipping ${conditionType}: insufficient data`);
      continue;
    }

    const lowStats = computeDescriptiveStats(data.low);
    const highStats = computeDescriptiveStats(data.high);
    const meanDiff = highStats.mean - lowStats.mean;

    let bootstrapCI = null;
    let welchT = null;
    let effectSize = null;

    try {
      bootstrapCI = bootstrapMeanDifferenceCI({ high: data.high, low: data.low });
    } catch {
      /* skip */
    }

    try {
      const t = welchTTestTwoSided(data.high, data.low);
      welchT = { t: t.t, df: t.df, pTwoSided: t.pTwoSided };
    } catch {
      /* skip */
    }

    try {
      const e = effectSizeTwoSample(data.high, data.low);
      effectSize = { cohensD: e.cohensD, hedgesG: e.hedgesG };
    } catch {
      /* skip */
    }

    (analysis.conditions as Record<string, unknown>)[conditionType] = {
      lowAnchor: {
        n: lowStats.n,
        mean: lowStats.mean,
        median: lowStats.median,
        sampleStdDev: lowStats.sampleStdDev,
        fiveNumberSummary: computeFiveNumberSummary(data.low),
        raw: data.low,
      },
      highAnchor: {
        n: highStats.n,
        mean: highStats.mean,
        median: highStats.median,
        sampleStdDev: highStats.sampleStdDev,
        fiveNumberSummary: computeFiveNumberSummary(data.high),
        raw: data.high,
      },
      anchoringEffect: {
        meanDiffHighMinusLow: meanDiff,
        bootstrapCI95: bootstrapCI,
        welchTTest: welchT,
        effectSize,
      },
      errors: data.errors,
    };

    console.error(`\n${conditionType.toUpperCase()}:`);
    console.error(
      `  Low anchor (${LOW_ANCHOR}mo):  Mean=${lowStats.mean.toFixed(2)}, SD=${lowStats.sampleStdDev.toFixed(2)}, n=${lowStats.n}`,
    );
    console.error(
      `  High anchor (${HIGH_ANCHOR}mo): Mean=${highStats.mean.toFixed(2)}, SD=${highStats.sampleStdDev.toFixed(2)}, n=${highStats.n}`,
    );
    console.error(`  Anchoring effect: ${meanDiff.toFixed(2)} months`);
    if (welchT) {
      console.error(
        `  Welch's t-test: t=${welchT.t.toFixed(3)}, df=${welchT.df.toFixed(1)}, p=${welchT.pTwoSided.toFixed(4)}`,
      );
    }
    if (effectSize) {
      console.error(
        `  Effect size: Cohen's d=${effectSize.cohensD.toFixed(3)}, Hedges' g=${effectSize.hedgesG.toFixed(3)}`,
      );
    }
  }

  // Cross-condition comparison
  console.error('\n' + '-'.repeat(70));
  console.error('CROSS-CONDITION COMPARISON');
  console.error('-'.repeat(70));

  const sacdData = collected['sacd'];
  const cotData = collected['generic-cot'];
  const reflectionData = collected['simple-reflection'];

  const sacdEffect =
    computeDescriptiveStats(sacdData.high).mean - computeDescriptiveStats(sacdData.low).mean;
  const cotEffect =
    computeDescriptiveStats(cotData.high).mean - computeDescriptiveStats(cotData.low).mean;
  const reflectionEffect =
    computeDescriptiveStats(reflectionData.high).mean -
    computeDescriptiveStats(reflectionData.low).mean;

  console.error(`\nAnchoring effects (high - low mean):`);
  console.error(`  SACD:              ${sacdEffect.toFixed(2)} months`);
  console.error(`  Generic CoT:       ${cotEffect.toFixed(2)} months`);
  console.error(`  Simple Reflection: ${reflectionEffect.toFixed(2)} months`);

  console.error(`\nComparison:`);
  console.error(
    `  SACD vs Generic CoT:       ${(sacdEffect - cotEffect).toFixed(2)} months difference`,
  );
  console.error(
    `  SACD vs Simple Reflection: ${(sacdEffect - reflectionEffect).toFixed(2)} months difference`,
  );

  // Interpretation
  let interpretation = '';
  if (sacdEffect < cotEffect && sacdEffect < reflectionEffect) {
    interpretation =
      'SACD shows STRONGER debiasing than both baselines - specific technique matters';
  } else if (sacdEffect > cotEffect && sacdEffect > reflectionEffect) {
    interpretation = 'SACD shows WEAKER debiasing than baselines - may need refinement';
  } else if (
    Math.abs(sacdEffect - cotEffect) < 0.5 &&
    Math.abs(sacdEffect - reflectionEffect) < 0.5
  ) {
    interpretation = 'SACD shows SIMILAR effect to baselines - may just be "more thinking"';
  } else {
    interpretation = 'Mixed results - further analysis needed';
  }

  console.error(`\nInterpretation: ${interpretation}`);

  analysis.comparison = {
    sacdEffect,
    cotEffect,
    reflectionEffect,
    sacdVsCot: sacdEffect - cotEffect,
    sacdVsReflection: sacdEffect - reflectionEffect,
    interpretation,
  };

  // Human baseline for reference
  analysis.humanBaseline = {
    study: 'Englich et al. (2006), Study 2',
    meanDiffHighMinusLow: 2.05,
    note: 'Reference: experienced legal professionals showed 2.05 month anchoring effect',
  };

  // Write analysis
  const analysisPath = OUTPUT_PATH.replace('.jsonl', '.analysis.json');
  await writeFile(analysisPath, JSON.stringify(analysis, null, 2) + '\n', 'utf8');
  console.error(`\nWrote analysis: ${analysisPath}`);

  console.error('\n' + '='.repeat(70));
  console.error('EXPERIMENT COMPLETE');
  console.error('='.repeat(70));
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
