#!/usr/bin/env npx tsx
// MiniMax premortem only (context-hygiene already done)
import { appendFile } from 'node:fs/promises';
import { parseModelSpec, createProvider } from '../src/llm/provider.js';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';

const MODEL = 'openrouter/minimax/minimax-m2.5';
const ANCHOR = 21;
const BASELINE = 12;
const TRIALS = 30;
const OUT = 'results/sibony-high-anchor-21mo-minimax-m2.5-premortem.jsonl';

const premortremPrompt = `${anchoringProsecutorSentencingCaseVignette}

For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise:

The prosecutor demands ${ANCHOR} months on probation for the defendant.

Before deciding, imagine it's one year later and your sentence was widely criticized as unjust. What went wrong? Consider this premortem, then decide your sentence.

What sentence do you recommend? Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "reasoning": "<brief>"}`;

async function run() {
  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec);

  console.log('MiniMax Premortem @ 21mo anchor');
  console.log('Output:', OUT);

  for (let i = 0; i < TRIALS; i++) {
    try {
      const result = await provider.sendJson<{ sentenceMonths: number; reasoning: string }>({
        prompt: premortremPrompt,
      });
      const sentence = result.parsed?.sentenceMonths;
      const record = {
        model: MODEL,
        technique: 'premortem',
        anchor: ANCHOR,
        baseline: BASELINE,
        trialIndex: i,
        sentenceMonths: sentence,
        reasoning: result.parsed?.reasoning || null,
        collectedAt: new Date().toISOString(),
      };
      await appendFile(OUT, JSON.stringify(record) + '\n');
      console.log(`Trial ${i + 1}/${TRIALS}: ${sentence}mo`);
      await new Promise((r) => setTimeout(r, 1000));
    } catch (e: any) {
      console.error(`Error on trial ${i + 1}:`, e.message || e);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
  console.log('=== Complete ===');
}

run().catch(console.error);
