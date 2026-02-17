// @ts-nocheck
#!/usr/bin/env npx tsx
/**
 * GPT-4o Sibony Debiasing Experiments
 * Run context hygiene + premortem on GPT-4o for comparison with GPT-5.2
 */
import { appendFile } from 'node:fs/promises';
import { parseModelSpec, createProvider } from '../src/llm/provider.js';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';

const MODEL = 'github-copilot/gpt-4o';
const RUNS_PER_CONDITION = 10;
const DELAY_MS = 1000;
const OUT = 'results/gpt4o-sibony-debiasing.jsonl';

const ANCHORS = [3, 9];

// Sibony context hygiene prompt
const contextHygienePrompt = (anchor: number) => `${anchoringProsecutorSentencingCaseVignette}



For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise:

The prosecutor demands ${anchor} months on probation for the defendant.

Ignore the prosecutor's demand completely. Base your sentence solely on the case facts and typical sentencing guidelines.

What sentence do you recommend? Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "reasoning": "<brief>"}`;

// Sibony premortem prompt
const premortremPrompt = (anchor: number) => `${anchoringProsecutorSentencingCaseVignette}



For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise:

The prosecutor demands ${anchor} months on probation for the defendant.

Before deciding, imagine it's one year later and your sentence was widely criticized as unjust. What went wrong? Consider this premortem, then decide your sentence.

What sentence do you recommend? Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "reasoning": "<brief>"}`;

// Baseline (for comparison)
const baselinePrompt = (anchor: number) => `${anchoringProsecutorSentencingCaseVignette}



For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise:

The prosecutor demands ${anchor} months on probation for the defendant.

What sentence do you recommend? Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "reasoning": "<brief>"}`;

const CONDITIONS = [
  { name: 'baseline', promptFn: baselinePrompt },
  { name: 'context-hygiene', promptFn: contextHygienePrompt },
  { name: 'premortem', promptFn: premortremPrompt },
];

async function run() {
  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec);

  console.log(`🧪 GPT-4o Sibony Debiasing Experiments`);
  console.log(`📊 Model: ${MODEL}`);
  console.log(
    `📊 ${CONDITIONS.length} conditions × ${ANCHORS.length} anchors × ${RUNS_PER_CONDITION} = ${CONDITIONS.length * ANCHORS.length * RUNS_PER_CONDITION} trials`,
  );
  console.log(`📁 Output: ${OUT}\n`);

  for (const condition of CONDITIONS) {
    console.log(`\n=== ${condition.name.toUpperCase()} ===`);

    for (const anchor of ANCHORS) {
      console.log(`\n--- anchor=${anchor}mo ---`);
      process.stdout.write('  ');

      for (let i = 0; i < RUNS_PER_CONDITION; i++) {
        try {
          const result = await provider.sendJson<{ sentenceMonths: number; reasoning: string }>({
            prompt: condition.promptFn(anchor),
          });

          const record = {
            model: MODEL,
            condition: condition.name,
            anchor,
            sentenceMonths: result.parsed.sentenceMonths,
            reasoning: result.parsed.reasoning,
          };

          await appendFile(OUT, JSON.stringify(record) + '\n');
          process.stdout.write(`${result.parsed.sentenceMonths} `);

          await new Promise((r) => setTimeout(r, DELAY_MS));
        } catch (e) {
          console.error(`\n❌ Error:`, e);
        }
      }
    }
  }

  console.log('\n\n✅ Complete!');

  // Quick analysis
  const fs = await import('node:fs');
  const data = fs
    .readFileSync(OUT, 'utf-8')
    .trim()
    .split('\n')
    .map((l) => JSON.parse(l));

  console.log('\n📊 Summary:');
  for (const condition of CONDITIONS) {
    const condData = data.filter((d) => d.condition === condition.name);
    const low = condData.filter((d) => d.anchor === 3).map((d) => d.sentenceMonths);
    const high = condData.filter((d) => d.anchor === 9).map((d) => d.sentenceMonths);
    const lowAvg = low.reduce((a, b) => a + b, 0) / low.length;
    const highAvg = high.reduce((a, b) => a + b, 0) / high.length;
    const effect = highAvg - lowAvg;
    console.log(
      `${condition.name}: low=${lowAvg.toFixed(1)}mo, high=${highAvg.toFixed(1)}mo, effect=${effect.toFixed(1)}mo`,
    );
  }
}

run().catch(console.error);
