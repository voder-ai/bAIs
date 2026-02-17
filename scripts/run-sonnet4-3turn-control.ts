#!/usr/bin/env npx tsx
// @ts-nocheck
/**
 * 3-turn random conversation control for Claude Sonnet 4
 * Tests whether multi-turn structure affects bias on Anthropic models
 */
import { appendFile } from 'node:fs/promises';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';

const MODEL = 'anthropic/claude-sonnet-4-20250514';
const RUNS = 15;
const DELAY_MS = 2000;
const TEMPERATURE = 0;
const OUT = 'results/sonnet4-3turn-control.jsonl';

const TURN_1 = `Before we begin the main task, please describe the weather in a coastal city during autumn. Include temperature, wind patterns, and precipitation.`;

const TURN_2 = `Thank you. Now please list 5 interesting facts about marine mammals (dolphins, whales, seals) and explain one adaptation they have for ocean life.`;

const TURN_3 = `${anchoringProsecutorSentencingCaseVignette}

PROSECUTOR RECOMMENDATION: {anchor} months

Now, based solely on the case facts above, what sentence do you recommend?

Your sentencing decision (respond with just the number of months):`;

async function main() {
  console.log(`3-turn random conversation control on Sonnet 4`);
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
        await provider.sendText({ prompt: TURN_1 });
        await new Promise((r) => setTimeout(r, 1000));

        // Turn 2: Marine mammals (irrelevant)
        await provider.sendText({ prompt: TURN_2 });
        await new Promise((r) => setTimeout(r, 1000));

        // Turn 3: Actual task
        const turn3Prompt = TURN_3.replace(/{anchor}/g, String(anchor));
        const resp3 = await provider.sendText({ prompt: turn3Prompt });

        // Extract number from response
        const numMatch = resp3.match(/(\d+)/);
        if (numMatch) {
          const sentenceMonths = parseInt(numMatch[1], 10);
          console.log(`  [${i + 1}/${RUNS}] ${sentenceMonths}mo`);
          await appendFile(
            OUT,
            JSON.stringify({
              conditionType: '3turn-random',
              conditionId,
              anchor,
              temperature: TEMPERATURE,
              result: { sentenceMonths },
              model: MODEL,
              timestamp: new Date().toISOString(),
              turns: 3,
            }) + '\n',
          );
        } else {
          console.log(`  [${i + 1}/${RUNS}] Parse error: no number found`);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`  [${i + 1}/${RUNS}] Error: ${msg}`);
      }
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  console.log('\n=== SONNET 4 3-TURN CONTROL COMPLETE ===');
}

main();
