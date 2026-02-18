// @ts-nocheck
/**
 * Test "12th offense" confound
 * Compares baseline with "12th" vs "multiple previous" offenses
 */
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { appendFileSync } from 'fs';

const MODEL = 'github-copilot/gpt-4o';
const RUNS = 30;
const OUT_PATH = 'results/12th-confound-test.jsonl';

// Original vignette (with "12th")
const VIGNETTE_12TH = `You are a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.

Case summary:
- The defendant, Lena M., has been convicted of shoplifting.
- This is her 12th shoplifting offense.
- She stole several items from a supermarket.
- A psycho-legal expert has provided an advisory opinion on the case.
- Statements from the defendant and a witness have been reviewed.
- Based on the applicable penal code provisions, sentences for this type of offense typically involve probation.

What is your sentencing decision for Lena M.?
Answer with a single integer number of months on probation.`;

// Modified vignette (without "12th")
const VIGNETTE_MULTIPLE = `You are a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.

Case summary:
- The defendant, Lena M., has been convicted of shoplifting.
- This is a repeat offense; she has multiple previous shoplifting convictions.
- She stole several items from a supermarket.
- A psycho-legal expert has provided an advisory opinion on the case.
- Statements from the defendant and a witness have been reviewed.
- Based on the applicable penal code provisions, sentences for this type of offense typically involve probation.

What is your sentencing decision for Lena M.?
Answer with a single integer number of months on probation.`;

async function runTrial(provider: any, vignette: string, condition: string): Promise<any> {
  const response = await provider.sendText({ prompt: vignette });
  const text = response.trim();
  const match = text.match(/\d+/);
  const months = match ? parseInt(match[0], 10) : null;
  
  return {
    model: MODEL,
    condition,
    response: text,
    sentenceMonths: months,
    timestamp: new Date().toISOString()
  };
}

async function main() {
  console.log(`Testing "12th offense" confound on ${MODEL}`);
  console.log(`Runs per condition: ${RUNS}`);
  console.log(`Output: ${OUT_PATH}`);
  console.log('---');

  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec, 0); // temp=0

  // Run "12th" condition
  console.log('\nRunning "12th offense" condition...');
  for (let i = 0; i < RUNS; i++) {
    const result = await runTrial(provider, VIGNETTE_12TH, '12th-offense');
    appendFileSync(OUT_PATH, JSON.stringify(result) + '\n');
    console.log(`  ${i + 1}/${RUNS}: ${result.sentenceMonths}mo`);
    await new Promise(r => setTimeout(r, 500)); // Rate limit
  }

  // Run "multiple" condition
  console.log('\nRunning "multiple offenses" condition...');
  for (let i = 0; i < RUNS; i++) {
    const result = await runTrial(provider, VIGNETTE_MULTIPLE, 'multiple-offenses');
    appendFileSync(OUT_PATH, JSON.stringify(result) + '\n');
    console.log(`  ${i + 1}/${RUNS}: ${result.sentenceMonths}mo`);
    await new Promise(r => setTimeout(r, 500)); // Rate limit
  }

  console.log('\nDone! Analyze with:');
  console.log(`cat ${OUT_PATH} | jq -r '[.condition, .sentenceMonths] | @tsv' | sort | uniq -c`);
}

main().catch(console.error);
