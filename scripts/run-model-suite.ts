#!/usr/bin/env npx tsx
// @ts-nocheck

/**
 * Generic Model Suite Runner
 * Runs baseline, controls, SACD, and/or debiasing for any model
 *
 * Usage:
 *   npx tsx scripts/run-model-suite.ts --model anthropic/claude-opus-4-6 --baseline
 *   npx tsx scripts/run-model-suite.ts --model openrouter/minimax/minimax-m2.5 --controls
 *   npx tsx scripts/run-model-suite.ts --model anthropic/claude-opus-4-6 --sacd
 *   npx tsx scripts/run-model-suite.ts --model anthropic/claude-opus-4-6 --debiasing
 *   npx tsx scripts/run-model-suite.ts --model anthropic/claude-opus-4-6 --all
 */

import { appendFileSync, existsSync } from 'node:fs';
import { runAnchoringProsecutorSentencing } from '../src/run/runAnchoringProsecutorSentencing.js';
import { runAnchoringSACD } from '../src/run/runAnchoringSACD.js';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { anchoringProsecutorSentencingExperiment } from '../src/experiments/anchoringProsecutorSentencing.js';
import { renderPrompt } from '../src/experiments/renderPrompt.js';

const RUNS_PER_CONDITION = 30;
const DEBIAS_RUNS = 15; // per technique per condition

const resultSchema = {
  prosecutorRecommendationMonths: 'integer 1..12',
  prosecutorEvaluation: '"too low"|"too high"|"just right"',
  defenseAttorneyEvaluation: '"too low"|"too high"|"just right"',
  sentenceMonths: 'integer 0..12',
};

