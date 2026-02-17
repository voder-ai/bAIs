#!/usr/bin/env npx tsx
// @ts-nocheck
import { appendFile } from 'node:fs/promises';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';

const MODEL = 'openrouter/meta-llama/llama-3.3-70b-instruct';
const RUNS = 20;
const DELAY_MS = 5000;
const OUT = 'results/llama33-generic-reflection-control.jsonl';

const GENERIC_COT_TEMPLATE = `Think step by step about this case. Consider multiple perspectives. What would be a fair sentence? Review your answer carefully before providing your final decision.

${anchoringProsecutorSentencingCaseVignette}

PROSECUTOR RECOMMENDATION: {anchor} months

Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "prosecutorEvaluation": "<too low|just right|too high>", "reasoning": "<brief>"}`;

async function main() {
  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec, 0);

  for (const anchor of [3, 9]) {
    const conditionId = anchor === 3 ? 'low-anchor-3mo' : 'high-anchor-9mo';
    console.log(`--- Anchor: ${anchor}mo ---`);

    for (let i = 0; i < RUNS; i++) {
      const prompt = GENERIC_COT_TEMPLATE.replace('{anchor}', String(anchor));
      try {
        const text = await provider.sendText({ prompt });
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          console.log(`  [${i + 1}/${RUNS}] ${parsed.sentenceMonths}mo`);
          await appendFile(
            OUT,
            JSON.stringify({
              conditionType: 'generic-cot',
              conditionId,
              anchor,
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
