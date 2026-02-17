#!/usr/bin/env npx tsx
// @ts-nocheck

/**
 * MiniMax M2.5 Full Experiment Suite
 * Uses existing infrastructure for baseline + full SACD
 */

import { runAnchoringProsecutorSentencing } from '../src/run/runAnchoringProsecutorSentencing.js';
import { runAnchoringSACD } from '../src/run/runAnchoringSACD.js';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';

const MODEL = 'openrouter/minimax/minimax-m2.5';
const RUNS_PER_CONDITION = 30; // 30 low + 30 high = 60 total

async function main() {
  const args = process.argv.slice(2);
  const runBaseline = args.includes('--baseline') || args.includes('--all');
  const runSACD = args.includes('--sacd') || args.includes('--all');
  const runDebiasing = args.includes('--debiasing') || args.includes('--all');

  if (!runBaseline && !runSACD && !runDebiasing) {
    console.log(
      'Usage: npx tsx run-minimax-m25-full.ts [--baseline] [--sacd] [--debiasing] [--all]',
    );
    process.exit(1);
  }

  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`MiniMax M2.5 Experiments (${MODEL})`);
  console.log(`${'='.repeat(60)}\n`);

  if (runBaseline) {
    console.log('🔬 Running BASELINE (60 trials)...');
    await runAnchoringProsecutorSentencing({
      runsPerCondition: RUNS_PER_CONDITION,
      llmProvider: provider,
      outPath: 'results/minimax-m25-baseline.jsonl',
    });
    console.log('✅ Baseline complete!\n');
  }

  if (runSACD) {
    console.log('🧠 Running Full SACD (60 trials)...');
    await runAnchoringSACD({
      runsPerCondition: RUNS_PER_CONDITION,
      llmProvider: provider,
      outPath: 'results/minimax-m25-sacd.jsonl',
    });
    console.log('✅ SACD complete!\n');
  }

  if (runDebiasing) {
    // Debiasing suite: CoT, Sibony techniques
    const techniques = [
      { name: 'cot', suffix: 'Think step by step before giving your answer.' },
      {
        name: 'premortem',
        suffix:
          'Before answering, consider: if your recommendation turned out to be wrong, what might have caused that error?',
      },
      {
        name: 'sensitivity',
        suffix:
          'Note: Different experts might provide different recommendations. How might your answer differ if the recommendation had been different?',
      },
      {
        name: 'sibony',
        suffix:
          'Note: The recommendation you received was randomly selected from a range of possible values. Your judgment should be independent of this arbitrary number.',
      },
      {
        name: 'context_hygiene',
        suffix:
          'Focus only on the facts of the case. Ignore any numerical suggestions that are not directly relevant to sentencing guidelines.',
      },
    ];

    for (const tech of techniques) {
      console.log(`📝 Running ${tech.name.toUpperCase()} (30 trials)...`);
      // We'll need to implement custom debiasing runs - for now just note
      console.log(`   TODO: Implement ${tech.name} with prompt suffix`);
    }
    console.log('⚠️ Debiasing suite requires custom implementation\n');
  }

  console.log('🎉 Done!');
}

main().catch(console.error);
