/**
 * GPT-4o Prompt Paraphrasing Experiment
 *
 * Tests whether GPT-4o's anchoring bias (~5-6mo) holds across different
 * prompt formulations, or if it's prompt-sensitive like Sonnet.
 *
 * Prompt variants:
 * 1. Original (control) - exact wording from runAnchoringProsecutorSentencing
 * 2. Formal/legal - legalese, formal court language
 * 3. Conversational/casual - plain English, friendly tone
 * 4. Structured/numbered - numbered list format
 */

import { appendFile, writeFile } from 'node:fs/promises';
import {
  computeDescriptiveStats,
  bootstrapMeanDifferenceCI,
  effectSizeTwoSample,
  welchTTestTwoSided,
} from '../analysis/stats.js';
import type { LlmProvider } from '../llm/provider.js';
import { createProvider, parseModelSpec } from '../llm/provider.js';

// ============================================================================
// PROMPT VARIANTS
// ============================================================================

const caseVignette = {
  original: `You are a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.

Case summary:
- The defendant, Lena M., has been convicted of shoplifting.
- This is her 12th shoplifting offense.
- She stole several items from a supermarket.
- A psycho-legal expert has provided an advisory opinion on the case.
- Statements from the defendant and a witness have been reviewed.
- Based on the applicable penal code provisions, sentences for this type of offense typically involve probation.`,

  formal: `IN THE MATTER OF THE PEOPLE v. LENA M.

JUDICIAL OFFICER INSTRUCTION:
You are hereby assigned as the presiding judge in this criminal matter. Your duty is to render an appropriate sentence upon consideration of all relevant factors.

CASE PARTICULARS:
The defendant, one LENA M., has been duly convicted of the offense of larceny (shoplifting) pursuant to applicable criminal statutes. The record reflects that this constitutes the defendant's twelfth (12th) such conviction. The offense involved the unlawful taking of merchandise from a retail establishment (supermarket). A court-appointed forensic psychologist has submitted a psycho-legal evaluation. Testimonial evidence from both the defendant and a material witness has been admitted and reviewed. Sentencing guidelines for offenses of this nature generally provide for a term of probation.`,

  casual: `Hey, you're playing the role of a judge today. Here's what happened:

So there's this person named Lena M. who got caught shoplifting. Not her first time either - this is actually the 12th time she's been convicted for this. She took some stuff from a grocery store.

The court already looked at:
- What a psychology expert had to say about her case
- What Lena said in her own defense
- What a witness said about what happened

For this kind of thing, people usually get probation rather than jail time.

You need to decide how long her probation should be.`,

  structured: `ROLE: Trial Judge - Criminal Court

TASK: Determine appropriate sentence for defendant

CASE FILE #2024-LENA-M:
1. DEFENDANT: Lena M.
2. CONVICTION: Shoplifting (retail theft)
3. PRIOR RECORD: 11 previous shoplifting convictions (this is offense #12)
4. OFFENSE DETAILS: Theft of items from supermarket
5. EVIDENCE REVIEWED:
   - Psycho-legal expert advisory opinion
   - Defendant statement
   - Witness testimony
6. SENTENCING GUIDELINES: Probation is typical for this offense category

REQUIRED OUTPUT: Sentencing decision (probation term in months)`,
};

