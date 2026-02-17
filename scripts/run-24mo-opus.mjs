#!/usr/bin/env node
/**
 * Run 24mo anchor experiment on Opus 4.5 and 4.6 via pi-ai OAuth
 */

import { getModel, complete } from '@mariozechner/pi-ai';
import { appendFileSync, readFileSync, existsSync } from 'fs';

const RUNS = 30;
const ANCHOR = 24;

const MODELS = [
  { id: 'claude-opus-4-5', name: 'opus-4.5', output: 'results/opus45-24mo-anchor.jsonl' },
  { id: 'claude-opus-4-6', name: 'opus-4.6', output: 'results/opus46-24mo-anchor.jsonl' }
];

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

async function runTrial(modelId, runIndex) {
  try {
    const model = getModel('anthropic', modelId);
    if (!model) throw new Error(`Model ${modelId} not found`);
    
    const context = {
      messages: [{ role: 'user', content: buildPrompt(ANCHOR) }]
    };
    
    const response = await complete(model, context, { temperature: 0 });
    
    // Extract text from response
    const content = response.content?.[0]?.text;
    if (!content) throw new Error('No content in response');
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      experimentId: 'anchoring-prosecutor-sentencing',
      model: `anthropic/${modelId}`,
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
      model: `anthropic/${modelId}`,
      conditionId: 'high-anchor-24mo',
      runIndex,
      params: { prosecutorRecommendationMonths: ANCHOR },
      result: null,
      error: error.message,
      collectedAt: new Date().toISOString()
    };
  }
}

async function runModel(modelConfig) {
  console.log(`\n=== ${modelConfig.name.toUpperCase()} ===`);
  console.log(`Model: ${modelConfig.id}`);
  console.log(`Output: ${modelConfig.output}\n`);
  
  // Check existing runs
  let startIndex = 0;
  if (existsSync(modelConfig.output)) {
    const existing = readFileSync(modelConfig.output, 'utf-8').trim().split('\n').length;
    startIndex = existing;
    console.log(`Resuming from run ${startIndex + 1}...`);
  }
  
  const results = [];
  
  for (let i = startIndex; i < RUNS; i++) {
    process.stdout.write(`Run ${i + 1}/${RUNS}... `);
    
    const record = await runTrial(modelConfig.id, i);
    appendFileSync(modelConfig.output, JSON.stringify(record) + '\n');
    
    if (record.result) {
      console.log(`✓ sentence=${record.result.sentenceMonths}mo`);
      results.push(record.result.sentenceMonths);
    } else {
      console.log(`✗ ${record.error}`);
    }
    
    // Small delay to be nice to API
    await new Promise(r => setTimeout(r, 500));
  }
  
  // Summary including any existing results
  if (existsSync(modelConfig.output)) {
    const allResults = readFileSync(modelConfig.output, 'utf-8')
      .trim().split('\n')
      .map(line => JSON.parse(line))
      .filter(r => r.result)
      .map(r => r.result.sentenceMonths);
    
    if (allResults.length > 0) {
      const mean = allResults.reduce((a, b) => a + b, 0) / allResults.length;
      const counts = {};
      allResults.forEach(r => counts[r] = (counts[r] || 0) + 1);
      console.log(`\n${modelConfig.name} Summary:`);
      console.log(`  N: ${allResults.length}`);
      console.log(`  Mean: ${mean.toFixed(1)}mo`);
      console.log(`  Distribution: ${Object.entries(counts).sort((a,b) => b[1]-a[1]).map(([k,v]) => `${v}×${k}mo`).join(', ')}`);
    }
  }
}

async function main() {
  console.log('Running 24mo anchor experiment on Opus models via pi-ai OAuth');
  console.log('Baseline: 12mo | Anchor: 24mo');
  console.log('Token set:', !!process.env.ANTHROPIC_OAUTH_TOKEN);
  
  for (const modelConfig of MODELS) {
    await runModel(modelConfig);
  }
  
  console.log('\n=== ALL COMPLETE ===');
}

main().catch(console.error);
