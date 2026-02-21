#!/usr/bin/env npx tsx
/**
 * Analyze anchoring effects from Phase 1+2 data
 * Computes effect sizes, temperature effects, and model taxonomy
 */
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const RESULTS_DIR = 'results';

interface Trial {
  model: string;
  temperature: number;
  sentenceMonths: number | null;
  anchor?: number;
  condition: string;
}

function loadJsonl(filepath: string): Trial[] {
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

function std(arr: number[]): number {
  if (arr.length < 2) return NaN;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((sum, x) => sum + (x - m) ** 2, 0) / (arr.length - 1));
}

// Load anchor values
const anchorValues = JSON.parse(readFileSync('results/anchor-values.json', 'utf-8'));
const modelBaselines: Record<string, number> = {};
anchorValues.forEach((m: any) => {
  const shortName = m.model.split('/').pop()?.replace(/[^a-z0-9-]/gi, '-');
  modelBaselines[shortName] = m.meanOverall;
});

// Load all data
const baselineFiles = readdirSync(RESULTS_DIR).filter(f => f.startsWith('baseline-') && f.endsWith('.jsonl'));
const lowAnchorFiles = readdirSync(RESULTS_DIR).filter(f => f.startsWith('low-anchor-') && f.endsWith('.jsonl'));
const highAnchorDir = join(RESULTS_DIR, 'high-anchor');
const highAnchorFiles = readdirSync(highAnchorDir).filter(f => f.endsWith('.jsonl'));

interface ModelData {
  baseline: number[];
  lowAnchor: number[];
  highAnchor: number[];
  lowAnchorValue: number;
  highAnchorValue: number;
}

const modelData: Record<string, ModelData> = {};

// Process baseline files
baselineFiles.forEach(f => {
  const trials = loadJsonl(join(RESULTS_DIR, f));
  trials.forEach(t => {
    if (t.sentenceMonths === null) return;
    const modelShort = t.model.split('/').pop()?.replace(/[^a-z0-9-]/gi, '-') || 'unknown';
    if (!modelData[modelShort]) {
      modelData[modelShort] = { baseline: [], lowAnchor: [], highAnchor: [], lowAnchorValue: 0, highAnchorValue: 0 };
    }
    modelData[modelShort].baseline.push(t.sentenceMonths);
  });
});

// Process low-anchor files
lowAnchorFiles.forEach(f => {
  const trials = loadJsonl(join(RESULTS_DIR, f));
  trials.forEach(t => {
    if (t.sentenceMonths === null) return;
    const modelShort = t.model.split('/').pop()?.replace(/[^a-z0-9-]/gi, '-') || 'unknown';
    if (!modelData[modelShort]) {
      modelData[modelShort] = { baseline: [], lowAnchor: [], highAnchor: [], lowAnchorValue: 0, highAnchorValue: 0 };
    }
    modelData[modelShort].lowAnchor.push(t.sentenceMonths);
    if (t.anchor) modelData[modelShort].lowAnchorValue = t.anchor;
  });
});

// Process high-anchor files
highAnchorFiles.forEach(f => {
  const trials = loadJsonl(join(highAnchorDir, f));
  trials.forEach(t => {
    if (t.sentenceMonths === null) return;
    const modelShort = t.model.split('/').pop()?.replace(/[^a-z0-9-]/gi, '-') || 'unknown';
    if (!modelData[modelShort]) {
      modelData[modelShort] = { baseline: [], lowAnchor: [], highAnchor: [], lowAnchorValue: 0, highAnchorValue: 0 };
    }
    modelData[modelShort].highAnchor.push(t.sentenceMonths);
    if (t.anchor) modelData[modelShort].highAnchorValue = t.anchor;
  });
});

console.log('=== ANCHORING EFFECT ANALYSIS ===\n');

const results: any[] = [];

Object.entries(modelData).forEach(([model, data]) => {
  if (data.baseline.length === 0) return;
  
  const baselineMean = mean(data.baseline);
  const baselineStd = std(data.baseline);
  const lowMean = mean(data.lowAnchor);
  const highMean = mean(data.highAnchor);
  
  // Effect sizes (Cohen's d relative to baseline)
  const lowEffect = data.lowAnchor.length > 0 ? (lowMean - baselineMean) / baselineStd : NaN;
  const highEffect = data.highAnchor.length > 0 ? (highMean - baselineMean) / baselineStd : NaN;
  
  // Absolute shifts
  const lowShift = lowMean - baselineMean;
  const highShift = highMean - baselineMean;
  
  // Susceptibility index (average absolute effect)
  const susceptibility = (Math.abs(lowEffect) + Math.abs(highEffect)) / 2;
  
  results.push({
    model,
    baselineMean: baselineMean.toFixed(1),
    baselineN: data.baseline.length,
    lowAnchor: data.lowAnchorValue,
    lowMean: lowMean.toFixed(1),
    lowN: data.lowAnchor.length,
    lowShift: lowShift.toFixed(1),
    lowEffect: lowEffect.toFixed(2),
    highAnchor: data.highAnchorValue,
    highMean: highMean.toFixed(1),
    highN: data.highAnchor.length,
    highShift: highShift.toFixed(1),
    highEffect: highEffect.toFixed(2),
    susceptibility: susceptibility.toFixed(2),
  });
});

// Sort by susceptibility
results.sort((a, b) => parseFloat(b.susceptibility) - parseFloat(a.susceptibility));

// Print results
console.log('Model                 | Baseline | Low Anchor → Mean (Δ)  | High Anchor → Mean (Δ) | Susceptibility');
console.log('----------------------|----------|------------------------|------------------------|---------------');
results.forEach(r => {
  console.log(
    `${r.model.padEnd(21)} | ${r.baselineMean.padStart(5)}mo  | ${r.lowAnchor}mo → ${r.lowMean}mo (${r.lowShift > 0 ? '+' : ''}${r.lowShift}) | ${r.highAnchor}mo → ${r.highMean}mo (${r.highShift > 0 ? '+' : ''}${r.highShift}) | ${r.susceptibility}`
  );
});

// Taxonomy
console.log('\n=== MODEL TAXONOMY ===\n');
const highSusceptibility = results.filter(r => parseFloat(r.susceptibility) > 0.5);
const lowSusceptibility = results.filter(r => parseFloat(r.susceptibility) <= 0.5);

console.log('HIGH SUSCEPTIBILITY (d > 0.5):');
highSusceptibility.forEach(r => console.log(`  - ${r.model}: ${r.susceptibility}`));

console.log('\nLOW SUSCEPTIBILITY (d ≤ 0.5):');
lowSusceptibility.forEach(r => console.log(`  - ${r.model}: ${r.susceptibility}`));
