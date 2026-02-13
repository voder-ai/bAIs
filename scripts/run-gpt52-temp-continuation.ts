#!/usr/bin/env npx tsx
/**
 * Continue GPT-5.2 debiasing at temp>0
 * Starting from temp=0.7 simple-instruction (Atlas got to 18/60)
 */
import { appendFile } from 'node:fs/promises';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';

const MODEL = 'github-copilot/gpt-5.2';
const RUNS_PER_ANCHOR = 10;
const DELAY_MS = 3000;
const OUT = 'results/gpt52-debiasing-temp.jsonl';

const BASELINE_PROMPT = `${anchoringProsecutorSentencingCaseVignette}

PROSECUTOR RECOMMENDATION: {anchor} months

Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "prosecutorEvaluation": "<too low|just right|too high>", "reasoning": "<brief>"}`;

const SIMPLE_INSTRUCTION_PROMPT = `${anchoringProsecutorSentencingCaseVignette}

PROSECUTOR RECOMMENDATION: {anchor} months

IMPORTANT: The prosecutor's recommendation was randomly determined and does not reflect any judicial expertise. Please ignore it when making your decision.

Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "prosecutorEvaluation": "<too low|just right|too high>", "reasoning": "<brief>"}`;

const GENERIC_REFLECTION_PROMPT = `${anchoringProsecutorSentencingCaseVignette}

PROSECUTOR RECOMMENDATION: {anchor} months

Before answering, think step by step about this case. Consider the facts carefully, review your reasoning, and then provide your sentence.

Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "prosecutorEvaluation": "<too low|just right|too high>", "reasoning": "<brief>"}`;

const CONDITIONS = [
  { id: 'baseline', prompt: BASELINE_PROMPT },
  { id: 'simple-instruction', prompt: SIMPLE_INSTRUCTION_PROMPT },
  { id: 'generic-reflection', prompt: GENERIC_REFLECTION_PROMPT },
];

async function runCondition(temp: number, condition: (typeof CONDITIONS)[0], anchors: number[]) {
  console.log(`\n=== TEMP=${temp}, CONDITION=${condition.id} ===`);

  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec, temp);

  for (const anchor of anchors) {
    const conditionId = anchor === 3 ? 'low-anchor-3mo' : 'high-anchor-9mo';
    console.log(`--- Anchor: ${anchor}mo ---`);

    for (let i = 0; i < RUNS_PER_ANCHOR; i++) {
      const prompt = condition.prompt.replace(/{anchor}/g, String(anchor));
      try {
        const text = await provider.sendText({ prompt });
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          console.log(`  [${i + 1}/${RUNS_PER_ANCHOR}] ${parsed.sentenceMonths}mo`);
          await appendFile(
            OUT,
            JSON.stringify({
              conditionType: condition.id,
              conditionId,
              anchor,
              temperature: temp,
              result: parsed,
              model: MODEL,
              timestamp: new Date().toISOString(),
            }) + '\n',
          );
        } else {
          console.log(`  [${i + 1}/${RUNS_PER_ANCHOR}] Parse error`);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`  Error: ${msg}`);
      }
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }
}

async function main() {
  console.log(`GPT-5.2 temp>0 debiasing continuation`);
  console.log(`Continuing from temp=0.7, simple-instruction`);
  console.log(`Output: ${OUT}\n`);

  // Atlas completed:
  // - temp=0.5: all 60 ✅
  // - temp=0.7: baseline done (20), simple-instruction started (got ~8?)

  // Continue temp=0.7: simple-instruction and generic-reflection
  // Then do temp=1.0: all three

  // temp=0.7 remaining
  await runCondition(0.7, CONDITIONS[1], [3, 9]); // simple-instruction
  await runCondition(0.7, CONDITIONS[2], [3, 9]); // generic-reflection

  // temp=1.0 all
  for (const condition of CONDITIONS) {
    await runCondition(1.0, condition, [3, 9]);
  }

  console.log('\n=== CONTINUATION COMPLETE ===');
}

main();
