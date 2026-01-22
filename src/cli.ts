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
  .option('-n, --runs <number>', 'Number of trials to run per condition', '30')
  .option('--codex-model <model>', 'Codex model to use (passes through to `codex -m`)')
  .option('--out <path>', 'Write JSONL results to this path (appends)')
  .option(
    '--artifacts <mode>',
    'Where to output analysis/report: console | files | both',
    'console',
  )
  .action(
    async (options: { runs: string; codexModel?: string; out?: string; artifacts: string }) => {
      const runs = Number(options.runs);
      if (!Number.isFinite(runs) || runs <= 0) {
        throw new Error('--runs must be a positive number');
      }

      const artifacts = options.artifacts;
      if (artifacts !== 'console' && artifacts !== 'files' && artifacts !== 'both') {
        throw new Error('--artifacts must be one of: console, files, both');
      }

      const runOptions: {
        runsPerCondition: number;
        codexModel?: string;
        outPath?: string;
        artifactsOutput?: 'console' | 'files' | 'both';
      } = { runsPerCondition: runs, artifactsOutput: artifacts };

      if (options.codexModel) runOptions.codexModel = options.codexModel;
      if (options.out) runOptions.outPath = options.out;

      await runAnchoringProsecutorSentencing(runOptions);
    },
  );

await program.parseAsync(process.argv);
