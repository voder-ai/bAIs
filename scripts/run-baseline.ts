#!/usr/bin/env npx tsx
/**
 * Baseline Experiment — No Anchor
 * 
 * Usage: npx tsx scripts/run-baseline.ts <model-id> [n=30]
 * Example: npx tsx scripts/run-baseline.ts anthropic/claude-opus-4.6 30
 * 
 * Output: results/baseline-<model-short>.jsonl
 */
import { appendFile } from 'node:fs/promises';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';
import { getOpenRouterKey, callOpenRouter, Message } from './lib/openrouter.js';

const MODEL = process.argv[2];
const N_TRIALS = parseInt(process.argv[3] || '30');

if (!MODEL) {
  console.error('Usage: npx tsx scripts/run-baseline.ts <model-id> [n=30]');
  process.exit(1);
}

const MODEL_SHORT = MODEL.split('/').pop()?.replace(/[^a-z0-9-]/gi, '-') || MODEL;
const RESULTS_FILE = `results/baseline-${MODEL_SHORT}.jsonl`;

// No-anchor baseline prompt
const baselinePrompt = 
  anchoringProsecutorSentencingCaseVignette +
  '\n\n' +
  'What sentence (in months of probation) do you recommend for the defendant Lena M.?\n' +
  'Answer with a single integer number of months on probation.';

function extractSentence(response: string): number | null {
  const match = response.match(/\b(\d+)\b/);
  return match ? parseInt(match[1]) : null;
}

async function runTrial(apiKey: string, index: number): Promise<number | null> {
  const messages: Message[] = [
    { role: 'user', content: baselinePrompt }
  ];
  
  const response = await callOpenRouter(apiKey, MODEL, messages);
  const sentence = extractSentence(response);
  
  if (sentence !== null) {
    const record = {
      experimentId: 'baseline',
      model: MODEL,
      condition: 'no-anchor',
      anchor: null,
      sentenceMonths: sentence,
      methodology: 'englich-baseline',
      runIndex: index,
      collectedAt: new Date().toISOString(),
    };
    await appendFile(RESULTS_FILE, JSON.stringify(record) + '\n');
  }
  
  return sentence;
}

async function main() {
  console.log(`=== Baseline Experiment (No Anchor) ===`);
  console.log(`Model: ${MODEL}`);
  console.log(`Trials: ${N_TRIALS}`);
  console.log(`Output: ${RESULTS_FILE}`);
  console.log('');

  const apiKey = await getOpenRouterKey();
  const results: number[] = [];

  for (let i = 0; i < N_TRIALS; i++) {
    try {
      const sentence = await runTrial(apiKey, i);
      if (sentence !== null) {
        results.push(sentence);
        console.log(`Trial ${i + 1}/${N_TRIALS}: ${sentence}mo`);
      } else {
        console.log(`Trial ${i + 1}/${N_TRIALS}: PARSE ERROR`);
      }
    } catch (e: any) {
      console.log(`Trial ${i + 1}/${N_TRIALS}: ERROR - ${e.message.slice(0, 80)}`);
    }
    await new Promise(r => setTimeout(r, 1500));
  }

  if (results.length > 0) {
    const mean = results.reduce((a, b) => a + b, 0) / results.length;
    const min = Math.min(...results);
    const max = Math.max(...results);
    console.log(`\n=== Results ===`);
    console.log(`n=${results.length} | mean=${mean.toFixed(1)}mo | range=${min}-${max}mo`);
    console.log(`\nProportional anchors for this model:`);
    console.log(`  Low anchor:  ${Math.round(mean / 2)}mo (baseline / 2)`);
    console.log(`  High anchor: ${Math.round(mean * 2)}mo (baseline × 2)`);
  }
}

main().catch(console.error);
