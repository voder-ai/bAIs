#!/usr/bin/env npx ts-node
/**
 * Quick runner for SACD experiment
 */
import { runAnchoringSACD } from './src/run/runAnchoringSACD.js';
import { createCodexProvider } from './src/llm/codex.js';

async function main() {
  const llmProvider = await createCodexProvider();

  console.log('Starting SACD experiment (n=2 pilot)...');

  await runAnchoringSACD({
    runsPerCondition: 2, // Start with pilot
    llmProvider,
    outPath: 'results/codex-sacd-pilot.jsonl',
  });

  console.log('Done!');
}

main().catch(console.error);
