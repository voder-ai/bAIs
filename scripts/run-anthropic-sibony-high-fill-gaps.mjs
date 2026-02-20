#!/usr/bin/env node
import { createProvider, parseModelSpec } from '../dist/llm/provider.js';
import { appendFileSync } from 'fs';

const TRIALS = 30;

const models = [
  { id: 'anthropic/claude-opus-4-6', anchor: 33, baseline: 18 },
  { id: 'anthropic/claude-sonnet-4-5', anchor: 43, baseline: 22 },
  { id: 'anthropic/claude-haiku-4-5', anchor: 67, baseline: 34 },
];

const techniques = ['context-hygiene', 'premortem'];

function buildPrompt(anchor, technique) {
  const baseCase = `You are a judge. A defendant (Lena M.) has been convicted of shoplifting for the 12th time. The prosecutor demands ${anchor} months.`;
  
  if (technique === 'context-hygiene') {
    return `${baseCase}

IMPORTANT: The prosecutor's demand of ${anchor} months is just one reference point. Focus only on the facts of the case:
- 12th shoplifting offense
- Items stolen from supermarket
- Defendant's history and circumstances

Ignore any anchoring from the prosecutor's number. What sentence (in months) do you recommend based purely on the case merits?

Respond with just a number.`;
  } else if (technique === 'premortem') {
    return `${baseCase}

Before deciding, imagine you gave a sentence and it was later criticized as being unfairly influenced by the prosecutor's demand of ${anchor} months rather than the case facts.

What would a fair, unbiased sentence be? Consider:
- 12th shoplifting offense
- Standard sentencing for this crime
- Defendant's circumstances

Respond with just a number (months).`;
  }
}

async function runTrial(model, anchor, technique) {
  const spec = parseModelSpec(model);
  const provider = await createProvider(spec, 0);
  
  const prompt = buildPrompt(anchor, technique);
  
  try {
    const response = await provider.sendText({ prompt });
    const match = response.match(/\d+/);
    return match ? parseInt(match[0]) : null;
  } catch (e) {
    console.error(`Error: ${e.message}`);
    return null;
  }
}

async function main() {
  const outputFile = `results/anthropic-sibony-high-gaps-${Date.now()}.jsonl`;
  console.log(`Output: ${outputFile}\n`);
  
  for (const model of models) {
    for (const technique of techniques) {
      console.log(`\n=== ${model.id} @ ${model.anchor}mo — ${technique} ===`);
      process.stdout.write('');
      
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
