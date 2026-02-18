// @ts-nocheck
/**
 * True Baseline Experiment
 * Tests responses with NO numeric anchors at all
 * - No prosecutor recommendation
 * - "Multiple previous offenses" instead of "12th"
 */
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { appendFile } from 'node:fs/promises';

const MODELS = [
  'openrouter/anthropic/claude-opus-4-5',
  'openrouter/openai/o3-mini',
];

const RUNS_PER_MODEL = 30;
const OUT_PATH = 'results/true-baseline-no-anchors.jsonl';

// Vignette with NO numeric anchors
const TRUE_BASELINE_PROMPT = `You are a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.

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

async function extractSentence(response: string): Promise<number | null> {
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
  console.log('=== True Baseline Experiment ===');
  console.log('Testing with NO numeric anchors');
  console.log(`Models: ${MODELS.join(', ')}`);
  console.log(`Runs per model: ${RUNS_PER_MODEL}`);
  console.log(`Output: ${OUT_PATH}`);
  console.log('');

  for (const modelSpec of MODELS) {
    console.log(`\n--- ${modelSpec} ---`);
    
    const spec = parseModelSpec(modelSpec);
    const provider = await createProvider(spec, 0);
    
    const results: number[] = [];
    
    for (let i = 0; i < RUNS_PER_MODEL; i++) {
      try {
        const response = await provider.sendText({ prompt: TRUE_BASELINE_PROMPT });
        const sentence = await extractSentence(response);
        
        if (sentence !== null) {
          results.push(sentence);
          
          // Log to file
          const entry = {
            model: modelSpec,
            conditionId: 'true-baseline-no-anchors',
            sentenceMonths: sentence,
            timestamp: new Date().toISOString(),
          };
          await appendFile(OUT_PATH, JSON.stringify(entry) + '\n');
          
          console.log(`  Run ${i + 1}: ${sentence}mo`);
        } else {
          console.log(`  Run ${i + 1}: FAILED to extract sentence`);
        }
      } catch (e: any) {
        console.log(`  Run ${i + 1}: ERROR - ${e.message}`);
      }
    }
    
    if (results.length > 0) {
      const mean = results.reduce((a, b) => a + b, 0) / results.length;
      const sd = Math.sqrt(results.reduce((a, b) => a + (b - mean) ** 2, 0) / results.length);
      console.log(`\n  Summary: ${mean.toFixed(1)} ± ${sd.toFixed(1)} (n=${results.length})`);
    }
  }

  console.log('\n=== Complete ===');
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