function getModelSlug(model: string): string {
  // Convert model ID to filename-safe slug
  return model
    .replace(/^(anthropic|openrouter|openai-codex|github-copilot)\//g, '')
    .replace(/\//g, '-')
    .replace(/[^a-z0-9-]/gi, '-')
    .toLowerCase();
}

function buildBasePrompt(anchor: number): string {
  const conditionVars = { prosecutorRecommendationMonths: anchor };
  const experimentDef = anchoringProsecutorSentencingExperiment;

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

  return parts.join('\n');
}

const debiasingSuffixes: Record<string, string> = {
  'consider-opposite':
    '\n\nBefore making your decision, consider: What if the opposite conclusion were correct? What evidence would support a different sentence?',
  'random-disclosure':
    "\n\nNote: The prosecutor's recommendation was randomly selected from a range of possible values. Your judgment should be independent of this arbitrary number.",
  'bias-warning':
    '\n\nWarning: Research shows that people are susceptible to anchoring bias—being unduly influenced by initial numbers they encounter. Please ensure your judgment is based solely on the facts of the case.',
  precommitment:
    "\n\nBefore considering the prosecutor's recommendation, what factors should determine an appropriate sentence for this type of case? List the relevant considerations, then provide your sentence.",
  'scale-recalibration':
    '\n\nFor reference, sentences for similar first-time shoplifting offenses typically range from probation only (0 months) to 12 months. Please calibrate your response within this context.',
  cot: '\n\nPlease think through this step by step:\n1. What are the relevant factors in this case?\n2. What sentence range is typical for such cases?\n3. How should each factor affect the final sentence?\n4. What is your final sentence recommendation?',
};

async function runDebiasing(model: string, slug: string, provider: any): Promise<void> {
  const anchors = [3, 9];

  for (const [techniqueName, suffix] of Object.entries(debiasingSuffixes)) {
    const outPath = `results/${slug}-debias-${techniqueName}.jsonl`;
    console.log(`  Running ${techniqueName}...`);

    for (const anchor of anchors) {
      const conditionId = anchor === 3 ? 'low-anchor-3mo' : 'high-anchor-9mo';
      const basePrompt = buildBasePrompt(anchor);
      const prompt = basePrompt + suffix;

      for (let i = 0; i < DEBIAS_RUNS; i++) {
        try {
          const result = await provider.generateObject({
            messages: [{ role: 'user', content: prompt }],
            schema: resultSchema,
            maxRetries: 3,
          });

          const row = {
            conditionId,
            prosecutorRecommendationMonths: anchor,
            technique: techniqueName,
            ...result,
            timestamp: new Date().toISOString(),
          };

          appendFileSync(outPath, JSON.stringify(row) + '\n');
          process.stdout.write(
            `    [${conditionId}] ${i + 1}/${DEBIAS_RUNS}: ${result.sentenceMonths}mo\r`,
          );
        } catch (err: any) {
          console.error(`    Error: ${err.message}`);
        }
      }
      console.log();
    }
    console.log(`  ✅ ${techniqueName} complete`);
  }
}

async function runControls(model: string, slug: string, provider: any): Promise<void> {
  const anchors = [3, 9];

  // Token-matched control
  const tokenOutPath = `results/${slug}-control-token.jsonl`;
  console.log('  Running token-matched control...');

  const tokenPadding =
    'The following contextual information is provided for reference. Weather: partly cloudy. Day of week: Tuesday.';

  for (const anchor of anchors) {
    const conditionId = anchor === 3 ? 'low-anchor-3mo' : 'high-anchor-9mo';
    const basePrompt = buildBasePrompt(anchor);
    const prompt = tokenPadding + '\n\n' + basePrompt;

    for (let i = 0; i < RUNS_PER_CONDITION; i++) {
      try {
        const result = await provider.generateObject({
          messages: [{ role: 'user', content: prompt }],
          schema: resultSchema,
          maxRetries: 3,
        });

        const row = {
          conditionId,
          prosecutorRecommendationMonths: anchor,
          control: 'token-matched',
          ...result,
          timestamp: new Date().toISOString(),
        };

        appendFileSync(tokenOutPath, JSON.stringify(row) + '\n');
        process.stdout.write(
          `    [${conditionId}] ${i + 1}/${RUNS_PER_CONDITION}: ${result.sentenceMonths}mo\r`,
        );
      } catch (err: any) {
        console.error(`    Error: ${err.message}`);
      }
    }
    console.log();
  }
  console.log('  ✅ Token-matched control complete');

  // 3-turn random control
  const turnOutPath = `results/${slug}-control-3turn.jsonl`;
  console.log('  Running 3-turn random control...');

  for (const anchor of anchors) {
    const conditionId = anchor === 3 ? 'low-anchor-3mo' : 'high-anchor-9mo';
    const basePrompt = buildBasePrompt(anchor);

    const randomTopics = [
      "What's a good recipe for chocolate chip cookies?",
      'Explain the water cycle in simple terms.',
      'What are some tips for better sleep?',
    ];

    for (let i = 0; i < RUNS_PER_CONDITION; i++) {
      try {
        const topic = randomTopics[i % randomTopics.length];

        const messages = [
          { role: 'user' as const, content: topic },
          {
            role: 'assistant' as const,
            content:
              'I can help with that. [Brief response about ' +
              topic.split(' ').slice(0, 3).join(' ') +
              '...]',
          },
          {
            role: 'user' as const,
            content: 'Thanks! Now I have a different question:\n\n' + basePrompt,
          },
        ];

        const result = await provider.generateObject({
          messages,
          schema: resultSchema,
          maxRetries: 3,
        });

        const row = {
          conditionId,
          prosecutorRecommendationMonths: anchor,
          control: '3-turn-random',
          ...result,
          timestamp: new Date().toISOString(),
        };

        appendFileSync(turnOutPath, JSON.stringify(row) + '\n');
        process.stdout.write(
          `    [${conditionId}] ${i + 1}/${RUNS_PER_CONDITION}: ${result.sentenceMonths}mo\r`,
        );
      } catch (err: any) {
        console.error(`    Error: ${err.message}`);
      }
    }
    console.log();
  }
  console.log('  ✅ 3-turn random control complete');
}

async function main() {
  const args = process.argv.slice(2);

  const modelIdx = args.indexOf('--model');
  if (modelIdx === -1 || !args[modelIdx + 1]) {
    console.log(
      'Usage: npx tsx scripts/run-model-suite.ts --model <model-id> [--baseline] [--controls] [--sacd] [--debiasing] [--all]',
    );
    console.log('\nExamples:');
    console.log(
      '  npx tsx scripts/run-model-suite.ts --model anthropic/claude-opus-4-6 --controls',
    );
    console.log(
      '  npx tsx scripts/run-model-suite.ts --model openrouter/minimax/minimax-m2.5 --debiasing',
    );
    process.exit(1);
  }

  const model = args[modelIdx + 1];
  const slug = getModelSlug(model);

  const runAll = args.includes('--all');
  const runBaseline = runAll || args.includes('--baseline');
  const runControlsFlag = runAll || args.includes('--controls');
  const runSACDFlag = runAll || args.includes('--sacd');
  const runDebiasFlag = runAll || args.includes('--debiasing');

  if (!runBaseline && !runControlsFlag && !runSACDFlag && !runDebiasFlag) {
    console.log(
      'Specify at least one experiment type: --baseline, --controls, --sacd, --debiasing, or --all',
    );
    process.exit(1);
  }

  const spec = parseModelSpec(model);
  const provider = await createProvider(spec);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Model Suite: ${model}`);
  console.log(`Output prefix: ${slug}-*`);
  console.log(`${'='.repeat(60)}\n`);

  if (runBaseline) {
    console.log('🔬 Running BASELINE (60 trials)...');
    await runAnchoringProsecutorSentencing({
      runsPerCondition: RUNS_PER_CONDITION,
      llmProvider: provider,
      outPath: `results/${slug}-baseline.jsonl`,
    });
    console.log('✅ Baseline complete!\n');
  }

  if (runControlsFlag) {
    console.log('🎛️ Running CONTROLS (60 trials)...');
    await runControls(model, slug, provider);
    console.log('✅ Controls complete!\n');
  }

  if (runSACDFlag) {
    console.log('🧠 Running SACD (60 trials)...');
    await runAnchoringSACD({
      runsPerCondition: RUNS_PER_CONDITION,
      llmProvider: provider,
      outPath: `results/${slug}-sacd.jsonl`,
    });
    console.log('✅ SACD complete!\n');
  }

  if (runDebiasFlag) {
    console.log('🎯 Running DEBIASING SUITE (180 trials)...');
    await runDebiasing(model, slug, provider);
    console.log('✅ Debiasing complete!\n');
  }

  console.log('🎉 All requested experiments complete!');
}

main().catch(console.error);
