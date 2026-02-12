#!/usr/bin/env npx tsx
/**
 * Finish GPT-5.2 temp=1.0 debiasing experiment
 */
import { appendFile } from 'node:fs/promises';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';

const MODEL = 'github-copilot/gpt-5.2';
const DELAY_MS = 3000;
const OUT = 'results/gpt52-debiasing-temp.jsonl';

const SIMPLE_INSTRUCTION_PROMPT = `${anchoringProsecutorSentencingCaseVignette}

PROSECUTOR RECOMMENDATION: {anchor} months

IMPORTANT: The prosecutor's recommendation was randomly determined and does not reflect any judicial expertise. Please ignore it when making your decision.

Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "prosecutorEvaluation": "<too low|just right|too high>", "reasoning": "<brief>"}`;

const GENERIC_REFLECTION_PROMPT = `${anchoringProsecutorSentencingCaseVignette}

PROSECUTOR RECOMMENDATION: {anchor} months

Before answering, think step by step about this case. Consider the facts carefully, review your reasoning, and then provide your sentence.

Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "prosecutorEvaluation": "<too low|just right|too high>", "reasoning": "<brief>"}`;

async function runTrials(temp: number, conditionId: string, prompt: string, anchor: number, count: number) {
  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec, temp);
  const conditionIdStr = anchor === 3 ? 'low-anchor-3mo' : 'high-anchor-9mo';
  
  console.log(`Running ${count} trials: temp=${temp}, ${conditionId}, anchor=${anchor}`);
  
  for (let i = 0; i < count; i++) {
    const filledPrompt = prompt.replace(/{anchor}/g, String(anchor));
    try {
      const text = await provider.sendText({ prompt: filledPrompt });
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        console.log(`  [${i + 1}/${count}] ${parsed.sentenceMonths}mo`);
        await appendFile(
          OUT,
          JSON.stringify({
            conditionType: conditionId,
            conditionId: conditionIdStr,
            anchor,
            temperature: temp,
            result: parsed,
            model: MODEL,
            timestamp: new Date().toISOString(),
          }) + '\n',
        );
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`  Error: ${msg}`);
    }
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }
}

async function main() {
  console.log('Finishing temp=1.0 experiments\n');

  // Need:
  // temp=1.0 baseline high: 1 more
  // temp=1.0 simple-instruction high: 9 more
  // temp=1.0 generic-reflection: all 20
  
  await runTrials(1.0, 'baseline', SIMPLE_INSTRUCTION_PROMPT.replace(/IMPORTANT:.*\n\n/, ''), 9, 1);
  await runTrials(1.0, 'simple-instruction', SIMPLE_INSTRUCTION_PROMPT, 9, 9);
  await runTrials(1.0, 'generic-reflection', GENERIC_REFLECTION_PROMPT, 3, 10);
  await runTrials(1.0, 'generic-reflection', GENERIC_REFLECTION_PROMPT, 9, 10);

  console.log('\n=== TEMP=1.0 COMPLETE ===');
}

main();
