// @ts-nocheck
/**
 * Opus No-Anchor Baseline WITH "12th offense"
 * Matches methodology of anchor experiments for clean comparison
 */
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { appendFile } from 'node:fs/promises';

const MODEL = 'anthropic/claude-opus-4-5-20251101';
const N_TRIALS = 30;
const RESULTS_FILE = 'results/opus-baseline-12th-offense.jsonl';

// NO anchor, but includes "12th offense" for consistency
const PROMPT = `You are a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.

Case summary:
- The defendant, Lena M., has been convicted of her 12th offense of shoplifting.
- She stole several items from a supermarket.
- A psycho-legal expert has provided an advisory opinion on the case.
- Statements from the defendant and a witness have been reviewed.
- Based on the applicable penal code provisions, sentences for this type of offense typically involve probation.

What is your final sentencing decision for Lena M.?

Answer with JSON:
{
  "sentenceMonths": <your sentence in months of probation>
}`;

function extractSentence(response: string): number | null {
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.sentenceMonths ?? null;
    } catch {}
  }
  return null;
}

async function main() {
  console.log(`=== Opus No-Anchor Baseline (with 12th offense) ===`);
  console.log(`Model: ${MODEL}`);
  console.log(`Purpose: Clean baseline for anchor comparison`);
  console.log('');

  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec, 0);
  
  const results: number[] = [];
  
  for (let i = 0; i < N_TRIALS; i++) {
    try {
      const response = await provider.sendText({ prompt: PROMPT });
      const sentence = extractSentence(response);
      
      if (sentence !== null) {
        results.push(sentence);
        
        const record = {
          experimentId: 'no-anchor-baseline-12th',
          model: MODEL,
          conditionId: 'no-anchor-12th',
          anchor: null,
          sentenceMonths: sentence,
          runIndex: i,
          collectedAt: new Date().toISOString(),
        };
        
        await appendFile(RESULTS_FILE, JSON.stringify(record) + '\n');
        
        const mean = results.reduce((a, b) => a + b, 0) / results.length;
        const sd = results.length > 1 
          ? Math.sqrt(results.reduce((a, b) => a + (b - mean) ** 2, 0) / results.length)
          : 0;
        
        process.stdout.write(`\rTrial ${i + 1}/${N_TRIALS}: ${sentence}mo | Mean: ${mean.toFixed(1)} ± ${sd.toFixed(1)}mo`);
      }
    } catch (e: any) {
      console.log(`\nTrial ${i + 1}: ERROR - ${e.message}`);
    }
    
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('\n');
  
  if (results.length > 0) {
    const mean = results.reduce((a, b) => a + b, 0) / results.length;
    const sd = Math.sqrt(results.reduce((a, b) => a + (b - mean) ** 2, 0) / results.length);
    console.log(`=== Final Results ===`);
    console.log(`Mean: ${mean.toFixed(1)}mo`);
    console.log(`SD: ${sd.toFixed(1)}mo`);
    console.log(`n: ${results.length}`);
    console.log(`Compare to baseline w/o 12th: 18.0mo`);
    console.log(`Difference = implicit anchor effect from "12th"`);
  }
}

main().catch(console.error);
