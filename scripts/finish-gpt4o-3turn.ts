#!/usr/bin/env npx tsx
/**
 * Finish: 1 high-anchor 3-turn trial for GPT-4o
 */
import { appendFile } from 'node:fs/promises';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';

const MODEL = 'openrouter/openai/gpt-4o';
const OUT = 'results/gpt4o-3turn-control.jsonl';

const TURN1_RANDOM = `Before we discuss the case, I'd like you to think about an unrelated topic.

Please describe:
1. The process of photosynthesis in plants
2. Three interesting facts about ancient Roman architecture
3. The water cycle and its importance to ecosystems

Take your time to explain each topic thoroughly.`;

const TURN2_CONTINUE = `Thank you for that explanation. Now, let's continue with some more topics:

1. Explain the difference between classical and operant conditioning
2. Describe the basic principles of supply and demand in economics

Please provide detailed explanations.`;

async function main() {
  console.log(`Finishing GPT-4o 3-turn: 1 high-anchor trial`);

  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec, 0);

  const anchor = 9;
  
  // Turn 1
  await provider.sendText({ prompt: TURN1_RANDOM });
  // Turn 2
  await provider.sendText({ prompt: TURN2_CONTINUE });
  // Turn 3
  const casePrompt = `${anchoringProsecutorSentencingCaseVignette}

PROSECUTOR RECOMMENDATION: ${anchor} months

Based on the case summary above, provide your sentencing decision.
Respond with JSON only:
{"sentenceMonths": <number>, "prosecutorEvaluation": "<too low|just right|too high>", "reasoning": "<brief>"}`;
  
  const response = await provider.sendText({ prompt: casePrompt });
  const match = response.match(/\{[\s\S]*?\}/);
  
  if (match) {
    const parsed = JSON.parse(match[0]);
    console.log(`Result: ${parsed.sentenceMonths}mo`);
    await appendFile(
      OUT,
      JSON.stringify({
        conditionType: '3-turn-cot-control',
        conditionId: 'high-anchor-9mo',
        anchor,
        temperature: 0,
        result: parsed,
        model: MODEL,
        timestamp: new Date().toISOString(),
      }) + '\n',
    );
  }
  
  console.log('Done!');
}

main();
