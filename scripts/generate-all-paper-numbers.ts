#!/usr/bin/env bun
/**
 * FULL TRACEABILITY: Generate ALL paper statistics from raw JSONL
 * 
 * This script is the single source of truth for all paper numbers.
 * Run this script and copy the output to main.tex.
 * 
 * Usage: bun scripts/generate-all-paper-numbers.ts
 */

import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const RESULTS_DIR = './results';

// ============================================================================
// DATA LOADING
// ============================================================================

function normalizeModel(model: string): string {
  return model
    .replace('anthropic/', '')
    .replace('openai/', '')
    .replace('deepseek/', '')
    .replace('moonshot/', '')
    .replace('moonshotai/', '')  // kimi models
    .replace('zhipu/', '')
    .replace('z-ai/', '')  // glm models
    .replace(/\./g, '-')
    .toLowerCase();
}

// Load baselines
const analysisData = JSON.parse(readFileSync(join(RESULTS_DIR, 'analysis-data.json'), 'utf-8'));
const baselineByModel = new Map<string, { mean: number; sd: number; n: number }>();

for (const b of analysisData.baselines) {
  const key = normalizeModel(b.model);
  baselineByModel.set(key, { mean: b.mean, sd: b.sd || 0, n: b.n });
}

// Load all technique trials
interface Trial {
  model: string;
  technique: string;
  anchor: number;
  anchorType: 'high' | 'low';
  sentenceMonths: number;
  pctBaseline: number;
}

function loadAllTrials(): Trial[] {
  const trials: Trial[] = [];
  const files = readdirSync(RESULTS_DIR).filter(f => f.endsWith('.jsonl'));
  
  for (const file of files) {
    try {
      const content = readFileSync(join(RESULTS_DIR, file), 'utf-8');
      const lines = content.trim().split('\n').filter(l => l);
      for (const line of lines) {
        const data = JSON.parse(line);
        
        // Handle different field names: 'sentenceMonths' for most, 'final' for SACD
        const response = data.sentenceMonths ?? data.final;
        if (typeof response !== 'number') continue;
        
        const model = normalizeModel(data.model || data.actualModel);
        const baseline = baselineByModel.get(model);
        if (!baseline) continue;
        
        const technique = data.technique || 
          (file.startsWith('full-sacd-') ? 'full-sacd' :
           file.includes('devils-advocate') ? 'devils-advocate' : 
           file.includes('premortem') ? 'premortem' : 
           file.includes('random-control') ? 'random-control' :
           file.includes('outside-view') ? 'outside-view' :
           file.startsWith('baseline-') ? 'baseline' : null);
        
        if (!technique) continue;
        
        const anchorType = data.anchor < baseline.mean ? 'low' : 'high';
        
        trials.push({
          model,
          technique,
          anchor: data.anchor,
          anchorType,
          sentenceMonths: response,
          pctBaseline: (response / baseline.mean) * 100
        });
      }
    } catch (e) {
      // Skip invalid files
    }
  }
  return trials;
}

// Load SACD data from analysis-data.json
interface SacdTrial {
  model: string;
  anchorType: 'high' | 'low';
  pctBaseline: number;
  n: number;
}

function loadSacdTrials(): SacdTrial[] {
  const trials: SacdTrial[] = [];
  for (const s of analysisData.sacd) {
    const model = normalizeModel(s.model);
    const baseline = baselineByModel.get(model);
    if (!baseline) continue;
    // Use finalMean (new format) or debiasedMean (old format)
    const finalValue = s.finalMean ?? s.debiasedMean;
    if (finalValue === undefined) continue;
    trials.push({
      model,
      anchorType: s.anchorType,
      pctBaseline: s.finalPctOfBaseline ?? (finalValue / baseline.mean) * 100,
      n: s.n
    });
  }
  return trials;
}

// ============================================================================
// STATISTICAL HELPERS
// ============================================================================

function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function sd(arr: number[]): number {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, x) => s + Math.pow(x - m, 2), 0) / (arr.length - 1));
}

function bootstrapCI(arr: number[], iterations = 1000): [number, number] {
  const samples: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const sample = Array(arr.length).fill(0).map(() => arr[Math.floor(Math.random() * arr.length)]);
    samples.push(mean(sample));
  }
  samples.sort((a, b) => a - b);
  return [samples[Math.floor(0.025 * samples.length)], samples[Math.floor(0.975 * samples.length)]];
}

