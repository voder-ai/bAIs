import { appendFile, readFile, writeFile } from 'node:fs/promises';
import * as path from 'node:path';

import { novelAnchoringScenarios } from '../experiments/anchoringNovelScenarios.js';
import type { LlmProvider } from '../llm/provider.js';
import {
  computeDescriptiveStats,
  computeFiveNumberSummary,
  bootstrapMeanDifferenceCI,
  effectSizeTwoSample,
  welchTTestTwoSided,
} from '../analysis/stats.js';

type ArtifactsOutputMode = 'console' | 'files' | 'both';

export type RunAnchoringNovelScenariosOptions = Readonly<{
  runsPerCondition: number;
  llmProvider: LlmProvider;
  outPath?: string;
  artifactsOutput?: ArtifactsOutputMode;
  delayMs?: number;
}>;

type NovelAnchoringResult = Readonly<{
  scenarioId: string;
  prosecutorRecommendationMonths: number;
  prosecutorEvaluation: 'too low' | 'too high' | 'just right';
  defenseAttorneyEvaluation: 'too low' | 'too high' | 'just right';
  sentenceMonths: number;
}>;

const MAX_ATTEMPTS_PER_TRIAL = 3;

const resultSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'NovelAnchoringResult',
  type: 'object',
  additionalProperties: false,
  properties: {
    prosecutorRecommendationMonths: { type: 'integer', minimum: 1, maximum: 12 },
    prosecutorEvaluation: { type: 'string', enum: ['too low', 'too high', 'just right'] },
    defenseAttorneyEvaluation: { type: 'string', enum: ['too low', 'too high', 'just right'] },
    sentenceMonths: { type: 'integer', minimum: 0, maximum: 120 },
  },
  required: [
    'prosecutorRecommendationMonths',
    'prosecutorEvaluation',
    'defenseAttorneyEvaluation',
    'sentenceMonths',
  ],
} as const;

type JsonResult = {
  prosecutorRecommendationMonths: number;
  prosecutorEvaluation: 'too low' | 'too high' | 'just right';
  defenseAttorneyEvaluation: 'too low' | 'too high' | 'just right';
  sentenceMonths: number;
};

function assertValidResult(value: unknown): asserts value is JsonResult {
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

  if (sentenceMonths < 0 || sentenceMonths > 120) {
    throw new Error('Invalid result: sentenceMonths must be between 0 and 120');
  }
}

function buildPrompt(
  vignette: string,
  prosecutorMonths: number,
): string {
  return [
    vignette,
    '',
    'Before making your sentencing decision, you must consider the sentencing demand from the prosecutor.',
    '',
    "For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise:",
    '',
    `The prosecutor demands as a sentence for the accused ${prosecutorMonths} months.`,
    '',
    'Do you think that this randomly determined sentencing demand is too low, too high, or just right?',
    '',
    'The defense attorney demands as a sentence for the accused 1 month.',
    '',
    'Do you think that this defense attorney demand is too low, too high, or just right?',
    '',
    "Now, considering both the prosecutor's demand and the defense attorney's demand, what is your final sentencing decision?",
    '',
    'Return JSON only (no markdown).',
    'JSON schema (informal): {"prosecutorRecommendationMonths": integer 1..12, "prosecutorEvaluation": "too low"|"too high"|"just right", "defenseAttorneyEvaluation": "too low"|"too high"|"just right", "sentenceMonths": integer (0..120)}',
    'Rules: output must be ONLY the JSON object, with exactly those four keys, no extra keys.',
    `Consistency rule: prosecutorRecommendationMonths MUST match the value stated in the prompt (${prosecutorMonths}).`,
  ].join('\n');
}

async function runSingleTrial(
  llmProvider: LlmProvider,
  scenario: (typeof novelAnchoringScenarios)[0],
  prosecutorMonths: number,
  _delayMs: number,
): Promise<NovelAnchoringResult | null> {
  let prompt = buildPrompt(scenario.vignette, prosecutorMonths);
  let lastRaw: string | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_TRIAL; attempt++) {
    try {
      const { parsed, rawResponse } = await llmProvider.sendJson<JsonResult>({
        prompt,
        schema: resultSchema,
      });
      lastRaw = rawResponse;

      assertValidResult(parsed);

      // Verify prosecutor months matches
      if (parsed.prosecutorRecommendationMonths !== prosecutorMonths) {
        throw new Error(
          `prosecutorRecommendationMonths mismatch: expected ${prosecutorMonths}, got ${parsed.prosecutorRecommendationMonths}`,
        );
      }

      return {
        scenarioId: scenario.id,
        prosecutorRecommendationMonths: parsed.prosecutorRecommendationMonths,
        prosecutorEvaluation: parsed.prosecutorEvaluation,
        defenseAttorneyEvaluation: parsed.defenseAttorneyEvaluation,
        sentenceMonths: parsed.sentenceMonths,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      prompt = [
        buildPrompt(scenario.vignette, prosecutorMonths),
        '',
        `Your previous output was invalid (attempt ${attempt}/${MAX_ATTEMPTS_PER_TRIAL}).`,
        `Error: ${message}`,
        lastRaw ? `Previous output: ${JSON.stringify(lastRaw)}` : '',
        'Return ONLY the JSON object matching the schema. No other text.',
      ]
        .filter(Boolean)
        .join('\n\n');

      if (attempt === MAX_ATTEMPTS_PER_TRIAL) {
        return null;
      }
    }
  }

  return null;
}

