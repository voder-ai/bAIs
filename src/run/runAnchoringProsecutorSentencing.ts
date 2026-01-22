import { appendFile, readFile, writeFile } from 'node:fs/promises';
import * as path from 'node:path';

import {
  anchoringProsecutorSentencingCaseVignette,
  anchoringProsecutorSentencingExperiment,
} from '../experiments/anchoringProsecutorSentencing.js';
import { renderPrompt } from '../experiments/renderPrompt.js';
import { codexExecJson, codexExecText } from '../llm/codexExec.js';
import {
  computeDescriptiveStats,
  computeFiveNumberSummary,
  bootstrapMeanDifferenceCI,
  effectSizeTwoSample,
  welchTTestTwoSided,
} from '../analysis/stats.js';

export type RunAnchoringProsecutorSentencingOptions = Readonly<{
  runsPerCondition: number;
  codexModel?: string;
  outPath?: string;
}>;

type AnchoringResult = Readonly<{
  higherOrLower: 'higher' | 'lower';
  sentenceMonths: number;
}>;

type AnalysisArtifact = Readonly<{
  experimentId: string;
  generatedAt: string;
  runConfig: {
    codexModel?: string;
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
    higherOrLower: { type: 'string', enum: ['higher', 'lower'] },
    sentenceMonths: { type: 'integer', minimum: 0, maximum: 600 },
  },
  required: ['higherOrLower', 'sentenceMonths'],
} as const;

function buildPrompt(conditionVars: Record<string, string | number>): string {
  const parts = anchoringProsecutorSentencingExperiment.steps.map((step) => {
    const template = step.prompts[0]?.template;
    if (!template) {
      throw new Error(`Missing prompt template for step ${step.id}`);
    }

    return renderPrompt(template, conditionVars);
  });

  return [
    ...parts,
    '',
    'Return JSON only (no markdown).',
    'JSON schema (informal): {"higherOrLower":"higher"|"lower","sentenceMonths": integer (0..600)}',
    'Rules: output must be ONLY the JSON object, with exactly those two keys, no extra keys.',
  ].join('\n\n');
}

function assertValidResult(value: unknown): asserts value is AnchoringResult {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid result: not an object');
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length !== 2 || !keys.includes('higherOrLower') || !keys.includes('sentenceMonths')) {
    throw new Error('Invalid result: must contain exactly higherOrLower and sentenceMonths');
  }
  const higherOrLower = record['higherOrLower'];
  const sentenceMonths = record['sentenceMonths'];

  if (higherOrLower !== 'higher' && higherOrLower !== 'lower') {
    throw new Error('Invalid result: higherOrLower must be "higher" or "lower"');
  }

  if (typeof sentenceMonths !== 'number' || !Number.isInteger(sentenceMonths)) {
    throw new Error('Invalid result: sentenceMonths must be an integer');
  }

  if (sentenceMonths < 0 || sentenceMonths > 600) {
    throw new Error('Invalid result: sentenceMonths must be between 0 and 600');
  }
}

const maxAttemptsPerTrial = 3;

async function runSingleTrial(options: {
  conditionId: string;
  conditionVars: Record<string, string | number>;
  runIndex: number;
  codexModel?: string;
}): Promise<
  | { ok: true; result: AnchoringResult; rawLastMessage: string }
  | { ok: false; error: string; rawLastMessage?: string }
