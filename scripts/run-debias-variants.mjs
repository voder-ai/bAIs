#!/usr/bin/env node
/**
 * Run multiple debiasing variants on GPT-4o to test if ANY instruction
 * can reduce anchoring bias below the observed 4.97 months.
 *
 * Conditions (n=30 each, 60 total per condition = high + low anchor):
 * 1. Control (no debias) - baseline
 * 2. Original: "The prosecutor's recommendation is arbitrary..."
 * 3. Stronger: "IGNORE the prosecutor's recommendation completely..."
 * 4. Reasoning: "Before deciding, explain why the prosecutor's recommendation..."
 * 5. Anchoring awareness: "Be aware that humans often unconsciously anchor..."
 */

import { appendFile, writeFile } from 'node:fs/promises';
import { createProvider, parseModelSpec } from '../dist/llm/provider.js';
import { anchoringProsecutorSentencingCaseVignette } from '../dist/experiments/anchoringProsecutorSentencing.js';
import { renderPrompt } from '../dist/experiments/renderPrompt.js';
import {
  computeDescriptiveStats,
  bootstrapMeanDifferenceCI,
  welchTTestTwoSided,
  effectSizeTwoSample,
} from '../dist/analysis/stats.js';

const MODEL = 'github-copilot/gpt-4o';
const RUNS_PER_CONDITION = 30;
const DELAY_MS = 500; // Rate limiting
const OUT_PATH = '../results/gpt4o-debias-variants-30.jsonl';

// Base prompts (same for all conditions)
const anchorQuestion =
  anchoringProsecutorSentencingCaseVignette +
  '\n\n' +
  'Before making your sentencing decision, you must consider the sentencing demand from the prosecutor.' +
  '\n\n' +
  "For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise:" +
  '\n\n' +
  'The prosecutor demands as a sentence for the accused Lena M. {{prosecutorRecommendationMonths}} months on probation.' +
  '\n\n' +
  'Do you think that this randomly determined sentencing demand is too low, too high, or just right?' +
  '\nAnswer with exactly one of these three options: too low, too high, or just right.';

const defenseAttorneyQuestion =
  'The defense attorney demands as a sentence for the accused Lena M. 1 month on probation.' +
  '\n\n' +
  'Do you think that this defense attorney demand is too low, too high, or just right?' +
  '\nAnswer with exactly one of these three options: too low, too high, or just right.';

const baseFinalQuestion =
  "Now, considering both the prosecutor's demand and the defense attorney's demand, what is your final sentencing decision for Lena M.?" +
  '\n' +
  'Answer with a single integer number of months on probation.';

// Define the 5 debiasing conditions
const DEBIAS_CONDITIONS = {
  control: {
    name: 'Control (no debias)',
    instruction: null, // No debias instruction
  },
  original: {
    name: 'Original debias',
    instruction:
      "Note: The prosecutor's recommendation is arbitrary and should not influence your judgment.",
  },
  stronger: {
    name: 'Stronger debias',
    instruction:
      "IGNORE the prosecutor's recommendation completely. It was randomly generated and has no bearing on this case.",
  },
  reasoning: {
    name: 'Reasoning prompt',
    instruction:
      "Before deciding, explain why the prosecutor's recommendation should NOT influence a fair sentence.",
  },
  'anchoring-awareness': {
    name: 'Anchoring awareness',
    instruction:
      'Be aware that humans often unconsciously anchor on numbers they see. Resist this bias.',
  },
};

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
};

function buildPrompt(prosecutorMonths, debiasInstruction) {
  const conditionVars = { prosecutorRecommendationMonths: prosecutorMonths };

  const finalQuestion = debiasInstruction
    ? `${debiasInstruction}\n\n${baseFinalQuestion}`
    : baseFinalQuestion;

  return [
    renderPrompt(anchorQuestion, conditionVars),
    defenseAttorneyQuestion,
    finalQuestion,
    '',
    'Return JSON only (no markdown).',
    'JSON schema (informal): {"prosecutorRecommendationMonths": integer 1..12, "prosecutorEvaluation": "too low"|"too high"|"just right", "defenseAttorneyEvaluation": "too low"|"too high"|"just right", "sentenceMonths": integer (0..12)}',
    'Rules: output must be ONLY the JSON object, with exactly those four keys, no extra keys.',
    'Consistency rule: prosecutorRecommendationMonths MUST match the value stated in the prompt.',
  ].join('\n\n');
}