function cohenD(group1: number[], group2: number[]): number {
  const n1 = group1.length, n2 = group2.length;
  const m1 = mean(group1), m2 = mean(group2);
  const var1 = group1.reduce((s, x) => s + Math.pow(x - m1, 2), 0) / (n1 - 1);
  const var2 = group2.reduce((s, x) => s + Math.pow(x - m2, 2), 0) / (n2 - 1);
  const pooledSD = Math.sqrt(((n1-1)*var1 + (n2-1)*var2) / (n1+n2-2));
  return (m1 - m2) / pooledSD;
}

// ============================================================================
// MAIN ANALYSIS
// ============================================================================

const allTrials = loadAllTrials();
const sacdTrials = loadSacdTrials();

console.log('=' .repeat(80));
console.log('FULL PAPER STATISTICS - Generated from raw JSONL');
console.log('=' .repeat(80));
console.log(`Total trials loaded: ${allTrials.length}`);
console.log(`SACD entries: ${sacdTrials.length}`);
console.log('');

// ============================================================================
// TABLE 1: Technique Rankings (Abstract/Intro)
// ============================================================================

console.log('TABLE 1: Technique Susceptibility vs % of Baseline');
console.log('-'.repeat(60));

const techniques = ['devils-advocate', 'random-control', 'premortem', 'full-sacd'];
const techniqueStats: Map<string, { 
  pctBaseline: number; 
  pctCI: [number, number];
  spreadLow: number;
  spreadHigh: number;
  spreadTotal: number;
  n: number;
}> = new Map();

for (const tech of techniques) {
  // All techniques now loaded from raw JSONL (including SACD)
  const filtered = allTrials.filter(t => t.technique === tech);
  const pcts = filtered.map(t => t.pctBaseline);
  const lowPcts = filtered.filter(t => t.anchorType === 'low').map(t => t.pctBaseline);
  const highPcts = filtered.filter(t => t.anchorType === 'high').map(t => t.pctBaseline);
  
  if (pcts.length === 0) continue;
  
  const pctMean = mean(pcts);
  const pctCI = bootstrapCI(pcts);
  const lowMean = lowPcts.length > 0 ? mean(lowPcts) : 0;
  const highMean = highPcts.length > 0 ? mean(highPcts) : 0;
  const spread = highMean - lowMean;
  
  techniqueStats.set(tech, {
    pctBaseline: pctMean,
    pctCI,
    spreadLow: lowMean,
    spreadHigh: highMean,
    spreadTotal: spread,
    n: pcts.length
  });
}

// No-technique baseline spread (for susceptibility delta)
const anchoringHigh = analysisData.anchoring.filter((a: any) => a.anchorType === 'high');
const anchoringLow = analysisData.anchoring.filter((a: any) => a.anchorType === 'low');
const noTechHighMean = anchoringHigh.reduce((s: number, a: any) => s + a.mean * a.n, 0) / anchoringHigh.reduce((s: number, a: any) => s + a.n, 0);
const noTechLowMean = anchoringLow.reduce((s: number, a: any) => s + a.mean * a.n, 0) / anchoringLow.reduce((s: number, a: any) => s + a.n, 0);
const noTechSpread = noTechHighMean - noTechLowMean;

console.log(`No-technique spread: ${noTechSpread.toFixed(1)}mo`);
console.log('');

// Print table
console.log('| Technique | % of Baseline | 95% CI | Spread | Suscept. Δ | n |');
console.log('|-----------|---------------|--------|--------|------------|---|');

for (const tech of techniques) {
  const stats = techniqueStats.get(tech);
  if (!stats) continue;
  
  const spreadMo = stats.spreadTotal;
  const susceptDelta = ((spreadMo - noTechSpread) / noTechSpread) * 100;
  
  console.log(`| ${tech} | ${stats.pctBaseline.toFixed(1)}% | [${stats.pctCI[0].toFixed(0)}, ${stats.pctCI[1].toFixed(0)}] | ${spreadMo.toFixed(1)}mo | ${susceptDelta > 0 ? '+' : ''}${susceptDelta.toFixed(0)}% | ${stats.n} |`);
}