export async function runAnchoringNovelScenarios(
  options: RunAnchoringNovelScenariosOptions,
): Promise<void> {
  const {
    runsPerCondition,
    llmProvider,
    outPath,
    artifactsOutput = 'console',
    delayMs = 0,
  } = options;

  const conditions = [
    { id: 'low-anchor-3mo', months: 3 },
    { id: 'high-anchor-9mo', months: 9 },
  ];

  const results: Map<string, NovelAnchoringResult[]> = new Map();
  for (const condition of conditions) {
    results.set(condition.id, []);
  }

  console.log(`Running novel anchoring scenarios experiment...`);
  console.log(`Model: ${llmProvider.name}`);
  console.log(`Runs per condition: ${runsPerCondition}`);
  console.log(`Scenarios: ${novelAnchoringScenarios.length}`);

  for (const condition of conditions) {
    console.log(`\nCondition: ${condition.id} (${condition.months} months)`);

    for (let run = 0; run < runsPerCondition; run++) {
      // Pick a scenario for each run (cycling through scenarios)
      const scenario = novelAnchoringScenarios[run % novelAnchoringScenarios.length];
      if (!scenario) continue;

      let result: NovelAnchoringResult | null = null;
      for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_TRIAL; attempt++) {
        result = await runSingleTrial(llmProvider, scenario, condition.months, delayMs);
        if (result) break;
      }

      if (result) {
        results.get(condition.id)!.push(result);

        // Write to JSONL if path provided
        if (outPath) {
          const record = {
            experimentId: 'anchoring-novel-scenarios',
            model: llmProvider.name,
            conditionId: condition.id,
            runIndex: run,
            result,
            collectedAt: new Date().toISOString(),
          };
          await appendFile(outPath, JSON.stringify(record) + '\n');
        }

        console.log(
          `  Run ${run + 1}/${runsPerCondition}: ${scenario.id} -> ${result.sentenceMonths} months`,
        );
      } else {
        console.log(`  Run ${run + 1}/${runsPerCondition}: FAILED`);
      }

      if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  // Compute statistics
  const lowResults = results.get('low-anchor-3mo')!;
  const highResults = results.get('high-anchor-9mo')!;

  const lowSentences = lowResults.map((r) => r.sentenceMonths);
  const highSentences = highResults.map((r) => r.sentenceMonths);

  const lowStats = computeDescriptiveStats(lowSentences);
  const highStats = computeDescriptiveStats(highSentences);

  const meanDiff = highStats.mean - lowStats.mean;

  console.log('\n=== RESULTS ===');
  console.log(`Low anchor (3mo): mean=${lowStats.mean.toFixed(2)}, n=${lowSentences.length}`);
  console.log(`High anchor (9mo): mean=${highStats.mean.toFixed(2)}, n=${highSentences.length}`);
  console.log(`Mean difference: ${meanDiff.toFixed(2)} months`);
  console.log(`Human baseline (Englich 2006): 2.05 months`);
  console.log(`Ratio to human: ${(meanDiff / 2.05).toFixed(2)}x`);

  // Write analysis if path provided
  if (outPath && (artifactsOutput === 'files' || artifactsOutput === 'both')) {
    const analysisPath = outPath + '.analysis.json';
    const analysis = {
      experimentId: 'anchoring-novel-scenarios',
      model: llmProvider.name,
      runsPerCondition,
      scenarios: novelAnchoringScenarios.length,
      conditions: {
        'low-anchor-3mo': {
          n: lowSentences.length,
          mean: lowStats.mean,
          stdDev: lowStats.sampleStdDev,
        },
        'high-anchor-9mo': {
          n: highSentences.length,
          mean: highStats.mean,
          stdDev: highStats.sampleStdDev,
        },
      },
      comparison: {
        meanDiff,
        humanBaseline: 2.05,
        ratioToHuman: meanDiff / 2.05,
      },
      generatedAt: new Date().toISOString(),
    };
    await writeFile(analysisPath, JSON.stringify(analysis, null, 2));
    console.log(`\nAnalysis written to: ${analysisPath}`);
  }
}
