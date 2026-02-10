import { appendFile, readFile, writeFile } from 'node:fs/promises';
import * as path from 'node:path';

import type { LlmProvider } from '../llm/provider.js';
import type { ExperimentDefinition } from '../experiments/experiment.js';
import {
  chiSquareTest,
  proportionZTest,
  proportionCI,
  type ChiSquareTestResult,
  type ProportionZTestResult,
  type ProportionCIResult,
} from '../analysis/stats.js';

type ArtifactsOutputMode = 'console' | 'files' | 'both';

export type RunChoiceExperimentOptions<TParams extends Record<string, unknown>> = Readonly<{
  experiment: ExperimentDefinition<TParams>;
  getPrompt: (params: TParams) => string;
  validChoices: readonly string[];
  runsPerCondition: number;
  llmProvider: LlmProvider;
  outPath?: string | undefined;
  artifactsOutput?: ArtifactsOutputMode | undefined;
  delayMs?: number | undefined;
}>;

type ChoiceResult = Readonly<{
  choice: string;
  rawResponse: string;
}>;

type TrialRecord = Readonly<{
  experimentId: string;
  model: string;
  conditionId: string;
  runIndex: number;
  params: Record<string, unknown>;
  choice: string | null;
  error?: string | undefined;
  rawResponse: string;
  collectedAt: string;
}>;

type ConditionAnalysis = Readonly<{
  conditionName: string;
  okN: number;
  errorN: number;
  choiceCounts: Record<string, number>;
  choiceProportions: Record<string, number>;
  choiceCI: Record<string, ProportionCIResult>;
}>;

type AnalysisArtifact = Readonly<{
  experimentId: string;
  generatedAt: string;
  runConfig: {
    model: string;
    runsPerCondition: number;
    maxAttemptsPerTrial: number;
    validChoices: readonly string[];
  };
  conditions: Record<string, ConditionAnalysis>;
  comparison: {
    chiSquareTest: ChiSquareTestResult | null;
    pairwiseTests: Record<string, ProportionZTestResult | null>;
  };
  toolchain: {
    packageName: string;
    packageVersion: string;
    nodeVersion: string;
  };
}>;

const maxAttemptsPerTrial = 3;

/**
 * Parse a choice response flexibly.
 * Handles: "A", "a", "Program A", "I choose A", "CHOICE: A", etc.
 */
export function parseChoice(
  rawResponse: string,
  validChoices: readonly string[],
): { choice: string } | { error: string } {
  const cleaned = rawResponse.trim().toLowerCase();

  // Direct match (case-insensitive, preserve original case from validChoices)
  for (const valid of validChoices) {
    if (cleaned === valid.toLowerCase()) {
      return { choice: valid };
    }
  }

  // Priority pattern: "CHOICE: X" format (typically at end of analytical responses)
  for (const valid of validChoices) {
    const choicePattern = new RegExp(`choice:\\s*${valid.toLowerCase()}\\b`, 'i');
    if (choicePattern.test(rawResponse)) {
      return { choice: valid };
    }
  }

  // Priority pattern: Final standalone choice (single letter/word at end of response)
  const lines = rawResponse.trim().split('\n');
  const lastLine = lines[lines.length - 1]?.trim().toLowerCase() ?? '';
  for (const valid of validChoices) {
    if (lastLine === valid.toLowerCase()) {
      return { choice: valid };
    }
  }

  // Look for explicit mentions of choices within the response (word-boundary matches)
  const mentions = new Set<string>();
  for (const valid of validChoices) {
    const pattern = new RegExp(`\\b${valid.toLowerCase()}\\b`, 'i');
    if (pattern.test(cleaned)) {
      mentions.add(valid);
    }
  }

  if (mentions.size === 1) {
    const only = [...mentions][0];
    if (!only) {
      return { error: 'Could not parse choice: internal empty mention set' };
    }
    return { choice: only };
  }

  if (mentions.size > 1) {
    return {
      error: `Ambiguous response: mentioned multiple choices (${[...mentions].join(', ')}). Please answer with exactly one choice.`,
    };
  }

  // Look for patterns like "I choose X" or "Program X"
  for (const valid of validChoices) {
    const patterns = [
      new RegExp(`(?:choose|select|pick)\\s+(?:program\\s+)?${valid.toLowerCase()}\\b`, 'i'),
      new RegExp(`(?:program\\s+)?${valid.toLowerCase()}(?:\\s+is|\\s+would)`, 'i'),
      new RegExp(`^${valid.toLowerCase()}[^a-z]`, 'i'),
      new RegExp(`[^a-z]${valid.toLowerCase()}$`, 'i'),
    ];

    for (const pattern of patterns) {
      if (pattern.test(cleaned)) {
        return { choice: valid };
      }
    }
  }

  return {
    error: `Could not parse choice from response. Expected one of: ${validChoices.join(', ')}. Got: ${rawResponse.slice(0, 100)}`,
  };
}

