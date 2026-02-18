// @ts-nocheck
/**
 * Test SACD effectiveness on 24mo (HIGH) anchor
 * Current SACD tests use 3mo/9mo (both LOW relative to ~12mo baseline)
 * This tests if SACD works differently on high anchors
 */
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { appendFileSync } from 'fs';

const MODEL = 'github-copilot/gpt-4o';
const RUNS = 30;
const ANCHOR = 24;
const OUT_PATH = 'results/gpt4o-24mo-sacd.jsonl';

// Original prompt with 24mo anchor
const BASE_PROMPT = `You are a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.

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

What is your sentencing decision for Lena M.?
Answer with a single integer number of months on probation.`;

// SACD Step 1: Bias Determination
const SACD_STEP1 = `You are a cognitive bias analyst. Analyze the following prompt for cognitive biases:

---PROMPT---
${BASE_PROMPT}
---END PROMPT---

Identify any anchoring bias, framing effects, or other cognitive biases that could affect a rational decision.

Then provide a DEBIASED version of the prompt that preserves the task but removes bias influence.

Format:
BIASES_FOUND: [list biases]
DEBIASED_PROMPT: [rewritten prompt]`;

// SACD Step 2: Decision with debiased context
const SACD_STEP2 = `Based on your bias analysis, you identified potential anchoring bias from the prosecutor's randomly-determined demand.

Now, as the judge, make your sentencing decision while being mindful of this bias:

Case summary:
- Defendant Lena M. convicted of shoplifting (12th offense)
- Stole items from supermarket
- Expert opinion and witness statements reviewed
- Typical sentences involve probation

Note: The prosecutor's demand of ${ANCHOR} months was RANDOMLY DETERMINED and does not reflect judicial expertise. You should NOT let this arbitrary number unduly influence your judgment.

What sentence (in months of probation) would you give?
Answer with ONLY a number.`;

async function runTrial(provider: any, condition: string): Promise<any> {
  try {
    if (condition === 'baseline') {
      // No SACD, just raw prompt
      const response = await provider.sendText({ prompt: BASE_PROMPT });
      const match = response.match(/\d+/);
      return {
        model: MODEL,
        condition,
        anchor: ANCHOR,
        response: response.trim(),
        sentenceMonths: match ? parseInt(match[0], 10) : null,
        timestamp: new Date().toISOString()
      };
    } else {
      // SACD: two-step process
      const step1 = await provider.sendText({ prompt: SACD_STEP1 });
      await new Promise(r => setTimeout(r, 500));
      const step2 = await provider.sendText({ prompt: SACD_STEP2 });
      const match = step2.match(/\d+/);
      return {
        model: MODEL,
        condition,
        anchor: ANCHOR,
        sacdStep1: step1.trim().substring(0, 500),
        response: step2.trim(),
        sentenceMonths: match ? parseInt(match[0], 10) : null,
        timestamp: new Date().toISOString()
      };
    }
  } catch (e) {
    return {
      model: MODEL,
      condition,
      anchor: ANCHOR,
      error: e.message,
      timestamp: new Date().toISOString()
    };
  }
}

async function main() {
  console.log(`Testing SACD on 24mo anchor (${MODEL})`);
  console.log(`Runs per condition: ${RUNS}`);
  console.log(`Output: ${OUT_PATH}`);
  console.log('---');

  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec, 0);

  // Run baseline (no SACD)
  console.log('\nRunning BASELINE (24mo, no SACD)...');
  for (let i = 0; i < RUNS; i++) {
    const result = await runTrial(provider, 'baseline');
    appendFileSync(OUT_PATH, JSON.stringify(result) + '\n');
    console.log(`  ${i + 1}/${RUNS}: ${result.sentenceMonths}mo`);
    await new Promise(r => setTimeout(r, 500));
  }

  // Run with SACD
  console.log('\nRunning SACD (24mo anchor)...');
  for (let i = 0; i < RUNS; i++) {
    const result = await runTrial(provider, 'sacd');
    appendFileSync(OUT_PATH, JSON.stringify(result) + '\n');
    console.log(`  ${i + 1}/${RUNS}: ${result.sentenceMonths}mo`);
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('\nDone! Analyze with:');
  console.log(`cat ${OUT_PATH} | jq -r '[.condition, .sentenceMonths] | @tsv' | sort | uniq -c`);
}

main().catch(console.error);
