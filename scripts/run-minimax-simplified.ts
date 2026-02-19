// @ts-nocheck
/**
 * MiniMax Simplified Prompt
 */
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { appendFile } from 'node:fs/promises';

const MODEL = 'openrouter/minimax/minimax-m2.1';
const ANCHOR = 3;
const N_TRIALS = 15;
const RESULTS_FILE = 'results/minimax-simplified-prompt.jsonl';

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
  console.log(`=== MiniMax M2.1 Simplified Prompt ===`);
  
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
          experimentId: 'simplified-prompt',
          model: MODEL,
          conditionId: `anchor-${ANCHOR}mo`,
          anchor: ANCHOR,
          sentenceMonths: sentence,
          runIndex: i,
          collectedAt: new Date().toISOString(),
        };
        
        await appendFile(RESULTS_FILE, JSON.stringify(record) + '\n');
        process.stdout.write(`\r${i + 1}/${N_TRIALS}: ${sentence}mo`);
      }
    } catch (e: any) {
      console.log(`\nTrial ${i + 1}: ERROR - ${e.message.slice(0, 100)}`);
    }
    
    await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log('\n');
  
  if (results.length > 0) {
    const mean = results.reduce((a, b) => a + b, 0) / results.length;
    console.log(`Result: ${mean.toFixed(1)}mo (n=${results.length})`);
  }
}

main().catch(console.error);
