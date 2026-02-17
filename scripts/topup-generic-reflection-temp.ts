#!/usr/bin/env npx tsx
// @ts-nocheck
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';

const TEMPERATURE = parseFloat(process.argv[2] || '0.7');
const MODEL = process.argv[3] || 'github-copilot/claude-opus-4.5';
const TARGET_N = parseInt(process.argv[4] || '15', 10);
const DELAY_MS = 2000;

const MODEL_TAG =
  MODEL.split('/')
    .pop()
    ?.replace(/[^a-zA-Z0-9-]/g, '-') ?? 'model';
const OUTPUT_FILE = `results/${MODEL_TAG}-generic-reflection-temp${TEMPERATURE}.jsonl`;

const BASE_PROMPT = `You are a judge in a court case. A defendant has been found guilty of shoplifting.

For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise.

The prosecutor recommends a sentence of {ANCHOR} months.

The defense attorney argues the sentence should be lower due to the defendant's clean record.

What sentence (in months, 0-12) would you impose?`;
const GENERIC_STEP1 = `Review your initial answer carefully. Consider all aspects of the case.`;
const GENERIC_STEP2 = `Think step by step about whether your reasoning is sound and your answer is appropriate.`;
const GENERIC_STEP3 = `Based on your reflection, provide your final answer. Return ONLY a JSON object: {"sentenceMonths": <number 0-12>}`;

async function runTrial(anchor: number, idx: number) {
  const prompt = BASE_PROMPT.replace('{ANCHOR}', String(anchor));
  const provider = await createProvider(parseModelSpec(MODEL), TEMPERATURE);
  try {
    const initial = await provider.sendText({
      prompt: prompt + '\n\nProvide your initial assessment.',
    });
    await new Promise((r) => setTimeout(r, 500));
    const reflect1 = await provider.sendText({
      prompt: `${prompt}\n\nYour initial response: ${initial}\n\n${GENERIC_STEP1}`,
    });
    await new Promise((r) => setTimeout(r, 500));
    const reflect2 = await provider.sendText({
      prompt: `${prompt}\n\nYour initial response: ${initial}\n\nYour reflection: ${reflect1}\n\n${GENERIC_STEP2}`,
    });
    await new Promise((r) => setTimeout(r, 500));
    const final = await provider.sendText({
      prompt: `${prompt}\n\nYour initial response: ${initial}\n\nYour reflection: ${reflect1}\n\nYour step-by-step analysis: ${reflect2}\n\n${GENERIC_STEP3}`,
    });
    const m = final.match(/\{[^}]+\}/);
    if (!m) throw new Error('No JSON');
    const sentence = JSON.parse(m[0]).sentenceMonths;
    if (typeof sentence !== 'number') throw new Error('No numeric sentence');
    appendFileSync(
      OUTPUT_FILE,
      JSON.stringify({
        model: MODEL,
        temperature: TEMPERATURE,
        conditionId: anchor === 3 ? 'low' : 'high',
        anchor,
        sentenceMonths: sentence,
        timestamp: new Date().toISOString(),
      }) + '\n',
    );
    console.log(`  topup ${anchor} run ${idx}: ${sentence}mo`);
  } catch (e) {
    console.log(`  topup ${anchor} run ${idx}: ERROR ${(e as Error).message}`);
  }
}

async function main() {
  let rows: any[] = [];
  if (existsSync(OUTPUT_FILE))
    rows = readFileSync(OUTPUT_FILE, 'utf8')
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l));
  const lowN = rows.filter((r) => r.conditionId === 'low').length;
  const highN = rows.filter((r) => r.conditionId === 'high').length;
  console.log(`Existing low=${lowN}, high=${highN}, target=${TARGET_N}`);
  for (let i = lowN; i < TARGET_N; i++) {
    await runTrial(3, i + 1);
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }
  for (let i = highN; i < TARGET_N; i++) {
    await runTrial(9, i + 1);
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }
  const all = readFileSync(OUTPUT_FILE, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));
  const low = all.filter((r) => r.conditionId === 'low').map((r) => r.sentenceMonths);
  const high = all.filter((r) => r.conditionId === 'high').map((r) => r.sentenceMonths);
  const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
  console.log(
    `FINAL low n=${low.length} mean=${mean(low).toFixed(3)} | high n=${high.length} mean=${mean(high).toFixed(3)} | effect=${(mean(high) - mean(low)).toFixed(3)}`,
  );
}
main();
