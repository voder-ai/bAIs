#!/usr/bin/env npx tsx

/**
 * Re-run Codex baseline experiments with explicit model ID
 * To replace the Feb 5 experiments that used CLI default
 */

import { runAnchoringProsecutorSentencing } from '../src/run/runAnchoringProsecutorSentencing.js';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';

const MODEL = 'pi-ai/openai-codex/gpt-5.2';
const OUTPUT = 'results/codex-gpt52-anchoring-30.jsonl';
const RUNS_PER_CONDITION = 15; // 15 low + 15 high = 30 total
const DELAY_MS = 1000;

async function main() {
  const spec = parseModelSpec(MODEL);
  const llmProvider = await createProvider(spec);

  console.error(`Running Codex baseline experiment:`);
  console.error(`  Model: ${MODEL}`);
  console.error(`  Runs per condition: ${RUNS_PER_CONDITION}`);
  console.error(`  Output: ${OUTPUT}`);
  console.error(``);

  await runAnchoringProsecutorSentencing({
    runsPerCondition: RUNS_PER_CONDITION,
    llmProvider,
    outPath: OUTPUT,
    artifactsOutput: 'both',
    delayMs: DELAY_MS,
  });

  console.error(`\nDone! Results written to ${OUTPUT}`);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
