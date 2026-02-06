#!/usr/bin/env node

import { Command } from 'commander';

import { runAnchoringProsecutorSentencing } from './run/runAnchoringProsecutorSentencing.js';
import { runAnchoringSACD } from './run/runAnchoringSACD.js';
import { runChoiceExperiment } from './run/runChoiceExperiment.js';

import { createProvider, parseModelSpec, type LlmProvider } from './llm/provider.js';
import { CodexProvider } from './llm/providers/codex.js';

import {
  framingEffectExperiment,
  getFramingPrompt,
  type FramingEffectParams,
} from './experiments/framingEffect.js';
import {
  framingExpectedValueExperiment,
  getFramingExpectedValuePrompt,
  type FramingExpectedValueParams,
} from './experiments/framingExpectedValue.js';
import {
  conjunctionFallacyExperiment,
  getConjunctionPrompt,
  type ConjunctionFallacyParams,
} from './experiments/conjunctionFallacy.js';
import {
  novelConjunctionExperiment,
  getNovelConjunctionPrompt,
  type NovelConjunctionParams,
} from './experiments/conjunctionFallacyNovel.js';
import {
  novelSunkCostExperiment,
  getNovelSunkCostPrompt,
  type NovelSunkCostParams,
} from './experiments/sunkCostFallacyNovel.js';
import {
  novelFramingExperiment,
  getNovelFramingPrompt,
  type NovelFramingParams,
} from './experiments/framingEffectNovel.js';
import {
  deframeExperiment,
  getDeFramePrompt,
  type DeFrameParams,
} from './experiments/framingDeFrame.js';
import {
  sunkCostFallacyExperiment,
  getSunkCostPrompt,
  type SunkCostParams,
} from './experiments/sunkCostFallacy.js';
import { anchoringContextHygieneExperiment } from './experiments/anchoringContextHygiene.js';
import { anchoringPremortemExperiment } from './experiments/anchoringPremortem.js';

const program = new Command();

program
  .name('bais')
  .description('bAIs: toolkit for running cognitive bias experiments on LLMs')
  .version('0.0.0');

const run = program.command('run').description('Run an experiment');

type CommonRunOptions = { runs: string; model?: string; out?: string; artifacts: string };

type ArtifactsMode = 'console' | 'files' | 'both';

function parseRuns(value: string): number {
  const runs = Number(value);
  if (!Number.isFinite(runs) || runs <= 0) {
    throw new Error('--runs must be a positive number');
  }
  return runs;
}

function parseArtifacts(value: string): ArtifactsMode {
  if (value !== 'console' && value !== 'files' && value !== 'both') {
    throw new Error('--artifacts must be one of: console, files, both');
  }
  return value;
}

async function createLlmProvider(model?: string): Promise<LlmProvider> {
  if (model) {
    const modelSpec = parseModelSpec(model);
    return createProvider(modelSpec);
  }

  return new CodexProvider();
}

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
  .action(async (options: CommonRunOptions) => {
    const runs = parseRuns(options.runs);
    const artifactsOutput = parseArtifacts(options.artifacts);
    const llmProvider = await createLlmProvider(options.model);

    const runOptions: {
      runsPerCondition: number;
      llmProvider: LlmProvider;
      outPath?: string;
      artifactsOutput: ArtifactsMode;
    } = {
      runsPerCondition: runs,
      llmProvider,
      artifactsOutput,
    };

    if (options.out) {
      runOptions.outPath = options.out;
    }

    await runAnchoringProsecutorSentencing(runOptions);
  });

run
  .command('anchoring-context-hygiene')
  .description("Run anchoring + Sibony's context hygiene debiasing experiment")
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
  .action(async (options: CommonRunOptions) => {
    const runs = parseRuns(options.runs);
    const artifactsOutput = parseArtifacts(options.artifacts);
    const llmProvider = await createLlmProvider(options.model);

    const runOptions: {
      runsPerCondition: number;
      llmProvider: LlmProvider;
      outPath?: string;
      artifactsOutput: ArtifactsMode;
      experimentOverride: typeof anchoringContextHygieneExperiment;
    } = {
      runsPerCondition: runs,
      llmProvider,
      artifactsOutput,
      experimentOverride: anchoringContextHygieneExperiment,
    };

    if (options.out) {
      runOptions.outPath = options.out;
    }

    await runAnchoringProsecutorSentencing(runOptions);
  });