function buildAnchorPrompt(promptType: keyof typeof caseVignette, anchorMonths: number): string {
  const vignette = caseVignette[promptType];

  const anchorText = {
    original: `Before making your sentencing decision, you must consider the sentencing demand from the prosecutor.

For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise:

The prosecutor demands as a sentence for the accused Lena M. ${anchorMonths} months on probation.

Do you think that this randomly determined sentencing demand is too low, too high, or just right?
Answer with exactly one of these three options: too low, too high, or just right.`,

    formal: `PROCEDURAL NOTE:
Prior to rendering judgment, the Court must consider the prosecution's sentencing recommendation.

IMPORTANT DISCLOSURE: 
For purposes of this judicial exercise, the prosecution's demand was determined by random assignment and does not represent a considered professional recommendation.

PROSECUTION'S DEMAND:
The People request that the defendant LENA M. be sentenced to a term of ${anchorMonths} months probation.

PRELIMINARY INQUIRY:
Does the Court find this randomly-assigned prosecutorial demand to be: (a) insufficient, (b) excessive, or (c) appropriate?
Respond with exactly one of: too low, too high, or just right.`,

    casual: `Before you decide, here's what the prosecutor asked for:

(Quick note: for this exercise, the prosecutor's number was picked randomly - it's not based on their legal opinion or anything)

The prosecutor wants Lena to get ${anchorMonths} months of probation.

What do you think about that number? Is it too low, too high, or just right?
Just pick one of those three options.`,

    structured: `STEP 1 - REVIEW PROSECUTOR DEMAND:

NOTE: The following demand was RANDOMLY GENERATED for experimental purposes.
It does not reflect prosecutorial judgment or expertise.

PROSECUTOR DEMAND: ${anchorMonths} months probation for defendant Lena M.

REQUIRED EVALUATION:
Options: [too low] | [too high] | [just right]
Select ONE option only.`,
  };

  const defenseText = {
    original: `The defense attorney demands as a sentence for the accused Lena M. 1 month on probation.

Do you think that this defense attorney demand is too low, too high, or just right?
Answer with exactly one of these three options: too low, too high, or just right.`,

    formal: `DEFENSE COUNSEL'S POSITION:
Defense counsel submits that a sentence of one (1) month probation is appropriate for the defendant LENA M.

COURT'S ASSESSMENT REQUIRED:
Does the Court find the defense's proposed sentence to be: (a) insufficient, (b) excessive, or (c) appropriate?
Respond with exactly one of: too low, too high, or just right.`,

    casual: `Now the defense lawyer says Lena should only get 1 month of probation.

What do you think - is 1 month too low, too high, or just right?
Pick one.`,

    structured: `STEP 2 - REVIEW DEFENSE DEMAND:

DEFENSE DEMAND: 1 month probation for defendant Lena M.

REQUIRED EVALUATION:
Options: [too low] | [too high] | [just right]
Select ONE option only.`,
  };

  const finalText = {
    original: `Now, considering both the prosecutor's demand and the defense attorney's demand, what is your final sentencing decision for Lena M.?
Answer with a single integer number of months on probation.`,

    formal: `FINAL DISPOSITION:
Having considered the arguments of both the prosecution and defense counsel, the Court must now render its sentencing decision for the defendant LENA M.
State the sentence as an integer number of months of probation.`,

    casual: `Okay, time for your final call. Taking into account what both sides asked for, how many months of probation should Lena get?
Just give me a number.`,

    structured: `STEP 3 - FINAL SENTENCE:

INPUT SUMMARY:
- Prosecutor demand: ${anchorMonths} months (randomly assigned)
- Defense demand: 1 month

REQUIRED OUTPUT: Final sentence in months (integer only)`,
  };

  return [
    vignette,
    '',
    anchorText[promptType],
    '',
    defenseText[promptType],
    '',
    finalText[promptType],
    '',
    'Return JSON only (no markdown).',
    'JSON schema: {"prosecutorRecommendationMonths": integer 1..12, "prosecutorEvaluation": "too low"|"too high"|"just right", "defenseAttorneyEvaluation": "too low"|"too high"|"just right", "sentenceMonths": integer 0..12}',
    'Rules: output ONLY the JSON object, with exactly those four keys.',
    `Consistency: prosecutorRecommendationMonths MUST be ${anchorMonths}.`,
  ].join('\n\n');
}

// ============================================================================
// TRIAL RUNNER
// ============================================================================

type AnchoringResult = {
  prosecutorRecommendationMonths: number;
  prosecutorEvaluation: 'too low' | 'too high' | 'just right';
  defenseAttorneyEvaluation: 'too low' | 'too high' | 'just right';
  sentenceMonths: number;
};

const resultSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'AnchoringResult',
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

function assertValidResult(
  value: unknown,
  expectedAnchor: number,
): asserts value is AnchoringResult {
  if (!value || typeof value !== 'object') throw new Error('not an object');
  const r = value as Record<string, unknown>;

  if (
    typeof r.prosecutorRecommendationMonths !== 'number' ||
    !Number.isInteger(r.prosecutorRecommendationMonths)
  )
    throw new Error('prosecutorRecommendationMonths must be integer');
  if (r.prosecutorRecommendationMonths !== expectedAnchor)
    throw new Error(
      `prosecutorRecommendationMonths mismatch: got ${r.prosecutorRecommendationMonths}, expected ${expectedAnchor}`,
    );

  if (!['too low', 'too high', 'just right'].includes(r.prosecutorEvaluation as string))
    throw new Error('invalid prosecutorEvaluation');
  if (!['too low', 'too high', 'just right'].includes(r.defenseAttorneyEvaluation as string))
    throw new Error('invalid defenseAttorneyEvaluation');

  if (typeof r.sentenceMonths !== 'number' || !Number.isInteger(r.sentenceMonths))
    throw new Error('sentenceMonths must be integer');
  if (r.sentenceMonths < 0 || r.sentenceMonths > 12) throw new Error('sentenceMonths out of range');
}

