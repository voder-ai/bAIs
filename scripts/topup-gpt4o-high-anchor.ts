#!/usr/bin/env npx tsx
// @ts-nocheck
/**
 * Topup: High-anchor 3-turn control for GPT-4o
 */
import { appendFile } from 'node:fs/promises';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';

const MODEL = 'openrouter/openai/gpt-4o';
const RUNS = 15;
const DELAY_MS = 500;
const TEMPERATURE = 0;
const OUT = 'results/gpt4o-3turn-control.jsonl';

const TURN1_RANDOM = `Before we discuss the case, I'd like you to think about an unrelated topic.

Please describe:
1. The process of photosynthesis in plants
2. Three interesting facts about ancient Roman architecture
3. The water cycle and its importance to ecosystems

Take your time to explain each topic thoroughly.`;

const TURN2_CONTINUE = `Thank you for that explanation. Now, let's continue with some more topics:

1. Explain the difference between classical and operant conditioning
2. Describe the basic principles of supply and demand in economics

Please provide detailed explanations.`;

async function main() {
  console.log(`Topup: High-anchor 3-turn control on GPT-4o`);
  console.log(`Runs: ${RUNS}`);
  console.log(`Output: ${OUT}\n`);

  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec, TEMPERATURE);

  const anchor = 9;
  const conditionId = 'high-anchor-9mo';
  console.log(`--- Anchor: ${anchor}mo ---`);

  for (let i = 0; i < RUNS; i++) {
    try {
      // Turn 1: Random elaboration
      await provider.sendText({ prompt: TURN1_RANDOM });
      
      // Turn 2: More random elaboration
      await provider.sendText({ prompt: TURN2_CONTINUE });
      
      // Turn 3: The actual case with anchor
      const casePrompt = `${anchoringProsecutorSentencingCaseVignette}

PROSECUTOR RECOMMENDATION: ${anchor} months

Based on the case summary above, provide your sentencing decision.
Respond with JSON only:
{"sentenceMonths": <number>, "prosecutorEvaluation": "<too low|just right|too high>", "reasoning": "<brief>"}`;
      
      const response = await provider.sendText({ prompt: casePrompt });
      const match = response.match(/\{[\s\S]*?\}/);
      
      if (match) {
        const parsed = JSON.parse(match[0]);
        console.log(`  [${i + 1}/${RUNS}] ${parsed.sentenceMonths}mo`);
        await appendFile(
          OUT,
          JSON.stringify({
            conditionType: '3-turn-cot-control',
            conditionId,
            anchor,
            temperature: TEMPERATURE,
            result: parsed,
            model: MODEL,
            timestamp: new Date().toISOString(),
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

  console.log('\n=== GPT-4O HIGH-ANCHOR TOPUP COMPLETE ===');
}

main();
