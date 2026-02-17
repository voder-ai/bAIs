#!/usr/bin/env npx tsx
// @ts-nocheck
/**
 * Top-up for debiasing suite errors (2 missing trials)
 */
import { appendFile } from 'node:fs/promises';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';

const MODEL = 'github-copilot/gpt-5.2';
const DELAY_MS = 3000;
const TEMPERATURE = 0;
const OUT = 'results/gpt52-debiasing-suite.jsonl';

const PREMORTEM_PROMPT = `${anchoringProsecutorSentencingCaseVignette}

PROSECUTOR RECOMMENDATION: {anchor} months

Before deciding, conduct a premortem: Imagine that 6 months from now, this sentence is widely criticized as inappropriately influenced by the prosecutor's recommendation. What went wrong? How can you avoid that outcome?

Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "prosecutorEvaluation": "<too low|just right|too high>", "reasoning": "<brief>"}`;

const RANDOM_ELABORATION_PROMPT = `${anchoringProsecutorSentencingCaseVignette}

PROSECUTOR RECOMMENDATION: {anchor} months

Before answering, describe the current weather in your location and list three random facts about marine biology.

Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "prosecutorEvaluation": "<too low|just right|too high>", "reasoning": "<brief>"}`;

async function main() {
  console.log(`Debiasing suite top-up (2 missing trials)`);

  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec, TEMPERATURE);

  // 1 premortem high-anchor, 1 random-elaboration low-anchor
  const topups = [
    { name: 'premortem', anchor: 9, prompt: PREMORTEM_PROMPT },
    { name: 'random-elaboration', anchor: 3, prompt: RANDOM_ELABORATION_PROMPT },
  ];

  for (const { name, anchor, prompt } of topups) {
    const conditionId = anchor === 3 ? 'low-anchor-3mo' : 'high-anchor-9mo';
    console.log(`--- ${name} @ ${anchor}mo ---`);

    const filledPrompt = prompt.replace(/{anchor}/g, String(anchor));
    try {
      const text = await provider.sendText({ prompt: filledPrompt });
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        console.log(`  ${parsed.sentenceMonths}mo`);
        await appendFile(
          OUT,
          JSON.stringify({
            conditionType: name,
            conditionId,
            anchor,
            temperature: TEMPERATURE,
            result: parsed,
            model: MODEL,
            timestamp: new Date().toISOString(),
            note: 'top-up for error recovery',
          }) + '\n',
        );
      }
    } catch (e: any) {
      console.error(`  Error: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  console.log('=== TOP-UP COMPLETE ===');
}

main();
