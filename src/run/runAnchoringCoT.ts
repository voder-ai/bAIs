#!/usr/bin/env node

import { runAnchoringProsecutorSentencing } from './runAnchoringProsecutorSentencing.js';
import { anchoringProsecutorSentencingExperimentCoT } from '../experiments/anchoringProsecutorSentencingCoT.js';
import { createProvider, parseModelSpec } from '../llm/provider.js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  let model = 'pi-ai/openai-codex/gpt-5.2';
  let runs = 30;
  let output = 'results/gpt52-anchoring-cot-30.jsonl';

  // Parse simple arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--model' && i + 1 < args.length) {
      model = args[i + 1]!;
      i++;
    } else if (args[i] === '--runs' && i + 1 < args.length) {
      runs = parseInt(args[i + 1]!, 10);
      i++;
    } else if (args[i] === '--output' && i + 1 < args.length) {
      output = args[i + 1]!;
      i++;
    }
  }

  const modelSpec = parseModelSpec(model);
  const llmProvider = await createProvider(modelSpec);

  console.error(`Running Chain-of-Thought Anchoring Experiment`);
  console.error(`Model: ${model}`);
  console.error(`Runs per condition: ${runs}`);
  console.error(`Output: ${output}`);
  console.error('');

  await runAnchoringProsecutorSentencing({
    runsPerCondition: runs,
    llmProvider,
    outPath: output,
    artifactsOutput: 'files',
    experimentOverride: anchoringProsecutorSentencingExperimentCoT,
  });

  console.error('Experiment complete!');
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
