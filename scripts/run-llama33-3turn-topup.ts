#!/usr/bin/env npx tsx
// @ts-nocheck
/**
 * 3-turn random conversation control for Llama 3.3 — TOP UP
 * Continuing from 13 trials (all low anchor) to complete 30 total
 */
import { appendFile } from 'node:fs/promises';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';

const MODEL = 'openrouter/meta-llama/llama-3.3-70b-instruct';
const DELAY_MS = 2000;
const TEMPERATURE = 0;
const OUT = 'results/llama33-3turn-control.jsonl';

const TURN_1 = `Before we begin the main task, please describe the weather in a coastal city during autumn.`;
const TURN_2 = `Thank you. Now please list 5 interesting facts about marine mammals.`;
const TURN_3 = `${anchoringProsecutorSentencingCaseVignette}

PROSECUTOR RECOMMENDATION: {anchor} months

Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "prosecutorEvaluation": "<too low|just right|too high>", "reasoning": "<brief>"}`;

async function main() {
  console.log(`Llama 3.3 3-turn control TOP UP`);
  console.log(`Remaining: 2 low anchor + 15 high anchor`);

  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec, TEMPERATURE);

  // Finish low anchor (2 remaining)
  console.log(`--- Finishing Low Anchor (3mo) ---`);
  for (let i = 13; i < 15; i++) {
    try {
      await provider.sendText({ prompt: TURN_1 });
      await new Promise((r) => setTimeout(r, 1000));
      await provider.sendText({ prompt: TURN_2 });
      await new Promise((r) => setTimeout(r, 1000));
      const resp3 = await provider.sendText({ prompt: TURN_3.replace(/{anchor}/g, '3') });
      const match = resp3.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        console.log(`  [${i + 1}/15] ${parsed.sentenceMonths}mo`);
        await appendFile(OUT, JSON.stringify({
          conditionType: '3turn-random', conditionId: 'low-anchor-3mo', anchor: 3,
          temperature: TEMPERATURE, result: parsed, model: MODEL,
          timestamp: new Date().toISOString(), turns: 3,
        }) + '\n');
      }
    } catch (e) { console.error(`Error: ${e}`); }
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  // High anchor (15 trials)
  console.log(`--- High Anchor (9mo) ---`);
  for (let i = 0; i < 15; i++) {
    try {
      await provider.sendText({ prompt: TURN_1 });
      await new Promise((r) => setTimeout(r, 1000));
      await provider.sendText({ prompt: TURN_2 });
      await new Promise((r) => setTimeout(r, 1000));
      const resp3 = await provider.sendText({ prompt: TURN_3.replace(/{anchor}/g, '9') });
      const match = resp3.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        console.log(`  [${i + 1}/15] ${parsed.sentenceMonths}mo`);
        await appendFile(OUT, JSON.stringify({
          conditionType: '3turn-random', conditionId: 'high-anchor-9mo', anchor: 9,
          temperature: TEMPERATURE, result: parsed, model: MODEL,
          timestamp: new Date().toISOString(), turns: 3,
        }) + '\n');
      }
    } catch (e) { console.error(`Error: ${e}`); }
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  console.log('\n=== LLAMA 3.3 3-TURN CONTROL COMPLETE ===');
}

main();
