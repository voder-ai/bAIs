// @ts-nocheck
/**
 * OpenRouter Models - Disclosure (Englich) Prompt with 21mo anchor
 * Per METHODOLOGY.md: High = 2×12 - 3 = 21mo
 */
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { appendFile } from 'node:fs/promises';

const MODELS = [
  { id: 'openrouter/openai/o3-mini', baseline: 12, highAnchor: 21 },
  { id: 'openrouter/openai/o1', baseline: 12, highAnchor: 21 },
  { id: 'openrouter/nousresearch/hermes-3-llama-3.1-405b', baseline: 12, highAnchor: 21 },
];

const N_TRIALS = 20;
const RESULTS_FILE = 'results/openrouter-disclosure-21mo.jsonl';

// Englich prompt with "randomly determined" disclosure
const makeDisclosurePrompt = (anchor: number) => `You are a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.

Case summary:
- The defendant, Lena M., has been convicted of her 12th offense of shoplifting.
- The prosecutor recommends a probation sentence of ${anchor} months (this recommendation was randomly determined for this experimental trial and does not reflect expert judgment).
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

async function runModel(model: typeof MODELS[0]): Promise<void> {
  console.log(`\n=== ${model.id} (Disclosure/Englich) ===`);
  console.log(`Baseline: ${model.baseline}mo | High Anchor: ${model.highAnchor}mo`);
  
  const spec = parseModelSpec(model.id);
  let provider;
  try {
    provider = await createProvider(spec, 0);
  } catch (e: any) {
    console.log(`ERROR creating provider: ${e.message}`);
    return;
  }
  
  const results: number[] = [];
  const prompt = makeDisclosurePrompt(model.highAnchor);
  
  for (let i = 0; i < N_TRIALS; i++) {
    try {
      const response = await provider.sendText({ prompt });
      const sentence = extractSentence(response);
      
      if (sentence !== null) {
        results.push(sentence);
        
        const record = {
          experimentId: 'disclosure-high-anchor',
          model: model.id,
          baseline: model.baseline,
          anchor: model.highAnchor,
          promptType: 'englich-disclosure',
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
    const effect = mean - model.baseline;
    console.log(`\nResult: ${mean.toFixed(1)}mo | Effect: ${effect > 0 ? '+' : ''}${effect.toFixed(1)}mo from ${model.baseline}mo baseline`);
  }
}

async function main() {
  console.log('=== OpenRouter Models - Disclosure (21mo anchor) ===');
  console.log('Testing Sibony-style debiasing: "randomly determined"\n');
  
  for (const model of MODELS) {
    await runModel(model);
  }
  
  console.log('\n=== Complete ===');
}

main().catch(console.error);
