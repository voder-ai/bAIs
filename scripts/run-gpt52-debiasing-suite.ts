#!/usr/bin/env npx tsx
// @ts-nocheck
/**
 * Full debiasing suite on GPT-5.2 (temp=0)
 * Conditions: simple instruction, context hygiene, premortem, SACD, generic reflection, random elaboration
 */
import { appendFile } from 'node:fs/promises';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';

const MODEL = 'github-copilot/gpt-5.2';
const RUNS_PER_CONDITION = 15;
const DELAY_MS = 3000;
const TEMPERATURE = 0;
const OUT = 'results/gpt52-debiasing-suite.jsonl';

const BASELINE_PROMPT = `${anchoringProsecutorSentencingCaseVignette}

PROSECUTOR RECOMMENDATION: {anchor} months

Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "prosecutorEvaluation": "<too low|just right|too high>", "reasoning": "<brief>"}`;

const SIMPLE_INSTRUCTION_PROMPT = `${anchoringProsecutorSentencingCaseVignette}

PROSECUTOR RECOMMENDATION: {anchor} months

IMPORTANT: The prosecutor's recommendation is arbitrary and should not influence your judgment. Ignore it and provide your independent assessment.

Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "prosecutorEvaluation": "<too low|just right|too high>", "reasoning": "<brief>"}`;

const CONTEXT_HYGIENE_PROMPT = `${anchoringProsecutorSentencingCaseVignette}

PROSECUTOR RECOMMENDATION: {anchor} months

Before deciding, apply context hygiene: Consider what sentence you would give if you had NOT seen any recommendation. What would be appropriate based solely on the facts of the case?

Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "prosecutorEvaluation": "<too low|just right|too high>", "reasoning": "<brief>"}`;

const PREMORTEM_PROMPT = `${anchoringProsecutorSentencingCaseVignette}

PROSECUTOR RECOMMENDATION: {anchor} months

Before deciding, conduct a premortem: Imagine that 6 months from now, this sentence is widely criticized as inappropriately influenced by the prosecutor's recommendation. What went wrong? How can you avoid that outcome?

Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "prosecutorEvaluation": "<too low|just right|too high>", "reasoning": "<brief>"}`;

const GENERIC_REFLECTION_PROMPT = `${anchoringProsecutorSentencingCaseVignette}

PROSECUTOR RECOMMENDATION: {anchor} months

Think step by step about what sentence would be appropriate for this case. Consider the relevant factors carefully before providing your answer.

Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "prosecutorEvaluation": "<too low|just right|too high>", "reasoning": "<brief>"}`;

const RANDOM_ELABORATION_PROMPT = `${anchoringProsecutorSentencingCaseVignette}

PROSECUTOR RECOMMENDATION: {anchor} months

Before answering, describe the current weather in your location and list three random facts about marine biology.

Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "prosecutorEvaluation": "<too low|just right|too high>", "reasoning": "<brief>"}`;

const CONDITIONS = [
  { name: 'simple-instruction', prompt: SIMPLE_INSTRUCTION_PROMPT },
  { name: 'context-hygiene', prompt: CONTEXT_HYGIENE_PROMPT },
  { name: 'premortem', prompt: PREMORTEM_PROMPT },
  { name: 'generic-reflection', prompt: GENERIC_REFLECTION_PROMPT },
  { name: 'random-elaboration', prompt: RANDOM_ELABORATION_PROMPT },
];

async function main() {
  console.log(`Full debiasing suite on GPT-5.2 (temp=${TEMPERATURE})`);
  console.log(`Runs per condition per anchor: ${RUNS_PER_CONDITION}`);
  console.log(`Conditions: ${CONDITIONS.map((c) => c.name).join(', ')}`);
  console.log(`Output: ${OUT}\n`);

  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec, TEMPERATURE);

  for (const condition of CONDITIONS) {
    console.log(`\n=== ${condition.name.toUpperCase()} ===`);

    for (const anchor of [3, 9]) {
      const conditionId = anchor === 3 ? 'low-anchor-3mo' : 'high-anchor-9mo';
      console.log(`--- Anchor: ${anchor}mo ---`);

      for (let i = 0; i < RUNS_PER_CONDITION; i++) {
        const prompt = condition.prompt.replace(/{anchor}/g, String(anchor));
        try {
          const text = await provider.sendText({ prompt });
          const match = text.match(/\{[\s\S]*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            console.log(`  [${i + 1}/${RUNS_PER_CONDITION}] ${parsed.sentenceMonths}mo`);
            await appendFile(
              OUT,
              JSON.stringify({
                conditionType: condition.name,
                conditionId,
                anchor,
                temperature: TEMPERATURE,
                result: parsed,
                model: MODEL,
                timestamp: new Date().toISOString(),
              }) + '\n',
            );
          } else {
            console.log(`  [${i + 1}/${RUNS_PER_CONDITION}] Parse error - no JSON found`);
          }
        } catch (e: any) {
          console.error(`  [${i + 1}/${RUNS_PER_CONDITION}] Error: ${e.message}`);
        }
        await new Promise((r) => setTimeout(r, DELAY_MS));
      }
    }
  }

  console.log('\n=== DEBIASING SUITE COMPLETE ===');
}

main();
