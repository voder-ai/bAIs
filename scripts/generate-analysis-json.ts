#!/usr/bin/env npx tsx
/**
 * Generate comprehensive analysis JSON for paper and visualizations
 * Loads ALL result files with current naming conventions
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

const RESULTS_DIR = 'results';

interface BaseTrial {
  model: string;
  actualModel?: string;
  temperature: number;
  anchor?: number;
  condition?: string;
  technique?: string;
}

interface StandardTrial extends BaseTrial {
  sentenceMonths: number | null;
}

interface SacdTrial extends BaseTrial {
  initial: number | null;
  final: number | null;
  iterations?: number;
}

function loadJsonl<T>(filepath: string): T[] {
  try {
    const content = readFileSync(filepath, 'utf-8');
    return content.trim().split('\n').filter(line => line.trim()).map(line => JSON.parse(line));
  } catch (e) {
    console.error(`Error loading ${filepath}:`, e);
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

function normalizeModel(model: string): string {
  return model.split('/').pop()?.replace(/[^a-z0-9-]/gi, '-').toLowerCase() || 'unknown';
}

// Load anchor values for baseline info
let modelInfo: Record<string, { baseline: number; lowAnchor: number; highAnchor: number }> = {};
const anchorValuesPath = join(RESULTS_DIR, 'anchor-values.json');
if (existsSync(anchorValuesPath)) {
  const anchorValues = JSON.parse(readFileSync(anchorValuesPath, 'utf-8'));
  anchorValues.forEach((m: any) => {
    const shortName = normalizeModel(m.model);
    modelInfo[shortName] = {
      baseline: m.meanOverall,
      lowAnchor: m.lowAnchor,
      highAnchor: m.highAnchor,
    };
  });
}

// === BASELINE ANALYSIS ===
const baselineFiles = readdirSync(RESULTS_DIR).filter(f => f.startsWith('baseline-') && f.endsWith('.jsonl'));
const baselineData: any[] = [];
const baselineByModel: Record<string, number[]> = {};

baselineFiles.forEach(f => {
  const trials = loadJsonl<StandardTrial>(join(RESULTS_DIR, f));
  const validTrials = trials.filter(t => t.sentenceMonths !== null && t.sentenceMonths !== undefined);
  if (validTrials.length === 0) return;
  
  const model = normalizeModel(validTrials[0].actualModel || validTrials[0].model);
  const temp = validTrials[0].temperature;
  const values = validTrials.map(t => t.sentenceMonths as number);
  
  if (!baselineByModel[model]) baselineByModel[model] = [];
  baselineByModel[model].push(...values);
  
  baselineData.push({
    file: f,
    model,
    temperature: temp,
    n: values.length,
    mean: mean(values),
    std: std(values),
    min: Math.min(...values),
    max: Math.max(...values),
  });
});

// Compute overall baselines per model
const computedBaselines: Record<string, number> = {};
for (const [model, values] of Object.entries(baselineByModel)) {
  computedBaselines[model] = mean(values);
}

// === ANCHORING ANALYSIS ===
const lowAnchorFiles = readdirSync(RESULTS_DIR).filter(f => f.startsWith('low-anchor-') && f.endsWith('.jsonl'));
const highAnchorDir = join(RESULTS_DIR, 'high-anchor');
const highAnchorFiles = existsSync(highAnchorDir) ? readdirSync(highAnchorDir).filter(f => f.endsWith('.jsonl')) : [];

const anchoringData: any[] = [];

// Process low-anchor
lowAnchorFiles.forEach(f => {
  const trials = loadJsonl<StandardTrial>(join(RESULTS_DIR, f));
  const validTrials = trials.filter(t => t.sentenceMonths !== null && t.sentenceMonths !== undefined);
  if (validTrials.length === 0) return;
  
  const model = normalizeModel(validTrials[0].actualModel || validTrials[0].model);
  const temp = validTrials[0].temperature;
  const anchor = validTrials[0].anchor || 0;
  const values = validTrials.map(t => t.sentenceMonths as number);
  const baseline = computedBaselines[model] || modelInfo[model]?.baseline || 0;
  
  anchoringData.push({
    file: f,
    model,
    temperature: temp,
    anchorType: 'low',
    anchorValue: anchor,
    baseline,
    n: values.length,
    mean: mean(values),
    std: std(values),
    shift: mean(values) - baseline,
    pctOfBaseline: baseline > 0 ? (mean(values) / baseline) * 100 : NaN,
  });
});

// Process high-anchor
highAnchorFiles.forEach(f => {
  const trials = loadJsonl<StandardTrial>(join(highAnchorDir, f));
  const validTrials = trials.filter(t => t.sentenceMonths !== null && t.sentenceMonths !== undefined);
  if (validTrials.length === 0) return;
  
  const model = normalizeModel(validTrials[0].actualModel || validTrials[0].model);
  const temp = validTrials[0].temperature;
  const anchor = validTrials[0].anchor || 0;
  const values = validTrials.map(t => t.sentenceMonths as number);
  const baseline = computedBaselines[model] || modelInfo[model]?.baseline || 0;
  
  anchoringData.push({
    file: f,
    model,
    temperature: temp,
    anchorType: 'high',
    anchorValue: anchor,
    baseline,
    n: values.length,
    mean: mean(values),
    std: std(values),
    shift: mean(values) - baseline,
    pctOfBaseline: baseline > 0 ? (mean(values) / baseline) * 100 : NaN,
  });
});

// === TECHNIQUE ANALYSIS (Devils Advocate, Premortem, Random Control, Outside View) ===
const techniques = ['devils-advocate', 'premortem', 'random-control', 'outside-view'];
const techniqueData: any[] = [];

techniques.forEach(technique => {
  const files = readdirSync(RESULTS_DIR).filter(f => f.startsWith(`${technique}-`) && f.endsWith('.jsonl'));
  
  files.forEach(f => {
    const trials = loadJsonl<StandardTrial>(join(RESULTS_DIR, f));
    const validTrials = trials.filter(t => t.sentenceMonths !== null && t.sentenceMonths !== undefined);
    if (validTrials.length === 0) return;
    
    const model = normalizeModel(validTrials[0].actualModel || validTrials[0].model);
    const temp = validTrials[0].temperature;
    const anchor = validTrials[0].anchor || 0;
    const values = validTrials.map(t => t.sentenceMonths as number);
    const baseline = computedBaselines[model] || modelInfo[model]?.baseline || 0;
    
    techniqueData.push({
      file: f,
      technique,
      model,
      temperature: temp,
      anchor,
      baseline,
      n: values.length,
      mean: mean(values),
      std: std(values),
      pctOfBaseline: baseline > 0 ? (mean(values) / baseline) * 100 : NaN,
      distFromBaseline: Math.abs(mean(values) - baseline),
    });
  });
});

// === SACD ANALYSIS ===
const sacdFiles = readdirSync(RESULTS_DIR).filter(f => f.startsWith('full-sacd-') && f.endsWith('.jsonl'));
const sacdData: any[] = [];

sacdFiles.forEach(f => {
  const trials = loadJsonl<SacdTrial>(join(RESULTS_DIR, f));
  const validTrials = trials.filter(t => 
    t.initial !== null && t.initial !== undefined && 
    t.final !== null && t.final !== undefined
  );
  if (validTrials.length === 0) return;
  
  const first = validTrials[0];
  const model = normalizeModel(first.actualModel || first.model);
  const temp = first.temperature;
  const anchor = first.anchor || 0;
  const baseline = computedBaselines[model] || modelInfo[model]?.baseline || 0;
  
  const initials = validTrials.map(t => t.initial as number);
  const finals = validTrials.map(t => t.final as number);
  
  const initialMean = mean(initials);
  const finalMean = mean(finals);
  const initialDistFromBaseline = Math.abs(initialMean - baseline);
  const finalDistFromBaseline = Math.abs(finalMean - baseline);
  
  sacdData.push({
    file: f,
    technique: 'full-sacd',
    model,
    temperature: temp,
    anchor,
    anchorType: anchor < baseline ? 'low' : 'high',
    baseline,
    n: validTrials.length,
    initialMean,
    finalMean,
    debiasEffect: finalMean - initialMean,
    movedTowardBaseline: finalDistFromBaseline < initialDistFromBaseline,
    initialDistFromBaseline,
    finalDistFromBaseline,
    initialPctOfBaseline: baseline > 0 ? (initialMean / baseline) * 100 : NaN,
    finalPctOfBaseline: baseline > 0 ? (finalMean / baseline) * 100 : NaN,
  });
});

// === AGGREGATE BY MODEL AND TECHNIQUE ===
const aggregateByModelTechnique: Record<string, Record<string, { values: number[]; baseline: number }>> = {};

// Add technique data
techniqueData.forEach(t => {
  if (!aggregateByModelTechnique[t.model]) aggregateByModelTechnique[t.model] = {};
  if (!aggregateByModelTechnique[t.model][t.technique]) {
    aggregateByModelTechnique[t.model][t.technique] = { values: [], baseline: t.baseline };
  }
  // Get individual values from file
  const trials = loadJsonl<StandardTrial>(join(RESULTS_DIR, t.file));
  trials.filter(tr => tr.sentenceMonths !== null).forEach(tr => {
    aggregateByModelTechnique[t.model][t.technique].values.push(tr.sentenceMonths as number);
  });
});

// Add SACD data
sacdData.forEach(s => {
  if (!aggregateByModelTechnique[s.model]) aggregateByModelTechnique[s.model] = {};
  if (!aggregateByModelTechnique[s.model]['full-sacd']) {
    aggregateByModelTechnique[s.model]['full-sacd'] = { values: [], baseline: s.baseline };
  }
  const trials = loadJsonl<SacdTrial>(join(RESULTS_DIR, s.file));
  trials.filter(t => t.final !== null).forEach(t => {
    aggregateByModelTechnique[s.model]['full-sacd'].values.push(t.final as number);
  });
});

// Compute aggregated stats
const aggregatedStats: any[] = [];
for (const [model, techniques] of Object.entries(aggregateByModelTechnique)) {
  for (const [technique, data] of Object.entries(techniques)) {
    const m = mean(data.values);
    const pctOfBaseline = data.baseline > 0 ? (m / data.baseline) * 100 : NaN;
    aggregatedStats.push({
      model,
      technique,
      n: data.values.length,
      baseline: data.baseline,
      mean: m,
      std: std(data.values),
      pctOfBaseline,
      absDeviation: Math.abs(pctOfBaseline - 100),
    });
  }
}

// === GRAND TOTALS BY TECHNIQUE ===
const grandTotalsByTechnique: Record<string, { values: number[]; baselineSum: number; count: number }> = {};

aggregatedStats.forEach(s => {
  if (!grandTotalsByTechnique[s.technique]) {
    grandTotalsByTechnique[s.technique] = { values: [], baselineSum: 0, count: 0 };
  }
  grandTotalsByTechnique[s.technique].values.push(...aggregateByModelTechnique[s.model][s.technique].values);
  grandTotalsByTechnique[s.technique].baselineSum += s.baseline;
  grandTotalsByTechnique[s.technique].count++;
});

const techniqueGrandTotals = Object.entries(grandTotalsByTechnique).map(([technique, data]) => {
  const avgBaseline = data.baselineSum / data.count;
  const m = mean(data.values);
  return {
    technique,
    n: data.values.length,
    mean: m,
    std: std(data.values),
    avgBaseline,
    pctOfBaseline: (m / avgBaseline) * 100,
    absDeviation: Math.abs((m / avgBaseline) * 100 - 100),
  };
}).sort((a, b) => a.absDeviation - b.absDeviation);

// === COUNT TOTALS ===
const totalBaseline = baselineData.reduce((sum, b) => sum + b.n, 0);
const totalAnchoring = anchoringData.reduce((sum, a) => sum + a.n, 0);
const totalTechniques = techniqueData.reduce((sum, t) => sum + t.n, 0);
const totalSacd = sacdData.reduce((sum, s) => sum + s.n, 0);

// === OUTPUT ===
const output = {
  generatedAt: new Date().toISOString(),
  summary: {
    totalTrials: totalBaseline + totalAnchoring + totalTechniques + totalSacd,
    breakdown: {
      baseline: totalBaseline,
      anchoring: totalAnchoring,
      techniques: totalTechniques,
      sacd: totalSacd,
    },
    models: [...new Set([
      ...baselineData.map(b => b.model),
      ...techniqueData.map(t => t.model),
      ...sacdData.map(s => s.model),
    ])].sort(),
    temperatures: [0, 0.7, 1.0],
    techniques: [...techniques, 'full-sacd'],
  },
  computedBaselines,
  baselines: baselineData,
  anchoring: anchoringData,
  techniques: techniqueData,
  sacd: sacdData,
  aggregatedByModelTechnique: aggregatedStats,
  techniqueGrandTotals,
  modelInfo: Object.entries(modelInfo).map(([model, info]) => ({ model, ...info })),
};

const outputPath = join(RESULTS_DIR, 'analysis-data.json');
writeFileSync(outputPath, JSON.stringify(output, null, 2));

console.log('\n=== ANALYSIS DATA GENERATED ===\n');
console.log(`Output: ${outputPath}`);
console.log(`Total trials: ${output.summary.totalTrials}`);
console.log(`  - Baseline: ${totalBaseline}`);
console.log(`  - Anchoring: ${totalAnchoring}`);
console.log(`  - Techniques: ${totalTechniques}`);
console.log(`  - SACD: ${totalSacd}`);
console.log(`Models: ${output.summary.models.length} (${output.summary.models.join(', ')})`);

console.log('\n=== TECHNIQUE RANKINGS (by % of baseline, closest to 100% = best) ===\n');
techniqueGrandTotals.forEach((t, i) => {
  console.log(`${i + 1}. ${t.technique}: ${t.pctOfBaseline.toFixed(1)}% (n=${t.n}, deviation=${t.absDeviation.toFixed(1)}%)`);
});

console.log('\n=== COMPUTED BASELINES BY MODEL ===\n');
Object.entries(computedBaselines).sort((a, b) => b[1] - a[1]).forEach(([model, baseline]) => {
  console.log(`  ${model}: ${baseline.toFixed(1)} months`);
});
