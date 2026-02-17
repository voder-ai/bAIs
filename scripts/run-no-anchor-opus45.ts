// @ts-nocheck
/**
 * No-Anchor Control on Claude Opus 4.5
 * Establishes unanchored baseline for comparison
 */
import { appendFile } from 'node:fs/promises';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import {
  anchoringNoAnchorCaseVignette,
  getNoAnchorControlQuestion,
} from '../src/experiments/anchoringNoAnchorControl.js';

const MODEL = 'anthropic/claude-opus-4-5';
const RUNS_PER_CONDITION = 10;
const OUT_PATH = 'results/opus45-no-anchor-control.jsonl';
const CONDITIONS: Array<'no-anchor' | 'low-anchor' | 'high-anchor'> = [
  'no-anchor',
  'low-anchor',
  'high-anchor',
];

async function main() {
  console.log(`Starting No-Anchor Control on ${MODEL}`);
  console.log(`Runs per condition: ${RUNS_PER_CONDITION}`);
  console.log(`Output: ${OUT_PATH}`);
  console.log('---');

  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec, 0); // temp=0

  for (const condition of CONDITIONS) {
    console.log(`\nCondition: ${condition}`);

    for (let i = 0; i < RUNS_PER_CONDITION; i++) {
      const question = getNoAnchorControlQuestion(condition);

      try {
        const response = await provider.sendText({ prompt: question });

        // Parse sentence from response
        const match = response.match(/\b(\d+)\b/);
        const sentenceMonths = match ? parseInt(match[1], 10) : null;

        const record = {
          model: MODEL,
          condition,
          runIndex: i,
          sentenceMonths,
          rawResponse: response.slice(0, 500),
          timestamp: new Date().toISOString(),
        };

        await appendFile(OUT_PATH, JSON.stringify(record) + '\n', 'utf8');
        console.log(`  Run ${i + 1}/${RUNS_PER_CONDITION}: ${sentenceMonths}mo`);
      } catch (e) {
        const record = {
          model: MODEL,
          condition,
          runIndex: i,
          error: (e as Error).message,
          timestamp: new Date().toISOString(),
        };
        await appendFile(OUT_PATH, JSON.stringify(record) + '\n', 'utf8');
        console.log(`  Run ${i + 1}/${RUNS_PER_CONDITION}: ERROR`);
      }
    }
  }

  console.log('\n---');
  console.log('No-anchor control complete!');
}

main().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
