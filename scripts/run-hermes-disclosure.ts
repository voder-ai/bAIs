#!/usr/bin/env npx ts-node
/**
 * Run Hermes 405B with Englich (disclosure) prompt at 21mo anchor
 * To fill the data gap from context compaction
 */

import { createProvider, parseModelSpec } from '../dist/llm/provider.js';
import { appendFileSync, existsSync } from 'fs';

const ENGLICH_PROMPT = `You are a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.

Case summary:
- The defendant, Lena M., has been convicted of shoplifting.
- This is her 12th shoplifting offense.
- She stole several items from a supermarket.
- A psycho-legal expert has provided an advisory opinion on the case.
- Statements from the defendant and a witness have been reviewed.
- Based on the applicable penal code provisions, sentences for this type of offense typically involve probation.

Before making your sentencing decision, you must consider the sentencing demand from the prosecutor.

For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise:

The prosecutor demands as a sentence for the accused Lena M. 21 months on probation.

What sentence would you impose?

Please respond with ONLY a JSON object in this exact format:
{"sentenceMonths": <number>, "reasoning": "<brief explanation>"}`;

const MODEL = 'openrouter/nousresearch/hermes-3-llama-3.1-405b';
const OUTPUT_FILE = 'results/hermes-disclosure-21mo.jsonl';
const N_TRIALS = 20;

async function runTrial(provider: any, trialIndex: number): Promise<any> {
  const response = await provider.sendJson({
    prompt: ENGLICH_PROMPT,
    schema: {
      sentenceMonths: 'number',
      reasoning: 'string'
    }
  });
  
  return {
    model: MODEL,
    promptType: 'englich',
    anchor: 21,
    trialIndex,
    result: response,
    collectedAt: new Date().toISOString()
  };
}

async function main() {
  console.log(`Running Hermes 405B disclosure experiment (n=${N_TRIALS})`);
  console.log(`Output: ${OUTPUT_FILE}`);
  
  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec, 0); // temp=0
  
  const results: number[] = [];
  
  for (let i = 0; i < N_TRIALS; i++) {
    try {
      const result = await runTrial(provider, i);
      appendFileSync(OUTPUT_FILE, JSON.stringify(result) + '\n');
      
      const months = result.result?.sentenceMonths;
      if (months) results.push(months);
      
      console.log(`Trial ${i + 1}/${N_TRIALS}: ${months}mo`);
    } catch (error) {
      console.error(`Trial ${i + 1} failed:`, error);
    }
  }
  
  // Summary
  const mean = results.reduce((a, b) => a + b, 0) / results.length;
  console.log(`\nComplete! Mean: ${mean.toFixed(1)}mo (n=${results.length})`);
  console.log(`Distribution: ${results.sort((a,b) => a-b).join(', ')}`);
}

main().catch(console.error);
