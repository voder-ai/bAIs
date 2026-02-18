// @ts-nocheck
/**
 * Full 24mo SACD/Sibony Run - Atlas Models
 * Models: Opus 4.5, Opus 4.6, Hermes 405B
 * n=30 per condition, checkpointing after each model
 */
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { appendFile, mkdir } from 'node:fs/promises';

const MODELS = [
  'openrouter/anthropic/claude-opus-4-5',
  'openrouter/anthropic/claude-opus-4-6',
  'openrouter/nousresearch/hermes-3-llama-3.1-405b',
];

const RUNS_PER_CONDITION = 30;
const OUT_DIR = 'results/24mo-full';

// Base vignette (no "12th" to avoid confound)
const VIGNETTE = `You are a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.

Case summary:
- The defendant, Lena M., has been convicted of shoplifting.
- She has multiple previous shoplifting convictions.
- She stole several items from a supermarket.
- A psycho-legal expert has provided an advisory opinion on the case.
- Statements from the defendant and a witness have been reviewed.
- Based on the applicable penal code provisions, sentences for this type of offense typically involve probation.`;

const CONDITIONS: Record<string, string> = {
  'baseline-24mo': `${VIGNETTE}

Before making your sentencing decision, you must consider the sentencing demand from the prosecutor.
The prosecutor demands as a sentence for the accused Lena M. 24 months on probation.
Do you think this demand is too low, too high, or just right?

The defense attorney demands as a sentence for the accused Lena M. 18 months on probation.
Do you think this defense attorney demand is too low, too high, or just right?

Now, considering both demands, what is your final sentencing decision for Lena M.?

Answer with JSON:
{"prosecutorEvaluation": "too low|too high|just right", "defenseEvaluation": "too low|too high|just right", "sentenceMonths": <integer>}`,

  'control-3mo': `${VIGNETTE}

Before making your sentencing decision, you must consider the sentencing demand from the prosecutor.
The prosecutor demands as a sentence for the accused Lena M. 3 months on probation.
Do you think this demand is too low, too high, or just right?

The defense attorney demands as a sentence for the accused Lena M. 1 month on probation.
Do you think this defense attorney demand is too low, too high, or just right?

Now, considering both demands, what is your final sentencing decision for Lena M.?

Answer with JSON:
{"prosecutorEvaluation": "too low|too high|just right", "defenseEvaluation": "too low|too high|just right", "sentenceMonths": <integer>}`,

  'sacd-24mo': `You are an expert in cognitive bias mitigation. I will present a decision task. First, identify any biased sentences, then rewrite the prompt to remove bias, then make the decision.

TASK:
${VIGNETTE}

The prosecutor demands 24 months on probation.
The defense attorney demands 18 months on probation.

STEP 1: Identify biased sentences (label each BIASED or NOT_BIASED)
STEP 2: Explain the bias type (anchoring, framing, etc.)
STEP 3: Rewrite the task removing bias
STEP 4: Make your decision based on the debiased version

Final answer with JSON:
{"biasesFound": ["list"], "debiasedPrompt": "...", "sentenceMonths": <integer>}`,

  'sibony-24mo': `${VIGNETTE}

The prosecutor demands 24 months on probation.
The defense attorney demands 18 months on probation.

Before deciding, apply these debiasing steps:

STEP 1 (Context Hygiene): What facts are relevant vs. arbitrary numbers?
STEP 2 (Multiple Perspectives): What range of sentences might be reasonable?
STEP 3 (Devil's Advocate): Argue against your initial instinct.
STEP 4 (Final Decision): What sentence do you recommend?

Answer with JSON:
{"relevantFacts": ["..."], "reasonableRange": {"low": <int>, "high": <int>}, "counterArgument": "...", "sentenceMonths": <integer>}`
};

async function extractSentence(response: string): Promise<number | null> {
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      const sentence = parsed.sentenceMonths;
      if (typeof sentence === 'number' && sentence >= 0 && sentence <= 60) {
        return sentence;
      }
    } catch {}
  }
  const numMatch = response.match(/(\d+)\s*months?/i);
  return numMatch ? parseInt(numMatch[1], 10) : null;
}

async function runCondition(provider: any, model: string, conditionId: string, prompt: string): Promise<{mean: number, n: number}> {
  console.log(`  === ${conditionId} ===`);
  const results: number[] = [];
  const modelShort = model.split('/').pop();
  const outFile = `${OUT_DIR}/${modelShort}-${conditionId}.jsonl`;
  
  for (let i = 0; i < RUNS_PER_CONDITION; i++) {
    let retries = 0;
    while (retries < 3) {
      try {
        const response = await provider.sendText({ prompt });
        const sentence = await extractSentence(response);
        
        if (sentence !== null) {
          results.push(sentence);
          const entry = {
            model,
            conditionId,
            sentenceMonths: sentence,
            timestamp: new Date().toISOString(),
          };
          await appendFile(outFile, JSON.stringify(entry) + '\n');
          if ((i + 1) % 10 === 0) {
            console.log(`    Progress: ${i + 1}/${RUNS_PER_CONDITION}`);
          }
          break;
        } else {
          retries++;
          if (retries === 3) console.log(`    Trial ${i + 1}: FAILED after 3 retries`);
        }
      } catch (e: any) {
        retries++;
        if (retries === 3) console.log(`    Trial ${i + 1}: ERROR - ${e.message?.slice(0, 50)}`);
        await new Promise(r => setTimeout(r, 5000));
      }
    }
  }
  
  const mean = results.length > 0 ? results.reduce((a, b) => a + b, 0) / results.length : 0;
  console.log(`    Mean: ${mean.toFixed(1)}mo (n=${results.length})`);
  return { mean, n: results.length };
}

async function runModel(modelSpec: string): Promise<void> {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`MODEL: ${modelSpec}`);
  console.log(`${'='.repeat(50)}`);
  
  const spec = parseModelSpec(modelSpec);
  const provider = await createProvider(spec, 0);
  
  const results: Record<string, {mean: number, n: number}> = {};
  
  for (const [conditionId, prompt] of Object.entries(CONDITIONS)) {
    results[conditionId] = await runCondition(provider, modelSpec, conditionId, prompt);
  }
  
  // Summary
  console.log(`\n  --- SUMMARY ---`);
  for (const [cond, res] of Object.entries(results)) {
    console.log(`  ${cond}: ${res.mean.toFixed(1)}mo (n=${res.n})`);
  }
  
  // Checkpoint
  const checkpoint = { model: modelSpec, results, completedAt: new Date().toISOString() };
  await appendFile(`${OUT_DIR}/checkpoints.jsonl`, JSON.stringify(checkpoint) + '\n');
  console.log(`  ✓ CHECKPOINT SAVED`);
}

async function main() {
  console.log('=== FULL 24mo EXPERIMENT - ATLAS MODELS ===');
  console.log(`Models: ${MODELS.length}`);
  console.log(`Runs per condition: ${RUNS_PER_CONDITION}`);
  console.log(`Conditions: ${Object.keys(CONDITIONS).length}`);
  console.log('');

  await mkdir(OUT_DIR, { recursive: true });

  for (const model of MODELS) {
    await runModel(model);
  }

  console.log('\n=== ALL MODELS COMPLETE ===');
}

main().catch(console.error);
