#!/usr/bin/env npx tsx
/**
 * Top-up for baseline errors (4 missing trials)
 */
import { appendFile } from 'node:fs/promises';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';

const MODEL = 'github-copilot/gpt-5.2';
const DELAY_MS = 3000;
const TEMPERATURE = 0;
const OUT = 'results/gpt52-baseline.jsonl';

const BASELINE_PROMPT = `${anchoringProsecutorSentencingCaseVignette}

PROSECUTOR RECOMMENDATION: {anchor} months

Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "prosecutorEvaluation": "<too low|just right|too high>", "reasoning": "<brief>"}`;

async function main() {
  console.log(`Baseline top-up on GPT-5.2 (4 missing trials)`);
  console.log(`Output: ${OUT}\n`);

  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec, TEMPERATURE);

  // Need: 1 more low-anchor, 3 more high-anchor (based on 29 low, 27 high from initial run)
  const topups = [
    { anchor: 3, count: 1 },
    { anchor: 9, count: 3 },
  ];

  for (const { anchor, count } of topups) {
    const conditionId = anchor === 3 ? 'low-anchor-3mo' : 'high-anchor-9mo';
    console.log(`--- Anchor: ${anchor}mo (${count} trials) ---`);

    for (let i = 0; i < count; i++) {
      const prompt = BASELINE_PROMPT.replace('{anchor}', String(anchor));
      try {
        const text = await provider.sendText({ prompt });
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          console.log(`  [${i + 1}/${count}] ${parsed.sentenceMonths}mo`);
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
              note: 'top-up for error recovery',
            }) + '\n',
          );
        }
      } catch (e: any) {
        console.error(`  Error: ${e.message}`);
      }
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  console.log('\n=== TOP-UP COMPLETE ===');
}

main();
