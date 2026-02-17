#!/usr/bin/env npx tsx
/**
 * Topup: 6 high-anchor token-matched trials for GPT-4o
 */
import { appendFile } from 'node:fs/promises';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';

const MODEL = 'openrouter/openai/gpt-4o';
const RUNS = 6;
const DELAY_MS = 500;
const OUT = 'results/gpt4o-token-control.jsonl';

const ELABORATION_PROMPT = `Before we begin, please complete these tasks in detail:
1. Describe the weather conditions in a coastal city during autumn.
2. List five facts about marine mammals.
3. Describe the lifecycle of a butterfly.
4. Explain three differences between freshwater and saltwater ecosystems.

Please complete all four tasks thoroughly.`;

async function main() {
  console.log(`Topup: ${RUNS} high-anchor token-matched trials on GPT-4o`);

  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec, 0);

  for (let i = 0; i < RUNS; i++) {
    try {
      const elaboration = await provider.sendText({ prompt: ELABORATION_PROMPT });
      const elaborationTokens = elaboration.split(/\s+/).length;
      
      const decisionPrompt = `${anchoringProsecutorSentencingCaseVignette}

PROSECUTOR RECOMMENDATION: 9 months

Based on the case above, provide your sentencing decision.
Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "prosecutorEvaluation": "<too low|just right|too high>", "reasoning": "<brief>"}`;
      
      const decision = await provider.sendText({ prompt: decisionPrompt });
      const match = decision.match(/\{[\s\S]*?\}/);
      
      if (match) {
        const parsed = JSON.parse(match[0]);
        console.log(`  [${i + 1}/${RUNS}] ${parsed.sentenceMonths}mo (~${elaborationTokens} words)`);
        await appendFile(
          OUT,
          JSON.stringify({
            conditionType: 'token-matched-random',
            conditionId: 'high-anchor-9mo',
            anchor: 9,
            temperature: 0,
            result: parsed,
            elaborationLength: elaborationTokens,
            model: MODEL,
            timestamp: new Date().toISOString(),
          }) + '\n',
        );
      }
    } catch (e: unknown) {
      console.error(`  [${i + 1}/${RUNS}] Error`);
    }
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }
  
  console.log('Topup complete!');
}

main();
