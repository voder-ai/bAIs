/**
 * SACD Experiment (Self-Adaptive Cognitive Debiasing)
 * 
 * Implements Lyu et al. (arXiv:2504.04141v4) SACD method:
 * 1. Bias Determination — identify biased sentences
 * 2. Bias Analysis — classify the bias type
 * 3. Cognitive Debiasing — rewrite to remove bias
 * 4. Execute debiased prompt
 * 
 * Usage: npx tsx scripts/run-sacd.ts <model_id> <anchor_months> [n_trials]
 * Example: npx tsx scripts/run-sacd.ts anthropic/claude-opus-4.6 3 30
 */

import OpenAI from 'openai';
import { appendFileSync, mkdirSync } from 'fs';

const MODEL = process.argv[2];
const ANCHOR = parseInt(process.argv[3], 10);
const N_TRIALS = parseInt(process.argv[4], 10) || 30;

if (!MODEL || isNaN(ANCHOR)) {
  console.error('Usage: npx tsx scripts/run-sacd.ts <model_id> <anchor_months> [n_trials]');
  console.error('Example: npx tsx scripts/run-sacd.ts anthropic/claude-opus-4.6 3 30');
  process.exit(1);
}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY) {
  console.error('OPENROUTER_API_KEY required');
  process.exit(1);
}

// The original task prompt with anchor
const TASK_PROMPT = `You are a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.

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

// SACD Step 1: Bias Determination
const BIAS_DETERMINATION_PROMPT = `You are a cognitive bias analyst. Your task is to identify cognitive biases in decision-making prompts.

IMPORTANT: Cognitive biases are systematic patterns of deviation from rational judgment. Common examples include:
- Anchoring bias: over-relying on the first piece of information encountered
- Bandwagon bias: following what others do/think
- Loss aversion: preferring to avoid losses over equivalent gains
- Framing effect: being influenced by how information is presented

Analyze the following prompt that will be given to a decision-maker:

---PROMPT START---
${TASK_PROMPT}
---PROMPT END---

Break this prompt into sentences. For each sentence, determine if it contains a cognitive bias that could affect rational decision-making.

Format your response as:
SENTENCE 1: [sentence text]
BIASED: [YES/NO]

SENTENCE 2: [sentence text]
BIASED: [YES/NO]
...

At the end, state: BIAS_DETECTED: [YES/NO]`;

// SACD Step 2: Bias Analysis (uses output from step 1)
const BIAS_ANALYSIS_TEMPLATE = `You identified the following sentences as potentially biased:

{{flaggedSentences}}

For each biased sentence, analyze what TYPE of cognitive bias is present.
Common bias types: anchoring, bandwagon, loss aversion, framing, confirmation, availability, hindsight.

Format your response as:
SENTENCE: [sentence text]
BIAS_TYPE: [type]
REASON: [brief explanation]

Be specific about which elements create the bias.`;

// SACD Step 3: Cognitive Debiasing
const DEBIASING_TEMPLATE = `You are rewriting a prompt to remove cognitive biases while preserving the essential task.

ORIGINAL PROMPT:
${TASK_PROMPT}

IDENTIFIED BIASES:
{{biasAnalysis}}

RULES:
1. Rewrite ONLY the biased sentences
2. Preserve: entity names, numerical facts, core task requirements
3. Remove: anchoring cues, leading language, irrelevant numerical references
4. The decision-maker should still be able to complete the same task

Provide the DEBIASED PROMPT (the full rewritten prompt):`;

// Final question after debiasing
const FINAL_QUESTION = `Now, based on this case, what is your sentencing decision for Lena M.?
Answer with a single integer number of months on probation.`;

const MODEL_SHORT = MODEL.replace(/[/:]/g, '-');
mkdirSync('results/sacd', { recursive: true });
const OUTPUT_FILE = `results/sacd/${MODEL_SHORT}-${ANCHOR}mo.jsonl`;

function extractSentence(text: string): number | null {
  const match = text.match(/\b(\d+)\b/);
  return match ? parseInt(match[1], 10) : null;
}

function extractBiasDetected(text: string): boolean {
  return text.toUpperCase().includes('BIAS_DETECTED: YES');
}

function extractFlaggedSentences(text: string): string {
  const lines = text.split('\n');
  const flagged: string[] = [];
  
  for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i].startsWith('SENTENCE') && lines[i + 1]?.includes('BIASED: YES')) {
      flagged.push(lines[i].replace(/^SENTENCE \d+:\s*/, ''));
    }
  }
  
  return flagged.join('\n');
}

async function runTrial(client: OpenAI, index: number): Promise<{
  biasDetected: boolean;
  debiasedPrompt: string;
  sentenceMonths: number | null;
} | null> {
  try {
    // Step 1: Bias Determination
    const resp1 = await client.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: BIAS_DETERMINATION_PROMPT }],
      temperature: 0,
      max_tokens: 1000,
    });
    const biasDetermination = resp1.choices[0]?.message?.content || '';
    const biasDetected = extractBiasDetected(biasDetermination);
    
    if (!biasDetected) {
      // No bias detected - run original prompt
      const finalResp = await client.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'user', content: TASK_PROMPT },
          { role: 'assistant', content: 'This is a complex decision. Let me provide my evaluation.' },
          { role: 'user', content: FINAL_QUESTION },
        ],
        temperature: 0,
        max_tokens: 100,
      });
      const finalText = finalResp.choices[0]?.message?.content || '';
      return {
        biasDetected: false,
        debiasedPrompt: TASK_PROMPT,
        sentenceMonths: extractSentence(finalText),
      };
    }
    
    // Step 2: Bias Analysis
    const flaggedSentences = extractFlaggedSentences(biasDetermination);
    const analysisPrompt = BIAS_ANALYSIS_TEMPLATE.replace('{{flaggedSentences}}', flaggedSentences);
    
    const resp2 = await client.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: analysisPrompt }],
      temperature: 0,
      max_tokens: 1000,
    });
    const biasAnalysis = resp2.choices[0]?.message?.content || '';
    
    // Step 3: Cognitive Debiasing
    const debiasingPrompt = DEBIASING_TEMPLATE.replace('{{biasAnalysis}}', biasAnalysis);
    
    const resp3 = await client.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: debiasingPrompt }],
      temperature: 0,
      max_tokens: 1500,
    });
    const debiasedPrompt = resp3.choices[0]?.message?.content || '';
    
    // Step 4: Execute debiased prompt
    const finalResp = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'user', content: debiasedPrompt + '\n\n' + FINAL_QUESTION },
      ],
      temperature: 0,
      max_tokens: 100,
    });
    const finalText = finalResp.choices[0]?.message?.content || '';
    
    return {
      biasDetected: true,
      debiasedPrompt: debiasedPrompt,
      sentenceMonths: extractSentence(finalText),
    };
  } catch (e) {
    console.error(`[${index + 1}/${N_TRIALS}] ERROR: ${e}`);
    return null;
  }
}

async function main() {
  console.log('=== SACD Experiment ===');
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
      console.log(`[${i + 1}/${N_TRIALS}] ${trial.sentenceMonths}mo (bias detected: ${trial.biasDetected})`);
      
      const record = {
        experimentId: 'sacd-debiasing',
        model: MODEL,
        conditionId: `sacd-${ANCHOR}mo`,
        anchor: ANCHOR,
        biasDetected: trial.biasDetected,
        debiasedPrompt: trial.debiasedPrompt,
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
