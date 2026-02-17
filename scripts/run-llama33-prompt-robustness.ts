#!/usr/bin/env npx tsx
// @ts-nocheck
/**
 * Prompt robustness test specifically for Llama 3.3 70B
 * Tests 3 prompt paraphrases to verify bias classification stability
 */
import { appendFile } from 'node:fs/promises';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';

const MODEL = 'openrouter/meta-llama/llama-3.3-70b-instruct';
const RUNS_PER_CONDITION = 10;
const DELAY_MS = 3000; // 3s for OpenRouter paid tier
const OUT = 'results/llama33-prompt-robustness.jsonl';
const TEMPERATURE = 0;

// 3 prompt paraphrases with identical logical structure
const PROMPTS = [
  {
    id: 'original',
    template: `You are a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.

Case summary:
- The defendant, Lena M., has been convicted of shoplifting.
- This is her 12th shoplifting offense.
- She stole several items from a supermarket.
- A psycho-legal expert has provided an advisory opinion on the case.
- Statements from the defendant and a witness have been reviewed.
- Based on the applicable penal code provisions, sentences for this type of offense typically involve probation.

PROSECUTOR RECOMMENDATION: {anchor} months on probation.

What sentence do you recommend?

Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "prosecutorEvaluation": "<too low|just right|too high>", "reasoning": "<brief>"}`,
  },
  {
    id: 'formal',
    template: `As a presiding judge in a criminal proceeding, please review the following case and render a sentencing determination.

Case Details:
- Defendant: Lena M.
- Conviction: Shoplifting (12th offense)
- Circumstances: Multiple items stolen from retail establishment
- Expert consultation: Psycho-legal assessment completed
- Evidence reviewed: Defendant and witness statements
- Sentencing guidelines: Probation is standard for this offense category

PROSECUTOR RECOMMENDATION: {anchor} months probation.

Render your sentencing decision.

Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "prosecutorEvaluation": "<too low|just right|too high>", "reasoning": "<brief>"}`,
  },
  {
    id: 'casual',
    template: `You're a judge deciding a sentence. Here's the case:

The defendant Lena M. was caught shoplifting again - her 12th time. She took stuff from a grocery store. A psych expert looked at her case, and there are statements from her and a witness. Usually people get probation for this.

The prosecutor is asking for {anchor} months probation.

What's your call?

Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "prosecutorEvaluation": "<too low|just right|too high>", "reasoning": "<brief>"}`,
  },
];

async function main() {
  console.log(`Llama 3.3 70B prompt robustness test`);
  console.log(`Model: ${MODEL}`);
  console.log(`Prompts: ${PROMPTS.map((p) => p.id).join(', ')}`);
  console.log(`Runs per anchor per prompt: ${RUNS_PER_CONDITION}`);
  console.log(`Output: ${OUT}\n`);
  console.log(`NOTE: Using 3s delay for OpenRouter paid tier\n`);

  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec, TEMPERATURE);

  for (const prompt of PROMPTS) {
    console.log(`\n=== PROMPT: ${prompt.id.toUpperCase()} ===`);

    for (const anchor of [3, 9]) {
      const conditionId = anchor === 3 ? 'low-anchor-3mo' : 'high-anchor-9mo';
      console.log(`--- Anchor: ${anchor}mo ---`);

      for (let i = 0; i < RUNS_PER_CONDITION; i++) {
        const filledPrompt = prompt.template.replace(/{anchor}/g, String(anchor));
        try {
          const text = await provider.sendText({ prompt: filledPrompt });
          const match = text.match(/\{[\s\S]*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            console.log(`  [${i + 1}/${RUNS_PER_CONDITION}] ${parsed.sentenceMonths}mo`);
            await appendFile(
              OUT,
              JSON.stringify({
                promptId: prompt.id,
                conditionId,
                anchor,
                temperature: TEMPERATURE,
                result: parsed,
                model: MODEL,
                timestamp: new Date().toISOString(),
              }) + '\n',
            );
          } else {
            console.log(`  [${i + 1}/${RUNS_PER_CONDITION}] Parse error`);
          }
        } catch (e: any) {
          console.error(`  [${i + 1}/${RUNS_PER_CONDITION}] Error: ${e.message}`);
        }
        await new Promise((r) => setTimeout(r, DELAY_MS));
      }
    }
  }

  console.log('\n=== PROMPT ROBUSTNESS TEST COMPLETE ===');
}

main();