async function runSingleTrial<TParams extends Record<string, unknown>>(options: {
  conditionId: string;
  params: TParams;
  getPrompt: (params: TParams) => string;
  validChoices: readonly string[];
  runIndex: number;
  llmProvider: LlmProvider;
}): Promise<
  { ok: true; result: ChoiceResult } | { ok: false; error: string; rawResponse?: string }
> {
  let lastRaw: string | undefined;
  let prompt = options.getPrompt(options.params);

  for (let attempt = 1; attempt <= maxAttemptsPerTrial; attempt += 1) {
    try {
      const rawResponse = await options.llmProvider.sendText({ prompt });
      lastRaw = rawResponse;

      const parseResult = parseChoice(rawResponse, options.validChoices);
      if ('error' in parseResult) {
        throw new Error(parseResult.error);
      }

      return {
        ok: true,
        result: {
          choice: parseResult.choice,
          rawResponse,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      prompt = [
        options.getPrompt(options.params),
        '',
        `Your previous response could not be parsed (attempt ${attempt}/${maxAttemptsPerTrial}).`,
        `Error: ${message}`,
        lastRaw ? `Previous response: ${JSON.stringify(lastRaw)}` : '',
        `Please answer with exactly one of: ${options.validChoices.join(', ')}.`,
      ]
        .filter(Boolean)
        .join('\n\n');

      if (attempt === maxAttemptsPerTrial) {
        const errorResult: { ok: false; error: string; rawResponse?: string } = {
          ok: false,
          error: message,
        };

        if (lastRaw) errorResult.rawResponse = lastRaw;
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

function buildReportPrompt(args: { analysis: AnalysisArtifact }): string {
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
    '- Focus on the choice proportions and statistical comparisons between conditions.',
    '',
    'Analysis summary JSON (authoritative):',
    analysisJson,
    '',
    'Output only the Markdown report (no code fences, no extra commentary).',
  ].join('\n');
}

function baseArtifactPath(
  experimentId: string,
  outPath: string | undefined,
): {
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
    analysisPath: `${experimentId}.analysis.json`,
    reportPath: `${experimentId}.report.md`,
  };
}

export async function runChoiceExperiment<TParams extends Record<string, unknown>>(
  options: RunChoiceExperimentOptions<TParams>,
): Promise<void> {
  const outPath = options.outPath;
  const artifactsOutput: ArtifactsOutputMode = options.artifactsOutput ?? 'files';

  const collected: Record<string, { choices: string[]; errorN: number }> = {};
  for (const condition of options.experiment.conditions) {
    collected[condition.id] = { choices: [], errorN: 0 };
  }

  // Run trials
  for (const condition of options.experiment.conditions) {
    for (let runIndex = 0; runIndex < options.runsPerCondition; runIndex += 1) {
      const trial = await runSingleTrial({
        conditionId: condition.id,
        params: condition.params,
        getPrompt: options.getPrompt,
        validChoices: options.validChoices,
        runIndex,
        llmProvider: options.llmProvider,
      });

      const isOk = trial.ok;

      if (isOk) {
        collected[condition.id]?.choices.push(trial.result.choice);
      } else {
        const entry = collected[condition.id];
        if (entry) entry.errorN += 1;
      }

      const record: TrialRecord = {
        experimentId: options.experiment.id,
        model: options.llmProvider.name,
        conditionId: condition.id,
        runIndex,
        params: condition.params as Record<string, unknown>,
        choice: isOk ? trial.result.choice : null,
        error: isOk ? undefined : trial.error,
        rawResponse: isOk ? trial.result.rawResponse : (trial.rawResponse ?? ''),
        collectedAt: new Date().toISOString(),
      };

      const line = JSON.stringify(record) + '\n';

      if (outPath) {
        await appendFile(outPath, line, 'utf8');
      } else {
        process.stdout.write(line);
      }

      // Delay between API calls (for rate limiting)
      if (options.delayMs && options.delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, options.delayMs));
      }
    }
  }

  const pkg = await readPackageInfo();

  // Analyze results
  const conditions: Record<string, ConditionAnalysis> = {};

  for (const condition of options.experiment.conditions) {
    const entry = collected[condition.id];
    if (!entry) {
      throw new Error(`Missing collected results for ${condition.id}`);
    }

    const totalValid = entry.choices.length;
    const choiceCounts: Record<string, number> = {};
    const choiceProportions: Record<string, number> = {};
    const choiceCI: Record<string, ProportionCIResult> = {};

    // Initialize counts
    for (const choice of options.validChoices) {
      choiceCounts[choice] = 0;
    }

    // Count choices
    for (const choice of entry.choices) {
      choiceCounts[choice] = (choiceCounts[choice] ?? 0) + 1;
    }

    // Calculate proportions and confidence intervals
    for (const choice of options.validChoices) {
      const count = choiceCounts[choice] ?? 0;
      choiceProportions[choice] = totalValid > 0 ? count / totalValid : 0;
      choiceCI[choice] =
        totalValid > 0
          ? proportionCI(count, totalValid)
          : {
              lower: 0,
              upper: 0,
              alpha: 0.05,
              method: 'wilson-score' as const,
            };
    }

    conditions[condition.id] = {
      conditionName: condition.name,
      okN: totalValid,
      errorN: entry.errorN,
      choiceCounts,
      choiceProportions,
      choiceCI,
    };
  }

  // Chi-square test across all conditions and choices
  let chiSquareResult: ChiSquareTestResult | null = null;
  if (options.experiment.conditions.length === 2 && options.validChoices.length === 2) {
    try {
      const [cond1, cond2] = options.experiment.conditions;
      const [choice1, choice2] = options.validChoices;

      if (cond1 && cond2 && choice1 && choice2) {
        const cond1Analysis = conditions[cond1.id];
        const cond2Analysis = conditions[cond2.id];

        if (cond1Analysis && cond2Analysis) {
          const observed = [
            [cond1Analysis.choiceCounts[choice1] ?? 0, cond1Analysis.choiceCounts[choice2] ?? 0],
            [cond2Analysis.choiceCounts[choice1] ?? 0, cond2Analysis.choiceCounts[choice2] ?? 0],
          ];

          chiSquareResult = chiSquareTest(observed);
        }
      }
    } catch {
      chiSquareResult = null;
    }
  }

  // Pairwise proportion tests
  const pairwiseTests: Record<string, ProportionZTestResult | null> = {};
  if (options.experiment.conditions.length === 2) {
    const [cond1, cond2] = options.experiment.conditions;
    if (cond1 && cond2) {
      const cond1Analysis = conditions[cond1.id];
      const cond2Analysis = conditions[cond2.id];

      if (cond1Analysis && cond2Analysis) {
        for (const choice of options.validChoices) {
          try {
            const successes1 = cond1Analysis.choiceCounts[choice] ?? 0;
            const successes2 = cond2Analysis.choiceCounts[choice] ?? 0;
            const n1 = cond1Analysis.okN;
            const n2 = cond2Analysis.okN;

            if (n1 > 0 && n2 > 0) {
              pairwiseTests[`${cond1.id}-vs-${cond2.id}-${choice}`] = proportionZTest(
                successes1,
                n1,
                successes2,
                n2,
              );
            }
          } catch {
            pairwiseTests[`${cond1.id}-vs-${cond2.id}-${choice}`] = null;
          }
        }
      }
    }
  }

  const analysis: AnalysisArtifact = {
    experimentId: options.experiment.id,
    generatedAt: new Date().toISOString(),
    runConfig: {
      model: options.llmProvider.name,
      runsPerCondition: options.runsPerCondition,
      maxAttemptsPerTrial,
      validChoices: options.validChoices,
    },
    conditions,
    comparison: {
      chiSquareTest: chiSquareResult,
      pairwiseTests,
    },
    toolchain: {
      packageName: pkg.name,
      packageVersion: pkg.version,
      nodeVersion: process.version,
    },
  };

  if (artifactsOutput === 'files' || artifactsOutput === 'both') {
    const { analysisPath } = baseArtifactPath(options.experiment.id, outPath);
    await writeFile(analysisPath, JSON.stringify(analysis, null, 2) + '\n', 'utf8');
    process.stderr.write(`Wrote analysis: ${analysisPath}\n`);
  }

  if (artifactsOutput === 'console' || artifactsOutput === 'both') {
    process.stderr.write('=== BEGIN ANALYSIS JSON ===\n');
    process.stderr.write(JSON.stringify(analysis, null, 2) + '\n');
    process.stderr.write('=== END ANALYSIS JSON ===\n');
  }

  try {
    const reportPrompt = buildReportPrompt({ analysis });
    const reportMarkdown = await options.llmProvider.sendText({ prompt: reportPrompt });

    if (artifactsOutput === 'files' || artifactsOutput === 'both') {
      const { reportPath } = baseArtifactPath(options.experiment.id, outPath);
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
