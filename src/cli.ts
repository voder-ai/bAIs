#!/usr/bin/env node

import { Command } from 'commander';

import { runAnchoringProsecutorSentencing } from './run/runAnchoringProsecutorSentencing.js';
import { createProvider, parseModelSpec, type LlmProvider } from './llm/provider.js';
import { CodexProvider } from './llm/providers/codex.js';

const program = new Command();

program
  .name('bais')
  .description('bAIs: toolkit for running cognitive bias experiments on LLMs')
  .version('0.0.0');

const run = program.command('run').description('Run an experiment');

run
  .command('anchoring-prosecutor-sentencing')
  .description('Run the prosecutor-recommendation anchoring experiment')
  .option('-n, --runs <number>', 'Number of trials to run per condition', '30')
  .option(
    '--model <provider/model>',
    'Model to use (e.g., openai/gpt-4o, anthropic/claude-sonnet-4-20250514)',
  )
  .option('--out <path>', 'Write JSONL results to this path (appends)')
  .option(
    '--artifacts <mode>',
    'Where to output analysis/report: console | files | both',
    'console',
  )
  .action(async (options: { runs: string; model?: string; out?: string; artifacts: string }) => {
    const runs = Number(options.runs);
    if (!Number.isFinite(runs) || runs <= 0) {
      throw new Error('--runs must be a positive number');
    }

    const artifacts = options.artifacts;
    if (artifacts !== 'console' && artifacts !== 'files' && artifacts !== 'both') {
      throw new Error('--artifacts must be one of: console, files, both');
    }

    // Create LLM provider
    let llmProvider;
    if (options.model) {
      const modelSpec = parseModelSpec(options.model);
      llmProvider = await createProvider(modelSpec);
    } else {
      // Default to Codex provider for backwards compatibility
      llmProvider = new CodexProvider();
    }

    const runOptions: {
      runsPerCondition: number;
      llmProvider: LlmProvider;
      outPath?: string;
      artifactsOutput: 'console' | 'files' | 'both';
    } = {
      runsPerCondition: runs,
      llmProvider,
      artifactsOutput: artifacts,
    };

    if (options.out) {
      runOptions.outPath = options.out;
    }

    await runAnchoringProsecutorSentencing(runOptions);
  });

await program.parseAsync(process.argv);
