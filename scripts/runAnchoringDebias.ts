#!/usr/bin/env -S npx tsx
// @ts-nocheck

import { runAnchoringProsecutorSentencing } from '../src/run/runAnchoringProsecutorSentencing.js';
import { anchoringProsecutorSentencingDebiasExperiment } from '../src/experiments/anchoringProsecutorSentencingDebias.js';
import { createProvider } from '../src/llm/provider.js';

async function main() {
  const modelArg = process.argv.find((arg) => arg.startsWith('--model='));
  const runsArg = process.argv.find((arg) => arg.startsWith('--runs='));
  const outputArg = process.argv.find((arg) => arg.startsWith('--output='));

  if (!modelArg || !runsArg || !outputArg) {
    console.error(
      'Usage: npx tsx scripts/runAnchoringDebias.ts --model=<model-id> --runs=<n> --output=<path>',
    );
    console.error(
      'Example: npx tsx scripts/runAnchoringDebias.ts --model=gpt-5.2 --runs=30 --output=results/gpt52-anchoring-debias-30.jsonl',
    );
    process.exit(1);
  }

  const modelId = modelArg.split('=')[1] ?? '';
  const runs = parseInt(runsArg.split('=')[1] ?? '0', 10);
  const output = outputArg.split('=')[1] ?? '';

  // Use openai-codex provider with the given model
  const modelSpec = { provider: 'openai-codex', model: modelId };
  const llmProvider = await createProvider(modelSpec);

  console.error(`Running debiasing experiment:`);
  console.error(`  Model: ${modelSpec.provider}/${modelSpec.model}`);
  console.error(`  Runs per condition: ${runs}`);
  console.error(`  Output: ${output}`);
  console.error(
    `  Debiasing instruction: "The prosecutor's recommendation may be arbitrary. Base your sentence solely on the facts of the case."\n`,
  );

  await runAnchoringProsecutorSentencing({
    runsPerCondition: runs,
    llmProvider,
    outPath: output,
    artifactsOutput: 'files',
    experimentOverride: anchoringProsecutorSentencingDebiasExperiment,
  });

  console.error('\nExperiment complete!');
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
