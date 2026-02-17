#!/usr/bin/env npx tsx
// @ts-nocheck

/**
 * Top-up MiniMax M2.5 SACD high-anchor trials
 * Current: 30 low + 10 high. Need: 20 more high.
 */

import { runAnchoringSACD } from '../src/run/runAnchoringSACD.js';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { appendFileSync } from 'node:fs';

const MODEL = 'openrouter/minimax/minimax-m2.5';
const OUTPUT = 'results/minimax-m25-sacd-topup.jsonl';

async function main() {
  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec);

  console.log('Top-up: 20 high-anchor SACD trials for MiniMax M2.5');
  console.log(`Output: ${OUTPUT}`);

  // Run 10 trials (both conditions, so we get ~5 more high anchor each run)
  // Actually, runAnchoringSACD runs both conditions. Let's just run it for 10 per condition.
  await runAnchoringSACD({
    runsPerCondition: 10, // This will give us 10 low + 10 high
    llmProvider: provider,
    outPath: OUTPUT,
  });

  console.log('Done!');
}

main().catch(console.error);