run
  .command('anchoring-premortem')
  .description("Run anchoring + Sibony's premortem debiasing experiment")
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
  .action(async (options: CommonRunOptions) => {
    const runs = parseRuns(options.runs);
    const artifactsOutput = parseArtifacts(options.artifacts);
    const llmProvider = await createLlmProvider(options.model);

    const runOptions: {
      runsPerCondition: number;
      llmProvider: LlmProvider;
      outPath?: string;
      artifactsOutput: ArtifactsMode;
      experimentOverride: typeof anchoringPremortemExperiment;
    } = {
      runsPerCondition: runs,
      llmProvider,
      artifactsOutput,
      experimentOverride: anchoringPremortemExperiment,
    };

    if (options.out) {
      runOptions.outPath = options.out;
    }

    await runAnchoringProsecutorSentencing(runOptions);
  });

run
  .command('anchoring-sacd')
  .description('Run anchoring + SACD (Self-Adaptive Cognitive Debiasing) experiment')
  .option('-n, --runs <number>', 'Number of trials to run per condition', '30')
  .option(
    '--model <provider/model>',
    'Model to use (e.g., openai/gpt-4o, anthropic/claude-sonnet-4-20250514)',
  )
  .option('--out <path>', 'Write JSONL results to this path (appends)')
  .action(async (options: CommonRunOptions) => {
    const runs = parseRuns(options.runs);
    const llmProvider = await createLlmProvider(options.model);

    const runOptions: {
      runsPerCondition: number;
      llmProvider: LlmProvider;
      outPath?: string;
    } = {
      runsPerCondition: runs,
      llmProvider,
    };

    if (options.out) {
      runOptions.outPath = options.out;
    }

    await runAnchoringSACD(runOptions);
  });

run
  .command('framing-effect')
  .description('Run the framing effect experiment (Asian Disease Problem)')
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
  .action(async (options: CommonRunOptions) => {
    const runs = parseRuns(options.runs);
    const artifactsOutput = parseArtifacts(options.artifacts);
    const llmProvider = await createLlmProvider(options.model);

    const baseOptions = {
      experiment: framingEffectExperiment,
      getPrompt: (params: FramingEffectParams) => getFramingPrompt(params.frame),
      validChoices: ['A', 'B', 'C', 'D'] as const,
      runsPerCondition: runs,
      llmProvider,
      artifactsOutput,
    } as const;

    if (options.out) {
      await runChoiceExperiment({ ...baseOptions, outPath: options.out });
    } else {
      await runChoiceExperiment(baseOptions);
    }
  });

run
  .command('framing-expected-value')
  .description("Run framing effect + Sibony's expected value debiasing experiment")
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
  .action(async (options: CommonRunOptions) => {
    const runs = parseRuns(options.runs);
    const artifactsOutput = parseArtifacts(options.artifacts);
    const llmProvider = await createLlmProvider(options.model);

    const baseOptions = {
      experiment: framingExpectedValueExperiment,
      getPrompt: (params: FramingExpectedValueParams) =>
        getFramingExpectedValuePrompt(params.frame),
      validChoices: ['A', 'B', 'C', 'D'] as const,
      runsPerCondition: runs,
      llmProvider,
      artifactsOutput,
    } as const;

    if (options.out) {
      await runChoiceExperiment({ ...baseOptions, outPath: options.out });
    } else {
      await runChoiceExperiment(baseOptions);
    }
  });

run
  .command('conjunction-fallacy')
  .description('Run the conjunction fallacy experiment (Linda/Bill Problem)')
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
  .action(async (options: CommonRunOptions) => {
    const runs = parseRuns(options.runs);
    const artifactsOutput = parseArtifacts(options.artifacts);
    const llmProvider = await createLlmProvider(options.model);

    const baseOptions = {
      experiment: conjunctionFallacyExperiment,
      getPrompt: (params: ConjunctionFallacyParams) => getConjunctionPrompt(params.scenario),
      validChoices: ['a', 'b'] as const,
      runsPerCondition: runs,
      llmProvider,
      artifactsOutput,
    } as const;

    if (options.out) {
      await runChoiceExperiment({ ...baseOptions, outPath: options.out });
    } else {
      await runChoiceExperiment(baseOptions);
    }
  });

