#!/usr/bin/env npx tsx
/**
 * Top-up Hermes 405B high anchor trials (need +17)
 */
import { appendFileSync } from 'node:fs';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { anchoringProsecutorSentencingExperiment } from '../src/experiments/anchoringProsecutorSentencing.js';
import { renderPrompt } from '../src/experiments/renderPrompt.js';

const MODEL = 'openrouter/nousresearch/hermes-3-llama-3.1-405b';
const OUTPUT = 'results/hermes-405b-anchoring-topup2.jsonl';
const DELAY_MS = 2000;
const TRIALS = 17;

async function main() {
  console.log(`Topping up Hermes 405B high anchor: ${TRIALS} trials`);

  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec, 0);

  const highCondition = anchoringProsecutorSentencingExperiment.conditions.find(
    (c) => c.id === 'high-anchor-9mo',
  )!;

  for (let i = 0; i < TRIALS; i++) {
    const conditionVars = highCondition.params as Record<string, unknown>;

    // Build prompt from experiment steps
    const parts: string[] = [];
    for (const step of anchoringProsecutorSentencingExperiment.steps) {
      for (const p of step.prompts) {
        const rendered = renderPrompt(p.template, conditionVars);
        if (p.role === 'system') {
          parts.push(`[System]\n${rendered}\n[/System]`);
        } else {
          parts.push(rendered);
        }
      }
    }
    const prompt = parts.join('\n\n');

    try {
      const response = await provider.sendText({ prompt });

      // Try multiple parsing strategies
      let sentenceMonths: number | null = null;

      // Try JSON format first
      const jsonMatch = response.match(/"?sentenceMonths"?\s*[:\s]+(\d+)/i);
      if (jsonMatch) {
        sentenceMonths = parseInt(jsonMatch[1], 10);
      } else {
        // Try plain number on last line (Hermes format)
        const lines = response
          .trim()
          .split('\n')
          .filter((l) => l.trim());
        const lastLine = lines[lines.length - 1];
        const numMatch = lastLine.match(/^(\d+)$/);
        if (numMatch) {
          sentenceMonths = parseInt(numMatch[1], 10);
        }
      }

      const result = {
        experimentId: 'anchoring-prosecutor',
        model: MODEL,
        conditionId: highCondition.id,
        runIndex: i,
        params: conditionVars,
        result: sentenceMonths ? { sentenceMonths } : null,
        rawResponse: response.slice(0, 500),
        collectedAt: new Date().toISOString(),
      };

      appendFileSync(OUTPUT, JSON.stringify(result) + '\n');
      console.log(`[${i + 1}/${TRIALS}] ${sentenceMonths ?? 'PARSE_ERROR'}mo`);

      if (i < TRIALS - 1) await new Promise((r) => setTimeout(r, DELAY_MS));
    } catch (e: any) {
      console.error(`[${i + 1}/${TRIALS}] Error:`, e.message);
      const result = {
        experimentId: 'anchoring-prosecutor',
        model: MODEL,
        conditionId: highCondition.id,
        runIndex: i,
        params: conditionVars,
        result: null,
        error: e.message,
        collectedAt: new Date().toISOString(),
      };
      appendFileSync(OUTPUT, JSON.stringify(result) + '\n');
    }
  }

  console.log('Done!');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
