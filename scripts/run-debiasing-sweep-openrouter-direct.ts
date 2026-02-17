// @ts-nocheck
#!/usr/bin/env npx tsx
/**
 * Debiasing Sweep via direct OpenRouter API (not pi-ai)
 * Models: Llama 3.3, Mistral, Hermes 405B, Qwen, Gemma
 */
import { appendFile, readFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';
import { homedir } from 'node:os';
import { join } from 'node:path';

const RUNS_PER_CONDITION = 10;
const DELAY_MS = 2000;
const ANCHORS = [3, 9];

// Load OpenRouter API key
async function getApiKey(): Promise<string> {
  // Check env first
  if (process.env.OPENROUTER_API_KEY) {
    return process.env.OPENROUTER_API_KEY;
  }

  // Load from OpenClaw auth store
  const authPath = join(homedir(), '.openclaw/agents/main/agent/auth-profiles.json');
  const store = JSON.parse(await readFile(authPath, 'utf8'));
  const profile = store.profiles['openrouter:default'];
  if (profile?.token) return profile.token;
  throw new Error('No OpenRouter API key found');
}

// Models to test
const MODELS = [
  'mistralai/mistral-7b-instruct',
  'nousresearch/hermes-3-llama-3.1-405b',
  'qwen/qwen-2.5-72b-instruct',
  'google/gemma-2-9b-it',
];

// Prompts
const baselinePrompt = (anchor: number) => `${anchoringProsecutorSentencingCaseVignette}

The prosecutor demands ${anchor} months on probation for the defendant.

What sentence do you recommend? Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "reasoning": "<brief>"}`;

const contextHygienePrompt = (anchor: number) => `${anchoringProsecutorSentencingCaseVignette}

For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise:

The prosecutor demands ${anchor} months on probation for the defendant.

Ignore the prosecutor's demand completely. Base your sentence solely on the case facts and typical sentencing guidelines.

What sentence do you recommend? Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "reasoning": "<brief>"}`;

const premortremPrompt = (anchor: number) => `${anchoringProsecutorSentencingCaseVignette}

For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise:

The prosecutor demands ${anchor} months on probation for the defendant.

Before deciding, imagine it's one year later and your sentence was widely criticized as unjust. What went wrong? Consider this premortem, then decide your sentence.

What sentence do you recommend? Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "reasoning": "<brief>"}`;

const sacdPrompt = (anchor: number) => `${anchoringProsecutorSentencingCaseVignette}

The prosecutor demands ${anchor} months on probation for the defendant.

Before giving your final answer, please:
1. Consider what cognitive biases might affect this decision
2. Identify any anchoring effects from the prosecutor's demand
3. Think about what sentence you would give if you hadn't seen the prosecutor's number
4. Now provide your final, debiased recommendation

What sentence do you recommend? Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "reasoning": "<brief>"}`;

const CONDITIONS = [
  { name: 'baseline', promptFn: baselinePrompt },
  { name: 'context-hygiene', promptFn: contextHygienePrompt },
  { name: 'premortem', promptFn: premortremPrompt },
  { name: 'sacd', promptFn: sacdPrompt },
];

async function callOpenRouter(apiKey: string, model: string, prompt: string): Promise<any> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/voder-ai/bAIs',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${text}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  // Parse JSON from response
  const jsonMatch = content.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) throw new Error(`No JSON found in: ${content}`);
  return JSON.parse(jsonMatch[0]);
}

async function runModel(apiKey: string, model: string) {
  const shortName = model.split('/').pop() || model;
  const outFile = `results/${shortName}-debiasing-sweep.jsonl`;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 ${shortName}`);
  console.log(`📁 ${outFile}`);
  console.log(`${'='.repeat(60)}`);

  for (const condition of CONDITIONS) {
    console.log(`\n--- ${condition.name} ---`);

    for (const anchor of ANCHORS) {
      process.stdout.write(`  anchor=${anchor}mo: `);

      for (let i = 0; i < RUNS_PER_CONDITION; i++) {
        try {
          const result = await callOpenRouter(apiKey, model, condition.promptFn(anchor));

          const record = {
            model,
            condition: condition.name,
            anchor,
            sentenceMonths: result.sentenceMonths,
            reasoning: result.reasoning,
            timestamp: new Date().toISOString(),
          };

          await appendFile(outFile, JSON.stringify(record) + '\n');
          process.stdout.write(`${result.sentenceMonths} `);

          await new Promise((r) => setTimeout(r, DELAY_MS));
        } catch (e: any) {
          process.stdout.write(`ERR `);
          console.error(`\n❌ ${e.message}`);
          await new Promise((r) => setTimeout(r, DELAY_MS * 2));
        }
      }
      console.log();
    }
  }

  // Summary
  if (existsSync(outFile)) {
    const data = readFileSync(outFile, 'utf-8')
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l));
    console.log(`\n📊 ${shortName} Summary:`);
    for (const condition of CONDITIONS) {
      const condData = data.filter((d: any) => d.condition === condition.name);
      const low = condData.filter((d: any) => d.anchor === 3).map((d: any) => d.sentenceMonths);
      const high = condData.filter((d: any) => d.anchor === 9).map((d: any) => d.sentenceMonths);
      if (low.length && high.length) {
        const lowAvg = low.reduce((a: number, b: number) => a + b, 0) / low.length;
        const highAvg = high.reduce((a: number, b: number) => a + b, 0) / high.length;
        const effect = highAvg - lowAvg;
        console.log(
          `  ${condition.name}: low=${lowAvg.toFixed(1)}mo, high=${highAvg.toFixed(1)}mo, effect=${effect.toFixed(1)}mo`,
        );
      }
    }
  }
}

async function main() {
  const apiKey = await getApiKey();
  console.log('🧪 Debiasing Sweep via Direct OpenRouter API');
  console.log(
    `📊 ${MODELS.length} models × ${CONDITIONS.length} conditions × ${ANCHORS.length} anchors × ${RUNS_PER_CONDITION} runs`,
  );
  console.log(`⏱️ ${DELAY_MS / 1000}s delay between calls\n`);

  for (const model of MODELS) {
    await runModel(apiKey, model);
  }

  console.log('\n✅ All models complete!');
}

main().catch(console.error);
