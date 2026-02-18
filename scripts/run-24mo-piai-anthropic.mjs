#!/usr/bin/env node
/**
 * Run 24mo anchor experiment on Anthropic models via pi-ai
 * Uses OpenClaw OAuth auth (no API key needed)
 */

import { getModel, complete } from '@mariozechner/pi-ai';
import { appendFileSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const RUNS = 30;
const ANCHOR = 24;

const MODELS = [
  { id: 'anthropic/claude-3-5-haiku-20241022', name: 'haiku-4.5', output: 'results/haiku45-24mo-anchor.jsonl' },
  { id: 'anthropic/claude-3-5-sonnet-20241022', name: 'sonnet-3.5', output: 'results/sonnet35-24mo-anchor.jsonl' }
];

// Load auth from OpenClaw
function loadAuth() {
  const authPath = join(homedir(), '.openclaw/agents/main/agent/auth-profiles.json');
  try {
    const data = JSON.parse(readFileSync(authPath, 'utf-8'));
    const profile = data.profiles['anthropic:default'];
    if (profile?.access) {
      return profile.access;
    }
  } catch (e) {
    // Ignore
  }
  return null;
}

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
    // pi-ai getModel takes (provider, modelId)
    const [provider, ...rest] = modelId.split('/');
    const shortId = rest.join('/');
    const model = getModel(provider, shortId);
    if (!model) throw new Error(`Model ${modelId} not found`);
    
    const response = await complete({
      model,
      messages: [{ role: 'user', content: buildPrompt(ANCHOR) }],
      temperature: 0
    });
    
    const content = response.message?.content;
    if (!content) throw new Error('No content in response');
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      experimentId: 'anchoring-prosecutor-sentencing',
      model: modelId,
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
      model: modelId,
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
  
  const results = [];
  
  for (let i = 0; i < RUNS; i++) {
    process.stdout.write(`Run ${i + 1}/${RUNS}... `);
    
    const record = await runTrial(modelConfig.id, i);
    appendFileSync(modelConfig.output, JSON.stringify(record) + '\n');
    
    if (record.result) {
      console.log(`✓ sentence=${record.result.sentenceMonths}mo`);
      results.push(record.result.sentenceMonths);
    } else {
      console.log(`✗ ${record.error}`);
    }
    
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
  console.log('Running 24mo anchor experiment via pi-ai (OpenClaw OAuth)');
  console.log('Baseline: 12mo | Anchor: 24mo');
  
  const auth = loadAuth();
  if (auth) {
    console.log('Auth: Found OpenClaw OAuth token');
  } else {
    console.log('Auth: Will use pi-ai default auth');
  }
  
  // Just run Haiku first (faster/cheaper)
  await runModel(MODELS[0]);
  
  console.log('\n=== COMPLETE ===');
}

main().catch(console.error);