> {
  let lastRaw: string | undefined;
  let prompt = buildPrompt(options.conditionVars);

  for (let attempt = 1; attempt <= maxAttemptsPerTrial; attempt += 1) {
    const codexOptions: {
      prompt: string;
      schema: unknown;
      model?: string;
    } = {
      prompt,
      schema: resultSchema,
    };

    if (options.codexModel) codexOptions.model = options.codexModel;

    try {
      const { parsed, rawLastMessage, isPureJson } =
        await codexExecJson<AnchoringResult>(codexOptions);
      lastRaw = rawLastMessage;

      if (!isPureJson) {
        throw new Error('Output contained non-JSON text; must be JSON only');
      }

      assertValidResult(parsed);
      return { ok: true, result: parsed, rawLastMessage };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      prompt = [
        buildPrompt(options.conditionVars),
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
    'Write in Markdown with the exact sections: Title, Abstract, Methods, Results, Discussion, Limitations, Conclusion.',
    '',
    'Grounding rules:',
    '- Do NOT invent any numbers.',
    '- Every quantitative statement MUST be supported by the provided analysis JSON.',
    '- If a statistic is missing or null, explicitly say it was not computed.',
    '- Keep the tone scientific and concise.',
    '- If raw per-trial values are present, you may summarize them (e.g., min/max, quartiles) but do not claim anything not supported by the JSON.',
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

  const collected: Record<string, { ok: number[]; errorN: number }> = {};
  for (const condition of anchoringProsecutorSentencingExperiment.conditions) {
    collected[condition.id] = { ok: [], errorN: 0 };
  }

  for (const condition of anchoringProsecutorSentencingExperiment.conditions) {
    for (let runIndex = 0; runIndex < options.runsPerCondition; runIndex += 1) {
      const trialOptions: {
        conditionId: string;
        conditionVars: Record<string, string | number>;
        runIndex: number;
        codexModel?: string;
      } = {
        conditionId: condition.id,
        conditionVars: condition.params as Record<string, string | number>,
        runIndex,
      };

      if (options.codexModel) trialOptions.codexModel = options.codexModel;

      const trial = await runSingleTrial(trialOptions);

      if (trial.ok) {
        collected[condition.id]?.ok.push(trial.result.sentenceMonths);
      } else {
        const entry = collected[condition.id];
        if (entry) entry.errorN += 1;
      }

      const record = {
        experimentId: anchoringProsecutorSentencingExperiment.id,
        conditionId: condition.id,
        runIndex,
        params: condition.params,
        result: trial.ok ? trial.result : null,
        error: trial.ok ? undefined : trial.error,
        rawLastMessage: trial.ok ? trial.rawLastMessage : trial.rawLastMessage,
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
  const { analysisPath, reportPath } = baseArtifactPath(outPath);

  const conditions: AnalysisArtifact['conditions'] = {};
  for (const condition of anchoringProsecutorSentencingExperiment.conditions) {
    const values = collected[condition.id]?.ok ?? [];
    const errorN = collected[condition.id]?.errorN ?? 0;

    const stats = values.length > 0 ? computeDescriptiveStats(values) : null;
    if (!stats) {
      continue;
    }

    const months = condition.params.prosecutorRecommendationMonths;
    if (typeof months !== 'number') {
      throw new Error(`Invalid condition params for ${condition.id}`);
    }

    conditions[condition.id] = {
      conditionName: condition.name,
      prosecutorRecommendationMonths: months,
      okN: stats.n,
      errorN,
      sentenceMonths: {
        mean: stats.mean,
        median: stats.median,
        sampleStdDev: stats.sampleStdDev,
        standardError: stats.standardError,
      },
      sentenceMonthsRaw: [...values],
      sentenceMonthsFiveNumberSummary: computeFiveNumberSummary(values),
    };
  }

  const lowId = 'low-12';
  const highId = 'high-60';
  const lowValues = collected[lowId]?.ok ?? [];
  const highValues = collected[highId]?.ok ?? [];

  const meanLow = lowValues.length > 0 ? computeDescriptiveStats(lowValues).mean : 0;
  const meanHigh = highValues.length > 0 ? computeDescriptiveStats(highValues).mean : 0;
  const meanDiffHighMinusLow = meanHigh - meanLow;

  let meanDiffCi: AnalysisArtifact['comparison']['meanDiffHighMinusLowCI95'] = null;
  if (lowValues.length >= 2 && highValues.length >= 2) {
    try {
      meanDiffCi = bootstrapMeanDifferenceCI({ high: highValues, low: lowValues });
    } catch {
      meanDiffCi = null;
    }
  }

  let welch: AnalysisArtifact['comparison']['welchTTest'] = null;
  let effectSize: AnalysisArtifact['comparison']['effectSize'] = null;
  if (lowValues.length >= 2 && highValues.length >= 2) {
    try {
      const t = welchTTestTwoSided(highValues, lowValues);
      welch = { t: t.t, df: t.df, pTwoSided: t.pTwoSided };
    } catch {
      welch = null;
    }

    try {
      const e = effectSizeTwoSample(highValues, lowValues);
      effectSize = { cohensD: e.cohensD, hedgesG: e.hedgesG };
    } catch {
      effectSize = null;
    }
  }

  const runConfig: AnalysisArtifact['runConfig'] = {
    runsPerCondition: options.runsPerCondition,
    maxAttemptsPerTrial,
  };
  if (options.codexModel) runConfig.codexModel = options.codexModel;

  const analysis: AnalysisArtifact = {
    experimentId: anchoringProsecutorSentencingExperiment.id,
    generatedAt: new Date().toISOString(),
    runConfig,
    conditions,
    comparison: {
      lowConditionId: lowId,
      highConditionId: highId,
      meanDiffHighMinusLow,
      meanDiffHighMinusLowCI95: meanDiffCi,
      welchTTest: welch,
      effectSize,
    },
    toolchain: {
      packageName: pkg.name,
      packageVersion: pkg.version,
      nodeVersion: process.version,
    },
  };

  await writeFile(analysisPath, JSON.stringify(analysis, null, 2) + '\n', 'utf8');
  process.stderr.write(`Wrote analysis: ${analysisPath}\n`);

  try {
    const reportPrompt = buildReportPrompt({
      analysis,
      vignette: anchoringProsecutorSentencingCaseVignette,
    });

    const codexTextOptions: { prompt: string; model?: string } = { prompt: reportPrompt };
    if (options.codexModel) codexTextOptions.model = options.codexModel;

    const reportMarkdown = await codexExecText(codexTextOptions);

    await writeFile(reportPath, reportMarkdown, 'utf8');
    process.stderr.write(`Wrote report: ${reportPath}\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Report generation failed: ${message}\n`);
  }
}
