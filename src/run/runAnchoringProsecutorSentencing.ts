import { appendFile, readFile, writeFile } from 'node:fs/promises';
import * as path from 'node:path';

import {
  anchoringProsecutorSentencingCaseVignette,
  anchoringProsecutorSentencingExperiment,
} from '../experiments/anchoringProsecutorSentencing.js';
import { renderPrompt } from '../experiments/renderPrompt.js';
import type { LlmProvider } from '../llm/provider.js';
import {
  computeDescriptiveStats,
  computeFiveNumberSummary,
  bootstrapMeanDifferenceCI,
  effectSizeTwoSample,
  welchTTestTwoSided,
} from '../analysis/stats.js';

type ArtifactsOutputMode = 'console' | 'files' | 'both';

export type RunAnchoringProsecutorSentencingOptions = Readonly<{
  runsPerCondition: number;
  llmProvider: LlmProvider;
  outPath?: string;
  artifactsOutput?: ArtifactsOutputMode;
  experimentOverride?: typeof anchoringProsecutorSentencingExperiment;
}>;

type AnchoringResult = Readonly<{
  prosecutorRecommendationMonths: number;
  prosecutorEvaluation: 'too low' | 'too high' | 'just right';
  defenseAttorneyEvaluation: 'too low' | 'too high' | 'just right';
  sentenceMonths: number;
}>;

type AnalysisArtifact = Readonly<{
  experimentId: string;
  generatedAt: string;
  runConfig: {
    model: string;
    runsPerCondition: number;
    maxAttemptsPerTrial: number;
  };
  conditions: Record<
    string,
    {
      conditionName: string;
      prosecutorRecommendationMonths: number;
      okN: number;
      errorN: number;
      sentenceMonths: {
        mean: number;
        median: number;
        sampleStdDev: number;
        standardError: number;
      };
      sentenceMonthsRaw: number[];
      sentenceMonthsFiveNumberSummary: {
        min: number;
        q1: number;
        median: number;
        q3: number;
        max: number;
      };
    }
  >;
  comparison: {
    lowConditionId: string;
    highConditionId: string;
    meanDiffHighMinusLow: number;
    meanDiffHighMinusLowCI95: {
      lower: number;
      upper: number;
      alpha: number;
      method: 'bootstrap-percentile';
      iterations: number;
      seed: number;
    } | null;
    welchTTest: { t: number; df: number; pTwoSided: number } | null;
    effectSize: { hedgesG: number; cohensD: number } | null;
  };
  humanBaseline: {
    study: string;
    lowAnchorMonths: number;
    highAnchorMonths: number;
    lowConditionMean: number;
    highConditionMean: number;
    meanDiffHighMinusLow: number;
    sampleSize: number;
    tStatistic: number;
    degreesOfFreedom: number;
    pValue: number;
  };
  comparisonToHuman: {
    llmBiasVsHuman: 'less' | 'similar' | 'greater';
    llmMeanDiff: number;
    humanMeanDiff: number;
    diffOfDiffs: number;
    interpretation: string;
  };
  toolchain: {
    packageName: string;
    packageVersion: string;
    nodeVersion: string;
  };
}>;

const resultSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'AnchoringProsecutorSentencingResult',
  type: 'object',
  additionalProperties: false,
  properties: {
    prosecutorRecommendationMonths: { type: 'integer', minimum: 1, maximum: 12 },
    prosecutorEvaluation: { type: 'string', enum: ['too low', 'too high', 'just right'] },
    defenseAttorneyEvaluation: { type: 'string', enum: ['too low', 'too high', 'just right'] },
    sentenceMonths: { type: 'integer', minimum: 0, maximum: 12 },
  },
  required: [
    'prosecutorRecommendationMonths',
    'prosecutorEvaluation',
    'defenseAttorneyEvaluation',
    'sentenceMonths',
  ],
} as const;

function buildPrompt(
  conditionVars: Record<string, string | number>,
  experimentDef: typeof anchoringProsecutorSentencingExperiment = anchoringProsecutorSentencingExperiment,
): string {
  const parts = experimentDef.steps.map((step) => {
    // Concatenate all prompts in the step (supports system + user prompts)
    return step.prompts
      .map((p) => {
        const rendered = renderPrompt(p.template, conditionVars);
        return p.role === 'system'
          ? `[System instruction]\n${rendered}\n[End system instruction]`
          : rendered;
      })
      .join('\n\n');
  });

  return [
    ...parts,
    '',
    'Return JSON only (no markdown).',
    'JSON schema (informal): {"prosecutorRecommendationMonths": integer 1..12, "prosecutorEvaluation": "too low"|"too high"|"just right", "defenseAttorneyEvaluation": "too low"|"too high"|"just right", "sentenceMonths": integer (0..12)}',
    'Rules: output must be ONLY the JSON object, with exactly those four keys, no extra keys.',
    'Consistency rule: prosecutorRecommendationMonths MUST match the value stated in the prompt.',
  ].join('\n\n');
}

