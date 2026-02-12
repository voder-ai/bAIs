#!/usr/bin/env npx tsx
/**
 * Structure-matched control for SACD
 * Same 3-iteration multi-turn structure, but irrelevant content (grammar/style analysis)
 */
import { appendFile } from 'node:fs/promises';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';

const MODEL = 'github-copilot/gpt-4o';
const RUNS = 15;
const DELAY_MS = 3000;
const MAX_ITERATIONS = 3;
const OUT = 'results/gpt4o-structure-matched-control.jsonl';

function buildBasePrompt(anchor: number): string {
  return `You are a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.

${anchoringProsecutorSentencingCaseVignette}

PROSECUTOR RECOMMENDATION: ${anchor} months

Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "prosecutorEvaluation": "<too low|just right|too high>", "reasoning": "<brief>"}`;
}

// Structure-matched iterations (grammar/style analysis instead of bias detection)
const STRUCTURE_MATCHED_PROMPT = `Analyze the following prompt for grammar, style, and clarity issues. For each sentence:
1. Mark as CLEAR or UNCLEAR
2. If UNCLEAR, explain why and suggest improvements
3. Rewrite the full prompt with improved clarity

{ORIGINAL_PROMPT}

After analysis, provide a rewritten version that is clearer and more professional.
End with ITERATION_COMPLETE.`;

async function runStructureMatched(
  provider: any,
  anchor: number,
): Promise<{ sentenceMonths: number | null; iterations: number; rawOutput: string }> {
  let currentPrompt = buildBasePrompt(anchor);
  let iterations = 0;
  let allOutput = '';

  // Run 3 iterations of grammar/style analysis (matching SACD structure)
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    iterations++;
    const analysisPrompt = STRUCTURE_MATCHED_PROMPT.replace('{ORIGINAL_PROMPT}', currentPrompt);

    const response = await provider.sendText({ prompt: analysisPrompt });
    allOutput += `\n--- Iteration ${i + 1} ---\n${response}`;

    // Extract rewritten prompt for next iteration (or use original if extraction fails)
    const rewrittenMatch = response.match(
      /(?:rewritten|improved|revised)[^:]*:?\s*([\s\S]*?)(?:ITERATION_COMPLETE|$)/i,
    );
    if (rewrittenMatch && rewrittenMatch[1].trim().length > 100) {
      currentPrompt = rewrittenMatch[1].trim();
    }
  }

  // Final judgment with the processed prompt
  const finalPrompt =
    currentPrompt +
    '\n\nNow provide your sentencing decision as JSON:\n{"sentenceMonths": <number>, "prosecutorEvaluation": "<too low|just right|too high>", "reasoning": "<brief>"}';
  const finalResponse = await provider.sendText({ prompt: finalPrompt });
  allOutput += `\n--- Final Response ---\n${finalResponse}`;

  // Extract sentence
  const match = finalResponse.match(/\{[\s\S]*\}/);
  let sentenceMonths: number | null = null;
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      sentenceMonths = parsed.sentenceMonths;
    } catch {}
  }

  return { sentenceMonths, iterations, rawOutput: allOutput };
}

async function main() {
  console.log(`Structure-matched control (3-iteration grammar analysis)`);
  console.log(`Runs per anchor: ${RUNS}, Total: ${RUNS * 2}`);
  console.log(`Output: ${OUT}\n`);

  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec, 0);

  for (const anchor of [3, 9]) {
    const conditionId = anchor === 3 ? 'low-anchor-3mo' : 'high-anchor-9mo';
    console.log(`--- Anchor: ${anchor}mo ---`);

    for (let i = 0; i < RUNS; i++) {
      try {
        const result = await runStructureMatched(provider, anchor);
        console.log(
          `  [${i + 1}/${RUNS}] ${result.sentenceMonths ?? 'null'}mo (${result.iterations} iterations)`,
        );

        await appendFile(
          OUT,
          JSON.stringify({
            conditionType: 'structure-matched',
            conditionId,
            anchor,
            sentenceMonths: result.sentenceMonths,
            iterations: result.iterations,
            model: MODEL,
            timestamp: new Date().toISOString(),
          }) + '\n',
        );
      } catch (e) {
        console.error(`  Error:`, e);
      }
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }
  console.log('Done!');
}

main();
