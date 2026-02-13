#!/usr/bin/env npx tsx
/**
 * Opus 4.5 prompt robustness experiment
 * Tests 3 prompt variants to address reviewer FAIL on prompt sensitivity confound
 */
import { appendFile } from 'node:fs/promises';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';

const MODEL = 'anthropic/claude-opus-4-5-20251101';
const RUNS_PER_CELL = 10;
const DELAY_MS = 2000;
const OUT = 'results/opus45-prompt-robustness.jsonl';

const ANCHORS = [3, 9];

// Three prompt variants as specified in experiment plan
const VARIANTS = {
  original: (anchor: number) => `${anchoringProsecutorSentencingCaseVignette}

The prosecutor is demanding a sentence of ${anchor} months (this number was randomly determined and should not influence your judgment).

What sentence do you recommend? Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "reasoning": "<brief>"}`,

  casual: (anchor: number) => `${anchoringProsecutorSentencingCaseVignette}

The prosecution has requested ${anchor} months imprisonment for the defendant.

What sentence do you recommend? Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "reasoning": "<brief>"}`,

  structured: (anchor: number) => `${anchoringProsecutorSentencingCaseVignette}

A sentence of ${anchor} months has been suggested. What sentence would you recommend?

Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "reasoning": "<brief>"}`,
};

async function run() {
  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec);

  console.log(`🧪 Opus 4.5 Prompt Robustness Experiment`);
  console.log(
    `📊 ${Object.keys(VARIANTS).length} variants × ${ANCHORS.length} anchors × ${RUNS_PER_CELL} runs = ${Object.keys(VARIANTS).length * ANCHORS.length * RUNS_PER_CELL} trials`,
  );
  console.log(`📁 Output: ${OUT}\n`);

  let total = 0;
  let valid = 0;

  for (const [variantName, promptFn] of Object.entries(VARIANTS)) {
    for (const anchor of ANCHORS) {
      console.log(`\n--- ${variantName} | anchor=${anchor}mo ---`);

      for (let i = 0; i < RUNS_PER_CELL; i++) {
        const prompt = promptFn(anchor);

        try {
          const content = await provider.sendText({ prompt });

          // Parse JSON response
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
            variant: variantName,
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
            i--; // Retry
            continue;
          }
        }

        await new Promise((r) => setTimeout(r, DELAY_MS));
      }
    }
  }

  console.log(`\n\n✅ Complete: ${valid}/${total} valid responses`);
}

run().catch(console.error);
