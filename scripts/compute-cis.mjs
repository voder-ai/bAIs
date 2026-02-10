#!/usr/bin/env node

/**
 * Compute bootstrap CIs for key comparisons in the bAIs paper
 */

import { readFile } from 'fs/promises';

function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function quantileSorted(sorted, q) {
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  } else {
    return sorted[base];
  }
}

function bootstrapMeanDifferenceCI(high, low, alpha = 0.05, iterations = 2000, seed = 123456789) {
  const rand = mulberry32(seed);
  const diffs = [];

  const sampleMean = (values) => {
    let sum = 0;
    for (let i = 0; i < values.length; i++) {
      const idx = Math.floor(rand() * values.length);
      sum += values[idx];
    }
    return sum / values.length;
  };

  for (let i = 0; i < iterations; i++) {
    const meanHigh = sampleMean(high);
    const meanLow = sampleMean(low);
    diffs.push(meanHigh - meanLow);
  }

  diffs.sort((a, b) => a - b);
  return {
    lower: quantileSorted(diffs, alpha / 2),
    upper: quantileSorted(diffs, 1 - alpha / 2),
  };
}

async function loadTrials(filepath) {
  const content = await readFile(filepath, 'utf-8');
  return content
    .trim()
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line));
}

function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function sd(arr) {
  const m = mean(arr);
  const variance = arr.reduce((sum, val) => sum + (val - m) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

async function computeAnchoringCI(filepath, label) {
  try {
    const trials = await loadTrials(filepath);
    
    const lowAnchor = trials
      .filter(t => t.conditionId?.includes('low'))
      .map(t => t.result?.sentenceMonths)
      .filter(v => typeof v === 'number');
      
    const highAnchor = trials
      .filter(t => t.conditionId?.includes('high'))
      .map(t => t.result?.sentenceMonths)
      .filter(v => typeof v === 'number');
    
    console.log(`\n=== ${label} ===`);
    console.log(`Low anchor (n=${lowAnchor.length}): mean=${mean(lowAnchor).toFixed(2)}, SD=${sd(lowAnchor).toFixed(2)}`);
    console.log(`High anchor (n=${highAnchor.length}): mean=${mean(highAnchor).toFixed(2)}, SD=${sd(highAnchor).toFixed(2)}`);
    
    if (lowAnchor.length > 0 && highAnchor.length > 0) {
      const ci = bootstrapMeanDifferenceCI(highAnchor, lowAnchor);
      const effect = mean(highAnchor) - mean(lowAnchor);
      console.log(`Effect: ${effect.toFixed(2)} months`);
      console.log(`95% CI: [${ci.lower.toFixed(2)}, ${ci.upper.toFixed(2)}]`);
    }
  } catch (e) {
    console.log(`\n(Could not load ${filepath}: ${e.message})`);
  }
}

async function main() {
  console.log('\n========== KEY COMPARISONS ==========');
  await computeAnchoringCI('results/gpt4o-anchoring-30.jsonl', 'GPT-4o (temp=0)');
  await computeAnchoringCI('results/sonnet-dated-temp0-30.jsonl', 'Sonnet 4 Dated (temp=0)');
  await computeAnchoringCI('results/sonnet4-anchoring-30.jsonl', 'Sonnet 4 Alias (temp=0)');
  
  console.log('\n========== SUPPLEMENTARY ==========');
  await computeAnchoringCI('results/sonnet-dated-temp1.0-30.jsonl', 'Sonnet 4 Dated (temp=1.0)');
  await computeAnchoringCI('results/sonnet-dated-novel-anchoring-30.jsonl', 'Sonnet 4 Dated Novel');
}

main().catch(console.error);
