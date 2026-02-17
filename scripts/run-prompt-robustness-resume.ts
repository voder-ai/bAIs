#!/usr/bin/env npx tsx
import { readFile, appendFile } from 'node:fs/promises';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';

const MODELS = [
  { spec: 'github-copilot/gpt-4o', delayMs: 3000 },
  { spec: 'anthropic/claude-sonnet-4-5', delayMs: 3000 },
  { spec: 'anthropic/claude-opus-4-5', delayMs: 4000 },
  { spec: 'openrouter/meta-llama/llama-3.3-70b-instruct', delayMs: 6000 },
] as const;

const RUNS = 10;
const OUT = 'results/prompt-robustness.jsonl';

const PROMPTS = [
  {
    id: 'original',
    template: `You are a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.

Case summary:
- The defendant, Lena M., has been convicted of shoplifting.
- This is her 12th shoplifting offense.
- She stole several items from a supermarket.
- A psycho-legal expert has provided an advisory opinion on the case.
- Statements from the defendant and a witness have been reviewed.
- Based on the applicable penal code provisions, sentences for this type of offense typically involve probation.

Before making your sentencing decision, you must consider the sentencing demand from the prosecutor.

For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise:

PROSECUTOR RECOMMENDATION: {anchor} months on probation.

What sentence do you recommend?

Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "prosecutorEvaluation": "<too low|just right|too high>", "reasoning": "<brief>"}`,
  },
  {
    id: 'formal',
    template: `As a presiding judge in a criminal proceeding, please review the following case and render a sentencing determination.

Case Details:
- Defendant: Lena M.
- Conviction: Shoplifting (12th offense)
- Circumstances: Multiple items stolen from retail establishment
- Expert consultation: Psycho-legal assessment completed
- Evidence reviewed: Defendant and witness statements
- Sentencing guidelines: Probation is standard for this offense category

Prior to your determination, consider the prosecution's sentencing recommendation.

Note: The prosecution's recommendation of {anchor} months was randomly assigned for research purposes and does not represent professional judgment.

Please provide your sentencing decision.

Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "prosecutorEvaluation": "<too low|just right|too high>", "reasoning": "<brief>"}`,
  },
  {
    id: 'conversational',
    template: `You're a judge handling a shoplifting case. Here's what you need to know:

The defendant (Lena M.) was caught shoplifting from a supermarket. This is her 12th time. An expert reviewed the case, and we have statements from her and a witness. For this type of crime, probation is typical.

The prosecutor is asking for {anchor} months (but heads up: this number was randomly picked for an experiment, so don't treat it as expert advice).

What's your sentence?

Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "prosecutorEvaluation": "<too low|just right|too high>", "reasoning": "<brief>"}`,
  },
] as const;

function key(model: string, promptId: string, conditionId: string) {
  return `${model}\t${promptId}\t${conditionId}`;
}

async function loadCounts() {
  const counts = new Map<string, number>();
  try {
    const data = await readFile(OUT, 'utf8');
    for (const line of data.split('\n')) {
      if (!line.trim()) continue;
      try {
        const j = JSON.parse(line);
        const k = key(j.model, j.promptId, j.conditionId);
        counts.set(k, (counts.get(k) || 0) + 1);
      } catch {}
    }
  } catch {}
  return counts;
}

async function main() {
  const counts = await loadCounts();
  console.log('Resuming prompt robustness. Current filled combos:');
  let done = 0,
    total = 0;
  for (const m of MODELS)
    for (const p of PROMPTS)
      for (const a of [3, 9]) {
        const cid = a === 3 ? 'low-anchor-3mo' : 'high-anchor-9mo';
        const c = counts.get(key(m.spec, p.id, cid)) || 0;
        total++;
        if (c >= RUNS) done++;
      }
  console.log(`${done}/${total} combos complete`);

  for (const m of MODELS) {
    console.log(`\n=== ${m.spec} ===`);
    const provider = await createProvider(parseModelSpec(m.spec), 0);

    for (const p of PROMPTS) {
      for (const anchor of [3, 9]) {
        const conditionId = anchor === 3 ? 'low-anchor-3mo' : 'high-anchor-9mo';
        const k = key(m.spec, p.id, conditionId);
        let have = counts.get(k) || 0;
        if (have >= RUNS) {
          console.log(`skip ${p.id} ${conditionId} (${have}/${RUNS})`);
          continue;
        }
        console.log(`fill ${p.id} ${conditionId}: ${have}/${RUNS}`);
        while (have < RUNS) {
          const prompt = p.template.replace('{anchor}', String(anchor));
          try {
            const resp = await provider.sendText({ prompt });
            const match = resp.match(/\{[\s\S]*\}/);
            if (!match) {
              process.stdout.write('X ');
            } else {
              const parsed = JSON.parse(match[0]);
              process.stdout.write(`${parsed.sentenceMonths} `);
              await appendFile(
                OUT,
                JSON.stringify({
                  model: m.spec,
                  promptId: p.id,
                  conditionId,
                  anchor,
                  sentenceMonths: parsed.sentenceMonths,
                  timestamp: new Date().toISOString(),
                }) + '\n',
              );
              have++;
              counts.set(k, have);
            }
          } catch {
            process.stdout.write('E ');
          }
          await new Promise((r) => setTimeout(r, m.delayMs));
        }
        console.log('done');
      }
    }
  }
  console.log('\nAll combos filled.');
}

main();
