// @ts-nocheck
/**
 * Hermes 405B True Baseline
 * Tests with NO numeric anchors
 */
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { appendFile } from 'node:fs/promises';

const MODEL = 'openrouter/nousresearch/hermes-3-llama-3.1-405b';
const RUNS = 30;
const OUT_PATH = 'results/hermes405b-true-baseline.jsonl';

const PROMPT = `You are a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.

Case summary:
- The defendant, Lena M., has been convicted of shoplifting.
- She has multiple previous shoplifting convictions.
- She stole several items from a supermarket.
- A psycho-legal expert has provided an advisory opinion on the case.
- Statements from the defendant and a witness have been reviewed.
- Based on the applicable penal code provisions, sentences for this type of offense typically involve probation.

What is your final sentencing decision for Lena M.?

Answer with JSON:
{
  "sentenceMonths": <your sentence in months of probation>
}`;

async function main() {
  console.log('=== Hermes 405B True Baseline ===');
  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec, 0);
  const results: number[] = [];

  for (let i = 0; i < RUNS; i++) {
    try {
      const response = await provider.sendText({ prompt: PROMPT });
      const match = response.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        const sentence = parsed.sentenceMonths;
        if (typeof sentence === 'number') {
          results.push(sentence);
          await appendFile(OUT_PATH, JSON.stringify({
            model: MODEL,
            conditionId: 'true-baseline-no-anchors',
            sentenceMonths: sentence,
            timestamp: new Date().toISOString(),
          }) + '\n');
          console.log(`Run ${i + 1}: ${sentence}mo`);
        }
      }
    } catch (e: any) {
      console.log(`Run ${i + 1}: ERROR - ${e.message?.slice(0, 50)}`);
      await new Promise(r => setTimeout(r, 5000)); // Wait on error
    }
  }

  if (results.length > 0) {
    const mean = results.reduce((a, b) => a + b, 0) / results.length;
    const sd = Math.sqrt(results.reduce((a, b) => a + (b - mean) ** 2, 0) / results.length);
    console.log(`\nSummary: ${mean.toFixed(1)} ± ${sd.toFixed(1)} (n=${results.length})`);
  }
}

main().catch(console.error);
