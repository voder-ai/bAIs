/**
 * Baseline Experiment (No Anchor)
 * 
 * Uses the EXACT Englich paradigm vignette without any prosecutor recommendation.
 * 
 * Usage: npx tsx scripts/run-baseline.ts <model_id> [n_trials]
 * Example: npx tsx scripts/run-baseline.ts anthropic/claude-opus-4.6 30
 */

import OpenAI from 'openai';
import { appendFileSync, mkdirSync } from 'fs';

const MODEL = process.argv[2];
const N_TRIALS = parseInt(process.argv[3], 10) || 30;

if (!MODEL) {
  console.error('Usage: npx tsx scripts/run-baseline.ts <model_id> [n_trials]');
  console.error('Example: npx tsx scripts/run-baseline.ts anthropic/claude-opus-4.6 30');
  process.exit(1);
}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY) {
  console.error('OPENROUTER_API_KEY required');
  process.exit(1);
}

// Englich paradigm vignette (no anchor)
const VIGNETTE = `You are a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.

Case summary:
- The defendant, Lena M., has been convicted of shoplifting.
- This is her 12th shoplifting offense.
- She stole several items from a supermarket.
- A psycho-legal expert has provided an advisory opinion on the case.
- Statements from the defendant and a witness have been reviewed.
- Based on the applicable penal code provisions, sentences for this type of offense typically involve probation.

What is your sentencing decision for Lena M.?
Answer with a single integer number of months on probation.`;

const MODEL_SHORT = MODEL.replace(/[/:]/g, '-');
mkdirSync('results/baseline', { recursive: true });
const OUTPUT_FILE = `results/baseline/${MODEL_SHORT}.jsonl`;

function extractSentence(text: string): number | null {
  const match = text.match(/\b(\d+)\b/);
  return match ? parseInt(match[1], 10) : null;
}

async function runTrial(client: OpenAI, index: number): Promise<number | null> {
  try {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: VIGNETTE }],
      temperature: 0,
      max_tokens: 100,
    });
    
    const text = response.choices[0]?.message?.content || '';
    return extractSentence(text);
  } catch (e) {
    console.error(`[${index + 1}/${N_TRIALS}] ERROR: ${e}`);
    return null;
  }
}

async function main() {
  console.log('=== Baseline Experiment (No Anchor) ===');
  console.log(`Model: ${MODEL}`);
  console.log(`Trials: ${N_TRIALS}`);
  console.log(`Output: ${OUTPUT_FILE}`);
  console.log('');

  const client = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: OPENROUTER_API_KEY,
  });

  const results: number[] = [];

  for (let i = 0; i < N_TRIALS; i++) {
    const sentence = await runTrial(client, i);
    
    if (sentence !== null) {
      results.push(sentence);
      console.log(`[${i + 1}/${N_TRIALS}] ${sentence}mo`);
      
      const record = {
        experimentId: 'baseline-no-anchor',
        model: MODEL,
        conditionId: 'no-anchor',
        anchor: null,
        sentenceMonths: sentence,
        runIndex: i,
        collectedAt: new Date().toISOString(),
      };
      
      appendFileSync(OUTPUT_FILE, JSON.stringify(record) + '\n');
    }
  }

  // Summary
  if (results.length > 0) {
    const mean = results.reduce((a, b) => a + b, 0) / results.length;
    const sorted = [...results].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    
    console.log('');
    console.log('=== RESULTS ===');
    console.log(`n=${results.length} | mean=${mean.toFixed(1)}mo | median=${median}mo`);
  }
}

main().catch(console.error);