run
  .command('conjunction-fallacy-novel')
  .description('Run conjunction fallacy with novel scenarios (contamination test)')
  .option('-n, --runs <number>', 'Number of trials to run per condition', '10')
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
  .action(async (options: CommonRunOptions) => {
    const runs = parseRuns(options.runs);
    const artifactsOutput = parseArtifacts(options.artifacts);
    const llmProvider = await createLlmProvider(options.model);

    const baseOptions = {
      experiment: novelConjunctionExperiment,
      getPrompt: (params: NovelConjunctionParams) => getNovelConjunctionPrompt(params.scenario),
      validChoices: ['a', 'b'] as const,
      runsPerCondition: runs,
      llmProvider,
      artifactsOutput,
    } as const;

    if (options.out) {
      await runChoiceExperiment({ ...baseOptions, outPath: options.out });
    } else {
      await runChoiceExperiment(baseOptions);
    }
  });

run
  .command('sunk-cost-fallacy')
  .description('Run the sunk cost fallacy experiment (Airplane Radar Problem)')
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
  .action(async (options: CommonRunOptions) => {
    const runs = parseRuns(options.runs);
    const artifactsOutput = parseArtifacts(options.artifacts);
    const llmProvider = await createLlmProvider(options.model);

    const baseOptions = {
      experiment: sunkCostFallacyExperiment,
      getPrompt: (params: SunkCostParams) => getSunkCostPrompt(params.sunkCostPresent),
      validChoices: ['yes', 'no'] as const,
      runsPerCondition: runs,
      llmProvider,
      artifactsOutput,
    } as const;

    if (options.out) {
      await runChoiceExperiment({ ...baseOptions, outPath: options.out });
    } else {
      await runChoiceExperiment(baseOptions);
    }
  });

run
  .command('framing-effect-novel')
  .description('Run framing effect with novel scenarios (contamination test)')
  .option('-n, --runs <number>', 'Number of trials to run per condition', '10')
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
  .action(async (options: CommonRunOptions) => {
    const runs = parseRuns(options.runs);
    const artifactsOutput = parseArtifacts(options.artifacts);
    const llmProvider = await createLlmProvider(options.model);

    const baseOptions = {
      experiment: novelFramingExperiment,
      getPrompt: (params: NovelFramingParams) =>
        getNovelFramingPrompt(params.scenario, params.frame),
      validChoices: ['A', 'B', 'C', 'D'] as const,
      runsPerCondition: runs,
      llmProvider,
      artifactsOutput,
    } as const;

    if (options.out) {
      await runChoiceExperiment({ ...baseOptions, outPath: options.out });
    } else {
      await runChoiceExperiment(baseOptions);
    }
  });

run
  .command('sunk-cost-novel')
  .description('Run sunk cost fallacy with novel scenarios (contamination test)')
  .option('-n, --runs <number>', 'Number of trials to run per condition', '10')
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
  .action(async (options: CommonRunOptions) => {
    const runs = parseRuns(options.runs);
    const artifactsOutput = parseArtifacts(options.artifacts);
    const llmProvider = await createLlmProvider(options.model);

    const baseOptions = {
      experiment: novelSunkCostExperiment,
      getPrompt: (params: NovelSunkCostParams) =>
        getNovelSunkCostPrompt(params.scenario, params.sunkCostPresent),
      validChoices: ['yes', 'no'] as const,
      runsPerCondition: runs,
      llmProvider,
      artifactsOutput,
    } as const;

    if (options.out) {
      await runChoiceExperiment({ ...baseOptions, outPath: options.out });
    } else {
      await runChoiceExperiment(baseOptions);
    }
  });

run
  .command('framing-deframe')
  .description('Run framing effect with DeFrame debiasing (arXiv:2602.04306)')
  .option('-n, --runs <number>', 'Number of trials to run per condition', '10')
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
  .action(async (options: CommonRunOptions) => {
    const runs = parseRuns(options.runs);
    const artifactsOutput = parseArtifacts(options.artifacts);
    const llmProvider = await createLlmProvider(options.model);

    const baseOptions = {
      experiment: deframeExperiment,
      getPrompt: (params: DeFrameParams) =>
        getDeFramePrompt(params.scenario, params.frame, params.debiasing),
      validChoices: ['A', 'B', 'C', 'D'] as const,
      runsPerCondition: runs,
      llmProvider,
      artifactsOutput,
    } as const;

    if (options.out) {
      await runChoiceExperiment({ ...baseOptions, outPath: options.out });
    } else {
      await runChoiceExperiment(baseOptions);
    }
  });

await program.parseAsync(process.argv);