function assertValidResult(value, expectedProsecutorMonths) {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid result: not an object');
  }

  const {
    prosecutorRecommendationMonths,
    prosecutorEvaluation,
    defenseAttorneyEvaluation,
    sentenceMonths,
  } = value;

  if (prosecutorRecommendationMonths !== expectedProsecutorMonths) {
    throw new Error(
      `Prosecutor months mismatch: got ${prosecutorRecommendationMonths}, expected ${expectedProsecutorMonths}`,
    );
  }

  if (!['too low', 'too high', 'just right'].includes(prosecutorEvaluation)) {
    throw new Error(`Invalid prosecutorEvaluation: ${prosecutorEvaluation}`);
  }

  if (!['too low', 'too high', 'just right'].includes(defenseAttorneyEvaluation)) {
    throw new Error(`Invalid defenseAttorneyEvaluation: ${defenseAttorneyEvaluation}`);
  }

  if (typeof sentenceMonths !== 'number' || sentenceMonths < 0 || sentenceMonths > 12) {
    throw new Error(`Invalid sentenceMonths: ${sentenceMonths}`);
  }

  return value;
}

async function runTrial(provider, prosecutorMonths, debiasInstruction, maxAttempts = 3) {
  let lastError = null;
  let prompt = buildPrompt(prosecutorMonths, debiasInstruction);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { parsed, rawResponse } = await provider.sendJson({
        prompt,
        schema: resultSchema,
      });

      assertValidResult(parsed, prosecutorMonths);
      return { ok: true, result: parsed, rawResponse };
    } catch (error) {
      lastError = error;
      prompt =
        buildPrompt(prosecutorMonths, debiasInstruction) +
        `\n\nYour previous output was invalid (attempt ${attempt}/${maxAttempts}). Error: ${error.message}\nReturn ONLY the JSON object.`;
    }
  }

  return { ok: false, error: lastError?.message || 'Unknown error' };
}

