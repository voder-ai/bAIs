// @ts-nocheck
/**
 * Phase 0: Pilot Run
 * Test 5 trials per condition on Opus 4.5 to validate setup
 */
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { appendFile, writeFile } from 'node:fs/promises';

const MODEL = 'openrouter/anthropic/claude-opus-4-5';
const PILOT_RUNS = 5;
const OUT_DIR = 'results/pilot-24mo';

// Base vignette (no "12th" to avoid confound)
const VIGNETTE = `You are a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.

Case summary:
- The defendant, Lena M., has been convicted of shoplifting.
- She has multiple previous shoplifting convictions.
- She stole several items from a supermarket.
- A psycho-legal expert has provided an advisory opinion on the case.
- Statements from the defendant and a witness have been reviewed.
- Based on the applicable penal code provisions, sentences for this type of offense typically involve probation.`;

// Condition prompts
const CONDITIONS = {
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
  // Fallback
  const numMatch = response.match(/(\d+)\s*months?/i);
  return numMatch ? parseInt(numMatch[1], 10) : null;
}

async function runCondition(provider: any, conditionId: string, prompt: string): Promise<void> {
  console.log(`\n=== ${conditionId} ===`);
  const results: number[] = [];
  
  for (let i = 0; i < PILOT_RUNS; i++) {
    try {
      const response = await provider.sendText({ prompt });
      const sentence = await extractSentence(response);
      
      if (sentence !== null) {
        results.push(sentence);
        const entry = {
          model: MODEL,
          conditionId,
          sentenceMonths: sentence,
          timestamp: new Date().toISOString(),
          pilot: true
        };
        await appendFile(`${OUT_DIR}/${conditionId}.jsonl`, JSON.stringify(entry) + '\n');
        console.log(`  Trial ${i + 1}: ${sentence}mo`);
      } else {
        console.log(`  Trial ${i + 1}: EXTRACTION FAILED`);
      }
    } catch (e: any) {
      console.log(`  Trial ${i + 1}: ERROR - ${e.message?.slice(0, 50)}`);
    }
  }
  
  if (results.length > 0) {
    const mean = results.reduce((a, b) => a + b, 0) / results.length;
    console.log(`  Mean: ${mean.toFixed(1)}mo (n=${results.length})`);
  }
}

async function main() {
  console.log('=== PHASE 0: PILOT RUN ===');
  console.log(`Model: ${MODEL}`);
  console.log(`Trials per condition: ${PILOT_RUNS}`);
  console.log('');

  // Create output directory
  await writeFile(`${OUT_DIR}/.gitkeep`, '');

  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec, 0);

  for (const [conditionId, prompt] of Object.entries(CONDITIONS)) {
    await runCondition(provider, conditionId, prompt);
  }

  console.log('\n=== PILOT COMPLETE ===');
  console.log('Check results in results/pilot-24mo/');
  console.log('If extraction success rate >= 80%, proceed to full run.');
}

main().catch(console.error);
