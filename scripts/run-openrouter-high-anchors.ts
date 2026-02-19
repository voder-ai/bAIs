// @ts-nocheck
/**
 * Run high anchor conditions for OpenRouter models
 * To complete disclosure comparison
 */
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { appendFile } from 'node:fs/promises';

const MODELS = [
  { id: 'openrouter/meta-llama/llama-3.3-70b-instruct', baseline: 12.0, highAnchor: 21 },
  { id: 'openrouter/openai/o1', baseline: null, highAnchor: 33 },
  { id: 'openrouter/openai/o3-mini', baseline: null, highAnchor: 33 },
  { id: 'openrouter/minimax/minimax-m2.1', baseline: null, highAnchor: 33 },
];

const N_TRIALS = 15;
const RESULTS_FILE = 'results/openrouter-high-anchors.jsonl';

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
  const numMatch = response.match(/(\d+)\s*months?/i);
  return numMatch ? parseInt(numMatch[1], 10) : null;
}

async function runModel(modelId: string, anchor: number): Promise<number[]> {
  console.log(`\n--- ${modelId} (${anchor}mo anchor) ---`);
  
  const spec = parseModelSpec(modelId);
  let provider;
  try {
    provider = await createProvider(spec, 0);
  } catch (e: any) {
    console.log(`ERROR creating provider: ${e.message}`);
    return [];
  }
  
  const results: number[] = [];
  const prompt = makePrompt(anchor);
  
  for (let i = 0; i < N_TRIALS; i++) {
    try {
      const response = await provider.sendText({ prompt });
      const sentence = extractSentence(response);
      
      if (sentence !== null) {
        results.push(sentence);
        
        const record = {
          experimentId: 'simplified-prompt-high',
          model: modelId,
          conditionId: `anchor-${anchor}mo`,
          anchor,
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
  
  if (results.length > 0) {
    const mean = results.reduce((a, b) => a + b, 0) / results.length;
    console.log(`\nResult: ${mean.toFixed(1)}mo (n=${results.length})`);
  }
  
  return results;
}

async function main() {
  console.log('=== OpenRouter Models - High Anchors ===\n');
  
  for (const model of MODELS) {
    await runModel(model.id, model.highAnchor);
  }
  
  console.log('\n=== Complete ===');
}

main().catch(console.error);
