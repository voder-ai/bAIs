#!/usr/bin/env node
/**
 * Run 24mo anchor experiment to test if anchors can push ABOVE baseline
 */

import { appendFileSync, readFileSync } from 'fs';

// Get OpenRouter key
let OPENROUTER_API_KEY;
try {
  OPENROUTER_API_KEY = readFileSync(process.env.HOME + '/.config/openrouter-key.txt', 'utf8').trim();
} catch (e) {
  console.error('Could not read OpenRouter key');
  process.exit(1);
}

const MODEL = 'openrouter/openai/o3-mini';
const OUTPUT = 'results/24mo-anchor-experiment.jsonl';
const RUNS = 30;

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

async function runExperiment() {
  console.log('Running 24mo anchor experiment (o3-mini)...');
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
          model: 'openai/o3-mini',
          messages: [{ role: 'user', content: buildPrompt(24) }],
          temperature: 0
        })
      });
      
      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || '';
      
      // Extract final number
      const lines = text.split('\n');
      const lastLine = lines[lines.length - 1] || lines[lines.length - 2] || '';
      const match = lastLine.match(/\d+/);
      const months = match ? parseInt(match[0]) : null;
      
      const result = {
        model: MODEL,
        anchor: 24,
        runIndex: i,
        sentenceMonths: months,
        rawResponse: text.slice(0, 500),
        timestamp: new Date().toISOString()
      };
      
      appendFileSync(OUTPUT, JSON.stringify(result) + '\n');
      console.log(`Trial ${i+1}/${RUNS}: ${months}mo`);
      results.push(months);
      
      await new Promise(r => setTimeout(r, 1500));
    } catch (e) {
      console.error(`Trial ${i+1} error:`, e.message);
    }
  }
  
  const validResults = results.filter(r => r != null);
  const mean = validResults.reduce((a,b) => a+b, 0) / validResults.length;
  console.log(`\nDone: mean=${mean.toFixed(1)}mo, n=${validResults.length}`);
  console.log('Baseline was 12mo. If mean > 12, anchors can push UP.');
}

runExperiment();
