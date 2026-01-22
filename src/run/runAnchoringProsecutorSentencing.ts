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
  olsRegression,
  pearsonCorrelation,
  effectSizeTwoSample,
  welchTTestTwoSided,
} from '../analysis/stats.js';

export type RunAnchoringProsecutorSentencingOptions = Readonly<{
  runs: number;
  codexModel?: string;
  outPath?: string;
}>;

type AnchoringResult = Readonly<{
  diceRoll: number;
  prosecutorRecommendationMonths: number;
  higherOrLower: 'higher' | 'lower';
  sentenceMonths: number;
}>;

type AnalysisArtifact = Readonly<{
  experimentId: string;
  generatedAt: string;
  runConfig: {
    codexModel?: string;
    runs: number;
    maxAttemptsPerTrial: number;
  };
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
  prosecutorRecommendationMonths: {
    mean: number;
    median: number;
    sampleStdDev: number;
    standardError: number;
  };
  prosecutorRecommendationMonthsRaw: number[];
  prosecutorRecommendationMonthsFiveNumberSummary: {
    min: number;
    q1: number;
    median: number;
    q3: number;
    max: number;
  };
  association: {
    pearsonR: number | null;
    ols: { slope: number; intercept: number; r: number } | null;
  };
  medianSplit: {
    thresholdAnchorMonths: number;
    lowAnchorGroup: {
      okN: number;
      anchorMonthsFiveNumberSummary: {
        min: number;
        q1: number;
        median: number;
        q3: number;
        max: number;
      };
      sentenceMonths: {
        mean: number;
        median: number;
        sampleStdDev: number;
        standardError: number;
      };
    };
    highAnchorGroup: {
      okN: number;
      anchorMonthsFiveNumberSummary: {
        min: number;
        q1: number;
        median: number;
        q3: number;
        max: number;
      };
      sentenceMonths: {
        mean: number;
        median: number;
        sampleStdDev: number;
        standardError: number;
      };
    };
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
  } | null;
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
    diceRoll: { type: 'integer', minimum: 1, maximum: 6 },
    prosecutorRecommendationMonths: { type: 'integer', minimum: 10, maximum: 60 },
    higherOrLower: { type: 'string', enum: ['higher', 'lower'] },
    sentenceMonths: { type: 'integer', minimum: 0, maximum: 600 },
  },
  required: ['diceRoll', 'prosecutorRecommendationMonths', 'higherOrLower', 'sentenceMonths'],
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
    'JSON schema (informal): {"diceRoll": integer 1..6, "prosecutorRecommendationMonths": integer 10..60, "higherOrLower":"higher"|"lower", "sentenceMonths": integer (0..600)}',
    'Rules: output must be ONLY the JSON object, with exactly those four keys, no extra keys.',
    'Consistency rules: prosecutorRecommendationMonths MUST equal diceRoll * 10.',
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
    !keys.includes('diceRoll') ||
    !keys.includes('prosecutorRecommendationMonths') ||
    !keys.includes('higherOrLower') ||
    !keys.includes('sentenceMonths')
  ) {
    throw new Error(
      'Invalid result: must contain exactly diceRoll, prosecutorRecommendationMonths, higherOrLower, and sentenceMonths',
    );
  }

  const diceRoll = record['diceRoll'];
  const prosecutorRecommendationMonths = record['prosecutorRecommendationMonths'];
  const higherOrLower = record['higherOrLower'];
  const sentenceMonths = record['sentenceMonths'];

  if (typeof diceRoll !== 'number' || !Number.isInteger(diceRoll) || diceRoll < 1 || diceRoll > 6) {
    throw new Error('Invalid result: diceRoll must be an integer between 1 and 6');
  }

  if (
    typeof prosecutorRecommendationMonths !== 'number' ||
    !Number.isInteger(prosecutorRecommendationMonths) ||
    prosecutorRecommendationMonths < 10 ||
    prosecutorRecommendationMonths > 60
  ) {
    throw new Error(
      'Invalid result: prosecutorRecommendationMonths must be an integer between 10 and 60',
    );
  }

  if (prosecutorRecommendationMonths !== diceRoll * 10) {
    throw new Error(
      'Invalid result: prosecutorRecommendationMonths must equal diceRoll * 10 for consistency',
    );
  }

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

  const condition = anchoringProsecutorSentencingExperiment.conditions[0];
  if (!condition) {
    throw new Error('No experiment conditions defined');
  }

  const collected = {
    sentenceMonths: [] as number[],
    prosecutorRecommendationMonths: [] as number[],
    errorN: 0,
  };

  for (let runIndex = 0; runIndex < options.runs; runIndex += 1) {
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
      collected.sentenceMonths.push(trial.result.sentenceMonths);
      collected.prosecutorRecommendationMonths.push(trial.result.prosecutorRecommendationMonths);
    } else {
      collected.errorN += 1;
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

  const pkg = await readPackageInfo();
  const { analysisPath, reportPath } = baseArtifactPath(outPath);

  const okN = collected.sentenceMonths.length;
  const errorN = collected.errorN;

  const sentenceStats = okN > 0 ? computeDescriptiveStats(collected.sentenceMonths) : null;
  const anchorStats =
    collected.prosecutorRecommendationMonths.length > 0
      ? computeDescriptiveStats(collected.prosecutorRecommendationMonths)
      : null;

  if (!sentenceStats || !anchorStats) {
    throw new Error('No valid trials to analyze');
  }

  let pearsonR: number | null = null;
  let ols: AnalysisArtifact['association']['ols'] = null;
  if (okN >= 2) {
    try {
      pearsonR = pearsonCorrelation(
        collected.prosecutorRecommendationMonths,
        collected.sentenceMonths,
      );
    } catch {
      pearsonR = null;
    }

    try {
      const res = olsRegression(collected.prosecutorRecommendationMonths, collected.sentenceMonths);
      ols = { slope: res.slope, intercept: res.intercept, r: res.r };
    } catch {
      ols = null;
    }
  }

  let medianSplit: AnalysisArtifact['medianSplit'] = null;
  if (okN >= 4) {
    const threshold = anchorStats.median;

    const lowAnchor: number[] = [];
    const highAnchor: number[] = [];
    const lowSentence: number[] = [];
    const highSentence: number[] = [];

    for (let i = 0; i < okN; i += 1) {
      const anchor = collected.prosecutorRecommendationMonths[i];
      const sentence = collected.sentenceMonths[i];
      if (anchor === undefined || sentence === undefined) {
        throw new Error('Internal paired-sample mismatch');
      }

      if (anchor <= threshold) {
        lowAnchor.push(anchor);
        lowSentence.push(sentence);
      } else {
        highAnchor.push(anchor);
        highSentence.push(sentence);
      }
    }

    if (lowSentence.length >= 2 && highSentence.length >= 2) {
      const lowSentenceStats = computeDescriptiveStats(lowSentence);
      const highSentenceStats = computeDescriptiveStats(highSentence);

      let splitWelch: { t: number; df: number; pTwoSided: number } | null = null;
      let splitEffect: { hedgesG: number; cohensD: number } | null = null;
      type MeanDiffCI95 = NonNullable<AnalysisArtifact['medianSplit']>['meanDiffHighMinusLowCI95'];
      let splitCi: MeanDiffCI95 = null;

      try {
        const t = welchTTestTwoSided(highSentence, lowSentence);
        splitWelch = { t: t.t, df: t.df, pTwoSided: t.pTwoSided };
      } catch {
        splitWelch = null;
      }

      try {
        const e = effectSizeTwoSample(highSentence, lowSentence);
        splitEffect = { cohensD: e.cohensD, hedgesG: e.hedgesG };
      } catch {
        splitEffect = null;
      }

      try {
        splitCi = bootstrapMeanDifferenceCI({ high: highSentence, low: lowSentence });
      } catch {
        splitCi = null;
      }

      medianSplit = {
        thresholdAnchorMonths: threshold,
        lowAnchorGroup: {
          okN: lowSentenceStats.n,
          anchorMonthsFiveNumberSummary: computeFiveNumberSummary(lowAnchor),
          sentenceMonths: {
            mean: lowSentenceStats.mean,
            median: lowSentenceStats.median,
            sampleStdDev: lowSentenceStats.sampleStdDev,
            standardError: lowSentenceStats.standardError,
          },
        },
        highAnchorGroup: {
          okN: highSentenceStats.n,
          anchorMonthsFiveNumberSummary: computeFiveNumberSummary(highAnchor),
          sentenceMonths: {
            mean: highSentenceStats.mean,
            median: highSentenceStats.median,
            sampleStdDev: highSentenceStats.sampleStdDev,
            standardError: highSentenceStats.standardError,
          },
        },
        meanDiffHighMinusLow: highSentenceStats.mean - lowSentenceStats.mean,
        meanDiffHighMinusLowCI95: splitCi,
        welchTTest: splitWelch,
        effectSize: splitEffect,
      };
    }
  }

  const runConfig: AnalysisArtifact['runConfig'] = {
    runs: options.runs,
    maxAttemptsPerTrial,
  };
  if (options.codexModel) runConfig.codexModel = options.codexModel;

  const analysis: AnalysisArtifact = {
    experimentId: anchoringProsecutorSentencingExperiment.id,
    generatedAt: new Date().toISOString(),
    runConfig,
    okN,
    errorN,
    sentenceMonths: {
      mean: sentenceStats.mean,
      median: sentenceStats.median,
      sampleStdDev: sentenceStats.sampleStdDev,
      standardError: sentenceStats.standardError,
    },
    sentenceMonthsRaw: [...collected.sentenceMonths],
    sentenceMonthsFiveNumberSummary: computeFiveNumberSummary(collected.sentenceMonths),
    prosecutorRecommendationMonths: {
      mean: anchorStats.mean,
      median: anchorStats.median,
      sampleStdDev: anchorStats.sampleStdDev,
      standardError: anchorStats.standardError,
    },
    prosecutorRecommendationMonthsRaw: [...collected.prosecutorRecommendationMonths],
    prosecutorRecommendationMonthsFiveNumberSummary: computeFiveNumberSummary(
      collected.prosecutorRecommendationMonths,
    ),
    association: {
      pearsonR,
      ols,
    },
    medianSplit,
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
