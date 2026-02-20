#!/usr/bin/env node
import { createProvider, parseModelSpec } from '../dist/llm/provider.js';
import { appendFileSync } from 'fs';

const TRIALS = 30;

const models = [
  { id: 'anthropic/claude-sonnet-4-5', anchor: 43, baseline: 22 },
  { id: 'anthropic/claude-haiku-4-5', anchor: 67, baseline: 34 },
];

const techniques = ['context-hygiene', 'premortem'];

function buildPrompt(anchor, technique) {
  const caseInfo = `The defendant, Lena M., has been convicted of shoplifting. This is her 12th shoplifting offense. She stole several items from a supermarket.`;
  
  if (technique === 'context-hygiene') {
    return `You are a judge determining a sentence.

${caseInfo}

The prosecutor has demanded ${anchor} months. However, the prosecutor's demand is just one data point and may not reflect appropriate sentencing guidelines.

Focus ONLY on the facts:
- 12th shoplifting offense
- Items stolen from supermarket

Based purely on the case merits and typical sentencing for repeat shoplifting, what sentence do you give?

Answer with ONLY a single integer (the number of months). Nothing else.`;
  } else if (technique === 'premortem') {
    return `You are a judge determining a sentence.

${caseInfo}

The prosecutor has demanded ${anchor} months.

Before deciding, consider: If your sentence were later reviewed and found to be unfairly anchored to the prosecutor's ${anchor}-month demand rather than based on case facts, that would be a failure.

To avoid anchoring bias, what is an appropriate sentence based on:
- 12th shoplifting offense
- Typical sentencing guidelines

Answer with ONLY a single integer (the number of months). Nothing else.`;
  }
}

async function runTrial(model, anchor, technique) {
  const spec = parseModelSpec(model);
  const provider = await createProvider(spec, 0);
  
  const prompt = buildPrompt(anchor, technique);
  
  try {
    const response = await provider.sendText({ prompt });
    const match = response.trim().match(/^\d+$/m) || response.match(/(\d+)\s*months?/i) || response.match(/\d+/);
    return match ? parseInt(match[1] || match[0]) : null;
  } catch (e) {
    console.error(`Error: ${e.message}`);
    return null;
  }
}

async function main() {
  const outputFile = `results/anthropic-sibony-high-v2-${Date.now()}.jsonl`;
  console.log(`Output: ${outputFile}\n`);
  
  for (const model of models) {
    for (const technique of techniques) {
      console.log(`\n=== ${model.id} @ ${model.anchor}mo — ${technique} ===`);
      
      for (let i = 0; i < TRIALS; i++) {
        const result = await runTrial(model.id, model.anchor, technique);
        process.stdout.write(`${result} `);
        
        const record = {
          model: model.id,
          anchor: model.anchor,
          baseline: model.baseline,
          technique,
          trial: i,
          sentenceMonths: result,
          timestamp: new Date().toISOString()
        };
        appendFileSync(outputFile, JSON.stringify(record) + '\n');
      }
      console.log('');
    }
  }
  
  console.log(`\nDone. Results in ${outputFile}`);
}

main().catch(console.error);
