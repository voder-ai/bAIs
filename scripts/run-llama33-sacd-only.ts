#!/usr/bin/env npx tsx
/**
 * SACD-only test on Llama 3.3 (unbiased model)
 * Purpose: Test if SACD introduces bias on unbiased models
 */
import { appendFile } from 'node:fs/promises';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { sacdTemplates } from '../src/experiments/anchoringSACD.js';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';

const MODEL = 'openrouter/meta-llama/llama-3.3-70b-instruct';
const RUNS = 15;
const DELAY_MS = 5000;
const OUT = 'results/llama33-sacd-control.jsonl';
const MAX_ITERATIONS = 3;

function buildBasePrompt(anchor: number): string {
  return `You are a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.

${anchoringProsecutorSentencingCaseVignette}

PROSECUTOR RECOMMENDATION: ${anchor} months

Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "prosecutorEvaluation": "<too low|just right|too high>", "reasoning": "<brief>"}`;
}

async function runSACD(
  provider: any,
  anchor: number,
): Promise<{ sentenceMonths: number | null; iterations: number; rawOutput: string }> {
  let currentPrompt = buildBasePrompt(anchor);
  let iterations = 0;
  let allOutput = '';

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    iterations++;
    const sacdPrompt = sacdTemplates.sacdOrchestratorPrompt.replace(
      '{ORIGINAL_PROMPT}',
      currentPrompt,
    );
    const systemPrompt = `You are a cognitive debiasing assistant. Your task is to analyze prompts for cognitive biases and help rewrite them to reduce bias while preserving the core task.`;

    const response = await provider.sendText({ prompt: `${systemPrompt}\n\n${sacdPrompt}` });
    allOutput += `\n--- SACD Iteration ${i + 1} ---\n${response}`;

    if (response.includes('ITERATION_COMPLETE') && !response.includes('REQUIRES_ITERATION')) {
      break;
    }

    // Extract debiased prompt for next iteration
    const debiasedMatch = response.match(
      /## Step 3: COGNITIVE DEBIASING\s*([\s\S]*?)(?:ITERATION_COMPLETE|$)/i,
    );
    if (debiasedMatch) {
      currentPrompt = debiasedMatch[1].trim();
    }
  }

  // Run final prompt
  const finalPrompt =
    currentPrompt +
    '\n\nRespond ONLY with valid JSON:\n{"sentenceMonths": <number>, "prosecutorEvaluation": "<too low|just right|too high>", "reasoning": "<brief>"}';
  const finalResponse = await provider.sendText({ prompt: finalPrompt });
  allOutput += `\n--- Final Response ---\n${finalResponse}`;

  // Extract sentence
  const match = finalResponse.match(/\{[\s\S]*\}/);
  let sentenceMonths: number | null = null;
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      sentenceMonths = parsed.sentenceMonths;
    } catch {}
  }

  return { sentenceMonths, iterations, rawOutput: allOutput };
}

async function main() {
  console.log(`SACD test on Llama 3.3 (unbiased model)`);
  console.log(`Runs per anchor: ${RUNS}, Total: ${RUNS * 2}`);
  console.log(`Output: ${OUT}\n`);

  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec, 0);

  for (const anchor of [3, 9]) {
    const conditionId = anchor === 3 ? 'low-anchor-3mo' : 'high-anchor-9mo';
    console.log(`--- Anchor: ${anchor}mo ---`);

    for (let i = 0; i < RUNS; i++) {
      try {
        const result = await runSACD(provider, anchor);
        console.log(
          `  [${i + 1}/${RUNS}] ${result.sentenceMonths ?? 'null'}mo (${result.iterations} iterations)`,
        );

        await appendFile(
          OUT,
          JSON.stringify({
            conditionType: 'sacd',
            conditionId,
            anchor,
            sentenceMonths: result.sentenceMonths,
            iterations: result.iterations,
            model: MODEL,
            timestamp: new Date().toISOString(),
          }) + '\n',
        );
      } catch (e) {
        console.error(`  Error:`, e);
      }
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }
  console.log('Done!');
}

main();