function assertValidResult(value: unknown): asserts value is AnchoringResult {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid result: not an object');
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (
    keys.length !== 4 ||
    !keys.includes('prosecutorRecommendationMonths') ||
    !keys.includes('prosecutorEvaluation') ||
    !keys.includes('defenseAttorneyEvaluation') ||
    !keys.includes('sentenceMonths')
  ) {
    throw new Error(
      'Invalid result: must contain exactly prosecutorRecommendationMonths, prosecutorEvaluation, defenseAttorneyEvaluation, and sentenceMonths',
    );
  }

  const prosecutorRecommendationMonths = record['prosecutorRecommendationMonths'];
  const prosecutorEvaluation = record['prosecutorEvaluation'];
  const defenseAttorneyEvaluation = record['defenseAttorneyEvaluation'];
  const sentenceMonths = record['sentenceMonths'];

  if (
    typeof prosecutorRecommendationMonths !== 'number' ||
    !Number.isInteger(prosecutorRecommendationMonths) ||
    prosecutorRecommendationMonths < 1 ||
    prosecutorRecommendationMonths > 12
  ) {
    throw new Error(
      'Invalid result: prosecutorRecommendationMonths must be an integer between 1 and 12',
    );
  }

  if (
    prosecutorEvaluation !== 'too low' &&
    prosecutorEvaluation !== 'too high' &&
    prosecutorEvaluation !== 'just right'
  ) {
    throw new Error(
      'Invalid result: prosecutorEvaluation must be "too low", "too high", or "just right"',
    );
  }

  if (
    defenseAttorneyEvaluation !== 'too low' &&
    defenseAttorneyEvaluation !== 'too high' &&
    defenseAttorneyEvaluation !== 'just right'
  ) {
    throw new Error(
      'Invalid result: defenseAttorneyEvaluation must be "too low", "too high", or "just right"',
    );
  }

  if (typeof sentenceMonths !== 'number' || !Number.isInteger(sentenceMonths)) {
    throw new Error('Invalid result: sentenceMonths must be an integer');
  }

  if (sentenceMonths < 0 || sentenceMonths > 12) {
    throw new Error('Invalid result: sentenceMonths must be between 0 and 12');
  }
}

const maxAttemptsPerTrial = 3;

async function runSingleTrial(options: {
  conditionId: string;
  conditionVars: Record<string, string | number>;
  runIndex: number;
  llmProvider: LlmProvider;
  experimentDef?: typeof anchoringProsecutorSentencingExperiment;
}): Promise<
  | { ok: true; result: AnchoringResult; rawLastMessage: string }
  | { ok: false; error: string; rawLastMessage?: string }
