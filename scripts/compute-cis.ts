#!/usr/bin/env npx ts-node

/**
 * Compute bootstrap CIs for key comparisons in the bAIs paper
 */

import { readFile } from 'fs/promises';
import { bootstrapMeanDifferenceCI } from '../src/analysis/stats.js';

interface Trial {
  conditionId: string;
  result: {
    sentenceMonths: number;
  };
}

async function loadTrials(filepath: string): Promise<Trial[]> {
  const content = await readFile(filepath, 'utf-8');
  return content
    .trim()
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line) as Trial);
}

async function computeAnchoringCI(filepath: string, label: string): Promise<void> {
  const trials = await loadTrials(filepath);
  
  const lowAnchor = trials
    .filter(t => t.conditionId?.includes('low'))
    .map(t => t.result.sentenceMonths)
    .filter(v => typeof v === 'number');
    
  const highAnchor = trials
    .filter(t => t.conditionId?.includes('high'))
    .map(t => t.result.sentenceMonths)
    .filter(v => typeof v === 'number');
  
  console.log(`\n=== ${label} ===`);
  console.log(`Low anchor (n=${lowAnchor.length}): mean=${mean(lowAnchor).toFixed(2)}, SD=${sd(lowAnchor).toFixed(2)}`);
  console.log(`High anchor (n=${highAnchor.length}): mean=${mean(highAnchor).toFixed(2)}, SD=${sd(highAnchor).toFixed(2)}`);
  
  if (lowAnchor.length > 0 && highAnchor.length > 0) {
    const ci = bootstrapMeanDifferenceCI({ high: highAnchor, low: lowAnchor });
    const effect = mean(highAnchor) - mean(lowAnchor);
    console.log(`Effect: ${effect.toFixed(2)} months`);
    console.log(`95% CI: [${ci.lower.toFixed(2)}, ${ci.upper.toFixed(2)}]`);
  }
}

function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function sd(arr: number[]): number {
  const m = mean(arr);
  const variance = arr.reduce((sum, val) => sum + (val - m) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

async function main() {
  await computeAnchoringCI('results/gpt4o-anchoring-30.jsonl', 'GPT-4o Anchoring');
  await computeAnchoringCI('results/sonnet4-anchoring-scenarios.jsonl', 'Sonnet 4 Anchoring');
  
  // Check for dated Sonnet data
  try {
    await computeAnchoringCI('results/sonnet-dated-anchoring-30.jsonl', 'Sonnet Dated Anchoring');
  } catch {
    console.log('\n(No sonnet-dated-anchoring-30.jsonl found)');
  }
}

main().catch(console.error);
