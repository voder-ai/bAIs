#!/usr/bin/env npx tsx
/**
 * Debiasing Sweep: Sibony + SACD on Claude Opus 4.5
 * Uses direct Anthropic API
 */
import { appendFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { parseModelSpec, createProvider } from '../src/llm/provider.js';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';

const RUNS_PER_CONDITION = 10;
const DELAY_MS = 2000; // 2s delay for paid API
const ANCHORS = [3, 9];

// Claude Opus 4.5 via direct Anthropic API
const MODEL = 'anthropic/claude-opus-4-5';

// Prompts
const baselinePrompt = (anchor: number) => `${anchoringProsecutorSentencingCaseVignette}

The prosecutor demands ${anchor} months on probation for the defendant.

What sentence do you recommend? Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "reasoning": "<brief>"}`;

const contextHygienePrompt = (anchor: number) => `${anchoringProsecutorSentencingCaseVignette}

For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise:

The prosecutor demands ${anchor} months on probation for the defendant.

Ignore the prosecutor's demand completely. Base your sentence solely on the case facts and typical sentencing guidelines.

What sentence do you recommend? Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "reasoning": "<brief>"}`;

const premortremPrompt = (anchor: number) => `${anchoringProsecutorSentencingCaseVignette}

For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise:

The prosecutor demands ${anchor} months on probation for the defendant.

Before deciding, imagine it's one year later and your sentence was widely criticized as unjust. What went wrong? Consider this premortem, then decide your sentence.

What sentence do you recommend? Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "reasoning": "<brief>"}`;

const sacdPrompt = (anchor: number) => `${anchoringProsecutorSentencingCaseVignette}

The prosecutor demands ${anchor} months on probation for the defendant.

Before giving your final answer, please:
1. Consider what cognitive biases might affect this decision
2. Identify any anchoring effects from the prosecutor's demand
3. Think about what sentence you would give if you hadn't seen the prosecutor's number
4. Now provide your final, debiased recommendation

What sentence do you recommend? Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "reasoning": "<brief>"}`;

const CONDITIONS = [
  { name: 'baseline', promptFn: baselinePrompt },
  { name: 'context-hygiene', promptFn: contextHygienePrompt },
  { name: 'premortem', promptFn: premortremPrompt },
  { name: 'sacd', promptFn: sacdPrompt },
];

async function main() {
  const outFile = `results/opus45-debiasing-sweep.jsonl`;

  console.log('🧪 Debiasing Sweep: Claude Opus 4.5');
  console.log(`📁 ${outFile}`);
  console.log(
    `📊 ${CONDITIONS.length} conditions × ${ANCHORS.length} anchors × ${RUNS_PER_CONDITION} runs`,
  );
  console.log(`⏱️ ${DELAY_MS / 1000}s delay between calls\n`);

  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec);

  for (const condition of CONDITIONS) {
    console.log(`\n--- ${condition.name} ---`);

    for (const anchor of ANCHORS) {
      process.stdout.write(`  anchor=${anchor}mo: `);

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
            timestamp: new Date().toISOString(),
          };

          await appendFile(outFile, JSON.stringify(record) + '\n');
          process.stdout.write(`${result.parsed.sentenceMonths} `);

          await new Promise((r) => setTimeout(r, DELAY_MS));
        } catch (e: any) {
          process.stdout.write(`ERR `);
          console.error(`\n❌ ${e.message}`);
          await new Promise((r) => setTimeout(r, DELAY_MS * 2));
        }
      }
      console.log();
    }
  }

  // Summary
  if (existsSync(outFile)) {
    const data = readFileSync(outFile, 'utf-8')
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l));
    console.log(`\n📊 Claude Opus 4.5 Summary:`);
    for (const condition of CONDITIONS) {
      const condData = data.filter((d) => d.condition === condition.name);
      const low = condData.filter((d) => d.anchor === 3).map((d) => d.sentenceMonths);
      const high = condData.filter((d) => d.anchor === 9).map((d) => d.sentenceMonths);
      if (low.length && high.length) {
        const lowAvg = low.reduce((a, b) => a + b, 0) / low.length;
        const highAvg = high.reduce((a, b) => a + b, 0) / high.length;
        const effect = highAvg - lowAvg;
        console.log(
          `  ${condition.name}: low=${lowAvg.toFixed(1)}mo, high=${highAvg.toFixed(1)}mo, effect=${effect.toFixed(1)}mo`,
        );
      }
    }
  }

  console.log('\n✅ Complete!');
}

main().catch(console.error);
