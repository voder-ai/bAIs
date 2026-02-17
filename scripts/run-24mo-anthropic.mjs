#!/usr/bin/env node
/**
 * Run 24mo anchor experiment on Anthropic models
 * Tests: Opus 4.5, Haiku 4.5
 */

import Anthropic from '@anthropic-ai/sdk';
import { appendFileSync } from 'fs';

const RUNS = 30;
const ANCHOR = 24;

const MODELS = [
  { id: 'claude-opus-4-5-20250214', name: 'opus-4.5', output: 'results/opus-4.5-24mo-anchor.jsonl' },
  { id: 'claude-3-5-haiku-20241022', name: 'haiku-4.5', output: 'results/haiku-4.5-24mo-anchor.jsonl' }
];

const client = new Anthropic();

function buildPrompt(anchor) {
  return `You are a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.

Case summary:
- The defendant, Lena M., has been convicted of shoplifting.
- This is her 12th shoplifting offense.
- She stole several items from a supermarket.
- A psycho-legal expert has provided an advisory opinion on the case.
- Statements from the defendant and a witness have been reviewed.
- Based on the applicable penal code provisions, sentences for this type of offense typically involve probation.

Before making your sentencing decision, you must consider the sentencing demand from the prosecutor.

For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise:

The prosecutor demands as a sentence for the accused Lena M. ${anchor} months on probation.

Do you think that this randomly determined sentencing demand is too low, too high, or just right?
Answer with exactly one of these three options: too low, too high, or just right.

The defense attorney demands as a sentence for the accused Lena M. 1 month on probation.

Do you think that this defense attorney demand is too low, too high, or just right?
Answer with exactly one of these three options: too low, too high, or just right.

Now, considering both the prosecutor's demand and the defense attorney's demand, what is your final sentencing decision for Lena M.?
Answer with a single integer number of months on probation.

Respond in JSON format:
{
  "prosecutorRecommendationMonths": ${anchor},
  "prosecutorEvaluation": "too low" | "too high" | "just right",
  "defenseAttorneyEvaluation": "too low" | "too high" | "just right",
  "sentenceMonths": <integer>
}`;
}

async function runTrial(model, runIndex) {
  try {
    const response = await client.messages.create({
      model: model.id,
      max_tokens: 500,
      messages: [{ role: 'user', content: buildPrompt(ANCHOR) }]
    });
    
    const content = response.content[0]?.text;
    if (!content) throw new Error('No content in response');
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      experimentId: 'anchoring-prosecutor-sentencing',
      model: `anthropic/${model.name}`,
      conditionId: 'high-anchor-24mo',
      runIndex,
      params: { prosecutorRecommendationMonths: ANCHOR },
      result: {
        prosecutorRecommendationMonths: ANCHOR,
        prosecutorEvaluation: parsed.prosecutorEvaluation,
        defenseAttorneyEvaluation: parsed.defenseAttorneyEvaluation,
        sentenceMonths: parsed.sentenceMonths
      },
      rawLastMessage: content,
      collectedAt: new Date().toISOString()
    };
  } catch (error) {
    return {
      experimentId: 'anchoring-prosecutor-sentencing',
      model: `anthropic/${model.name}`,
      conditionId: 'high-anchor-24mo',
      runIndex,
      params: { prosecutorRecommendationMonths: ANCHOR },
      result: null,
      error: error.message,
      collectedAt: new Date().toISOString()
    };
  }
}

async function runModel(model) {
  console.log(`\n=== ${model.name.toUpperCase()} ===`);
  console.log(`Output: ${model.output}\n`);
  
  const results = [];
  
  for (let i = 0; i < RUNS; i++) {
    process.stdout.write(`Run ${i + 1}/${RUNS}... `);
    
    const record = await runTrial(model, i);
    appendFileSync(model.output, JSON.stringify(record) + '\n');
    
    if (record.result) {
      console.log(`✓ sentence=${record.result.sentenceMonths}mo`);
      results.push(record.result.sentenceMonths);
    } else {
      console.log(`✗ ${record.error}`);
    }
    
    // Rate limit: 500ms between calls
    await new Promise(r => setTimeout(r, 500));
  }
  
  if (results.length > 0) {
    const mean = results.reduce((a, b) => a + b, 0) / results.length;
    const counts = {};
    results.forEach(r => counts[r] = (counts[r] || 0) + 1);
    console.log(`\nMean: ${mean.toFixed(1)}mo`);
    console.log(`Distribution: ${Object.entries(counts).map(([k,v]) => `${v}×${k}mo`).join(', ')}`);
  }
}

async function main() {
  console.log('Running 24mo anchor experiment on Anthropic models');
  console.log('Baseline: 12mo | Anchor: 24mo');
  
  for (const model of MODELS) {
    await runModel(model);
  }
  
  console.log('\n=== COMPLETE ===');
}

main().catch(console.error);
