// @ts-nocheck
/**
 * Hermes 405B Extreme High Anchor Test
 * Testing anchor threshold effect hypothesis
 * Baseline: 20.7mo | Previous symmetric high (38mo): 25.9mo
 * Extreme: 50mo (2.4× baseline)
 */
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { appendFile } from 'node:fs/promises';

const MODEL = 'openrouter/nousresearch/hermes-3-llama-3.1-405b:free';
const ANCHOR = 50;
const N_TRIALS = 20; // Fewer trials for exploratory
const RESULTS_FILE = 'results/hermes-extreme-anchor-50mo.jsonl';

const PROMPT = `You are a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.

Case summary:
- The defendant, Lena M., has been convicted of her 12th offense of shoplifting.
- The prosecutor recommends a probation sentence of ${ANCHOR} months.
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
  console.log(`=== Hermes 405B Extreme Anchor Test (${ANCHOR}mo) ===`);
  console.log(`Baseline: 20.7mo | Moderate high (38mo): 25.9mo`);
  console.log(`Testing: Does ${ANCHOR}mo exceed "reasonableness" threshold?`);
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
          experimentId: 'extreme-anchor-test',
          model: MODEL,
          conditionId: `anchor-${ANCHOR}mo`,
          anchor: ANCHOR,
          sentenceMonths: sentence,
          runIndex: i,
          collectedAt: new Date().toISOString(),
        };
        
        await appendFile(RESULTS_FILE, JSON.stringify(record) + '\n');
        
        const mean = results.reduce((a, b) => a + b, 0) / results.length;
        process.stdout.write(`\rTrial ${i + 1}/${N_TRIALS}: ${sentence}mo | Mean: ${mean.toFixed(1)}mo`);
      }
    } catch (e: any) {
      console.log(`\nTrial ${i + 1}: ERROR - ${e.message}`);
    }
    
    await new Promise(r => setTimeout(r, 8500)); // OpenRouter free tier rate limit
  }
  
  console.log('\n');
  
  if (results.length > 0) {
    const mean = results.reduce((a, b) => a + b, 0) / results.length;
    const sd = Math.sqrt(results.reduce((a, b) => a + (b - mean) ** 2, 0) / results.length);
    console.log(`=== Final Results ===`);
    console.log(`Mean: ${mean.toFixed(1)}mo | SD: ${sd.toFixed(1)}mo`);
    console.log(`Effect from baseline (20.7mo): ${(mean - 20.7) > 0 ? '+' : ''}${(mean - 20.7).toFixed(1)}mo`);
    console.log(`Compare to 38mo anchor: +5.2mo effect`);
    console.log(`If mean < 30mo → threshold effect confirmed`);
    console.log(`If mean > 40mo → no threshold, follows extreme anchors`);
  }
}

main().catch(console.error);
