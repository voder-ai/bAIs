#!/usr/bin/env npx tsx
/**
 * Opus 4.5 with PROBATION framing (matching original Englich)
 * 2x2 design: Framing test for Mac infrastructure
 */
import { appendFile } from 'node:fs/promises';
import { parseModelSpec, createProvider } from '../src/llm/provider.js';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';

const MODEL = 'anthropic/claude-opus-4-5-20251101';
const RUNS_PER_CELL = 10;
const DELAY_MS = 1000;
const OUT = 'results/opus45-probation-framing-mac.jsonl';

const ANCHORS = [3, 9];

// Original Englich framing with explicit "probation"
const prompt = (anchor: number) => `${anchoringProsecutorSentencingCaseVignette}

The prosecutor demands ${anchor} months on probation for the defendant.

What sentence do you recommend? Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "reasoning": "<brief>"}`;

async function run() {
  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec);

  console.log(`🧪 Opus 4.5 PROBATION Framing Test (Mac)`);
  console.log(`📊 Model: ${MODEL}`);
  console.log(`📊 ${ANCHORS.length} anchors × ${RUNS_PER_CELL} runs = 20 trials`);
  console.log(`📁 Output: ${OUT}\n`);

  for (const anchor of ANCHORS) {
    console.log(`\n--- anchor=${anchor}mo ---`);
    process.stdout.write('  ');

    for (let i = 0; i < RUNS_PER_CELL; i++) {
      try {
        const result = await provider.sendJson<{ sentenceMonths: number; reasoning: string }>({
          prompt: prompt(anchor),
        });

        const record = {
          model: MODEL,
          framing: 'probation',
          infrastructure: 'mac',
          anchor,
          sentenceMonths: result.parsed.sentenceMonths,
          reasoning: result.parsed.reasoning,
        };

        await appendFile(OUT, JSON.stringify(record) + '\n');
        process.stdout.write(`[${i + 1}/${RUNS_PER_CELL}] ${result.parsed.sentenceMonths}mo  `);

        await new Promise((r) => setTimeout(r, DELAY_MS));
      } catch (e) {
        console.error(`\n❌ Error:`, e);
      }
    }
    console.log();
  }

  console.log('\n✅ Complete!');
}

run().catch(console.error);