> {
  let lastRaw: string | undefined;
  let prompt = buildPrompt(options.conditionVars, options.experimentDef);

  for (let attempt = 1; attempt <= maxAttemptsPerTrial; attempt += 1) {
    try {
      const { parsed, rawResponse, isPureJson } =
        await options.llmProvider.sendJson<AnchoringResult>({
          prompt,
          schema: resultSchema,
        });
      lastRaw = rawResponse;

      if (!isPureJson) {
        throw new Error('Output contained non-JSON text; must be JSON only');
      }

      assertValidResult(parsed);
      return { ok: true, result: parsed, rawLastMessage: rawResponse };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      prompt = [
        buildPrompt(options.conditionVars, options.experimentDef),
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

async function readPackageInfo(): Promise<{ name: string; version: string }> {
  try {
    const jsonPath = path.join(process.cwd(), 'package.json');
    const raw = await readFile(jsonPath, 'utf8');
    const parsed = JSON.parse(raw) as { name?: unknown; version?: unknown };
    return {
      name: typeof parsed.name === 'string' ? parsed.name : 'unknown',
      version: typeof parsed.version === 'string' ? parsed.version : 'unknown',
    };
  } catch {
    return { name: 'unknown', version: 'unknown' };
  }
}

function buildReportPrompt(args: { analysis: AnalysisArtifact; vignette: string }): string {
  const analysisJson = JSON.stringify(args.analysis, null, 2);
  return [
    'You are a careful research assistant writing a short research report.',
    'Write in Markdown with the exact sections: Title, Abstract, Methods, Results, Discussion, Limitations, Conclusion, References.',
    '',
    'Grounding rules:',
    '- Do NOT invent any numbers.',
    '- Every quantitative statement MUST be supported by the provided analysis JSON.',
    '- If a statistic is missing or null, explicitly say it was not computed.',
    '- Keep the tone scientific and concise.',
    '- If raw per-trial values are present, you may summarize them (e.g., min/max, quartiles) but do not claim anything not supported by the JSON.',
    '',
    'CRITICAL - Discussion section requirements:',
    '- MUST include comparison of LLM results to the human baseline from the study',
    '- The analysis JSON includes humanBaseline and comparisonToHuman fields',
    '- Report the human baseline results: low condition mean, high condition mean, and mean difference',
    '- Report the LLM results and compare them to the human baseline',
    '- State whether the LLM bias is LESS, SIMILAR, or GREATER than human bias',
    '- Interpret this finding in relation to the null hypothesis (that LLMs exhibit the same bias as humans)',
    '- MUST cite the original study: Englich, B., Mussweiler, T., & Strack, F. (2006)',
    '',
    'CRITICAL - Limitations section requirements:',
    '- MUST mention that the case vignette is a high-level summary based on the published study description',
    '- The original study likely included more detailed case materials that are not available in the published paper',
    '- This limits exact replicability of the case context, though the core anchoring manipulation remains intact',
    '- MUST note that the original study used 39 experienced legal professionals (27 judges, 2 prosecutors, mean 13 years experience) with formal qualifications and real-world judicial experience',
    '- MUST note that the LLM has no legal qualifications, no professional experience, and no real-world decision-making context',
    '- State that while anchoring bias patterns can be compared, LLM responses cannot be directly equated to human legal professional judgments',
    '- Include other limitations from the data (sample size, missing statistics, etc.)',
    '',
    'CRITICAL - References section requirements:',
    '- MUST include the full citation for the original study:',
    "- Englich, B., Mussweiler, T., & Strack, F. (2006). Playing dice with criminal sentences: The influence of irrelevant anchors on experts' judicial decision making. Personality and Social Psychology Bulletin, 32(2), 188–200. https://doi.org/10.1177/0146167205282152",
    '',
    'Experiment vignette (constant across conditions):',
    args.vignette,
    '',
    'Analysis summary JSON (authoritative):',
    analysisJson,
    '',
    'Output only the Markdown report (no code fences, no extra commentary).',
  ].join('\n');
}

function baseArtifactPath(outPath: string | undefined): {
  analysisPath: string;
  reportPath: string;
} {
  if (outPath) {
    return {
      analysisPath: `${outPath}.analysis.json`,
      reportPath: `${outPath}.report.md`,
    };
  }

  return {
    analysisPath: 'anchoring-prosecutor-sentencing.analysis.json',
    reportPath: 'anchoring-prosecutor-sentencing.report.md',
  };
}

export async function runAnchoringProsecutorSentencing(
  options: RunAnchoringProsecutorSentencingOptions,
): Promise<void> {
  const outPath = options.outPath;
  const artifactsOutput: ArtifactsOutputMode = options.artifactsOutput ?? 'files';
  const experiment = options.experimentOverride ?? anchoringProsecutorSentencingExperiment;

  const collected: Record<string, { ok: number[]; errorN: number }> = {};
  for (const condition of experiment.conditions) {
    collected[condition.id] = { ok: [], errorN: 0 };
  }

  for (const condition of experiment.conditions) {
    const expectedRecommendation = (condition.params as Record<string, unknown>)[
      'prosecutorRecommendationMonths'
    ];

    if (typeof expectedRecommendation !== 'number') {
      throw new Error(`Invalid condition params for ${condition.id}`);
    }

    for (let runIndex = 0; runIndex < options.runsPerCondition; runIndex += 1) {
      const trialOptions: {
        conditionId: string;
        conditionVars: Record<string, string | number>;
        runIndex: number;
        llmProvider: LlmProvider;
        experimentDef?: typeof anchoringProsecutorSentencingExperiment;
      } = {
        conditionId: condition.id,
        conditionVars: condition.params as Record<string, string | number>,
        runIndex,
        llmProvider: options.llmProvider,
        experimentDef: experiment,
      };

      const trial = await runSingleTrial(trialOptions);

      const mismatchError =
        trial.ok && trial.result.prosecutorRecommendationMonths !== expectedRecommendation
          ? 'Invalid result: prosecutorRecommendationMonths did not match condition'
          : null;

      const isOk = trial.ok && mismatchError === null;
      const trialError = trial.ok ? undefined : trial.error;

      if (isOk) {
        collected[condition.id]?.ok.push(trial.result.sentenceMonths);
      } else {
        const entry = collected[condition.id];
        if (entry) entry.errorN += 1;
      }

      const record = {
        experimentId: experiment.id,
        model: options.llmProvider.name,
        conditionId: condition.id,
        runIndex,
        params: condition.params,
        result: isOk ? trial.result : null,
        error: isOk
          ? undefined
          : (mismatchError ?? trialError ?? 'Invalid result: unknown failure'),
        rawLastMessage: trial.ok ? trial.rawLastMessage : (trial.rawLastMessage ?? undefined),
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

  const pkg = await readPackageInfo();

  const conditionMeta = experiment.conditions.map((condition) => {
    const prosecutorRecommendationMonths = (condition.params as Record<string, unknown>)[
      'prosecutorRecommendationMonths'
    ];
    if (typeof prosecutorRecommendationMonths !== 'number') {
      throw new Error(`Invalid condition params for ${condition.id}`);
    }

    const entry = collected[condition.id];
    if (!entry) {
      throw new Error(`Missing collected results for ${condition.id}`);
    }

    return {
      id: condition.id,
      name: condition.name,
      prosecutorRecommendationMonths,
      sentenceMonths: entry.ok,
      errorN: entry.errorN,
    };
  });

  const conditions: AnalysisArtifact['conditions'] = {};
  for (const meta of conditionMeta) {
    if (meta.sentenceMonths.length < 1) {
      throw new Error(`No valid trials to analyze for condition ${meta.id}`);
    }

    const stats = computeDescriptiveStats(meta.sentenceMonths);
    conditions[meta.id] = {
      conditionName: meta.name,
      prosecutorRecommendationMonths: meta.prosecutorRecommendationMonths,
      okN: stats.n,
      errorN: meta.errorN,
      sentenceMonths: {
        mean: stats.mean,
        median: stats.median,
        sampleStdDev: stats.sampleStdDev,
        standardError: stats.standardError,
      },
      sentenceMonthsRaw: [...meta.sentenceMonths],
      sentenceMonthsFiveNumberSummary: computeFiveNumberSummary(meta.sentenceMonths),
    };
  }

  const sortedByAnchor = [...conditionMeta].sort(
    (a, b) => a.prosecutorRecommendationMonths - b.prosecutorRecommendationMonths,
  );
  const low = sortedByAnchor[0];
  const high = sortedByAnchor[sortedByAnchor.length - 1];
  if (!low || !high) {
    throw new Error('No conditions available for comparison');
  }

  const lowStats = conditions[low.id]?.sentenceMonths;
  const highStats = conditions[high.id]?.sentenceMonths;
  if (!lowStats || !highStats) {
    throw new Error('Internal analysis state: missing condition summaries');
  }

  const meanDiffHighMinusLow = highStats.mean - lowStats.mean;

  let meanDiffHighMinusLowCI95: AnalysisArtifact['comparison']['meanDiffHighMinusLowCI95'] = null;
  let welchTTest: AnalysisArtifact['comparison']['welchTTest'] = null;
  let effectSize: AnalysisArtifact['comparison']['effectSize'] = null;

  if (high.sentenceMonths.length >= 2 && low.sentenceMonths.length >= 2) {
    try {
      meanDiffHighMinusLowCI95 = bootstrapMeanDifferenceCI({
        high: high.sentenceMonths,
        low: low.sentenceMonths,
      });
    } catch {
      meanDiffHighMinusLowCI95 = null;
    }

    try {
      const t = welchTTestTwoSided(high.sentenceMonths, low.sentenceMonths);
      welchTTest = { t: t.t, df: t.df, pTwoSided: t.pTwoSided };
    } catch {
      welchTTest = null;
    }

    try {
      const e = effectSizeTwoSample(high.sentenceMonths, low.sentenceMonths);
      effectSize = { cohensD: e.cohensD, hedgesG: e.hedgesG };
    } catch {
      effectSize = null;
    }
  }

  const runConfig: AnalysisArtifact['runConfig'] = {
    model: options.llmProvider.name,
    runsPerCondition: options.runsPerCondition,
    maxAttemptsPerTrial,
  };

  // Human baseline from Englich et al. (2006), Study 2
  const humanBaseline: AnalysisArtifact['humanBaseline'] = {
    study: 'Englich et al. (2006), Study 2',
    lowAnchorMonths: 3,
    highAnchorMonths: 9,
    lowConditionMean: 4.0,
    highConditionMean: 6.05,
    meanDiffHighMinusLow: 2.05,
    sampleSize: 39,
    tStatistic: 2.1,
    degreesOfFreedom: 37,
    pValue: 0.05,
  };

  // Compare LLM bias to human baseline
  const diffOfDiffs = meanDiffHighMinusLow - humanBaseline.meanDiffHighMinusLow;
  const relativeThreshold = 0.5; // If difference is < 0.5 months, consider similar

  let llmBiasVsHuman: 'less' | 'similar' | 'greater';
  let interpretation: string;

  if (Math.abs(diffOfDiffs) < relativeThreshold) {
    llmBiasVsHuman = 'similar';
    interpretation = `LLM anchoring bias (${meanDiffHighMinusLow.toFixed(2)} months) is similar to human bias (${humanBaseline.meanDiffHighMinusLow} months), with a difference of ${diffOfDiffs.toFixed(2)} months.`;
  } else if (diffOfDiffs < 0) {
    llmBiasVsHuman = 'less';
    interpretation = `LLM anchoring bias (${meanDiffHighMinusLow.toFixed(2)} months) is LESS than human bias (${humanBaseline.meanDiffHighMinusLow} months), with a difference of ${diffOfDiffs.toFixed(2)} months.`;
  } else {
    llmBiasVsHuman = 'greater';
    interpretation = `LLM anchoring bias (${meanDiffHighMinusLow.toFixed(2)} months) is GREATER than human bias (${humanBaseline.meanDiffHighMinusLow} months), with a difference of ${diffOfDiffs.toFixed(2)} months.`;
  }

  const analysis: AnalysisArtifact = {
    experimentId: experiment.id,
    generatedAt: new Date().toISOString(),
    runConfig,
    conditions,
    comparison: {
      lowConditionId: low.id,
      highConditionId: high.id,
      meanDiffHighMinusLow,
      meanDiffHighMinusLowCI95,
      welchTTest,
      effectSize,
    },
    humanBaseline,
    comparisonToHuman: {
      llmBiasVsHuman,
      llmMeanDiff: meanDiffHighMinusLow,
      humanMeanDiff: humanBaseline.meanDiffHighMinusLow,
      diffOfDiffs,
      interpretation,
    },
    toolchain: {
      packageName: pkg.name,
      packageVersion: pkg.version,
      nodeVersion: process.version,
    },
  };

  if (artifactsOutput === 'files' || artifactsOutput === 'both') {
    const { analysisPath } = baseArtifactPath(outPath);
    await writeFile(analysisPath, JSON.stringify(analysis, null, 2) + '\n', 'utf8');
    process.stderr.write(`Wrote analysis: ${analysisPath}\n`);
  }

  if (artifactsOutput === 'console' || artifactsOutput === 'both') {
    process.stderr.write('=== BEGIN ANALYSIS JSON ===\n');
    process.stderr.write(JSON.stringify(analysis, null, 2) + '\n');
    process.stderr.write('=== END ANALYSIS JSON ===\n');
  }

  try {
    const reportPrompt = buildReportPrompt({
      analysis,
      vignette: anchoringProsecutorSentencingCaseVignette,
    });

    const reportMarkdown = await options.llmProvider.sendText({ prompt: reportPrompt });

    if (artifactsOutput === 'files' || artifactsOutput === 'both') {
      const { reportPath } = baseArtifactPath(outPath);
      await writeFile(reportPath, reportMarkdown, 'utf8');
      process.stderr.write(`Wrote report: ${reportPath}\n`);
    }

    if (artifactsOutput === 'console' || artifactsOutput === 'both') {
      process.stderr.write('=== BEGIN REPORT MARKDOWN ===\n');
      process.stderr.write(reportMarkdown.trimEnd() + '\n');
      process.stderr.write('=== END REPORT MARKDOWN ===\n');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Report generation failed: ${message}\n`);
  }
}
