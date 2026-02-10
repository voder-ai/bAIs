import { appendFile, readFile, writeFile } from 'node:fs/promises';
import * as path from 'node:path';

import { anchoringSalaryExperiment } from '../experiments/anchoringSalary.js';
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

export type RunAnchoringSalaryOptions = Readonly<{
  runsPerCondition: number;
  llmProvider: LlmProvider;
  outPath?: string;
  artifactsOutput?: ArtifactsOutputMode;
  experimentOverride?: typeof anchoringSalaryExperiment;
}>;

type AnchoringSalaryResult = Readonly<{
  recruiterMentionedSalary: number;
  recruiterEvaluation: 'too low' | 'too high' | 'about right';
  candidateEvaluation: 'too low' | 'too high' | 'about right';
  recommendedSalary: number;
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
      recruiterMentionedSalary: number;
      okN: number;
      errorN: number;
      recommendedSalary: {
        mean: number;
        median: number;
        sampleStdDev: number;
        standardError: number;
      };
      recommendedSalaryRaw: number[];
      recommendedSalaryFiveNumberSummary: {
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
  title: 'AnchoringSalaryResult',
  type: 'object',
  additionalProperties: false,
  properties: {
    recruiterMentionedSalary: { type: 'integer', minimum: 60000, maximum: 200000 },
    recruiterEvaluation: { type: 'string', enum: ['too low', 'too high', 'about right'] },
    candidateEvaluation: { type: 'string', enum: ['too low', 'too high', 'about right'] },
    recommendedSalary: { type: 'integer', minimum: 60000, maximum: 200000 },
  },
  required: [
    'recruiterMentionedSalary',
    'recruiterEvaluation',
    'candidateEvaluation',
    'recommendedSalary',
  ],
} as const;

function buildPrompt(
  conditionVars: Record<string, string | number>,
  experimentDef: typeof anchoringSalaryExperiment = anchoringSalaryExperiment,
): string {
  const parts = experimentDef.steps.map((step) => {
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
    'JSON schema (informal): {"recruiterMentionedSalary": integer 60000..200000, "recruiterEvaluation": "too low"|"too high"|"about right", "candidateEvaluation": "too low"|"too high"|"about right", "recommendedSalary": integer (60000..200000)}',
    'Rules: output must be ONLY the JSON object, with exactly those four keys, no extra keys.',
    'Consistency rule: recruiterMentionedSalary MUST match the value stated in the prompt.',
  ].join('\n\n');
}

function assertValidResult(value: unknown): asserts value is AnchoringSalaryResult {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid result: not an object');
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (
    keys.length !== 4 ||
    !keys.includes('recruiterMentionedSalary') ||
    !keys.includes('recruiterEvaluation') ||
    !keys.includes('candidateEvaluation') ||
    !keys.includes('recommendedSalary')
  ) {
    throw new Error(
      'Invalid result: must contain exactly recruiterMentionedSalary, recruiterEvaluation, candidateEvaluation, and recommendedSalary',
    );
  }

  const recruiterMentionedSalary = record['recruiterMentionedSalary'];
  const recruiterEvaluation = record['recruiterEvaluation'];
  const candidateEvaluation = record['candidateEvaluation'];
  const recommendedSalary = record['recommendedSalary'];

  if (
    typeof recruiterMentionedSalary !== 'number' ||
    !Number.isInteger(recruiterMentionedSalary) ||
    recruiterMentionedSalary < 60000 ||
    recruiterMentionedSalary > 200000
  ) {
    throw new Error(
      'Invalid result: recruiterMentionedSalary must be an integer between 60000 and 200000',
    );
  }

  if (
    recruiterEvaluation !== 'too low' &&
    recruiterEvaluation !== 'too high' &&
    recruiterEvaluation !== 'about right'
  ) {
    throw new Error(
      'Invalid result: recruiterEvaluation must be "too low", "too high", or "about right"',
    );
  }

  if (
    candidateEvaluation !== 'too low' &&
    candidateEvaluation !== 'too high' &&
    candidateEvaluation !== 'about right'
  ) {
    throw new Error(
      'Invalid result: candidateEvaluation must be "too low", "too high", or "about right"',
    );
  }

  if (typeof recommendedSalary !== 'number' || !Number.isInteger(recommendedSalary)) {
    throw new Error('Invalid result: recommendedSalary must be an integer');
  }

  if (recommendedSalary < 60000 || recommendedSalary > 200000) {
    throw new Error('Invalid result: recommendedSalary must be between 60000 and 200000');
  }
}

const maxAttemptsPerTrial = 3;

async function runSingleTrial(options: {
  conditionId: string;
  conditionVars: Record<string, string | number>;
  runIndex: number;
  llmProvider: LlmProvider;
  experimentDef?: typeof anchoringSalaryExperiment;
}): Promise<
  | { ok: true; result: AnchoringSalaryResult; rawLastMessage: string }
  | { ok: false; error: string; rawLastMessage?: string }
> {
  let lastRaw: string | undefined;
  let prompt = buildPrompt(options.conditionVars, options.experimentDef);

  for (let attempt = 1; attempt <= maxAttemptsPerTrial; attempt += 1) {
    try {
      const { parsed, rawResponse } = await options.llmProvider.sendJson<AnchoringSalaryResult>({
        prompt,
        schema: resultSchema,
      });
      lastRaw = rawResponse;

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
    analysisPath: 'anchoring-salary.analysis.json',
    reportPath: 'anchoring-salary.report.md',
  };
}

export async function runAnchoringSalary(options: RunAnchoringSalaryOptions): Promise<void> {
  const outPath = options.outPath;
  const artifactsOutput: ArtifactsOutputMode = options.artifactsOutput ?? 'files';
  const experiment = options.experimentOverride ?? anchoringSalaryExperiment;

  const collected: Record<string, { ok: number[]; errorN: number }> = {};
  for (const condition of experiment.conditions) {
    collected[condition.id] = { ok: [], errorN: 0 };
  }

  for (const condition of experiment.conditions) {
    const expectedSalary = (condition.params as Record<string, unknown>)[
      'recruiterMentionedSalary'
    ];

    if (typeof expectedSalary !== 'number') {
      throw new Error(`Invalid condition params for ${condition.id}`);
    }

    for (let runIndex = 0; runIndex < options.runsPerCondition; runIndex += 1) {
      const trialOptions: {
        conditionId: string;
        conditionVars: Record<string, string | number>;
        runIndex: number;
        llmProvider: LlmProvider;
        experimentDef?: typeof anchoringSalaryExperiment;
      } = {
        conditionId: condition.id,
        conditionVars: condition.params as Record<string, string | number>,
        runIndex,
        llmProvider: options.llmProvider,
        experimentDef: experiment,
      };

      const trial = await runSingleTrial(trialOptions);

      const mismatchError =
        trial.ok && trial.result.recruiterMentionedSalary !== expectedSalary
          ? 'Invalid result: recruiterMentionedSalary did not match condition'
          : null;

      const isOk = trial.ok && mismatchError === null;
      const trialError = trial.ok ? undefined : trial.error;

      if (isOk) {
        collected[condition.id]?.ok.push(trial.result.recommendedSalary);
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
    const recruiterMentionedSalary = (condition.params as Record<string, unknown>)[
      'recruiterMentionedSalary'
    ];
    if (typeof recruiterMentionedSalary !== 'number') {
      throw new Error(`Invalid condition params for ${condition.id}`);
    }

    const entry = collected[condition.id];
    if (!entry) {
      throw new Error(`Missing collected results for ${condition.id}`);
    }

    return {
      id: condition.id,
      name: condition.name,
      recruiterMentionedSalary,
      recommendedSalary: entry.ok,
      errorN: entry.errorN,
    };
  });

  const conditions: AnalysisArtifact['conditions'] = {};
  for (const meta of conditionMeta) {
    if (meta.recommendedSalary.length < 1) {
      throw new Error(`No valid trials to analyze for condition ${meta.id}`);
    }

    const stats = computeDescriptiveStats(meta.recommendedSalary);
    conditions[meta.id] = {
      conditionName: meta.name,
      recruiterMentionedSalary: meta.recruiterMentionedSalary,
      okN: stats.n,
      errorN: meta.errorN,
      recommendedSalary: {
        mean: stats.mean,
        median: stats.median,
        sampleStdDev: stats.sampleStdDev,
        standardError: stats.standardError,
      },
      recommendedSalaryRaw: [...meta.recommendedSalary],
      recommendedSalaryFiveNumberSummary: computeFiveNumberSummary(meta.recommendedSalary),
    };
  }

  const sortedByAnchor = [...conditionMeta].sort(
    (a, b) => a.recruiterMentionedSalary - b.recruiterMentionedSalary,
  );
  const low = sortedByAnchor[0];
  const high = sortedByAnchor[sortedByAnchor.length - 1];
  if (!low || !high) {
    throw new Error('No conditions available for comparison');
  }

  const lowStats = conditions[low.id]?.recommendedSalary;
  const highStats = conditions[high.id]?.recommendedSalary;
  if (!lowStats || !highStats) {
    throw new Error('Internal analysis state: missing condition summaries');
  }

  const meanDiffHighMinusLow = highStats.mean - lowStats.mean;

  let meanDiffHighMinusLowCI95: AnalysisArtifact['comparison']['meanDiffHighMinusLowCI95'] = null;
  let welchTTest: AnalysisArtifact['comparison']['welchTTest'] = null;
  let effectSize: AnalysisArtifact['comparison']['effectSize'] = null;

  if (high.recommendedSalary.length >= 2 && low.recommendedSalary.length >= 2) {
    try {
      meanDiffHighMinusLowCI95 = bootstrapMeanDifferenceCI({
        high: high.recommendedSalary,
        low: low.recommendedSalary,
      });
    } catch {
      meanDiffHighMinusLowCI95 = null;
    }

    try {
      const t = welchTTestTwoSided(high.recommendedSalary, low.recommendedSalary);
      welchTTest = { t: t.t, df: t.df, pTwoSided: t.pTwoSided };
    } catch {
      welchTTest = null;
    }

    try {
      const e = effectSizeTwoSample(high.recommendedSalary, low.recommendedSalary);
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
}
