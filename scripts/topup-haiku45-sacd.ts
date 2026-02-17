// @ts-nocheck
/**
 * Topup: Final 5 high-anchor SACD trials for Haiku 4.5
 */
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { runAnchoringSACD } from '../src/run/runAnchoringSACD.js';

const MODEL = 'anthropic/claude-3-5-haiku-20241022';
const RUNS_PER_CONDITION = 5; // Just topup the missing high-anchor trials
const OUT_PATH = 'results/haiku45-full-sacd.jsonl';

async function main() {
  console.log(`Topup: ${RUNS_PER_CONDITION} high-anchor SACD trials on ${MODEL}`);
  console.log(`Output: ${OUT_PATH} (append)`);
  console.log('---');

  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec, 0); // temp=0

  // Run only high-anchor condition
  await runAnchoringSACD({
    runsPerCondition: RUNS_PER_CONDITION,
    llmProvider: provider,
    outPath: OUT_PATH,
    conditions: [{ id: 'high-anchor-9mo', params: { prosecutorRecommendationMonths: 9 } }],
  });

  console.log('---');
  console.log('Topup complete!');
}

main().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