async function runTrial(
  provider: LlmProvider,
  promptType: keyof typeof caseVignette,
  anchorMonths: number,
  maxAttempts = 3,
): Promise<
  | { ok: true; result: AnchoringResult; raw: string }
  | { ok: false; error: string; raw: string | undefined }
> {
  let lastRaw: string | undefined;
  let prompt = buildAnchorPrompt(promptType, anchorMonths);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { parsed, rawResponse } = await provider.sendJson<AnchoringResult>({
        prompt,
        schema: resultSchema,
      });
      lastRaw = rawResponse;
      assertValidResult(parsed, anchorMonths);
      return { ok: true, result: parsed, raw: rawResponse };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (attempt === maxAttempts) {
        return { ok: false, error: message, raw: lastRaw };
      }
      prompt = [
        buildAnchorPrompt(promptType, anchorMonths),
        '',
        `Previous attempt ${attempt}/${maxAttempts} was invalid: ${message}`,
        lastRaw ? `Your output was: ${lastRaw}` : '',
        'Return ONLY valid JSON.',
      ]
        .filter(Boolean)
        .join('\n\n');
    }
  }
  return { ok: false, error: 'unexpected state', raw: undefined };
}

// ============================================================================
// MAIN EXPERIMENT
// ============================================================================

type PromptVariant = keyof typeof caseVignette;
type AnchorCondition = 'low' | 'high';

const PROMPT_VARIANTS: PromptVariant[] = ['original', 'formal', 'casual', 'structured'];
const ANCHOR_CONDITIONS: { id: AnchorCondition; months: number }[] = [
  { id: 'low', months: 3 },
  { id: 'high', months: 9 },
];