// ============================================================================
// TABLE 5: SACD by Model
// ============================================================================

console.log('\n\nTABLE 5: SACD by Model');
console.log('-'.repeat(60));

const sacdByModel: Map<string, number[]> = new Map();
for (const s of sacdTrials) {
  if (!sacdByModel.has(s.model)) sacdByModel.set(s.model, []);
  for (let i = 0; i < s.n; i++) {
    sacdByModel.get(s.model)!.push(s.pctBaseline);
  }
}

console.log('| Model | % of Baseline | 95% CI | Deviation | n |');
console.log('|-------|---------------|--------|-----------|---|');

const modelResults: { model: string; pct: number; ci: [number, number]; dev: number; n: number }[] = [];
for (const [model, pcts] of sacdByModel) {
  const m = mean(pcts);
  const ci = bootstrapCI(pcts);
  const dev = Math.abs(m - 100);
  modelResults.push({ model, pct: m, ci, dev, n: pcts.length });
}

modelResults.sort((a, b) => a.dev - b.dev);
for (const r of modelResults) {
  console.log(`| ${r.model} | ${r.pct.toFixed(1)}% | [${r.ci[0].toFixed(0)}, ${r.ci[1].toFixed(0)}] | ${r.dev.toFixed(1)}% | ${r.n} |`);
}

// ============================================================================
// TABLE 6: Anchor Asymmetry
// ============================================================================

console.log('\n\nTABLE 6: High vs Low Anchor');
console.log('-'.repeat(60));

console.log('| Technique | Low Anchor | Low CI | High Anchor | High CI | Asymmetry |');
console.log('|-----------|------------|--------|-------------|---------|-----------|');

for (const tech of techniques) {
  const stats = techniqueStats.get(tech);
  if (!stats) continue;
  
  // Get per-anchor CIs
  let lowPcts: number[] = [];
  let highPcts: number[] = [];
  
  if (tech === 'full-sacd') {
    for (const s of sacdTrials) {
      for (let i = 0; i < s.n; i++) {
        if (s.anchorType === 'low') lowPcts.push(s.pctBaseline);
        else highPcts.push(s.pctBaseline);
      }
    }
  } else {
    const filtered = allTrials.filter(t => t.technique === tech);
    lowPcts = filtered.filter(t => t.anchorType === 'low').map(t => t.pctBaseline);
    highPcts = filtered.filter(t => t.anchorType === 'high').map(t => t.pctBaseline);
  }
  
  const lowCI = bootstrapCI(lowPcts);
  const highCI = bootstrapCI(highPcts);
  const asymmetry = stats.spreadHigh - stats.spreadLow;
  
  console.log(`| ${tech} | ${stats.spreadLow.toFixed(1)}% | [${lowCI[0].toFixed(0)}, ${lowCI[1].toFixed(0)}] | ${stats.spreadHigh.toFixed(1)}% | [${highCI[0].toFixed(0)}, ${highCI[1].toFixed(0)}] | ${asymmetry.toFixed(1)}pp |`);
}

// ============================================================================
// TABLE 7: SACD vs Premortem Tradeoff
// ============================================================================

console.log('\n\nTABLE 7: SACD vs Premortem Tradeoff');
console.log('-'.repeat(60));

const sacdStats = techniqueStats.get('full-sacd')!;
const premortStats = techniqueStats.get('premortem')!;

// Average response deviation from 100%
const sacdAvgDev = Math.abs(((sacdStats.spreadLow + sacdStats.spreadHigh) / 2) - 100);
const premortAvgDev = Math.abs(((premortStats.spreadLow + premortStats.spreadHigh) / 2) - 100);

// Mean absolute per-trial error
const sacdAbsError = (Math.abs(sacdStats.spreadLow - 100) + Math.abs(sacdStats.spreadHigh - 100)) / 2;
const premortAbsError = (Math.abs(premortStats.spreadLow - 100) + Math.abs(premortStats.spreadHigh - 100)) / 2;

