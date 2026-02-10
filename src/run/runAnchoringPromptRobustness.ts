import { appendFile, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { readFile } from 'node:fs/promises';

import {
  createRobustnessConditions,
  paraphrases,
  type Paraphrase,
} from '../experiments/anchoringPromptRobustness.js';
import { renderPrompt } from '../experiments/renderPrompt.js';
import type { LlmProvider } from '../llm/provider.js';
import {
  computeDescriptiveStats,
  computeFiveNumberSummary,
  bootstrapMeanDifferenceCI,
  effectSizeTwoSample,
  welchTTestTwoSided,
} from '../analysis/stats.js';

export type RunAnchoringPromptRobustnessOptions = Readonly<{
  runsPerCondition: number;
  llmProvider: LlmProvider;
  outPath?: string;
  delayMs?: number;
}>;

type AnchoringResult = Readonly<{
  prosecutorRecommendationMonths: number;
  prosecutorEvaluation: 'too low' | 'too high' | 'just right';
  defenseAttorneyEvaluation: 'too low' | 'too high' | 'just right';
  sentenceMonths: number;
}>;

const resultSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'AnchoringPromptRobustnessResult',
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

function buildPromptForParaphrase(
  paraphrase: Paraphrase,
  conditionVars: Record<string, string | number>,
): string {
  const anchorQuestion =
    paraphrase.caseVignette +
    '\n\n' +
    paraphrase.anchorIntro +
    '\n\n' +
    renderPrompt(paraphrase.anchorStatement, conditionVars) +
    '\n\n' +
    paraphrase.anchorQuestion;

  return [
    anchorQuestion,
    '',
    paraphrase.defenseQuestion,
    '',
    paraphrase.finalQuestion,
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
  paraphrase: Paraphrase;
  conditionVars: Record<string, string | number>;
  runIndex: number;
  llmProvider: LlmProvider;
}): Promise<
  | { ok: true; result: AnchoringResult; rawLastMessage: string }
  | { ok: false; error: string; rawLastMessage?: string }
> {
  let lastRaw: string | undefined;
  let prompt = buildPromptForParaphrase(options.paraphrase, options.conditionVars);

  for (let attempt = 1; attempt <= maxAttemptsPerTrial; attempt += 1) {
    try {
      const { parsed, rawResponse } = await options.llmProvider.sendJson<AnchoringResult>({
        prompt,
        schema: resultSchema,
      });
      lastRaw = rawResponse;

      assertValidResult(parsed);
      return { ok: true, result: parsed, rawLastMessage: rawResponse };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      prompt = [
        buildPromptForParaphrase(options.paraphrase, options.conditionVars),
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

type ParaphraseAnalysis = {
  paraphraseId: string;
  lowAnchor: {
    n: number;
    mean: number;
    median: number;
    stdDev: number;
    raw: number[];
  };
  highAnchor: {
    n: number;
    mean: number;
    median: number;
    stdDev: number;
    raw: number[];
  };
  anchoringEffect: number;
  welchTTest: { t: number; df: number; pTwoSided: number } | null;
  effectSize: { hedgesG: number; cohensD: number } | null;
  ci95: { lower: number; upper: number } | null;
};

type RobustnessAnalysis = {
  experimentId: string;
  generatedAt: string;
  model: string;
  runsPerCondition: number;
  paraphraseCount: number;
  totalTrials: number;
  errorCount: number;
  paraphrases: ParaphraseAnalysis[];
  crossParaphraseStats: {
    anchoringEffects: number[];
    meanAnchoringEffect: number;
    stdDevAnchoringEffect: number;
    minAnchoringEffect: number;
    maxAnchoringEffect: number;
    effectsConsistent: boolean;
    allSignificant: boolean;
  };
  humanBaseline: {
    study: string;
    anchoringEffect: number;
  };
  conclusion: string;
};

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

export async function runAnchoringPromptRobustness(
  options: RunAnchoringPromptRobustnessOptions,
): Promise<void> {
  const outPath = options.outPath;

  const allConditions = createRobustnessConditions();

  // Collect results by condition
  const collected: Record<
    string,
    {
      paraphrase: Paraphrase;
      anchor: number;
      ok: number[];
      errorN: number;
    }
  > = {};

  for (const condition of allConditions) {
    collected[condition.id] = {
      paraphrase: condition.paraphrase,
      anchor: condition.params.prosecutorRecommendationMonths,
      ok: [],
      errorN: 0,
    };
  }

  let totalTrials = 0;
  let errorCount = 0;

  // Run all trials
  for (const condition of allConditions) {
    const expectedRecommendation = condition.params.prosecutorRecommendationMonths;

    for (let runIndex = 0; runIndex < options.runsPerCondition; runIndex += 1) {
      totalTrials += 1;

      const trial = await runSingleTrial({
        conditionId: condition.id,
        paraphrase: condition.paraphrase,
        conditionVars: condition.params as Record<string, string | number>,
        runIndex,
        llmProvider: options.llmProvider,
      });

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
        errorCount += 1;
      }

      const record = {
        experimentId: 'anchoring-prompt-robustness',
        model: options.llmProvider.name,
        conditionId: condition.id,
        paraphraseId: condition.paraphrase.id,
        anchor: expectedRecommendation,
        runIndex,
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

      // Delay between API calls
      if (options.delayMs && options.delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, options.delayMs));
      }
    }
  }

  // Analyze by paraphrase
  const paraphraseAnalyses: ParaphraseAnalysis[] = [];

  for (const paraphrase of paraphrases) {
    const lowId = `${paraphrase.id}-anchor-3mo`;
    const highId = `${paraphrase.id}-anchor-9mo`;

    const lowData = collected[lowId];
    const highData = collected[highId];

    if (!lowData || !highData) continue;

    const lowStats = computeDescriptiveStats(lowData.ok);
    const highStats = computeDescriptiveStats(highData.ok);

    const anchoringEffect = highStats.mean - lowStats.mean;

    let welchTTest: ParaphraseAnalysis['welchTTest'] = null;
    let effectSize: ParaphraseAnalysis['effectSize'] = null;
    let ci95: ParaphraseAnalysis['ci95'] = null;

    if (lowData.ok.length >= 2 && highData.ok.length >= 2) {
      try {
        const t = welchTTestTwoSided(highData.ok, lowData.ok);
        welchTTest = { t: t.t, df: t.df, pTwoSided: t.pTwoSided };
      } catch {
        /* empty */
      }

      try {
        const e = effectSizeTwoSample(highData.ok, lowData.ok);
        effectSize = { cohensD: e.cohensD, hedgesG: e.hedgesG };
      } catch {
        /* empty */
      }

      try {
        const ciResult = bootstrapMeanDifferenceCI({
          high: highData.ok,
          low: lowData.ok,
        });
        ci95 = { lower: ciResult.lower, upper: ciResult.upper };
      } catch {
        /* empty */
      }
    }

    paraphraseAnalyses.push({
      paraphraseId: paraphrase.id,
      lowAnchor: {
        n: lowStats.n,
        mean: lowStats.mean,
        median: lowStats.median,
        stdDev: lowStats.sampleStdDev,
        raw: [...lowData.ok],
      },
      highAnchor: {
        n: highStats.n,
        mean: highStats.mean,
        median: highStats.median,
        stdDev: highStats.sampleStdDev,
        raw: [...highData.ok],
      },
      anchoringEffect,
      welchTTest,
      effectSize,
      ci95,
    });
  }

  // Cross-paraphrase summary
  const anchoringEffects = paraphraseAnalyses.map((p) => p.anchoringEffect);
  const meanEffect = anchoringEffects.reduce((a, b) => a + b, 0) / anchoringEffects.length;

  const effectVariance =
    anchoringEffects.reduce((sum, e) => sum + (e - meanEffect) ** 2, 0) /
    (anchoringEffects.length - 1);
  const effectStdDev = Math.sqrt(effectVariance);

  const allSignificant = paraphraseAnalyses.every(
    (p) => p.welchTTest && p.welchTTest.pTwoSided < 0.05,
  );
  const effectsConsistent = effectStdDev < 0.5; // Small variation threshold

  const humanAnchoringEffect = 2.05; // From Englich et al. (2006)

  let conclusion: string;
  if (allSignificant && effectsConsistent) {
    conclusion = `ROBUST: Anchoring effect replicates across all ${paraphrases.length} paraphrases (mean effect = ${meanEffect.toFixed(2)} months, SD = ${effectStdDev.toFixed(2)}). All p < 0.05. Results are not sensitive to prompt wording.`;
  } else if (allSignificant) {
    conclusion = `PARTIALLY ROBUST: Anchoring effect significant in all paraphrases but with notable variation (mean effect = ${meanEffect.toFixed(2)} months, SD = ${effectStdDev.toFixed(2)}). Effect magnitude varies with wording.`;
  } else {
    const significantCount = paraphraseAnalyses.filter(
      (p) => p.welchTTest && p.welchTTest.pTwoSided < 0.05,
    ).length;
    conclusion = `NOT ROBUST: Anchoring effect only significant in ${significantCount}/${paraphrases.length} paraphrases. Results depend on prompt wording. Findings may not generalize.`;
  }

  const analysis: RobustnessAnalysis = {
    experimentId: 'anchoring-prompt-robustness',
    generatedAt: new Date().toISOString(),
    model: options.llmProvider.name,
    runsPerCondition: options.runsPerCondition,
    paraphraseCount: paraphrases.length,
    totalTrials,
    errorCount,
    paraphrases: paraphraseAnalyses,
    crossParaphraseStats: {
      anchoringEffects,
      meanAnchoringEffect: meanEffect,
      stdDevAnchoringEffect: effectStdDev,
      minAnchoringEffect: Math.min(...anchoringEffects),
      maxAnchoringEffect: Math.max(...anchoringEffects),
      effectsConsistent,
      allSignificant,
    },
    humanBaseline: {
      study: 'Englich et al. (2006), Study 2',
      anchoringEffect: humanAnchoringEffect,
    },
    conclusion,
  };

  // Write analysis
  if (outPath) {
    const analysisPath = outPath.replace(/\.jsonl$/, '.analysis.json');
    await writeFile(analysisPath, JSON.stringify(analysis, null, 2) + '\n', 'utf8');
    process.stderr.write(`Wrote analysis: ${analysisPath}\n`);
  }

  // Print summary to stderr
  process.stderr.write('\n=== PROMPT ROBUSTNESS ANALYSIS ===\n');
  process.stderr.write(`Model: ${options.llmProvider.name}\n`);
  process.stderr.write(`Paraphrases: ${paraphrases.length}\n`);
  process.stderr.write(`Trials per condition: ${options.runsPerCondition}\n`);
  process.stderr.write(`Total trials: ${totalTrials} (${errorCount} errors)\n\n`);

  for (const p of paraphraseAnalyses) {
    const sig = p.welchTTest && p.welchTTest.pTwoSided < 0.05 ? '***' : '';
    process.stderr.write(
      `${p.paraphraseId}: effect = ${p.anchoringEffect.toFixed(2)} months ${sig}\n`,
    );
    process.stderr.write(
      `  Low anchor (3mo): M=${p.lowAnchor.mean.toFixed(2)}, SD=${p.lowAnchor.stdDev.toFixed(2)}\n`,
    );
    process.stderr.write(
      `  High anchor (9mo): M=${p.highAnchor.mean.toFixed(2)}, SD=${p.highAnchor.stdDev.toFixed(2)}\n`,
    );
    if (p.welchTTest) {
      process.stderr.write(
        `  t(${p.welchTTest.df.toFixed(1)}) = ${p.welchTTest.t.toFixed(2)}, p = ${p.welchTTest.pTwoSided.toFixed(4)}\n`,
      );
    }
    if (p.effectSize) {
      process.stderr.write(`  Hedges' g = ${p.effectSize.hedgesG.toFixed(2)}\n`);
    }
    process.stderr.write('\n');
  }

  process.stderr.write(`Human baseline (Englich et al.): ${humanAnchoringEffect} months\n\n`);
  process.stderr.write(`CONCLUSION: ${conclusion}\n`);
}
