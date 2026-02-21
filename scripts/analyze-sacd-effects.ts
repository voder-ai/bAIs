#!/usr/bin/env npx tsx
/**
 * Analyze SACD debiasing effects
 * Compares initial (anchored) vs debiased responses
 */
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const RESULTS_DIR = 'results';

interface SacdTrial {
  model: string;
  anchor: number;
  temperature: number;
  initialSentence: number | null;
  debiasedSentence: number | null;
  condition: string;
}

function loadJsonl(filepath: string): SacdTrial[] {
  try {
    const content = readFileSync(filepath, 'utf-8');
    return content.trim().split('\n').map(line => JSON.parse(line));
  } catch {
    return [];
  }
}

function mean(arr: number[]): number {
  if (arr.length === 0) return NaN;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// Load anchor values for baselines
const anchorValues = JSON.parse(readFileSync('results/anchor-values.json', 'utf-8'));
const modelBaselines: Record<string, number> = {};
anchorValues.forEach((m: any) => {
  const shortName = m.model.split('/').pop()?.replace(/[^a-z0-9-]/gi, '-');
  modelBaselines[shortName] = m.meanOverall;
});

// Load all SACD files
const sacdFiles = readdirSync(RESULTS_DIR).filter(f => f.startsWith('sacd-') && f.endsWith('.jsonl'));

interface ModelSacdData {
  model: string;
  anchor: number;
  baseline: number;
  initial: number[];
  debiased: number[];
}

const sacdData: ModelSacdData[] = [];

sacdFiles.forEach(f => {
  const trials = loadJsonl(join(RESULTS_DIR, f));
  if (trials.length === 0) return;
  
  const first = trials[0];
  const modelShort = first.model.split('/').pop()?.replace(/[^a-z0-9-]/gi, '-') || 'unknown';
  
  const initials: number[] = [];
  const debiaseds: number[] = [];
  
  trials.forEach(t => {
    if (t.initialSentence !== null) initials.push(t.initialSentence);
    if (t.debiasedSentence !== null) debiaseds.push(t.debiasedSentence);
  });
  
  sacdData.push({
    model: modelShort,
    anchor: first.anchor,
    baseline: modelBaselines[modelShort] || 0,
    initial: initials,
    debiased: debiaseds,
  });
});

console.log('=== SACD DEBIASING ANALYSIS ===\n');
console.log('Model            | Anchor | Baseline | Initial | Debiased | Δ Debias | Toward Baseline?');
console.log('-----------------|--------|----------|---------|----------|----------|------------------');

// Group by model
const modelGroups: Record<string, ModelSacdData[]> = {};
sacdData.forEach(d => {
  if (!modelGroups[d.model]) modelGroups[d.model] = [];
  modelGroups[d.model].push(d);
});

Object.entries(modelGroups).forEach(([model, data]) => {
  data.forEach(d => {
    const initialMean = mean(d.initial);
    const debiasedMean = mean(d.debiased);
    const delta = debiasedMean - initialMean;
    
    // Check if debiasing moved toward baseline
    const initialDistFromBaseline = Math.abs(initialMean - d.baseline);
    const debiasedDistFromBaseline = Math.abs(debiasedMean - d.baseline);
    const towardBaseline = debiasedDistFromBaseline < initialDistFromBaseline;
    
    console.log(
      `${model.padEnd(16)} | ${String(d.anchor).padStart(4)}mo | ${d.baseline.toFixed(0).padStart(6)}mo | ${initialMean.toFixed(1).padStart(6)}mo | ${debiasedMean.toFixed(1).padStart(6)}mo | ${(delta > 0 ? '+' : '') + delta.toFixed(1).padStart(5)}mo | ${towardBaseline ? '✅ YES' : '❌ NO'}`
    );
  });
});

// Summary statistics
console.log('\n=== SUMMARY ===\n');

let totalTowardBaseline = 0;
let totalAwayFromBaseline = 0;
let totalEffects: number[] = [];

Object.values(modelGroups).forEach(data => {
  data.forEach(d => {
    const initialMean = mean(d.initial);
    const debiasedMean = mean(d.debiased);
    const delta = debiasedMean - initialMean;
    totalEffects.push(Math.abs(delta));
    
    const initialDistFromBaseline = Math.abs(initialMean - d.baseline);
    const debiasedDistFromBaseline = Math.abs(debiasedMean - d.baseline);
    if (debiasedDistFromBaseline < initialDistFromBaseline) {
      totalTowardBaseline++;
    } else {
      totalAwayFromBaseline++;
    }
  });
});

console.log(`Conditions moving TOWARD baseline: ${totalTowardBaseline}`);
console.log(`Conditions moving AWAY from baseline: ${totalAwayFromBaseline}`);
console.log(`Average absolute debiasing effect: ${mean(totalEffects).toFixed(1)}mo`);