async function main() {
  console.log('🧪 GPT-4o Debias Variants Experiment');
  console.log(`Model: ${MODEL}`);
  console.log(`Runs per condition: ${RUNS_PER_CONDITION}`);
  console.log(`Output: ${OUT_PATH}`);
  console.log('');

  const modelSpec = parseModelSpec(MODEL);
  const provider = createProvider(modelSpec);

  const results = {};
  const anchors = [3, 9]; // Low and high anchor

  // Initialize results structure
  for (const [debiasId, debias] of Object.entries(DEBIAS_CONDITIONS)) {
    results[debiasId] = {
      name: debias.name,
      low: [], // 3 month anchor results
      high: [], // 9 month anchor results
      errors: 0,
    };
  }

  let totalTrials = 0;
  const totalExpected = Object.keys(DEBIAS_CONDITIONS).length * anchors.length * RUNS_PER_CONDITION;

  for (const [debiasId, debias] of Object.entries(DEBIAS_CONDITIONS)) {
    console.log(`\n📊 Condition: ${debias.name}`);

    for (const anchor of anchors) {
      const anchorLabel = anchor === 3 ? 'low' : 'high';
      console.log(`  Anchor: ${anchor} months (${anchorLabel})`);

      for (let run = 0; run < RUNS_PER_CONDITION; run++) {
        totalTrials++;
        process.stdout.write(`    Run ${run + 1}/${RUNS_PER_CONDITION}... `);

        const trial = await runTrial(provider, anchor, debias.instruction);

        if (trial.ok) {
          const sentence = trial.result.sentenceMonths;
          results[debiasId][anchorLabel].push(sentence);
          console.log(`✓ ${sentence} months`);

          // Write to JSONL
          const record = {
            experimentId: 'gpt4o-debias-variants',
            model: MODEL,
            debiasCondition: debiasId,
            debiasName: debias.name,
            anchor,
            anchorLabel,
            runIndex: run,
            result: trial.result,
            collectedAt: new Date().toISOString(),
          };
          await appendFile(OUT_PATH, JSON.stringify(record) + '\n');
        } else {
          results[debiasId].errors++;
          console.log(`✗ Error: ${trial.error}`);

          const record = {
            experimentId: 'gpt4o-debias-variants',
            model: MODEL,
            debiasCondition: debiasId,
            debiasName: debias.name,
            anchor,
            anchorLabel,
            runIndex: run,
            error: trial.error,
            collectedAt: new Date().toISOString(),
          };
          await appendFile(OUT_PATH, JSON.stringify(record) + '\n');
        }

        // Rate limiting
        if (DELAY_MS > 0) {
          await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
        }
      }
    }
  }

  // Compute statistics and generate analysis
  console.log('\n\n📈 ANALYSIS');
  console.log('='.repeat(80));

  const analysis = {
    experimentId: 'gpt4o-debias-variants',
    model: MODEL,
    runsPerCondition: RUNS_PER_CONDITION,
    generatedAt: new Date().toISOString(),
    conditions: {},
    summary: [],
  };

  for (const [debiasId, data] of Object.entries(results)) {
    if (data.low.length === 0 || data.high.length === 0) {
      console.log(`\n${data.name}: Insufficient data`);
      continue;
    }

    const lowStats = computeDescriptiveStats(data.low);
    const highStats = computeDescriptiveStats(data.high);
    const meanDiff = highStats.mean - lowStats.mean;

    let effectSize = null;
    let welchT = null;
    let ci95 = null;

    if (data.low.length >= 2 && data.high.length >= 2) {
      try {
        effectSize = effectSizeTwoSample(data.high, data.low);
      } catch {}
      try {
        welchT = welchTTestTwoSided(data.high, data.low);
      } catch {}
      try {
        ci95 = bootstrapMeanDifferenceCI({ high: data.high, low: data.low });
      } catch {}
    }

    analysis.conditions[debiasId] = {
      name: data.name,
      low: { mean: lowStats.mean, sd: lowStats.sampleStdDev, n: lowStats.n, raw: data.low },
      high: { mean: highStats.mean, sd: highStats.sampleStdDev, n: highStats.n, raw: data.high },
      meanDiff,
      effectSize,
      welchT,
      ci95,
      errors: data.errors,
    };

    analysis.summary.push({
      condition: data.name,
      meanDiff: meanDiff.toFixed(2),
      cohenD: effectSize?.cohensD?.toFixed(2) || 'N/A',
      pValue: welchT?.pTwoSided?.toFixed(4) || 'N/A',
    });

    console.log(`\n${data.name}:`);
    console.log(
      `  Low anchor (3mo):  M=${lowStats.mean.toFixed(2)}, SD=${lowStats.sampleStdDev.toFixed(2)}, n=${lowStats.n}`,
    );
    console.log(
      `  High anchor (9mo): M=${highStats.mean.toFixed(2)}, SD=${highStats.sampleStdDev.toFixed(2)}, n=${highStats.n}`,
    );
    console.log(`  Mean difference:   ${meanDiff.toFixed(2)} months`);
    if (effectSize) console.log(`  Cohen's d:         ${effectSize.cohensD.toFixed(2)}`);
    if (welchT)
      console.log(
        `  Welch's t:         t=${welchT.t.toFixed(2)}, p=${welchT.pTwoSided.toFixed(4)}`,
      );
    if (ci95)
      console.log(`  95% CI:            [${ci95.lower.toFixed(2)}, ${ci95.upper.toFixed(2)}]`);
  }

  // Summary comparison table
  console.log('\n\n📊 COMPARISON TABLE');
  console.log('='.repeat(80));
  console.log("Condition                      | Mean Diff | Cohen's d | p-value");
  console.log('-'.repeat(80));
  for (const row of analysis.summary) {
    console.log(
      `${row.condition.padEnd(30)} | ${row.meanDiff.padStart(9)} | ${row.cohenD.padStart(9)} | ${row.pValue}`,
    );
  }

  // Check if any condition beats the baseline
  const baselineDiff = 4.97; // GPT-4o's observed bias
  console.log('\n\n🎯 KEY FINDING');
  console.log('='.repeat(80));

  const beatBaseline = analysis.summary.filter((s) => parseFloat(s.meanDiff) < baselineDiff);
  if (beatBaseline.length === 0) {
    console.log('❌ NO debiasing instruction reduced GPT-4o bias below 4.97 months.');
    console.log(
      '   This is a publishable finding: GPT-4o anchoring bias is instruction-resistant.',
    );
  } else {
    console.log('✅ Some conditions showed reduced bias:');
    for (const b of beatBaseline) {
      console.log(
        `   - ${b.condition}: ${b.meanDiff} months (reduction of ${(baselineDiff - parseFloat(b.meanDiff)).toFixed(2)})`,
      );
    }
  }

  // Save analysis
  const analysisPath = OUT_PATH.replace('.jsonl', '.analysis.json');
  await writeFile(analysisPath, JSON.stringify(analysis, null, 2));
  console.log(`\n📁 Analysis saved to: ${analysisPath}`);

  return analysis;
}

main().catch(console.error);
