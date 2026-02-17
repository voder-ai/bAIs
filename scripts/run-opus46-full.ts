#!/usr/bin/env npx tsx

/**
 * Opus 4.6 Full Experiment Suite via pi-ai/anthropic
 * - Baseline (60 trials)
 * - Full SACD (60 trials)
 * - Controls (60 trials)
 * - Debiasing suite (150 trials)
 */

import { runAnchoringProsecutorSentencing } from '../src/run/runAnchoringProsecutorSentencing.js';
import { runAnchoringSACD } from '../src/run/runAnchoringSACD.js';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';

const MODEL = 'anthropic/claude-opus-4-6'; // Opus 4.6
const RUNS_PER_CONDITION = 30;

async function main() {
  const args = process.argv.slice(2);
  const runBaseline = args.includes('--baseline') || args.includes('--all');
  const runSACD = args.includes('--sacd') || args.includes('--all');

  if (!runBaseline && !runSACD) {
    console.log('Usage: npx tsx run-opus46-full.ts [--baseline] [--sacd] [--all]');
    process.exit(1);
  }

  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Opus 4.6 Experiments (${MODEL})`);
  console.log(`${'='.repeat(60)}\n`);

  if (runBaseline) {
    console.log('🔬 Running BASELINE (60 trials)...');
    await runAnchoringProsecutorSentencing({
      runsPerCondition: RUNS_PER_CONDITION,
      llmProvider: provider,
      outPath: 'results/opus46-baseline.jsonl',
    });
    console.log('✅ Baseline complete!\n');
  }

  if (runSACD) {
    console.log('🧠 Running Full SACD (60 trials)...');
    await runAnchoringSACD({
      runsPerCondition: RUNS_PER_CONDITION,
      llmProvider: provider,
      outPath: 'results/opus46-sacd.jsonl',
    });
    console.log('✅ SACD complete!\n');
  }

  console.log('🎉 Done!');
}

main().catch(console.error);
