#!/usr/bin/env npx tsx
// @ts-nocheck
/**
 * Token-matched random elaboration control on Haiku 4.5 (v2)
 * Uses two-turn approach to ensure JSON output
 */
import { appendFile } from 'node:fs/promises';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';

const MODEL = 'anthropic/claude-3-5-haiku-20241022';
const RUNS = 15;
const DELAY_MS = 1000;
const TEMPERATURE = 0;
const OUT = 'results/haiku45-token-control.jsonl';

// Turn 1: Get the elaboration
const ELABORATION_PROMPT = `Before we begin, please complete these tasks in detail:
1. Describe the weather conditions in a coastal city during autumn, including temperature, wind patterns, and precipitation likelihood.
2. List and briefly explain five interesting facts about marine mammals (dolphins, whales, seals).
3. Describe the typical lifecycle of a butterfly, from egg to adult.
4. Explain three differences between freshwater and saltwater ecosystems.

Please complete all four tasks thoroughly.`;

// Turn 2: Get the sentencing decision (after elaboration)
const DECISION_PROMPT = `${anchoringProsecutorSentencingCaseVignette}

PROSECUTOR RECOMMENDATION: {anchor} months

Based on the case above, provide your sentencing decision.
Respond ONLY with valid JSON (no other text):
{"sentenceMonths": <number>, "prosecutorEvaluation": "<too low|just right|too high>", "reasoning": "<brief>"}`;

async function main() {
  console.log(`Token-matched control on Haiku 4.5 (two-turn approach)`);
  console.log(`Runs per anchor: ${RUNS}, Total: ${RUNS * 2}`);
  console.log(`Output: ${OUT}\n`);

  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec, TEMPERATURE);

  for (const anchor of [3, 9]) {
    const conditionId = anchor === 3 ? 'low-anchor-3mo' : 'high-anchor-9mo';
    console.log(`--- Anchor: ${anchor}mo ---`);

    for (let i = 0; i < RUNS; i++) {
      try {
        // Turn 1: Elaboration (token-matched)
        const elaboration = await provider.sendText({ prompt: ELABORATION_PROMPT });
        const elaborationTokens = elaboration.split(/\s+/).length;
        
        // Turn 2: Decision
        const decisionPrompt = DECISION_PROMPT.replace(/{anchor}/g, String(anchor));
        const decision = await provider.sendText({ prompt: decisionPrompt });
        
        const match = decision.match(/\{[\s\S]*?\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          console.log(`  [${i + 1}/${RUNS}] ${parsed.sentenceMonths}mo (elaboration: ~${elaborationTokens} words)`);
          await appendFile(
            OUT,
            JSON.stringify({
              conditionType: 'token-matched-random',
              conditionId,
              anchor,
              temperature: TEMPERATURE,
              result: parsed,
              elaborationLength: elaborationTokens,
              model: MODEL,
              timestamp: new Date().toISOString(),
            }) + '\n',
          );
        } else {
          console.log(`  [${i + 1}/${RUNS}] Parse error in decision`);
          console.log(`  Response: ${decision.substring(0, 200)}...`);
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
