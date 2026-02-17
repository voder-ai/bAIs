/**
 * Full Iterative SACD on Haiku 4.5
 * Uses the complete SACD protocol (up to 3 iterations)
 */
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { runAnchoringSACD } from '../src/run/runAnchoringSACD.js';

const MODEL = 'anthropic/claude-3-5-haiku-20241022';
const RUNS_PER_CONDITION = 30;
const OUT_PATH = 'results/haiku45-full-sacd.jsonl';

async function main() {
  console.log(`Starting Full Iterative SACD on ${MODEL}`);
  console.log(`Runs per condition: ${RUNS_PER_CONDITION}`);
  console.log(`Output: ${OUT_PATH}`);
  console.log('---');

  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec, 0); // temp=0

  await runAnchoringSACD({
    runsPerCondition: RUNS_PER_CONDITION,
    llmProvider: provider,
    outPath: OUT_PATH,
  });

  console.log('---');
  console.log('Full SACD complete!');
}

main().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