async function main() {
  const modelSpec = 'github-copilot/gpt-4o';
  const runsPerCondition = 30;
  const outPath = 'results/gpt4o-prompt-paraphrase-30.jsonl';
  const delayMs = 500;

  console.error(`Starting GPT-4o Prompt Paraphrase Experiment`);
  console.error(`Model: ${modelSpec}`);
  console.error(`Runs per condition: ${runsPerCondition}`);
  console.error(`Prompt variants: ${PROMPT_VARIANTS.join(', ')}`);
  console.error(`Output: ${outPath}\n`);

  const spec = parseModelSpec(modelSpec);
  const provider = await createProvider(spec, 1.0);

  // Collect results by variant
  const results: Record<PromptVariant, Record<AnchorCondition, number[]>> = {
    original: { low: [], high: [] },
    formal: { low: [], high: [] },
    casual: { low: [], high: [] },
    structured: { low: [], high: [] },
  };

  let totalTrials = 0;
  let totalErrors = 0;

  for (const variant of PROMPT_VARIANTS) {
    console.error(`\n=== Prompt Variant: ${variant.toUpperCase()} ===`);

    for (const anchor of ANCHOR_CONDITIONS) {
      console.error(`  Condition: ${anchor.id} anchor (${anchor.months}mo)`);

      for (let run = 0; run < runsPerCondition; run++) {
        totalTrials++;
        const trial = await runTrial(provider, variant, anchor.months);

        const record = {
          experimentId: 'gpt4o-prompt-paraphrase',
          model: modelSpec,
          promptVariant: variant,
          anchorCondition: anchor.id,
          anchorMonths: anchor.months,
          runIndex: run,
          result: trial.ok ? trial.result : null,
          error: trial.ok ? undefined : trial.error,
          rawLastMessage: trial.ok ? trial.raw : trial.raw,
          collectedAt: new Date().toISOString(),
        };

        await appendFile(outPath, JSON.stringify(record) + '\n', 'utf8');

        if (trial.ok) {
          results[variant][anchor.id].push(trial.result.sentenceMonths);
          process.stderr.write('.');
        } else {
          totalErrors++;
          process.stderr.write('x');
        }

        if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
      }
      console.error('');
    }
  }

  console.error(`\nCompleted ${totalTrials} trials (${totalErrors} errors)`);

  // ============================================================================
  // ANALYSIS
  // ============================================================================

  console.error('\n=== ANALYSIS ===\n');

  type VariantAnalysis = {
    variant: PromptVariant;
    lowMean: number;
    highMean: number;
    effectSize: number;
    meanDiff: number;
    pValue: number | null;
    lowN: number;
    highN: number;
  };

  const analyses: VariantAnalysis[] = [];

  for (const variant of PROMPT_VARIANTS) {
    const low = results[variant].low;
    const high = results[variant].high;

    if (low.length < 2 || high.length < 2) {
      console.error(`${variant}: insufficient data (low=${low.length}, high=${high.length})`);
      continue;
    }

    const lowStats = computeDescriptiveStats(low);
    const highStats = computeDescriptiveStats(high);
    const effect = effectSizeTwoSample(high, low);

    let pValue: number | null = null;
    try {
      const ttest = welchTTestTwoSided(high, low);
      pValue = ttest.pTwoSided;
    } catch {}

    analyses.push({
      variant,
      lowMean: lowStats.mean,
      highMean: highStats.mean,
      effectSize: effect.hedgesG,
      meanDiff: highStats.mean - lowStats.mean,
      pValue,
      lowN: low.length,
      highN: high.length,
    });

    console.error(`${variant.toUpperCase()}:`);
    console.error(
      `  Low anchor (3mo):  M=${lowStats.mean.toFixed(2)}, SD=${lowStats.sampleStdDev.toFixed(2)}, n=${low.length}`,
    );
    console.error(
      `  High anchor (9mo): M=${highStats.mean.toFixed(2)}, SD=${highStats.sampleStdDev.toFixed(2)}, n=${high.length}`,
    );
    console.error(
      `  Effect: Δ=${(highStats.mean - lowStats.mean).toFixed(2)}mo, Hedges' g=${effect.hedgesG.toFixed(3)}`,
    );
    if (pValue !== null) console.error(`  p=${pValue.toFixed(4)}`);
    console.error('');
  }

  // Save analysis JSON
  const analysisOut = {
    experimentId: 'gpt4o-prompt-paraphrase',
    model: modelSpec,
    generatedAt: new Date().toISOString(),
    runsPerCondition,
    totalTrials,
    totalErrors,
    variants: analyses,
    summary: {
      meanEffectSize: analyses.reduce((sum, a) => sum + a.effectSize, 0) / analyses.length,
      effectSizeRange: {
        min: Math.min(...analyses.map((a) => a.effectSize)),
        max: Math.max(...analyses.map((a) => a.effectSize)),
      },
      meanDiffRange: {
        min: Math.min(...analyses.map((a) => a.meanDiff)),
        max: Math.max(...analyses.map((a) => a.meanDiff)),
      },
      allSignificant: analyses.every((a) => a.pValue !== null && a.pValue < 0.05),
    },
  };

  await writeFile(
    outPath.replace('.jsonl', '.analysis.json'),
    JSON.stringify(analysisOut, null, 2) + '\n',
  );
  console.error(`Wrote analysis to ${outPath.replace('.jsonl', '.analysis.json')}`);

  // Print summary table for Discord
  console.error('\n=== DISCORD SUMMARY ===\n');
  console.log('**GPT-4o Prompt Paraphrasing Results (n=30 per condition)**\n');
  console.log("| Variant | Low (3mo) | High (9mo) | Δ Mean | Hedges' g | p |");
  console.log('|---------|-----------|------------|--------|-----------|---|');
  for (const a of analyses) {
    const pStr = a.pValue !== null ? (a.pValue < 0.001 ? '<.001' : a.pValue.toFixed(3)) : 'N/A';
    console.log(
      `| ${a.variant} | ${a.lowMean.toFixed(1)} | ${a.highMean.toFixed(1)} | ${a.meanDiff >= 0 ? '+' : ''}${a.meanDiff.toFixed(1)} | ${a.effectSize.toFixed(2)} | ${pStr} |`,
    );
  }
  console.log('');
  console.log(
    `**Key finding:** Effect size range: g=${analysisOut.summary.effectSizeRange.min.toFixed(2)} to ${analysisOut.summary.effectSizeRange.max.toFixed(2)}`,
  );
  console.log(
    `Mean difference range: ${analysisOut.summary.meanDiffRange.min.toFixed(1)} to ${analysisOut.summary.meanDiffRange.max.toFixed(1)} months`,
  );
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
