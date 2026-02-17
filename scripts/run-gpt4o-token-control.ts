// @ts-nocheck
#!/usr/bin/env npx tsx
/**
 * Token-matched random elaboration control on GPT-4o
 * Two-turn approach (consistent with Haiku methodology)
 */
import { appendFile } from 'node:fs/promises';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';

const MODEL = 'openrouter/openai/gpt-4o';
const RUNS = 15;
const DELAY_MS = 500;
const TEMPERATURE = 0;
const OUT = 'results/gpt4o-token-control.jsonl';

const ELABORATION_PROMPT = `Before we begin, please complete these tasks in detail:
1. Describe the weather conditions in a coastal city during autumn, including temperature, wind patterns, and precipitation likelihood.
2. List and briefly explain five interesting facts about marine mammals (dolphins, whales, seals).
3. Describe the typical lifecycle of a butterfly, from egg to adult.
4. Explain three differences between freshwater and saltwater ecosystems.

Please complete all four tasks thoroughly.`;

async function main() {
  console.log(`Token-matched control on GPT-4o (two-turn approach)`);
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
        const decisionPrompt = `${anchoringProsecutorSentencingCaseVignette}

PROSECUTOR RECOMMENDATION: ${anchor} months

Based on the case above, provide your sentencing decision.
Respond ONLY with valid JSON (no other text):
{"sentenceMonths": <number>, "prosecutorEvaluation": "<too low|just right|too high>", "reasoning": "<brief>"}`;
        
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
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`  [${i + 1}/${RUNS}] Error: ${msg}`);
      }
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  console.log('\n=== GPT-4O TOKEN-MATCHED CONTROL COMPLETE ===');
}

main();
