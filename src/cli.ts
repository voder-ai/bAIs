#!/usr/bin/env node

import { Command } from 'commander';

import { runAnchoringProsecutorSentencing } from './run/runAnchoringProsecutorSentencing.js';

const program = new Command();

program
  .name('bais')
  .description('bAIs: toolkit for running cognitive bias experiments on LLMs')
  .version('0.0.0');

const run = program.command('run').description('Run an experiment');

run
  .command('anchoring-prosecutor-sentencing')
  .description('Run the prosecutor-recommendation anchoring experiment')
  .option('-n, --runs <number>', 'Runs per condition', '30')
  .option('--codex-model <model>', 'Codex model to use (passes through to `codex -m`)')
  .option('--out <path>', 'Write JSONL results to this path (appends)')
  .action(async (options: { runs: string; codexModel?: string; out?: string }) => {
    const runsPerCondition = Number(options.runs);
    if (!Number.isFinite(runsPerCondition) || runsPerCondition <= 0) {
      throw new Error('--runs must be a positive number');
    }

    const runOptions: {
      runsPerCondition: number;
      codexModel?: string;
      outPath?: string;
    } = { runsPerCondition };

    if (options.codexModel) runOptions.codexModel = options.codexModel;
    if (options.out) runOptions.outPath = options.out;

    await runAnchoringProsecutorSentencing(runOptions);
  });

await program.parseAsync(process.argv);
