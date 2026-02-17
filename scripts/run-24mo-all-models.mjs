#!/usr/bin/env node
/**
 * Run 24mo anchor experiment across multiple models
 */

import { appendFileSync, readFileSync } from 'fs';

const OPENROUTER_API_KEY = readFileSync(process.env.HOME + '/.config/openrouter-key.txt', 'utf8').trim();
const RUNS = 30;

const MODELS = [
  { id: 'openai/o1', name: 'o1' },
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama33' },
  { id: 'nousresearch/hermes-3-llama-3.1-405b', name: 'Hermes405B' },
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
Answer with a single integer number of months on probation.`;
}

async function runModel(model) {
  const output = `results/${model.name.toLowerCase()}-24mo-anchor.jsonl`;
  console.log(`\n=== Running ${model.name} (24mo anchor) ===`);
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
          messages: [{ role: 'user', content: buildPrompt(24) }],
          temperature: 0,
          max_tokens: 1024
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
        model: model.id,
        anchor: 24,
        runIndex: i,
        sentenceMonths: months,
        timestamp: new Date().toISOString()
      };
      
      appendFileSync(output, JSON.stringify(result) + '\n');
      console.log(`${model.name} ${i+1}/${RUNS}: ${months !== null ? months + 'mo' : 'ERROR'}`);
      if (months) results.push(months);
      
      await new Promise(r => setTimeout(r, 1500));
    } catch (e) {
      console.error(`${model.name} ${i+1}: ERROR - ${e.message}`);
    }
  }
  
  if (results.length > 0) {
    const mean = results.reduce((a,b) => a+b, 0) / results.length;
    console.log(`\n${model.name} DONE: mean=${mean.toFixed(1)}mo, n=${results.length}`);
  }
}

async function main() {
  for (const model of MODELS) {
    await runModel(model);
  }
  console.log('\n=== ALL MODELS COMPLETE ===');
}

main();
