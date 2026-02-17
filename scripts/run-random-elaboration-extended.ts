#!/usr/bin/env npx tsx
/**
 * Random elaboration control on additional models
 * Fix #2: Validate mechanism decomposition across more models
 */
import { appendFile } from 'node:fs/promises';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';

// Additional models to test (already have GPT-4o and Llama 3.3)
const MODELS = [
  { spec: 'anthropic/claude-opus-4-5', category: 'biased', delay: 3000 },
  { spec: 'anthropic/claude-sonnet-4-20250514', category: 'unbiased', delay: 3000 },
];

const RUNS = 15;
const OUT = 'results/random-elaboration-extended.jsonl';

const RANDOM_ELABORATION_PROMPT = `Before answering the main question, please complete this warm-up task:

Describe the weather in a hypothetical coastal city. Include details about temperature, sky conditions, and wind. Write 2-3 sentences.

---

Now for the main task:

${anchoringProsecutorSentencingCaseVignette}

PROSECUTOR RECOMMENDATION: {anchor} months

Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "prosecutorEvaluation": "<too low|just right|too high>", "reasoning": "<brief>"}`;

async function main() {
  console.log('Random elaboration on extended model set');
  console.log(`Models: ${MODELS.map((m) => m.spec).join(', ')}`);
  console.log(`Runs per anchor: ${RUNS}`);
  console.log(`Output: ${OUT}\n`);

  for (const model of MODELS) {
    console.log(`\n=== ${model.spec} (${model.category}) ===`);
    const spec = parseModelSpec(model.spec);
    const provider = await createProvider(spec, 0);

    for (const anchor of [3, 9]) {
      const conditionId = anchor === 3 ? 'low-anchor-3mo' : 'high-anchor-9mo';
      console.log(`  Anchor ${anchor}mo:`);

      for (let i = 0; i < RUNS; i++) {
        const prompt = RANDOM_ELABORATION_PROMPT.replace('{anchor}', String(anchor));
        try {
          const response = await provider.sendText({ prompt });
          const match = response.match(/\{[\s\S]*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            process.stdout.write(`${parsed.sentenceMonths} `);
            await appendFile(
              OUT,
              JSON.stringify({
                conditionType: 'random-elaboration',
                model: model.spec,
                category: model.category,
                conditionId,
                anchor,
                sentenceMonths: parsed.sentenceMonths,
                timestamp: new Date().toISOString(),
              }) + '\n',
            );
          } else {
            process.stdout.write('X ');
          }
        } catch (e) {
          process.stdout.write('E ');
        }
        await new Promise((r) => setTimeout(r, model.delay));
      }
      console.log();
    }
  }
  console.log('\nDone!');
}

main();
