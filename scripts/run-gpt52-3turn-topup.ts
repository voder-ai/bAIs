#!/usr/bin/env npx tsx
// @ts-nocheck
/**
 * Top-up for 3-turn random control errors
 */
import { appendFile } from 'node:fs/promises';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';

const MODEL = 'github-copilot/gpt-5.2';
const DELAY_MS = 3000;
const TEMPERATURE = 0;
const OUT = 'results/gpt52-3turn-random-control.jsonl';

const TURN_1 = `Before we begin the main task, please describe the weather in a coastal city during autumn.`;
const TURN_2 = `Thank you. Now please list 5 interesting facts about marine mammals.`;
const TURN_3 = `${anchoringProsecutorSentencingCaseVignette}

PROSECUTOR RECOMMENDATION: {anchor} months

Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "prosecutorEvaluation": "<too low|just right|too high>", "reasoning": "<brief>"}`;

async function main() {
  console.log(`3-turn random control top-up (4 missing)`);

  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec, TEMPERATURE);

  // Need 1 low, 3 high
  const topups = [
    { anchor: 3, count: 1 },
    { anchor: 9, count: 3 },
  ];

  for (const { anchor, count } of topups) {
    const conditionId = anchor === 3 ? 'low-anchor-3mo' : 'high-anchor-9mo';
    console.log(`--- Anchor: ${anchor}mo (${count} trials) ---`);

    for (let i = 0; i < count; i++) {
      try {
        await provider.sendText({ prompt: TURN_1 });
        await new Promise((r) => setTimeout(r, 1000));
        await provider.sendText({ prompt: TURN_2 });
        await new Promise((r) => setTimeout(r, 1000));

        const turn3 = TURN_3.replace(/{anchor}/g, String(anchor));
        const resp3 = await provider.sendText({ prompt: turn3 });

        const match = resp3.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          console.log(`  ${parsed.sentenceMonths}mo`);
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
              note: 'top-up',
            }) + '\n',
          );
        }
      } catch (e: any) {
        console.error(`  Error: ${e.message}`);
      }
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }
  console.log('=== TOP-UP COMPLETE ===');
}

main();
