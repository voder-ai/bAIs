#!/usr/bin/env node
/**
 * Run SYMMETRIC HIGH ANCHOR experiments
 * 
 * Tests high anchors that are properly calibrated to be as far ABOVE 
 * the no-anchor baseline as the low anchor (3mo) is BELOW it.
 * 
 * Model baselines (from no-anchor experiments):
 * - Hermes 405B: 20.7mo → high anchor = 38mo
 * - GPT-4o: 24.5mo → high anchor = 46mo  
 * - GPT-5.2: 32.1mo → high anchor = 61mo
 */

import { appendFileSync, readFileSync, existsSync } from 'fs';

// Get API key
let OPENROUTER_API_KEY;
const keyPath = process.env.HOME + '/.config/openrouter-key.txt';
if (existsSync(keyPath)) {
  OPENROUTER_API_KEY = readFileSync(keyPath, 'utf8').trim();
} else {
  console.error('Missing OpenRouter API key at ~/.config/openrouter-key.txt');
  process.exit(1);
}

const RUNS = 30;

// Models with their symmetric high anchors based on no-anchor baselines
const MODELS = [
  { 
    id: 'nousresearch/hermes-3-llama-3.1-405b', 
    name: 'Hermes405B',
    baseline: 20.7,
    highAnchor: 38  // 20.7 + (20.7 - 3) = 38.4 ≈ 38
  },
  { 
    id: 'openai/gpt-4o', 
    name: 'GPT4o',
    baseline: 24.5,
    highAnchor: 46  // 24.5 + (24.5 - 3) = 46
  },
  { 
    id: 'openai/gpt-5.2', 
    name: 'GPT52',
    baseline: 32.1,
    highAnchor: 61  // 32.1 + (32.1 - 3) = 61.2 ≈ 61
  },
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

What is your final sentencing decision for Lena M.?
Answer with a single integer number of months on probation.`;
}

async function runModel(model, anchor, condition) {
  const output = `results/${model.name.toLowerCase()}-symmetric-${condition}.jsonl`;
  console.log(`\n=== Running ${model.name} (${anchor}mo anchor - ${condition}) ===`);
  const results = [];
  
  for (let i = 0; i < RUNS; i++) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`
        },
        body: JSON.stringify({
          model: model.id,
          messages: [{ role: 'user', content: buildPrompt(anchor) }],
          temperature: 0,
          max_tokens: 256
        })
      });
      
      const data = await response.json();
      if (data.error) {
        console.error(`${model.name} ${i+1}: ERROR - ${data.error.message}`);
        continue;
      }
      
      const text = data.choices?.[0]?.message?.content || '';
      const matches = text.match(/\d+/g);
      const months = matches ? parseInt(matches[matches.length - 1]) : null;
      
      const result = {
        experimentId: 'anchoring-symmetric-high',
        model: model.id,
        conditionId: condition,
        params: { 
          prosecutorRecommendationMonths: anchor,
          modelBaseline: model.baseline 
        },
        runIndex: i,
        result: { sentenceMonths: months },
        timestamp: new Date().toISOString()
      };
      
      appendFileSync(output, JSON.stringify(result) + '\n');
      console.log(`${model.name} ${i+1}/${RUNS}: ${months !== null ? months + 'mo' : 'ERROR'}`);
      if (months !== null) results.push(months);
      
      // Rate limit
      await new Promise(r => setTimeout(r, 1500));
    } catch (e) {
      console.error(`${model.name} ${i+1}: ERROR - ${e.message}`);
    }
  }
  
  if (results.length > 0) {
    const mean = results.reduce((a,b) => a+b, 0) / results.length;
    const variance = results.reduce((a,b) => a + Math.pow(b - mean, 2), 0) / results.length;
    const sd = Math.sqrt(variance);
    console.log(`\n${model.name} ${condition} DONE: mean=${mean.toFixed(1)}mo, sd=${sd.toFixed(2)}, n=${results.length}`);
    return { model: model.name, condition, anchor, mean, sd, n: results.length };
  }
  return null;
}

async function main() {
  console.log('=== SYMMETRIC HIGH ANCHOR EXPERIMENT ===');
  console.log('Testing properly calibrated high anchors\n');
  
  const allResults = [];
  
  for (const model of MODELS) {
    // Run low anchor (3mo) for comparison
    const lowResult = await runModel(model, 3, 'low-anchor-3mo');
    if (lowResult) allResults.push(lowResult);
    
    // Run symmetric high anchor
    const highResult = await runModel(model, model.highAnchor, `high-anchor-${model.highAnchor}mo`);
    if (highResult) allResults.push(highResult);
  }
  
  console.log('\n=== SUMMARY ===');
  console.log('Model | Baseline | Low (3mo) | High (symmetric) | Anchoring Effect');
  console.log('------|----------|-----------|------------------|------------------');
  
  for (const model of MODELS) {
    const low = allResults.find(r => r.model === model.name && r.condition === 'low-anchor-3mo');
    const high = allResults.find(r => r.model === model.name && r.condition.includes('high-anchor'));
    
    if (low && high) {
      const effect = high.mean - low.mean;
      console.log(`${model.name} | ${model.baseline}mo | ${low.mean.toFixed(1)}mo | ${high.mean.toFixed(1)}mo | ${effect > 0 ? '+' : ''}${effect.toFixed(1)}mo`);
    }
  }
  
  console.log('\n=== COMPLETE ===');
}

main();
