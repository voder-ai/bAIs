#!/usr/bin/env bun
/**
 * Alternative metric: Response as % of baseline
 * 
 * Instead of measuring "% closer to baseline than control",
 * directly measure "where does response land relative to baseline?"
 * 
 * 100% = exactly at baseline (perfect)
 * <100% = below baseline
 * >100% = above baseline
 * 
 * This avoids circularity because it doesn't depend on anchor conditions.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const RESULTS_DIR = './results';

interface AnalysisData {
  baselines: Array<{
    model: string;
    temperature: number;
    n: number;
    mean: number;
    std: number;
  }>;
  anchoring: Array<{
    model: string;
    temperature: number;
    anchorType: 'low' | 'high';
    anchorValue: number;
    baseline: number;
    n: number;
    mean: number;
    std: number;
  }>;
  sacd: Array<{
    model: string;
    temperature: number;
    anchor: number;
    anchorType: 'low' | 'high';
    baseline: number;
    n: number;
    initialMean: number;
    debiasedMean: number;
  }>;
}

// Load the consolidated analysis data
const data: AnalysisData = JSON.parse(readFileSync(join(RESULTS_DIR, 'analysis-data.json'), 'utf-8'));

// Build baseline lookup: model -> mean across all temps
const baselineByModel = new Map<string, number>();
const baselineDetails = new Map<string, {n: number, mean: number}>();

for (const b of data.baselines) {
  const key = b.model;
  if (!baselineDetails.has(key)) {
    baselineDetails.set(key, {n: 0, mean: 0});
  }
  const d = baselineDetails.get(key)!;
  // Weighted average
  const totalN = d.n + b.n;
  d.mean = (d.mean * d.n + b.mean * b.n) / totalN;
  d.n = totalN;
}

for (const [model, d] of baselineDetails) {
  baselineByModel.set(model, d.mean);
}

console.log('=== MODEL BASELINES (weighted average across temperatures) ===\n');
const sortedBaselines = Array.from(baselineByModel.entries()).sort((a, b) => b[1] - a[1]);
for (const [model, mean] of sortedBaselines) {
  const d = baselineDetails.get(model)!;
  console.log(`${model}: ${mean.toFixed(1)}mo (n=${d.n})`);
}

// Analyze anchoring conditions (no technique)
console.log('\n=== ANCHORING CONDITIONS - NO TECHNIQUE (% of baseline) ===');
console.log('100% = at baseline, >100% = pulled above, <100% = pulled below\n');

interface ConditionResult {
  condition: string;
  meanPct: number;
  deviation: number;
  direction: string;
  n: number;
}

const anchorResults: ConditionResult[] = [];

// Group by anchor type
const byAnchorType = new Map<string, {pcts: number[], n: number}>();
for (const a of data.anchoring) {
  const key = a.anchorType;
  if (!byAnchorType.has(key)) byAnchorType.set(key, {pcts: [], n: 0});
  const d = byAnchorType.get(key)!;
  
  const pct = (a.mean / a.baseline) * 100;
  for (let i = 0; i < a.n; i++) {
    d.pcts.push(pct);
  }
  d.n += a.n;
}

for (const [anchorType, d] of byAnchorType) {
  const meanPct = d.pcts.reduce((a, b) => a + b, 0) / d.pcts.length;
  const deviation = Math.abs(meanPct - 100);
  anchorResults.push({
    condition: `${anchorType}-anchor (no technique)`,
    meanPct,
    deviation,
    direction: meanPct > 100 ? 'above' : 'below',
    n: d.n
  });
}

console.table(anchorResults.map(r => ({
  condition: r.condition,
  n: r.n,
  'mean %': r.meanPct.toFixed(1) + '%',
  'deviation': r.deviation.toFixed(1) + '%',
  direction: r.direction
})));

// Analyze SACD technique
console.log('\n=== SACD TECHNIQUE (% of baseline) ===\n');

const sacdByAnchor = new Map<string, {initial: number[], debiased: number[], n: number}>();

for (const s of data.sacd) {
  const key = s.anchorType;
  if (!sacdByAnchor.has(key)) sacdByAnchor.set(key, {initial: [], debiased: [], n: 0});
  const d = sacdByAnchor.get(key)!;
  
  const initialPct = (s.initialMean / s.baseline) * 100;
  const debiasedPct = (s.debiasedMean / s.baseline) * 100;
  
  for (let i = 0; i < s.n; i++) {
    d.initial.push(initialPct);
    d.debiased.push(debiasedPct);
  }
  d.n += s.n;
}

const sacdResults: any[] = [];
for (const [anchorType, d] of sacdByAnchor) {
  const initialMean = d.initial.reduce((a, b) => a + b, 0) / d.initial.length;
  const debiasedMean = d.debiased.reduce((a, b) => a + b, 0) / d.debiased.length;
  
  sacdResults.push({
    anchor: anchorType,
    n: d.n,
    'before SACD': initialMean.toFixed(1) + '%',
    'after SACD': debiasedMean.toFixed(1) + '%',
    'before deviation': Math.abs(initialMean - 100).toFixed(1) + '%',
    'after deviation': Math.abs(debiasedMean - 100).toFixed(1) + '%',
    'improvement': (Math.abs(initialMean - 100) - Math.abs(debiasedMean - 100)).toFixed(1) + '%'
  });
}

console.table(sacdResults);

// Model-specific analysis
console.log('\n=== MODEL-SPECIFIC: SACD EFFECT (% of baseline) ===\n');

const sacdByModel = new Map<string, {
  model: string,
  initialPcts: number[],
  debiasedPcts: number[],
  n: number
}>();

for (const s of data.sacd) {
  if (!sacdByModel.has(s.model)) {
    sacdByModel.set(s.model, {model: s.model, initialPcts: [], debiasedPcts: [], n: 0});
  }
  const d = sacdByModel.get(s.model)!;
  
  const initialPct = (s.initialMean / s.baseline) * 100;
  const debiasedPct = (s.debiasedMean / s.baseline) * 100;
  
  for (let i = 0; i < s.n; i++) {
    d.initialPcts.push(initialPct);
    d.debiasedPcts.push(debiasedPct);
  }
  d.n += s.n;
}

const modelResults = Array.from(sacdByModel.values()).map(d => {
  const initialMean = d.initialPcts.reduce((a, b) => a + b, 0) / d.initialPcts.length;
  const debiasedMean = d.debiasedPcts.reduce((a, b) => a + b, 0) / d.debiasedPcts.length;
  const initialDev = Math.abs(initialMean - 100);
  const debiasedDev = Math.abs(debiasedMean - 100);
  
  return {
    model: d.model,
    n: d.n,
    initialMean,
    debiasedMean,
    initialDev,
    debiasedDev,
    improvement: initialDev - debiasedDev
  };
}).sort((a, b) => b.improvement - a.improvement);

console.table(modelResults.map(r => ({
  model: r.model,
  n: r.n,
  'before SACD': r.initialMean.toFixed(1) + '%',
  'after SACD': r.debiasedMean.toFixed(1) + '%',
  'deviation improvement': r.improvement.toFixed(1) + '%'
})));

// Key insight
console.log('\n=== KEY INSIGHT ===\n');
console.log('This "% of baseline" metric directly measures where responses land');
console.log('relative to the model\'s natural, unanchored judgment.\n');
console.log('ADDRESSES CIRCULARITY CONCERN:');
console.log('- Traditional: "Did technique reduce gap between high/low anchors?"');
console.log('- This metric: "Did technique bring response closer to 100% of baseline?"\n');
console.log('The second question doesn\'t depend on how anchors were chosen—');
console.log('it only asks whether responses match unanchored behavior.\n');

// Summary stats
const allInitialDevs = modelResults.map(r => r.initialDev);
const allDebiasedDevs = modelResults.map(r => r.debiasedDev);
const avgInitialDev = allInitialDevs.reduce((a, b) => a + b, 0) / allInitialDevs.length;
const avgDebiasedDev = allDebiasedDevs.reduce((a, b) => a + b, 0) / allDebiasedDevs.length;

console.log('SUMMARY:');
console.log(`  Average deviation before SACD: ${avgInitialDev.toFixed(1)}%`);
console.log(`  Average deviation after SACD:  ${avgDebiasedDev.toFixed(1)}%`);
console.log(`  Overall improvement:           ${(avgInitialDev - avgDebiasedDev).toFixed(1)}%`);
console.log('');
console.log('A technique that produces responses at 100% of baseline');
console.log('would be "perfectly debiased" by this metric.');
