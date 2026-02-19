// @ts-nocheck
/**
 * Opus No-Anchor Baseline using pi-ai
 * Uses the existing createProvider which handles OAuth automatically
 */
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { appendFile } from 'node:fs/promises';

const MODEL = 'anthropic/claude-opus-4-5-20251101';
const N_TRIALS = 30;
const RESULTS_FILE = 'results/opus-no-anchor-baseline-piai.jsonl';

// No-anchor prompt - exactly matches other baseline experiments
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

function extractSentence(response: string): number | null {
  // Try to parse JSON
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.sentenceMonths ?? null;
    } catch {}
  }
  
  // Fallback: look for number
  const numMatch = response.match(/(\d+)\s*months?/i);
  return numMatch ? parseInt(numMatch[1], 10) : null;
}

async function main() {
  console.log(`=== Opus No-Anchor Baseline ===`);
  console.log(`Model: ${MODEL}`);
  console.log(`Trials: ${N_TRIALS}`);
  console.log(`Output: ${RESULTS_FILE}`);
  console.log('');

  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec, 0); // temperature 0
  
  const results: number[] = [];
  
  for (let i = 0; i < N_TRIALS; i++) {
    try {
      const response = await provider.sendText({ prompt: PROMPT });
      const sentence = extractSentence(response);
      
      if (sentence !== null) {
        results.push(sentence);
        
        const record = {
          experimentId: 'no-anchor-baseline',
          model: MODEL,
          conditionId: 'no-anchor',
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
        
        process.stdout.write(`\rTrial ${i + 1}/${N_TRIALS}: ${sentence}mo | Running mean: ${mean.toFixed(1)} ± ${sd.toFixed(1)}mo (n=${results.length})`);
      } else {
        console.log(`\nTrial ${i + 1}: FAILED to extract sentence from response`);
      }
    } catch (e: any) {
      console.log(`\nTrial ${i + 1}: ERROR - ${e.message}`);
    }
    
    // Small delay to avoid rate limits
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
    console.log(`Raw: [${results.join(', ')}]`);
  }
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
