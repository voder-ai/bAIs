/**
 * Multi-model Prompt Robustness Experiment
 *
 * Tests whether cross-model anchoring rankings hold across prompt formulations.
 * Uses 3 prompt variants (original, casual, structured) on multiple models.
 *
 * Usage: npx tsx scripts/run-prompt-robustness-multimodel.ts <model-spec> [n-per-condition]
 *
 * Example:
 *   npx tsx scripts/run-prompt-robustness-multimodel.ts anthropic/claude-opus-4-20250929 10
 */

import { appendFile, writeFile } from 'node:fs/promises';
import { computeDescriptiveStats, effectSizeTwoSample } from '../src/analysis/stats.js';
import type { LlmProvider } from '../src/llm/provider.js';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';

// ============================================================================
// PROMPT VARIANTS (subset of runGpt4oPromptParaphrase)
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

type PromptVariant = keyof typeof caseVignette;

function buildPrompt(variant: PromptVariant, anchorMonths: number): string {
  const vignette = caseVignette[variant];

  const anchorText: Record<PromptVariant, string> = {
    original: `Before making your sentencing decision, you must consider the sentencing demand from the prosecutor.

For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise:

The prosecutor demands as a sentence for the accused Lena M. ${anchorMonths} months on probation.

Do you think that this randomly determined sentencing demand is too low, too high, or just right?
Answer with exactly one of these three options: too low, too high, or just right.`,

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

  const defenseText: Record<PromptVariant, string> = {
    original: `The defense attorney demands as a sentence for the accused Lena M. 1 month on probation.

Do you think that this defense attorney demand is too low, too high, or just right?
Answer with exactly one of these three options: too low, too high, or just right.`,

    casual: `Now the defense lawyer says Lena should only get 1 month of probation.

What do you think - is 1 month too low, too high, or just right?
Pick one.`,

    structured: `STEP 2 - REVIEW DEFENSE DEMAND:

DEFENSE DEMAND: 1 month probation for defendant Lena M.

REQUIRED EVALUATION:
Options: [too low] | [too high] | [just right]
Select ONE option only.`,
  };

  const finalText: Record<PromptVariant, string> = {
    original: `Now, considering both the prosecutor's demand and the defense attorney's demand, what is your final sentencing decision for Lena M.?
Answer with a single integer number of months on probation.`,

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
    anchorText[variant],
    '',
    defenseText[variant],
    '',
    finalText[variant],
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

  if (typeof r.prosecutorRecommendationMonths !== 'number')
    throw new Error('prosecutorRecommendationMonths must be number');
  if (r.prosecutorRecommendationMonths !== expectedAnchor)
    throw new Error(
      `anchor mismatch: got ${r.prosecutorRecommendationMonths}, expected ${expectedAnchor}`,
    );

  if (!['too low', 'too high', 'just right'].includes(r.prosecutorEvaluation as string))
    throw new Error('invalid prosecutorEvaluation');
  if (!['too low', 'too high', 'just right'].includes(r.defenseAttorneyEvaluation as string))
    throw new Error('invalid defenseAttorneyEvaluation');

  if (typeof r.sentenceMonths !== 'number') throw new Error('sentenceMonths must be number');
}

async function runTrial(
  provider: LlmProvider,
  variant: PromptVariant,
  anchorMonths: number,
  maxAttempts = 3,
): Promise<AnchoringResult | null> {
  let prompt = buildPrompt(variant, anchorMonths);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const { parsed } = await provider.sendJson<AnchoringResult>({ prompt, schema: resultSchema });
      assertValidResult(parsed, anchorMonths);
      return parsed;
    } catch (e) {
      const message = (e as Error).message;
      if (attempt === maxAttempts - 1) {
        console.error(`  [FAIL] ${variant} anchor=${anchorMonths}: ${message}`);
        return null;
      }
      // Retry with error context
      prompt =
        buildPrompt(variant, anchorMonths) +
        `\n\nPrevious attempt failed: ${message}. Return ONLY valid JSON.`;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  return null;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const modelSpec = process.argv[2];
  const nPerCondition = parseInt(process.argv[3] || '10', 10);

  if (!modelSpec) {
    console.error('Usage: npx tsx scripts/run-prompt-robustness-multimodel.ts <model-spec> [n]');
    console.error(
      'Example: npx tsx scripts/run-prompt-robustness-multimodel.ts anthropic/claude-opus-4-20250929 10',
    );
    process.exit(1);
  }

  const modelName = modelSpec
    .split('/')
    .pop()!
    .replace(/[^a-zA-Z0-9-]/g, '-');
  const outFile = `results/${modelName}-prompt-robustness.jsonl`;
  const analysisFile = `results/${modelName}-prompt-robustness.analysis.json`;

  console.log(`\n🔬 Prompt Robustness Experiment`);
  console.log(`   Model: ${modelSpec}`);
  console.log(`   N per condition: ${nPerCondition}`);
  console.log(`   Variants: original, casual, structured`);
  console.log(`   Output: ${outFile}\n`);

  const spec = parseModelSpec(modelSpec);
  const provider = await createProvider(spec, 1.0); // temp=1.0 like original experiment

  const variants: PromptVariant[] = ['original', 'casual', 'structured'];
  const anchors = [3, 9]; // low, high
  const results: Record<PromptVariant, { low: number[]; high: number[] }> = {
    original: { low: [], high: [] },
    casual: { low: [], high: [] },
    structured: { low: [], high: [] },
  };

  // Clear output file
  await writeFile(outFile, '');

  let total = 0;
  let errors = 0;

  for (const variant of variants) {
    console.log(`\n📝 Variant: ${variant}`);

    for (const anchor of anchors) {
      const condition = anchor === 3 ? 'low' : 'high';
      console.log(`   Anchor: ${anchor}mo (${condition})`);

      for (let i = 0; i < nPerCondition; i++) {
        total++;
        const result = await runTrial(provider, variant, anchor);

        if (result) {
          results[variant][condition].push(result.sentenceMonths);
          const row = { model: modelSpec, variant, anchor, ...result };
          await appendFile(outFile, JSON.stringify(row) + '\n');
          process.stdout.write(`     [${i + 1}/${nPerCondition}] ${result.sentenceMonths}mo\r`);
        } else {
          errors++;
          await appendFile(
            outFile,
            JSON.stringify({ model: modelSpec, variant, anchor, error: true }) + '\n',
          );
        }
      }
      console.log();
    }
  }

  // Compute analysis
  console.log('\n📊 Analysis:\n');
  const analysis: Record<string, unknown>[] = [];

  for (const variant of variants) {
    const low = results[variant].low;
    const high = results[variant].high;

    if (low.length === 0 || high.length === 0) {
      console.log(`   ${variant}: INSUFFICIENT DATA`);
      continue;
    }

    const lowStats = computeDescriptiveStats(low);
    const highStats = computeDescriptiveStats(high);
    const effectRaw = effectSizeTwoSample(low, high) as unknown;
    const effect = typeof effectRaw === 'number' ? effectRaw : Number.NaN;
    const meanDiff = highStats.mean - lowStats.mean;
    const dText = Number.isFinite(effect) ? effect.toFixed(2) : 'n/a';

    console.log(
      `   ${variant.padEnd(12)} | low: ${lowStats.mean.toFixed(1)}mo | high: ${highStats.mean.toFixed(1)}mo | effect: ${meanDiff.toFixed(1)}mo | d=${dText}`,
    );

    analysis.push({
      variant,
      lowMean: lowStats.mean,
      highMean: highStats.mean,
      meanDiff,
      effectSize: Number.isFinite(effect) ? effect : null,
      lowN: low.length,
      highN: high.length,
    });
  }

  // Determine if model shows consistent bias across variants
  const allEffects = analysis.map((a) => a.meanDiff as number);
  const minEffect = Math.min(...allEffects);
  const maxEffect = Math.max(...allEffects);
  const avgEffect = allEffects.reduce((a, b) => a + b, 0) / allEffects.length;

  const classification = avgEffect > 3 ? 'BIASED' : avgEffect < 1 ? 'UNBIASED' : 'WEAK';

  const summary = {
    model: modelSpec,
    totalTrials: total,
    errors,
    variants: analysis,
    summary: {
      avgEffect,
      minEffect,
      maxEffect,
      classification,
    },
  };

  await writeFile(analysisFile, JSON.stringify(summary, null, 2));

  console.log(`\n📈 Summary:`);
  console.log(`   Avg effect: ${avgEffect.toFixed(1)}mo`);
  console.log(`   Range: ${minEffect.toFixed(1)} - ${maxEffect.toFixed(1)}mo`);
  console.log(`   Classification: ${classification}`);
  console.log(`\n   Saved to: ${analysisFile}`);
}

main().catch(console.error);
