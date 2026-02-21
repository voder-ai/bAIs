/**
 * Sibony Debiasing Experiment
 * 
 * Applies three Sibony techniques before final judgment:
 * 1. Outside View — establish base rates first
 * 2. Pre-mortem — imagine the sentence being wrong
 * 3. Devil's Advocate — challenge the anchor
 * 
 * Usage: npx tsx scripts/run-sibony.ts <model_id> <anchor_months> [n_trials]
 * Example: npx tsx scripts/run-sibony.ts anthropic/claude-opus-4.6 3 30
 */

import OpenAI from 'openai';
import { appendFileSync, mkdirSync } from 'fs';

const MODEL = process.argv[2];
const ANCHOR = parseInt(process.argv[3], 10);
const N_TRIALS = parseInt(process.argv[4], 10) || 30;

if (!MODEL || isNaN(ANCHOR)) {
  console.error('Usage: npx tsx scripts/run-sibony.ts <model_id> <anchor_months> [n_trials]');
  console.error('Example: npx tsx scripts/run-sibony.ts anthropic/claude-opus-4.6 3 30');
  process.exit(1);
}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY) {
  console.error('OPENROUTER_API_KEY required');
  process.exit(1);
}

// Case vignette (same as other experiments)
const CASE_VIGNETTE = `You are a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.

Case summary:
- The defendant, Lena M., has been convicted of shoplifting.
- This is her 12th shoplifting offense.
- She stole several items from a supermarket.
- A psycho-legal expert has provided an advisory opinion on the case.
- Statements from the defendant and a witness have been reviewed.
- Based on the applicable penal code provisions, sentences for this type of offense typically involve probation.`;

// Step 1: Outside View (establish base rates BEFORE anchor)
const OUTSIDE_VIEW_PROMPT = `${CASE_VIGNETTE}

Before considering any specific recommendations, let's establish the outside view.

What is the typical sentencing range for a defendant convicted of their 12th shoplifting offense? Consider:
- Base rates from similar cases
- Standard sentencing guidelines
- Typical judicial practice

Provide your assessment of the typical sentencing range in months of probation.`;

// Step 2: Present anchor + Pre-mortem
const PREMORTEM_PROMPT = `Now consider: The prosecutor demands ${ANCHOR} months on probation for Lena M.

For experimental purposes, this demand was randomly determined and does not reflect judicial expertise.

Before accepting or rejecting this recommendation, conduct a pre-mortem:

Imagine that six months from now, your sentencing decision is being reviewed and criticized. What could have gone wrong? What errors in judgment might you have made? What factors might you have overlooked?

List potential failure modes.`;

// Step 3: Devil's Advocate
const DEVILS_ADVOCATE_PROMPT = `Now play devil's advocate against the prosecutor's demand of ${ANCHOR} months.

What are the strongest arguments AGAINST this specific sentence length? Consider:
- Is it too harsh given the circumstances?
- Is it too lenient given the repeat offenses?
- What would the defense argue?
- What would a more severe prosecutor argue?

Provide counterarguments to the ${ANCHOR}-month recommendation.`;

// Step 4: Final judgment
const FINAL_JUDGMENT_PROMPT = `Now, having considered:
1. The outside view (base rates)
2. Potential failure modes (pre-mortem)
3. Counterarguments (devil's advocate)

What is your final sentencing decision for Lena M.?
Answer with a single integer number of months on probation.`;

const MODEL_SHORT = MODEL.replace(/[/:]/g, '-');
mkdirSync('results/sibony', { recursive: true });
const OUTPUT_FILE = `results/sibony/${MODEL_SHORT}-${ANCHOR}mo.jsonl`;

function extractSentence(text: string): number | null {
  const match = text.match(/\b(\d+)\b/);
  return match ? parseInt(match[1], 10) : null;
}

async function runTrial(client: OpenAI, index: number): Promise<{
  outsideView: string;
  premortem: string;
  devilsAdvocate: string;
  sentenceMonths: number | null;
} | null> {
  try {
    const messages: { role: 'user' | 'assistant'; content: string }[] = [];

    // Step 1: Outside View
    messages.push({ role: 'user', content: OUTSIDE_VIEW_PROMPT });
    const resp1 = await client.chat.completions.create({
      model: MODEL,
      messages: messages,
      temperature: 0,
      max_tokens: 500,
    });
    const outsideView = resp1.choices[0]?.message?.content || '';
    messages.push({ role: 'assistant', content: outsideView });

    // Step 2: Pre-mortem
    messages.push({ role: 'user', content: PREMORTEM_PROMPT });
    const resp2 = await client.chat.completions.create({
      model: MODEL,
      messages: messages,
      temperature: 0,
      max_tokens: 500,
    });
    const premortem = resp2.choices[0]?.message?.content || '';
    messages.push({ role: 'assistant', content: premortem });

    // Step 3: Devil's Advocate
    messages.push({ role: 'user', content: DEVILS_ADVOCATE_PROMPT });
    const resp3 = await client.chat.completions.create({
      model: MODEL,
      messages: messages,
      temperature: 0,
      max_tokens: 500,
    });
    const devilsAdvocate = resp3.choices[0]?.message?.content || '';
    messages.push({ role: 'assistant', content: devilsAdvocate });

    // Step 4: Final Judgment
    messages.push({ role: 'user', content: FINAL_JUDGMENT_PROMPT });
    const resp4 = await client.chat.completions.create({
      model: MODEL,
      messages: messages,
      temperature: 0,
      max_tokens: 100,
    });
    const finalText = resp4.choices[0]?.message?.content || '';
    const sentenceMonths = extractSentence(finalText);

    return { outsideView, premortem, devilsAdvocate, sentenceMonths };
  } catch (e) {
    console.error(`[${index + 1}/${N_TRIALS}] ERROR: ${e}`);
    return null;
  }
}

async function main() {
  console.log('=== Sibony Debiasing Experiment ===');
  console.log(`Model: ${MODEL}`);
  console.log(`Anchor: ${ANCHOR}mo`);
  console.log(`Trials: ${N_TRIALS}`);
  console.log(`Output: ${OUTPUT_FILE}`);
  console.log('');
  console.log('Techniques: Outside View → Pre-mortem → Devil\'s Advocate');
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
      console.log(`[${i + 1}/${N_TRIALS}] ${trial.sentenceMonths}mo`);
      
      const record = {
        experimentId: 'sibony-debiasing',
        model: MODEL,
        conditionId: `sibony-${ANCHOR}mo`,
        anchor: ANCHOR,
        outsideView: trial.outsideView,
        premortem: trial.premortem,
        devilsAdvocate: trial.devilsAdvocate,
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
