// @ts-nocheck
#!/usr/bin/env npx tsx
/**
 * Random elaboration control on GPT-4o (biased model)
 * Purpose: Test if multi-turn structure alone debiases, confirming mechanism
 */
import { appendFile } from 'node:fs/promises';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';

const MODEL = 'github-copilot/gpt-4o';
const RUNS = 15;
const DELAY_MS = 3000;
const OUT = 'results/gpt4o-random-elaboration-control.jsonl';

// Irrelevant elaboration - same multi-turn structure, no reasoning content
const RANDOM_ELABORATION_PROMPT = `Before answering the main question, please complete this warm-up task:

Describe the weather in a hypothetical coastal city. Include details about temperature, sky conditions, and wind. Write 2-3 sentences.

---

Now for the main task:

${anchoringProsecutorSentencingCaseVignette}

PROSECUTOR RECOMMENDATION: {anchor} months

Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "prosecutorEvaluation": "<too low|just right|too high>", "reasoning": "<brief>"}`;

async function main() {
  console.log(`Random elaboration control on GPT-4o`);
  console.log(`Runs per anchor: ${RUNS}, Total: ${RUNS * 2}`);
  console.log(`Output: ${OUT}\n`);

  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec, 0);

  for (const anchor of [3, 9]) {
    const conditionId = anchor === 3 ? 'low-anchor-3mo' : 'high-anchor-9mo';
    console.log(`--- Anchor: ${anchor}mo ---`);

    for (let i = 0; i < RUNS; i++) {
      const prompt = RANDOM_ELABORATION_PROMPT.replace('{anchor}', String(anchor));
      try {
        const text = await provider.sendText({ prompt });
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          console.log(`  [${i + 1}/${RUNS}] ${parsed.sentenceMonths}mo`);
          await appendFile(
            OUT,
            JSON.stringify({
              conditionType: 'random-elaboration',
              conditionId,
              anchor,
              result: parsed,
              model: MODEL,
              timestamp: new Date().toISOString(),
            }) + '\n',
          );
        } else {
          console.log(`  [${i + 1}/${RUNS}] parse failed`);
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
