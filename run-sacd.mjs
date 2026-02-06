import { runAnchoringSACD } from './dist/run/runAnchoringSACD.js';
import { createProvider } from './dist/llm/provider.js';

async function main() {
  // Use anthropic provider
  const llmProvider = await createProvider({
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
  });

  console.log('Starting SACD experiment (n=2 pilot)...');

  await runAnchoringSACD({
    runsPerCondition: 2,
    llmProvider,
    outPath: 'results/anthropic-sacd-pilot.jsonl',
  });

  console.log('Done!');
}

main().catch(console.error);
