#!/usr/bin/env npx tsx
// @ts-nocheck
/**
 * Retry top-ups with longer delays
 */
import { appendFile } from 'node:fs/promises';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';

const MODEL = 'github-copilot/gpt-5.2';
const DELAY_MS = 8000; // Longer delay
const TEMPERATURE = 0;
const OUT = 'results/gpt52-3turn-random-control.jsonl';

const TURN_1 = `Describe the weather in a coastal city during autumn.`;
const TURN_2 = `List 5 facts about marine mammals.`;
const TURN_3 = `${anchoringProsecutorSentencingCaseVignette}

PROSECUTOR RECOMMENDATION: {anchor} months

Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "prosecutorEvaluation": "<too low|just right|too high>", "reasoning": "<brief>"}`;

async function runOne(provider: any, anchor: number, attempt: number): Promise<boolean> {
  const conditionId = anchor === 3 ? 'low-anchor-3mo' : 'high-anchor-9mo';
  try {
    console.log(`  Attempt ${attempt} for ${anchor}mo anchor...`);
    await provider.sendText({ prompt: TURN_1 });
    await new Promise((r) => setTimeout(r, 2000));
    await provider.sendText({ prompt: TURN_2 });
    await new Promise((r) => setTimeout(r, 2000));

    const turn3 = TURN_3.replace(/{anchor}/g, String(anchor));
    const resp3 = await provider.sendText({ prompt: turn3 });

    const match = resp3.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      console.log(`  ✅ ${parsed.sentenceMonths}mo`);
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
          note: 'retry-topup',
        }) + '\n',
      );
      return true;
    }
    console.log(`  ❌ No JSON in response`);
    return false;
  } catch (e: any) {
    console.log(`  ❌ Error: ${e.message}`);
    return false;
  }
}

async function main() {
  console.log(`Retry top-ups with longer delays`);

  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec, TEMPERATURE);

  // Need 1 low, 2 high
  const needed = [
    { anchor: 3, count: 1 },
    { anchor: 9, count: 2 },
  ];

  for (const { anchor, count } of needed) {
    console.log(`\n--- ${anchor}mo anchor (need ${count}) ---`);
    let got = 0;
    let attempts = 0;
    while (got < count && attempts < count * 3) {
      attempts++;
      await new Promise((r) => setTimeout(r, DELAY_MS));
      if (await runOne(provider, anchor, attempts)) {
        got++;
      }
    }
    console.log(`Got ${got}/${count} for ${anchor}mo`);
  }
  console.log('\n=== RETRY COMPLETE ===');
}

main();
