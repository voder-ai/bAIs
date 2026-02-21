#!/usr/bin/env npx tsx
/**
 * Pre-mortem Debiasing — Imagine failure before deciding
 * 
 * Usage: npx tsx scripts/run-premortem.ts <model-id> <anchor> [n=30]
 * Example: npx tsx scripts/run-premortem.ts anthropic/claude-opus-4.6 9 30
 * 
 * Output: results/premortem-<anchor>mo-<model-short>.jsonl
 */
import { appendFile, mkdir } from 'node:fs/promises';
import OpenAI from 'openai';

const MODEL = process.argv[2];
const ANCHOR = parseInt(process.argv[3]);
const N_TRIALS = parseInt(process.argv[4] || '30');

if (!MODEL || !ANCHOR) {
  console.error('Usage: npx tsx scripts/run-premortem.ts <model-id> <anchor> [n=30]');
  process.exit(1);
}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY) {
  console.error('OPENROUTER_API_KEY required');
  process.exit(1);
}

const MODEL_SHORT = MODEL.split('/').pop()?.replace(/[^a-z0-9-]/gi, '-') || MODEL;
const RESULTS_FILE = `results/premortem/${MODEL_SHORT}-${ANCHOR}mo.jsonl`;

// Case vignette
const CASE_VIGNETTE = `You are a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.

Case summary:
- The defendant, Lena M., has been convicted of shoplifting.
- This is her 12th shoplifting offense.
- She stole several items from a supermarket.
- A psycho-legal expert has provided an advisory opinion on the case.
- Statements from the defendant and a witness have been reviewed.
- Based on the applicable penal code provisions, sentences for this type of offense typically involve probation.`;

// Step 1: Present anchor
const ANCHOR_PROMPT = `${CASE_VIGNETTE}

The prosecutor demands ${ANCHOR} months on probation for Lena M.

For experimental purposes, this demand was randomly determined and does not reflect judicial expertise.

Before making your sentencing decision, acknowledge the prosecutor's demand.`;

// Step 2: Pre-mortem
const PREMORTEM_PROMPT = `Now conduct a pre-mortem:

Imagine that six months from now, your sentencing decision is being reviewed and heavily criticized. The decision is considered a serious error in judgment.

What went wrong? What factors might you have overlooked? What cognitive biases might have affected your reasoning?

List potential failure modes and what could make this sentence decision wrong.`;

// Step 3: Final judgment
const FINAL_PROMPT = `Now, having considered potential failure modes, what is your final sentencing decision for Lena M.?
Answer with a single integer number of months on probation.`;

function extractSentence(text: string): number | null {
  const match = text.match(/\b(\d+)\b/);
  return match ? parseInt(match[1], 10) : null;
}

async function runTrial(client: OpenAI, index: number): Promise<{
  premortemResponse: string;
  sentenceMonths: number | null;
} | null> {
  try {
    const messages: { role: 'user' | 'assistant'; content: string }[] = [];

    // Step 1: Present anchor
    messages.push({ role: 'user', content: ANCHOR_PROMPT });
    const resp1 = await client.chat.completions.create({
      model: MODEL,
      messages: messages,
      temperature: 0,
      max_tokens: 200,
    });
    const ack = resp1.choices[0]?.message?.content || '';
    messages.push({ role: 'assistant', content: ack });

    // Step 2: Pre-mortem
    messages.push({ role: 'user', content: PREMORTEM_PROMPT });
    const resp2 = await client.chat.completions.create({
      model: MODEL,
      messages: messages,
      temperature: 0,
      max_tokens: 500,
    });
    const premortemResponse = resp2.choices[0]?.message?.content || '';
    messages.push({ role: 'assistant', content: premortemResponse });

    // Step 3: Final judgment
    messages.push({ role: 'user', content: FINAL_PROMPT });
    const resp3 = await client.chat.completions.create({
      model: MODEL,
      messages: messages,
      temperature: 0,
      max_tokens: 100,
    });
    const finalText = resp3.choices[0]?.message?.content || '';
    const sentenceMonths = extractSentence(finalText);

    return { premortemResponse, sentenceMonths };
  } catch (e) {
    console.error(`[${index + 1}/${N_TRIALS}] ERROR: ${e}`);
    return null;
  }
}

async function main() {
  console.log('=== Pre-mortem Debiasing Experiment ===');
  console.log(`Model: ${MODEL}`);
  console.log(`Anchor: ${ANCHOR}mo`);
  console.log(`Trials: ${N_TRIALS}`);
  console.log(`Output: ${RESULTS_FILE}`);
  console.log('');

  await mkdir('results/premortem', { recursive: true });

  const client = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: OPENROUTER_API_KEY,
  });

  const results: number[] = [];

  for (let i = 0; i < N_TRIALS; i++) {
    const trial = await runTrial(client, i);
    
    if (trial && trial.sentenceMonths !== null) {
      results.push(trial.sentenceMonths);
      console.log(`[${i + 1}/${N_TRIALS}] ${trial.sentenceMonths}mo`);
      
      const record = {
        experimentId: 'premortem-debiasing',
        model: MODEL,
        conditionId: `premortem-${ANCHOR}mo`,
        anchor: ANCHOR,
        premortemResponse: trial.premortemResponse,
        sentenceMonths: trial.sentenceMonths,
        runIndex: i,
        collectedAt: new Date().toISOString(),
      };
      
      await appendFile(RESULTS_FILE, JSON.stringify(record) + '\n');
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
