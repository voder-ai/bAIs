#!/usr/bin/env npx tsx
/**
 * Generate comprehensive analysis JSON for paper and visualizations
 * Outputs structured data for all experiments
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const RESULTS_DIR = 'results';

interface Trial {
  model: string;
  temperature: number;
  sentenceMonths: number | null;
  anchor?: number;
  condition: string;
}

interface SacdTrial {
  model: string;
  anchor: number;
  temperature: number;
  initialSentence: number | null;
  debiasedSentence: number | null;
  condition: string;
}

function loadJsonl<T>(filepath: string): T[] {
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
const modelInfo: Record<string, { baseline: number; lowAnchor: number; highAnchor: number }> = {};
anchorValues.forEach((m: any) => {
  const shortName = m.model.split('/').pop()?.replace(/[^a-z0-9-]/gi, '-');
  modelInfo[shortName] = {
    baseline: m.meanOverall,
    lowAnchor: m.lowAnchor,
    highAnchor: m.highAnchor,
  };
});

// === BASELINE ANALYSIS ===
const baselineFiles = readdirSync(RESULTS_DIR).filter(f => f.startsWith('baseline-') && f.endsWith('.jsonl'));
const baselineData: any[] = [];

baselineFiles.forEach(f => {
  const trials = loadJsonl<Trial>(join(RESULTS_DIR, f));
  const validTrials = trials.filter(t => t.sentenceMonths !== null);
  if (validTrials.length === 0) return;
  
  const model = validTrials[0].model.split('/').pop()?.replace(/[^a-z0-9-]/gi, '-') || 'unknown';
  const temp = validTrials[0].temperature;
  const values = validTrials.map(t => t.sentenceMonths as number);
  
  baselineData.push({
    model,
    temperature: temp,
    n: values.length,
    mean: mean(values),
    std: std(values),
    min: Math.min(...values),
    max: Math.max(...values),
  });
});

// === ANCHORING ANALYSIS ===
const lowAnchorFiles = readdirSync(RESULTS_DIR).filter(f => f.startsWith('low-anchor-') && f.endsWith('.jsonl'));
const highAnchorDir = join(RESULTS_DIR, 'high-anchor');
const highAnchorFiles = readdirSync(highAnchorDir).filter(f => f.endsWith('.jsonl'));

const anchoringData: any[] = [];

// Process low-anchor
lowAnchorFiles.forEach(f => {
  const trials = loadJsonl<Trial>(join(RESULTS_DIR, f));
  const validTrials = trials.filter(t => t.sentenceMonths !== null);
  if (validTrials.length === 0) return;
  
  const model = validTrials[0].model.split('/').pop()?.replace(/[^a-z0-9-]/gi, '-') || 'unknown';
  const temp = validTrials[0].temperature;
  const anchor = validTrials[0].anchor || 0;
  const values = validTrials.map(t => t.sentenceMonths as number);
  const baseline = modelInfo[model]?.baseline || 0;
  const baselineStd = std(baselineData.filter(b => b.model === model).map(b => b.mean));
  
  anchoringData.push({
    model,
    temperature: temp,
    anchorType: 'low',
    anchorValue: anchor,
    baseline,
    n: values.length,
    mean: mean(values),
    std: std(values),
    shift: mean(values) - baseline,
    effectSize: baselineStd > 0 ? (mean(values) - baseline) / baselineStd : NaN,
  });
});

// Process high-anchor
highAnchorFiles.forEach(f => {
  const trials = loadJsonl<Trial>(join(highAnchorDir, f));
  const validTrials = trials.filter(t => t.sentenceMonths !== null);
  if (validTrials.length === 0) return;
  
  const model = validTrials[0].model.split('/').pop()?.replace(/[^a-z0-9-]/gi, '-') || 'unknown';
  const temp = validTrials[0].temperature;
  const anchor = validTrials[0].anchor || 0;
  const values = validTrials.map(t => t.sentenceMonths as number);
  const baseline = modelInfo[model]?.baseline || 0;
  const baselineStd = std(baselineData.filter(b => b.model === model).map(b => b.mean));
  
  anchoringData.push({
    model,
    temperature: temp,
    anchorType: 'high',
    anchorValue: anchor,
    baseline,
    n: values.length,
    mean: mean(values),
    std: std(values),
    shift: mean(values) - baseline,
    effectSize: baselineStd > 0 ? (mean(values) - baseline) / baselineStd : NaN,
  });
});

// === SACD ANALYSIS ===
const sacdFiles = readdirSync(RESULTS_DIR).filter(f => f.startsWith('sacd-') && f.endsWith('.jsonl'));
const sacdData: any[] = [];

sacdFiles.forEach(f => {
  const trials = loadJsonl<SacdTrial>(join(RESULTS_DIR, f));
  const validTrials = trials.filter(t => t.initialSentence !== null && t.debiasedSentence !== null);
  if (validTrials.length === 0) return;
  
  const first = validTrials[0];
  const model = first.model.split('/').pop()?.replace(/[^a-z0-9-]/gi, '-') || 'unknown';
  const baseline = modelInfo[model]?.baseline || 0;
  
  const initials = validTrials.map(t => t.initialSentence as number);
  const debiaseds = validTrials.map(t => t.debiasedSentence as number);
  
  const initialMean = mean(initials);
  const debiasedMean = mean(debiaseds);
  const initialDistFromBaseline = Math.abs(initialMean - baseline);
  const debiasedDistFromBaseline = Math.abs(debiasedMean - baseline);
  
  sacdData.push({
    model,
    temperature: first.temperature,
    anchor: first.anchor,
    anchorType: first.anchor < baseline ? 'low' : 'high',
    baseline,
    n: validTrials.length,
    initialMean,
    debiasedMean,
    debiasEffect: debiasedMean - initialMean,
    movedTowardBaseline: debiasedDistFromBaseline < initialDistFromBaseline,
    initialDistFromBaseline,
    debiasedDistFromBaseline,
  });
});

// === OUTPUT ===
const output = {
  generatedAt: new Date().toISOString(),
  summary: {
    totalTrials: baselineData.reduce((sum, b) => sum + b.n, 0) +
                 anchoringData.reduce((sum, a) => sum + a.n, 0) +
                 sacdData.reduce((sum, s) => sum + s.n, 0),
    models: [...new Set(baselineData.map(b => b.model))],
    temperatures: [0, 0.7, 1.0],
  },
  baselines: baselineData,
  anchoring: anchoringData,
  sacd: sacdData,
  modelInfo: Object.entries(modelInfo).map(([model, info]) => ({ model, ...info })),
};

const outputPath = 'results/analysis-data.json';
writeFileSync(outputPath, JSON.stringify(output, null, 2));
console.log(`Analysis data written to ${outputPath}`);
console.log(`Total trials: ${output.summary.totalTrials}`);
console.log(`Models: ${output.summary.models.length}`);
console.log(`Baseline records: ${baselineData.length}`);
console.log(`Anchoring records: ${anchoringData.length}`);
console.log(`SACD records: ${sacdData.length}`);
