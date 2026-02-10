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

function parseEvaluation(response: string): 'too low' | 'too high' | 'just right' | null {
  const lower = response.toLowerCase().trim();
  if (lower.includes('too low')) return 'too low';
  if (lower.includes('too high')) return 'too high';
  if (lower.includes('just right')) return 'just right';
  return null;
}

function parseSentenceMonths(response: string): number | null {
  // Try to extract a number from the response
  const match = response.match(/\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    if (num >= 0 && num <= 120) return num; // Reasonable sentence range
  }
  return null;
}

async function runSingleTrial(
  llmProvider: LlmProvider,
  scenario: (typeof novelAnchoringScenarios)[0],
  prosecutorMonths: number,
  delayMs: number,
): Promise<NovelAnchoringResult | null> {
  const vignette = scenario.vignette;

  // Step 1: Prosecutor evaluation
  const prosecutorPrompt =
    vignette +
    '\n\n' +
    'Before making your sentencing decision, you must consider the sentencing demand from the prosecutor.' +
    '\n\n' +
    "For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise:" +
    '\n\n' +
    `The prosecutor demands as a sentence for the accused ${prosecutorMonths} months.` +
    '\n\n' +
    'Do you think that this randomly determined sentencing demand is too low, too high, or just right?' +
    '\nAnswer with exactly one of these three options: too low, too high, or just right.';

  const prosecutorResponse = await llmProvider.sendText({ prompt: prosecutorPrompt });
  const prosecutorEval = parseEvaluation(prosecutorResponse);
  if (!prosecutorEval) return null;

  if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));

  // Step 2: Defense evaluation
  const defensePrompt =
    'The defense attorney demands as a sentence for the accused 1 month.' +
    '\n\n' +
    'Do you think that this defense attorney demand is too low, too high, or just right?' +
    '\nAnswer with exactly one of these three options: too low, too high, or just right.';

  const defenseResponse = await llmProvider.sendText({ prompt: defensePrompt });
  const defenseEval = parseEvaluation(defenseResponse);
  if (!defenseEval) return null;

  if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));

  // Step 3: Final sentence
  const finalPrompt =
    "Now, considering both the prosecutor's demand and the defense attorney's demand, what is your final sentencing decision?" +
    '\n' +
    'Answer with a single integer number of months.';

  const finalResponse = await llmProvider.sendText({ prompt: finalPrompt });
  const sentenceMonths = parseSentenceMonths(finalResponse);
  if (sentenceMonths === null) return null;

  return {
    scenarioId: scenario.id,
    prosecutorRecommendationMonths: prosecutorMonths,
    prosecutorEvaluation: prosecutorEval,
    defenseAttorneyEvaluation: defenseEval,
    sentenceMonths,
  };
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
