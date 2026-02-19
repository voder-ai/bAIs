// @ts-nocheck
/**
 * GPT-4o with Simplified Prompt (no disclosure)
 * Testing if disclosure effect generalizes beyond Opus
 */
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { appendFile } from 'node:fs/promises';

const MODEL = 'github-copilot/gpt-4o';
const ANCHORS = [3, 33]; // Low and high
const N_TRIALS = 20; // Per condition
const RESULTS_FILE = 'results/gpt4o-simplified-prompt.jsonl';

// Simplified prompt - NO "randomly determined" disclaimer
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
    
    await new Promise(r => setTimeout(r, 300));
  }
  
  return results;
}

async function main() {
  console.log(`=== GPT-4o Simplified Prompt (no disclosure) ===`);
  console.log(`Model: ${MODEL}`);
  console.log(`Testing: Does disclosure effect generalize?`);
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
  
  console.log('\n\n=== Summary ===');
  console.log('Compare with Englich prompt (with disclosure) data');
  console.log('If simplified shows higher anchoring effect → disclosure is the key');
}

main().catch(console.error);
