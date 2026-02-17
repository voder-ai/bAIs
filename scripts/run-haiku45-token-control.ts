#!/usr/bin/env npx tsx
// @ts-nocheck
/**
 * Token-matched random elaboration control on Haiku 4.5
 * Designed to produce ~200-400 tokens of irrelevant content (matching CoT length)
 */
import { appendFile } from 'node:fs/promises';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';

const MODEL = 'anthropic/claude-3-5-haiku-20241022';
const RUNS = 15;
const DELAY_MS = 1000;
const TEMPERATURE = 0;
const OUT = 'results/haiku45-token-control.jsonl';

// Prompt designed to elicit ~200-400 tokens of irrelevant elaboration
const TOKEN_MATCHED_PROMPT = `${anchoringProsecutorSentencingCaseVignette}

PROSECUTOR RECOMMENDATION: {anchor} months

Before answering, please complete the following tasks in detail:
1. Describe the weather conditions in a coastal city during autumn, including temperature, wind patterns, and precipitation likelihood.
2. List and briefly explain five interesting facts about marine mammals (dolphins, whales, seals).
3. Describe the typical lifecycle of a butterfly, from egg to adult.
4. Explain three differences between freshwater and saltwater ecosystems.

After completing all four tasks above, provide your sentencing decision.

Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "prosecutorEvaluation": "<too low|just right|too high>", "reasoning": "<brief>"}`;

async function main() {
  console.log(`Token-matched random elaboration control on Haiku 4.5`);
  console.log(`Runs per anchor: ${RUNS}, Total: ${RUNS * 2}`);
  console.log(`Output: ${OUT}\n`);

  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec, TEMPERATURE);

  for (const anchor of [3, 9]) {
    const conditionId = anchor === 3 ? 'low-anchor-3mo' : 'high-anchor-9mo';
    console.log(`--- Anchor: ${anchor}mo ---`);

    for (let i = 0; i < RUNS; i++) {
      const prompt = TOKEN_MATCHED_PROMPT.replace(/{anchor}/g, String(anchor));
      try {
        const text = await provider.sendText({ prompt });
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          console.log(`  [${i + 1}/${RUNS}] ${parsed.sentenceMonths}mo`);
          await appendFile(
            OUT,
            JSON.stringify({
              conditionType: 'token-matched-random',
              conditionId,
              anchor,
              temperature: TEMPERATURE,
              result: parsed,
              model: MODEL,
              timestamp: new Date().toISOString(),
              fullResponse: text.substring(0, 500),
            }) + '\n',
          );
        } else {
          console.log(`  [${i + 1}/${RUNS}] Parse error`);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`  [${i + 1}/${RUNS}] Error: ${msg}`);
      }
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  console.log('\n=== HAIKU 4.5 TOKEN-MATCHED CONTROL COMPLETE ===');
}

main();
