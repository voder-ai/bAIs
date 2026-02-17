#!/usr/bin/env npx tsx
// @ts-nocheck
/**
 * 3-turn random conversation control (matches SACD turn structure)
 * Tests whether SACD's effect is from structured self-critique or just multi-turn processing
 */
import { appendFile } from 'node:fs/promises';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';

const MODEL = 'github-copilot/gpt-5.2';
const RUNS = 15;
const DELAY_MS = 3000;
const TEMPERATURE = 0;
const OUT = 'results/gpt52-3turn-random-control.jsonl';

const TURN_1 = `Before we begin the main task, please describe the weather in a coastal city during autumn. Include temperature, wind patterns, and precipitation.`;

const TURN_2 = `Thank you. Now please list 5 interesting facts about marine mammals (dolphins, whales, seals) and explain one adaptation they have for ocean life.`;

const TURN_3 = `${anchoringProsecutorSentencingCaseVignette}

PROSECUTOR RECOMMENDATION: {anchor} months

Now, based solely on the case facts above, what sentence do you recommend?

Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "prosecutorEvaluation": "<too low|just right|too high>", "reasoning": "<brief>"}`;

async function main() {
  console.log(`3-turn random conversation control on GPT-5.2`);
  console.log(`Runs per anchor: ${RUNS}, Total: ${RUNS * 2}`);
  console.log(`Output: ${OUT}\n`);

  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec, TEMPERATURE);

  for (const anchor of [3, 9]) {
    const conditionId = anchor === 3 ? 'low-anchor-3mo' : 'high-anchor-9mo';
    console.log(`--- Anchor: ${anchor}mo ---`);

    for (let i = 0; i < RUNS; i++) {
      try {
        // Turn 1: Weather (irrelevant)
        const resp1 = await provider.sendText({ prompt: TURN_1 });
        await new Promise((r) => setTimeout(r, 1000));

        // Turn 2: Marine mammals (irrelevant)
        const resp2 = await provider.sendText({ prompt: TURN_2 });
        await new Promise((r) => setTimeout(r, 1000));

        // Turn 3: Actual task
        const turn3Prompt = TURN_3.replace(/{anchor}/g, String(anchor));
        const resp3 = await provider.sendText({ prompt: turn3Prompt });

        const match = resp3.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          console.log(`  [${i + 1}/${RUNS}] ${parsed.sentenceMonths}mo`);
          await appendFile(
            OUT,
            JSON.stringify({
              conditionType: '3turn-random',
              conditionId,
              anchor,
              temperature: TEMPERATURE,
              result: parsed,
              model: MODEL,
              timestamp: new Date().toISOString(),
              turns: 3,
            }) + '\n',
          );
        } else {
          console.log(`  [${i + 1}/${RUNS}] Parse error`);
        }
      } catch (e: any) {
        console.error(`  [${i + 1}/${RUNS}] Error: ${e.message}`);
      }
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  console.log('\n=== 3-TURN RANDOM CONTROL COMPLETE ===');
}

main();
