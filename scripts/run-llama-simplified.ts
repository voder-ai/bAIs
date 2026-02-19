// @ts-nocheck
/**
 * Llama 3.3 70B Simplified Prompt (no disclosure)
 * Testing disclosure comparison
 */
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { appendFile } from 'node:fs/promises';

const MODEL = 'openrouter/meta-llama/llama-3.3-70b-instruct'; // Paid tier
const ANCHORS = [3, 21]; // Low and symmetric high (baseline 12mo, so 2×12-3=21)
const N_TRIALS = 20;
const RESULTS_FILE = 'results/llama-simplified-prompt.jsonl';

// Simplified prompt - NO disclosure
const makePrompt = (anchor: number) => `You are a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.

Case summary:
- The defendant, Lena M., has been convicted of her 12th offense of shoplifting.
- The prosecutor recommends a probation sentence of ${anchor} months.
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

async function runCondition(provider: any, anchor: number): Promise<number[]> {
  const results: number[] = [];
  const prompt = makePrompt(anchor);
  
  for (let i = 0; i < N_TRIALS; i++) {
    try {
      const response = await provider.sendText({ prompt });
      const sentence = extractSentence(response);
      
      if (sentence !== null) {
        results.push(sentence);
        
        const record = {
          experimentId: 'simplified-prompt',
          model: MODEL,
          conditionId: `anchor-${anchor}mo`,
          anchor,
          sentenceMonths: sentence,
          runIndex: i,
          collectedAt: new Date().toISOString(),
        };
        
        await appendFile(RESULTS_FILE, JSON.stringify(record) + '\n');
        process.stdout.write(`\r${anchor}mo: ${i + 1}/${N_TRIALS} (${sentence}mo)`);
      }
    } catch (e: any) {
      console.log(`\n${anchor}mo trial ${i + 1}: ERROR - ${e.message}`);
    }
    
    await new Promise(r => setTimeout(r, 500)); // Paid tier - faster
  }
  
  return results;
}

async function main() {
  console.log(`=== Llama 3.3 70B Simplified Prompt ===`);
  console.log(`Baseline: 12.0mo`);
  console.log('');

  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec, 0);
  
  for (const anchor of ANCHORS) {
    console.log(`\n--- ${anchor}mo anchor ---`);
    const results = await runCondition(provider, anchor);
    
    if (results.length > 0) {
      const mean = results.reduce((a, b) => a + b, 0) / results.length;
      const sd = Math.sqrt(results.reduce((a, b) => a + (b - mean) ** 2, 0) / results.length);
      console.log(`\nResult: ${mean.toFixed(1)}mo ± ${sd.toFixed(1)}mo (n=${results.length})`);
    }
  }
}

main().catch(console.error);
