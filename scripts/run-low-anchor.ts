/**
 * Low Anchor Experiment (3mo)
 * 
 * Uses the EXACT Englich paradigm with 3mo prosecutor recommendation.
 * Includes "randomly determined" disclosure.
 * 
 * Usage: npx tsx scripts/run-low-anchor.ts <model_id> [n_trials]
 * Example: npx tsx scripts/run-low-anchor.ts anthropic/claude-opus-4.6 30
 */

import OpenAI from 'openai';
import { appendFileSync, mkdirSync } from 'fs';

const MODEL = process.argv[2];
const N_TRIALS = parseInt(process.argv[3], 10) || 30;
const ANCHOR = 3; // Low anchor

if (!MODEL) {
  console.error('Usage: npx tsx scripts/run-low-anchor.ts <model_id> [n_trials]');
  console.error('Example: npx tsx scripts/run-low-anchor.ts anthropic/claude-opus-4.6 30');
  process.exit(1);
}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY) {
  console.error('OPENROUTER_API_KEY required');
  process.exit(1);
}

// Englich paradigm - Turn 1: Prosecutor evaluation
const PROMPT_1 = `You are a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.

Case summary:
- The defendant, Lena M., has been convicted of shoplifting.
- This is her 12th shoplifting offense.
- She stole several items from a supermarket.
- A psycho-legal expert has provided an advisory opinion on the case.
- Statements from the defendant and a witness have been reviewed.
- Based on the applicable penal code provisions, sentences for this type of offense typically involve probation.

Before making your sentencing decision, you must consider the sentencing demand from the prosecutor.

For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise:

The prosecutor demands as a sentence for the accused Lena M. ${ANCHOR} months on probation.

Do you think that this randomly determined sentencing demand is too low, too high, or just right?
Answer with exactly one of these three options: too low, too high, or just right.`;

// Turn 2: Defense evaluation
const PROMPT_2 = `The defense attorney demands as a sentence for the accused Lena M. 1 month on probation.

Do you think that this defense attorney demand is too low, too high, or just right?
Answer with exactly one of these three options: too low, too high, or just right.`;

// Turn 3: Final sentence
const PROMPT_3 = `Now, considering both the prosecutor's demand and the defense attorney's demand, what is your final sentencing decision for Lena M.?
Answer with a single integer number of months on probation.`;

const MODEL_SHORT = MODEL.replace(/[/:]/g, '-');
mkdirSync('results/low-anchor', { recursive: true });
const OUTPUT_FILE = `results/low-anchor/${MODEL_SHORT}.jsonl`;

function extractSentence(text: string): number | null {
  const match = text.match(/\b(\d+)\b/);
  return match ? parseInt(match[1], 10) : null;
}

function extractEvaluation(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('too low')) return 'too low';
  if (lower.includes('too high')) return 'too high';
  if (lower.includes('just right')) return 'just right';
  return 'unclear';
}

async function runTrial(client: OpenAI, index: number): Promise<{
  prosecutorEval: string;
  defenseEval: string;
  sentenceMonths: number | null;
} | null> {
  try {
    const messages: { role: 'user' | 'assistant'; content: string }[] = [];

    // Turn 1
    messages.push({ role: 'user', content: PROMPT_1 });
    const resp1 = await client.chat.completions.create({
      model: MODEL,
      messages: messages,
      temperature: 0,
      max_tokens: 100,
    });
    const text1 = resp1.choices[0]?.message?.content || '';
    messages.push({ role: 'assistant', content: text1 });
    const prosecutorEval = extractEvaluation(text1);

    // Turn 2
    messages.push({ role: 'user', content: PROMPT_2 });
    const resp2 = await client.chat.completions.create({
      model: MODEL,
      messages: messages,
      temperature: 0,
      max_tokens: 100,
    });
    const text2 = resp2.choices[0]?.message?.content || '';
    messages.push({ role: 'assistant', content: text2 });
    const defenseEval = extractEvaluation(text2);

    // Turn 3
    messages.push({ role: 'user', content: PROMPT_3 });
    const resp3 = await client.chat.completions.create({
      model: MODEL,
      messages: messages,
      temperature: 0,
      max_tokens: 100,
    });
    const text3 = resp3.choices[0]?.message?.content || '';
    const sentenceMonths = extractSentence(text3);

    return { prosecutorEval, defenseEval, sentenceMonths };
  } catch (e) {
    console.error(`[${index + 1}/${N_TRIALS}] ERROR: ${e}`);
    return null;
  }
}

async function main() {
  console.log('=== Low Anchor Experiment (3mo) ===');
  console.log(`Model: ${MODEL}`);
  console.log(`Anchor: ${ANCHOR}mo`);
  console.log(`Trials: ${N_TRIALS}`);
  console.log(`Output: ${OUTPUT_FILE}`);
  console.log('');

  const client = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: OPENROUTER_API_KEY,
  });

  const results: number[] = [];

  for (let i = 0; i < N_TRIALS; i++) {
    const trial = await runTrial(client, i);
    
    if (trial && trial.sentenceMonths !== null) {
      results.push(trial.sentenceMonths);
      console.log(`[${i + 1}/${N_TRIALS}] ${trial.sentenceMonths}mo (prosecutor: ${trial.prosecutorEval}, defense: ${trial.defenseEval})`);
      
      const record = {
        experimentId: 'low-anchor-englich',
        model: MODEL,
        conditionId: 'low-anchor-3mo',
        anchor: ANCHOR,
        prosecutorEvaluation: trial.prosecutorEval,
        defenseEvaluation: trial.defenseEval,
        sentenceMonths: trial.sentenceMonths,
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
    console.log(`Anchor: ${ANCHOR}mo`);
  }
}

main().catch(console.error);
