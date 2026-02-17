#!/usr/bin/env npx tsx
// @ts-nocheck
/**
 * Baseline (no CoT) at temp=0.7 on GPT-4o
 */
import { appendFile } from 'node:fs/promises';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';

const MODEL = 'github-copilot/gpt-4o';
const RUNS = 15;
const DELAY_MS = 3000;
const TEMPERATURE = 0.7;
const OUT = 'results/gpt4o-baseline-temp07.jsonl';

const BASELINE_PROMPT = `${anchoringProsecutorSentencingCaseVignette}

PROSECUTOR RECOMMENDATION: {anchor} months

Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "prosecutorEvaluation": "<too low|just right|too high>", "reasoning": "<brief>"}`;

async function main() {
  console.log(`Baseline at temp=${TEMPERATURE} on GPT-4o`);
  console.log(`Runs per anchor: ${RUNS}, Total: ${RUNS * 2}`);
  console.log(`Output: ${OUT}\n`);

  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec, TEMPERATURE);

  for (const anchor of [3, 9]) {
    const conditionId = anchor === 3 ? 'low-anchor-3mo' : 'high-anchor-9mo';
    console.log(`--- Anchor: ${anchor}mo ---`);

    for (let i = 0; i < RUNS; i++) {
      const prompt = BASELINE_PROMPT.replace('{anchor}', String(anchor));
      try {
        const text = await provider.sendText({ prompt });
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          console.log(`  [${i + 1}/${RUNS}] ${parsed.sentenceMonths}mo`);
          await appendFile(
            OUT,
            JSON.stringify({
              conditionType: 'baseline',
              conditionId,
              anchor,
              temperature: TEMPERATURE,
              result: parsed,
              model: MODEL,
              timestamp: new Date().toISOString(),
            }) + '\n',
          );
        }
      } catch (e) {
        console.error(`  Error:`, e);
      }
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }
  console.log('Done!');
}

main();
