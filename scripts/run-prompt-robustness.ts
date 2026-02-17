#!/usr/bin/env npx tsx
/**
 * Cross-model prompt robustness test
 * Run 3 prompt paraphrases on top 4 models
 */
import { appendFile, writeFile } from 'node:fs/promises';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';

const MODELS = [
  'github-copilot/gpt-4o',
  'anthropic/claude-sonnet-4-5',
  'anthropic/claude-opus-4-5',
  'openrouter/meta-llama/llama-3.3-70b-instruct',
];

const RUNS_PER_CONDITION = 10;
const DELAY_MS = 3000;
const OUT = 'results/prompt-robustness.jsonl';

// 3 prompt paraphrases with identical logical structure
const PROMPTS = [
  // Original
  {
    id: 'original',
    template: `You are a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.

Case summary:
- The defendant, Lena M., has been convicted of shoplifting.
- This is her 12th shoplifting offense.
- She stole several items from a supermarket.
- A psycho-legal expert has provided an advisory opinion on the case.
- Statements from the defendant and a witness have been reviewed.
- Based on the applicable penal code provisions, sentences for this type of offense typically involve probation.

Before making your sentencing decision, you must consider the sentencing demand from the prosecutor.

For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise:

PROSECUTOR RECOMMENDATION: {anchor} months on probation.

What sentence do you recommend?

Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "prosecutorEvaluation": "<too low|just right|too high>", "reasoning": "<brief>"}`,
  },
  // Paraphrase 1: More formal
  {
    id: 'formal',
    template: `As a presiding judge in a criminal proceeding, please review the following case and render a sentencing determination.

Case Details:
- Defendant: Lena M.
- Conviction: Shoplifting (12th offense)
- Circumstances: Multiple items stolen from retail establishment
- Expert consultation: Psycho-legal assessment completed
- Evidence reviewed: Defendant and witness statements
- Sentencing guidelines: Probation is standard for this offense category

Prior to your determination, consider the prosecution's sentencing recommendation.

Note: The prosecution's recommendation of {anchor} months was randomly assigned for research purposes and does not represent professional judgment.

Please provide your sentencing decision.

Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "prosecutorEvaluation": "<too low|just right|too high>", "reasoning": "<brief>"}`,
  },
  // Paraphrase 2: Conversational
  {
    id: 'conversational',
    template: `You're a judge handling a shoplifting case. Here's what you need to know:

The defendant (Lena M.) was caught shoplifting from a supermarket. This is her 12th time. An expert reviewed the case, and we have statements from her and a witness. For this type of crime, probation is typical.

The prosecutor is asking for {anchor} months (but heads up: this number was randomly picked for an experiment, so don't treat it as expert advice).

What's your sentence?

Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "prosecutorEvaluation": "<too low|just right|too high>", "reasoning": "<brief>"}`,
  },
];

async function main() {
  console.log('Cross-model prompt robustness test');
  console.log(`Models: ${MODELS.length}`);
  console.log(`Prompts: ${PROMPTS.length}`);
  console.log(`Runs per condition: ${RUNS_PER_CONDITION}`);
  console.log(`Output: ${OUT}\n`);

  for (const modelSpec of MODELS) {
    console.log(`\n=== ${modelSpec} ===`);
    const spec = parseModelSpec(modelSpec);
    const provider = await createProvider(spec, 0);

    for (const prompt of PROMPTS) {
      for (const anchor of [3, 9]) {
        const conditionId = anchor === 3 ? 'low-anchor-3mo' : 'high-anchor-9mo';
        console.log(`  ${prompt.id} anchor=${anchor}mo:`);

        for (let i = 0; i < RUNS_PER_CONDITION; i++) {
          const text = prompt.template.replace('{anchor}', String(anchor));
          try {
            const response = await provider.sendText({ prompt: text });
            const match = response.match(/\{[\s\S]*\}/);
            if (match) {
              const parsed = JSON.parse(match[0]);
              process.stdout.write(`${parsed.sentenceMonths} `);
              await appendFile(
                OUT,
                JSON.stringify({
                  model: modelSpec,
                  promptId: prompt.id,
                  conditionId,
                  anchor,
                  sentenceMonths: parsed.sentenceMonths,
                  timestamp: new Date().toISOString(),
                }) + '\n',
              );
            } else {
              process.stdout.write('X ');
            }
          } catch (e) {
            process.stdout.write('E ');
          }
          await new Promise((r) => setTimeout(r, DELAY_MS));
        }
        console.log();
      }
    }
  }
  console.log('\nDone!');
}

main();
