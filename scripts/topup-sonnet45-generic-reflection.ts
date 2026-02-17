#!/usr/bin/env npx tsx
// @ts-nocheck
/**
 * Top-up Sonnet 4.5 generic reflection control (+10: 5 low, 5 high)
 */
import { appendFileSync } from 'node:fs';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { anchoringProsecutorSentencingExperiment } from '../src/experiments/anchoringProsecutorSentencing.js';
import { renderPrompt } from '../src/experiments/renderPrompt.js';

const MODEL = 'anthropic/claude-sonnet-4-5-20250929';
const OUTPUT = 'results/sonnet45-generic-reflection-control-topup.jsonl';
const DELAY_MS = 2000;

const TRIALS = [...Array(5).fill({ anchor: 3 }), ...Array(5).fill({ anchor: 9 })];

// Generic reflection prompt (not bias-specific)
const GENERIC_REFLECTION = `Before giving your final answer, please reflect on this decision:
- Consider different perspectives
- Think about what factors are most important
- Evaluate the strengths and weaknesses of your reasoning`;

async function main() {
  console.log(`Topping up Sonnet 4.5 generic reflection: ${TRIALS.length} trials`);

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
    // Add generic reflection
    parts.push(GENERIC_REFLECTION);
    const prompt = parts.join('\n\n');

    try {
      const response = await provider.sendText({ prompt });

      let sentenceMonths: number | null = null;
      const patterns = [
        /"?sentenceMonths"?\s*[:\s]+(\d+)/i,
        /final.*?(\d+)\s*months?/i,
        /decision[:\s]*\**(\d+)\s*months?\**/i,
        /sentence.*?(\d+)\s*months?/i,
      ];

      for (const pattern of patterns) {
        const match = response.match(pattern);
        if (match) {
          sentenceMonths = parseInt(match[1], 10);
          break;
        }
      }

      const result = {
        model: MODEL,
        condition: 'generic-reflection',
        anchor,
        sentenceMonths,
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
          model: MODEL,
          condition: 'generic-reflection',
          anchor,
          sentenceMonths: null,
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
