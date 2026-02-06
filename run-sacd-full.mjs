import { runAnchoringSACD } from './dist/run/runAnchoringSACD.js';
import { createProvider } from './dist/llm/provider.js';

async function main() {
  const llmProvider = await createProvider({
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
  });

  console.log('Starting SACD experiment (n=30 full validation)...');

  await runAnchoringSACD({
    runsPerCondition: 30,
    llmProvider,
    outPath: 'results/anthropic-sacd-30.jsonl',
  });

  console.log('Done!');
}

main().catch(console.error);
