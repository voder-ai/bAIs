#!/usr/bin/env npx tsx
// @ts-nocheck
/**
 * Opus 4.5 probation framing experiment
 * Uses original Englich "months on probation" framing
 */
import { appendFile } from 'node:fs/promises';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';

const MODEL = 'anthropic/claude-opus-4-5-20251101';
const RUNS_PER_ANCHOR = 10;
const DELAY_MS = 2000;
const OUT = 'results/opus45-probation-framing.jsonl';

const ANCHORS = [3, 9];

// Original Englich framing with "months on probation"
const probationPrompt = (anchor: number) => `${anchoringProsecutorSentencingCaseVignette}

The prosecutor demands as a sentence for the accused Lena M. ${anchor} months on probation.

What sentence (in months on probation) do you recommend? Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "reasoning": "<brief>"}`;

async function run() {
  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec);

  console.log(`🧪 Opus 4.5 PROBATION Framing Experiment`);
  console.log(`📊 Model: ${MODEL}`);
  console.log(
    `📊 2 anchors × ${RUNS_PER_ANCHOR} runs = ${ANCHORS.length * RUNS_PER_ANCHOR} trials`,
  );
  console.log(`📁 Output: ${OUT}\n`);

  let total = 0;
  let valid = 0;

  for (const anchor of ANCHORS) {
    console.log(`\n--- probation | anchor=${anchor}mo ---`);

    for (let i = 0; i < RUNS_PER_ANCHOR; i++) {
      const prompt = probationPrompt(anchor);

      try {
        const content = await provider.sendText({ prompt });

        let parsed: number | null = null;
        const jsonMatch = content.match(/\{[^}]+\}/);
        if (jsonMatch) {
          try {
            const obj = JSON.parse(jsonMatch[0]);
            if (typeof obj.sentenceMonths === 'number') {
              parsed = obj.sentenceMonths;
            }
          } catch {}
        }

        const record = {
          model: MODEL,
          framing: 'probation',
          infrastructure: 'vultr',
          anchor,
          trial: i + 1,
          raw: content,
          parsed,
          timestamp: new Date().toISOString(),
        };

        await appendFile(OUT, JSON.stringify(record) + '\n');

        total++;
        if (parsed !== null) {
          valid++;
          process.stdout.write(`✓${parsed} `);
        } else {
          process.stdout.write(`✗ `);
        }
      } catch (err: any) {
        console.error(`\n❌ Error: ${err.message}`);
        if (err.message?.includes('rate') || err.message?.includes('429')) {
          console.log('Rate limited, waiting 30s...');
          await new Promise((r) => setTimeout(r, 30000));
          i--;
          continue;
        }
      }

      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  console.log(`\n\n✅ Complete: ${valid}/${total} valid responses`);
}

run().catch(console.error);