console.log('| Metric | SACD | Premortem | Winner |');
console.log('|--------|------|-----------|--------|');
console.log(`| Avg response deviation | ${sacdAvgDev.toFixed(1)}% | ${premortAvgDev.toFixed(1)}% | ${sacdAvgDev < premortAvgDev ? 'SACD' : 'Premortem'} |`);
console.log(`| Mean abs per-trial error | ${sacdAbsError.toFixed(1)}% | ${premortAbsError.toFixed(1)}% | ${sacdAbsError < premortAbsError ? 'SACD' : 'Premortem'} |`);

// ============================================================================
// EFFECT SIZES
// ============================================================================

console.log('\n\nEFFECT SIZES (Cohen\'s d)');
console.log('-'.repeat(60));

// Get raw pct arrays
const getPcts = (tech: string): number[] => {
  if (tech === 'full-sacd') {
    const arr: number[] = [];
    for (const s of sacdTrials) {
      for (let i = 0; i < s.n; i++) arr.push(s.pctBaseline);
    }
    return arr;
  }
  return allTrials.filter(t => t.technique === tech).map(t => t.pctBaseline);
};

const sacdPcts = getPcts('full-sacd');
const daPcts = getPcts('devils-advocate');
const rcPcts = getPcts('random-control');
const premortPcts = getPcts('premortem');

console.log(`SACD vs Devil's Advocate: d = ${cohenD(sacdPcts, daPcts).toFixed(2)}`);
console.log(`SACD vs Random Control: d = ${cohenD(sacdPcts, rcPcts).toFixed(2)}`);
console.log(`Premortem vs Devil's Advocate: d = ${cohenD(premortPcts, daPcts).toFixed(2)}`);
console.log(`Random Control vs Devil's Advocate: d = ${cohenD(rcPcts, daPcts).toFixed(2)}`);

// ============================================================================
// OPUS SENSITIVITY
// ============================================================================

console.log('\n\nOPUS SENSITIVITY ANALYSIS');
console.log('-'.repeat(60));

for (const tech of techniques) {
  let allPcts: number[] = [];
  let noOpusPcts: number[] = [];
  
  if (tech === 'full-sacd') {
    for (const s of sacdTrials) {
      for (let i = 0; i < s.n; i++) {
        allPcts.push(s.pctBaseline);
        if (!s.model.includes('opus')) noOpusPcts.push(s.pctBaseline);
      }
    }
  } else {
    const filtered = allTrials.filter(t => t.technique === tech);
    allPcts = filtered.map(t => t.pctBaseline);
    noOpusPcts = filtered.filter(t => !t.model.includes('opus')).map(t => t.pctBaseline);
  }
  
  const allMean = mean(allPcts);
  const noOpusMean = mean(noOpusPcts);
  console.log(`${tech}: All=${allMean.toFixed(1)}%, NoOpus=${noOpusMean.toFixed(1)}%, Δ=${(noOpusMean - allMean).toFixed(1)}pp`);
}

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n\n' + '='.repeat(80));
console.log('KEY NUMBERS FOR PAPER');
console.log('='.repeat(80));

console.log(`
Total trials: ${allTrials.length + sacdTrials.reduce((s, t) => s + t.n, 0)}
Models: ${baselineByModel.size}
Techniques: ${techniques.length}

SACD: ${sacdStats.pctBaseline.toFixed(1)}% [${sacdStats.pctCI[0].toFixed(0)}, ${sacdStats.pctCI[1].toFixed(0)}]
Premortem: ${premortStats.pctBaseline.toFixed(1)}% [${premortStats.pctCI[0].toFixed(0)}, ${premortStats.pctCI[1].toFixed(0)}]
Random Control: ${techniqueStats.get('random-control')!.pctBaseline.toFixed(1)}%
Devil's Advocate: ${techniqueStats.get('devils-advocate')!.pctBaseline.toFixed(1)}%

SACD vs Premortem Tradeoff:
  - By avg response: SACD ${sacdAvgDev.toFixed(1)}% vs Premortem ${premortAvgDev.toFixed(1)}%
  - By per-trial error: SACD ${sacdAbsError.toFixed(1)}% vs Premortem ${premortAbsError.toFixed(1)}%

No-technique spread: ${noTechSpread.toFixed(1)}mo
`);

console.log('Script complete. Copy relevant sections to main.tex.');
