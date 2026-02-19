// @ts-nocheck
/**
 * Opus Symmetric High Anchor Experiment
 * Baseline: 18mo → Symmetric high = 2 × 18 - 3 = 33mo
 */
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { appendFile } from 'node:fs/promises';

const MODEL = 'anthropic/claude-opus-4-5-20251101';
const ANCHOR = 33; // Symmetric high: 2 × baseline - low = 2 × 18 - 3 = 33
const N_TRIALS = 30;
const RESULTS_FILE = 'results/opus-symmetric-high-33mo.jsonl';

// Same prompt structure as other anchoring experiments
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
  const numMatch = response.match(/(\d+)\s*months?/i);
  return numMatch ? parseInt(numMatch[1], 10) : null;
}

async function main() {
  console.log(`=== Opus Symmetric High Anchor (${ANCHOR}mo) ===`);
  console.log(`Model: ${MODEL}`);
  console.log(`Trials: ${N_TRIALS}`);
  console.log(`Baseline: 18mo → Effect should be +15mo if symmetric`);
  console.log(`Output: ${RESULTS_FILE}`);
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
          experimentId: 'symmetric-high-anchor',
          model: MODEL,
          conditionId: `anchor-${ANCHOR}mo`,
          anchor: ANCHOR,
          sentenceMonths: sentence,
          runIndex: i,
          collectedAt: new Date().toISOString(),
        };
        
        await appendFile(RESULTS_FILE, JSON.stringify(record) + '\n');
        
        const mean = results.reduce((a, b) => a + b, 0) / results.length;
        const sd = results.length > 1 
          ? Math.sqrt(results.reduce((a, b) => a + (b - mean) ** 2, 0) / results.length)
          : 0;
        
        process.stdout.write(`\rTrial ${i + 1}/${N_TRIALS}: ${sentence}mo | Mean: ${mean.toFixed(1)} ± ${sd.toFixed(1)}mo (n=${results.length})`);
      } else {
        console.log(`\nTrial ${i + 1}: FAILED to extract sentence`);
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
    const effect = mean - 18; // Baseline is 18mo
    console.log(`=== Final Results ===`);
    console.log(`Mean: ${mean.toFixed(1)}mo`);
    console.log(`SD: ${sd.toFixed(1)}mo`);
    console.log(`Effect from baseline (18mo): ${effect > 0 ? '+' : ''}${effect.toFixed(1)}mo`);
    console.log(`n: ${results.length}`);
    console.log(`Raw: [${results.join(', ')}]`);
  }
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
