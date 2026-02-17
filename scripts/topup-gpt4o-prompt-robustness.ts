#!/usr/bin/env npx tsx
/**
 * Top-up GPT-4o prompt robustness (need +19: 9 low, 10 high)
 */
import { appendFileSync } from 'node:fs';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { anchoringProsecutorSentencingExperiment } from '../src/experiments/anchoringProsecutorSentencing.js';
import { renderPrompt } from '../src/experiments/renderPrompt.js';

const MODEL = 'github-copilot/gpt-4o';
const OUTPUT = 'results/gpt4o-anchoring-prompt-robustness-topup.jsonl';
const DELAY_MS = 3000;

const TRIALS = [...Array(9).fill({ anchor: 3 }), ...Array(10).fill({ anchor: 9 })];

function parseResponse(response: string): number | null {
  // Try multiple patterns
  const patterns = [
    /"?sentenceMonths"?\s*[:\s]+(\d+)/i, // JSON format
    /final.*?(\d+)\s*months?/i, // "Final: X months"
    /decision[:\s]*\**(\d+)\s*months?\**/i, // "decision: **X months**"
    /sentence.*?(\d+)\s*months?/i, // "sentence X months"
  ];

  for (const pattern of patterns) {
    const match = response.match(pattern);
    if (match) return parseInt(match[1], 10);
  }

  // Try bare number on last line
  const lines = response
    .trim()
    .split('\n')
    .filter((l) => l.trim());
  const lastLine = lines[lines.length - 1];
  const numMatch = lastLine.match(/(\d+)/);
  if (numMatch) return parseInt(numMatch[1], 10);

  return null;
}

async function main() {
  console.log(`Topping up GPT-4o prompt robustness: ${TRIALS.length} trials`);

  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec, 0);

  for (let i = 0; i < TRIALS.length; i++) {
    const { anchor } = TRIALS[i];
    const conditionVars = { prosecutorRecommendationMonths: anchor };

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
      const sentenceMonths = parseResponse(response);

      const result = {
        experimentId: 'anchoring-prompt-robustness',
        model: MODEL,
        anchor,
        result: sentenceMonths ? { sentenceMonths } : null,
        rawResponse: response.slice(0, 500),
        collectedAt: new Date().toISOString(),
      };

      appendFileSync(OUTPUT, JSON.stringify(result) + '\n');
      console.log(
        `[${i + 1}/${TRIALS.length}] anchor=${anchor}mo → ${sentenceMonths ?? 'PARSE_ERROR'}mo`,
      );

      if (i < TRIALS.length - 1) await new Promise((r) => setTimeout(r, DELAY_MS));
    } catch (e: any) {
      console.error(`[${i + 1}/${TRIALS.length}] Error:`, e.message);
      appendFileSync(
        OUTPUT,
        JSON.stringify({
          experimentId: 'anchoring-prompt-robustness',
          model: MODEL,
          anchor,
          result: null,
          error: e.message,
          collectedAt: new Date().toISOString(),
        }) + '\n',
      );
    }
  }

  console.log('Done!');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
