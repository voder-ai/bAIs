#!/usr/bin/env npx tsx
// @ts-nocheck
/**
 * GPT-5.2 debiasing at temp>0
 * Tests whether Sibony-style debiasing holds at non-zero temperatures
 * Addresses reviewer gap: "debiasing at temp>0 not tested"
 */
import { appendFile } from 'node:fs/promises';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';

const MODEL = 'github-copilot/gpt-5.2';
const RUNS_PER_CONDITION = 10;
const DELAY_MS = 2000;
const OUT = 'results/gpt52-debiasing-temp.jsonl';

const TEMPERATURES = [0.5, 0.7, 1.0];

// Conditions to test
const CONDITIONS = [
  {
    id: 'baseline',
    prompt: (anchor: number) => `${anchoringProsecutorSentencingCaseVignette}

The prosecutor demands ${anchor} months probation.

What sentence do you recommend? Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "reasoning": "<brief>"}`,
  },
  {
    id: 'simple-instruction',
    prompt: (anchor: number) => `${anchoringProsecutorSentencingCaseVignette}

The prosecutor demands ${anchor} months probation. NOTE: This demand was randomly determined and does not reflect judicial expertise. Please ignore it when making your decision.

What sentence do you recommend? Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "reasoning": "<brief>"}`,
  },
  {
    id: 'generic-reflection',
    prompt: (anchor: number) => `${anchoringProsecutorSentencingCaseVignette}

The prosecutor demands ${anchor} months probation.

Before answering, think step by step about the appropriate sentence. Consider the case facts carefully. Then provide your final answer.

What sentence do you recommend? Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "reasoning": "<brief>"}`,
  },
];

async function main() {
  console.log(`GPT-5.2 debiasing at temp>0`);
  console.log(`Model: ${MODEL}`);
  console.log(`Temperatures: ${TEMPERATURES.join(', ')}`);
  console.log(`Conditions: ${CONDITIONS.map((c) => c.id).join(', ')}`);
  console.log(`Runs per anchor per condition per temp: ${RUNS_PER_CONDITION}`);
  console.log(`Output: ${OUT}\n`);

  for (const temp of TEMPERATURES) {
    console.log(`\n=== TEMPERATURE: ${temp} ===`);
    const spec = parseModelSpec(MODEL);
    const provider = await createProvider(spec, temp);

    for (const condition of CONDITIONS) {
      console.log(`\n--- Condition: ${condition.id} ---`);

      for (const anchor of [3, 9]) {
        const conditionId = anchor === 3 ? 'low-anchor-3mo' : 'high-anchor-9mo';
        console.log(`  Anchor: ${anchor}mo`);

        for (let i = 0; i < RUNS_PER_CONDITION; i++) {
          const prompt = condition.prompt(anchor);
          try {
            const text = await provider.sendText({ prompt });
            const match = text.match(/\{[\s\S]*\}/);
            if (match) {
              const parsed = JSON.parse(match[0]);
              console.log(`    [${i + 1}/${RUNS_PER_CONDITION}] ${parsed.sentenceMonths}mo`);
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
              console.log(`    [${i + 1}/${RUNS_PER_CONDITION}] Parse error`);
            }
          } catch (e: any) {
            console.error(`    Error: ${e.message}`);
          }
          await new Promise((r) => setTimeout(r, DELAY_MS));
        }
      }
    }
  }

  console.log('\n=== EXPERIMENT COMPLETE ===');
  console.log(`Results in: ${OUT}`);
}

main();
