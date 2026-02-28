#!/usr/bin/env npx tsx
// @ts-nocheck
/**
 * Bootstrap CIs for Table V (Multi-Domain MAD Rankings)
 * 
 * Computes 95% CIs for MAD values to assess ranking stability
 * Uses baseline-none as reference for all techniques (per-model)
 */

import * as fs from 'fs';
import * as path from 'path';

const PAPER_MODELS = ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5', 'gpt-5-2'];
const DOMAINS = ['salary', 'loan', 'medical', 'judicial-dui', 'judicial-fraud', 'judicial-aggravated-theft'];
const TECHNIQUES = ['baseline', 'devils-advocate', 'premortem', 'sacd', 'random-control'];
const N_BOOTSTRAP = 1000;

interface Trial {
  model: string;
  technique: string;
  anchor: string;
  value: number;
}

function loadDomainTrials(domain: string): Trial[] {
  const dir = `results/vignette-${domain}`;
  
  const trials: Trial[] = [];
  
  if (!fs.existsSync(dir)) {
    console.error(`Missing: ${dir}`);
    return trials;
  }
  
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsonl'));
  
  for (const file of files) {
    // Parse filename: {technique}-{anchor}-{model}-t07.jsonl
    const parts = file.replace('.jsonl', '').split('-');
    
    // Find technique
    let technique = parts[0];
    if (parts[0] === 'devils' && parts[1] === 'advocate') {
      technique = 'devils-advocate';
    } else if (parts[0] === 'random' && parts[1] === 'control') {
      technique = 'random-control';
    }
    
    // Find anchor position
    let anchorIdx = 1;
    if (technique === 'devils-advocate' || technique === 'random-control') {
      anchorIdx = 2;
    }
    const anchor = parts[anchorIdx]; // 'none', 'low', or 'high'
    
    // Find model from filename
    let model = '';
    if (file.includes('claude-opus-4-6')) model = 'claude-opus-4-6';
    else if (file.includes('claude-sonnet-4-6')) model = 'claude-sonnet-4-6';
    else if (file.includes('claude-sonnet-4-5')) continue; // Skip sonnet 4.5
    else if (file.includes('claude-haiku-4-5')) model = 'claude-haiku-4-5';
    else if (file.includes('gpt-5-2')) model = 'gpt-5-2';
    else continue;
    
    if (!PAPER_MODELS.includes(model)) continue;
    
    const lines = fs.readFileSync(path.join(dir, file), 'utf-8').trim().split('\n');
    
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const data = JSON.parse(line);
        
        // Extract value based on domain
        let value: number | null = null;
        if (domain === 'salary') {
          value = data.response ?? data.salaryOffer;
        } else if (domain === 'loan') {
          value = data.response ?? data.loanAmount;
        } else if (domain === 'medical') {
          value = data.response ?? data.triageHours;
        } else {
          value = data.response ?? data.sentenceMonths;
        }
        
        if (value !== null && !isNaN(value) && value > 0) {
          trials.push({ model, technique, anchor, value });
        }
      } catch (e) {}
    }
  }
  
  return trials;
}

function bootstrap(values: number[], n: number): number[] {
  const samples: number[] = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(Math.random() * values.length);
    samples.push(values[idx]);
  }
  return samples;
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function computeMADPerModel(
  lowVals: Map<string, number[]>, 
  highVals: Map<string, number[]>, 
  baselineVals: Map<string, number[]>
): number {
  let totalDev = 0;
  let count = 0;
  
  for (const model of PAPER_MODELS) {
    const base = baselineVals.get(model) || [];
    const low = lowVals.get(model) || [];
    const high = highVals.get(model) || [];
    
    if (base.length < 3 || low.length < 3 || high.length < 3) continue;
    
    const baseMean = mean(base);
    if (baseMean === 0) continue;
    
    const lowMean = mean(low);
    const highMean = mean(high);
    
    const lowDev = Math.abs((lowMean / baseMean - 1) * 100);
    const highDev = Math.abs((highMean / baseMean - 1) * 100);
    
    totalDev += (lowDev + highDev) / 2;
    count++;
  }
  
  return count > 0 ? totalDev / count : NaN;
}

function bootstrapMADPerModel(
  lowTrials: Trial[], 
  highTrials: Trial[], 
  baselineTrials: Trial[]
): { mean: number; ci95: [number, number] } {
  const mads: number[] = [];
  
  for (let i = 0; i < N_BOOTSTRAP; i++) {
    // Group by model and bootstrap within each group
    const lowByModel = new Map<string, number[]>();
    const highByModel = new Map<string, number[]>();
    const baseByModel = new Map<string, number[]>();
    
    for (const model of PAPER_MODELS) {
      const modelLow = lowTrials.filter(t => t.model === model);
      const modelHigh = highTrials.filter(t => t.model === model);
      const modelBase = baselineTrials.filter(t => t.model === model);
      
      if (modelLow.length > 0) {
        lowByModel.set(model, bootstrap(modelLow.map(t => t.value), modelLow.length));
      }
      if (modelHigh.length > 0) {
        highByModel.set(model, bootstrap(modelHigh.map(t => t.value), modelHigh.length));
      }
      if (modelBase.length > 0) {
        baseByModel.set(model, bootstrap(modelBase.map(t => t.value), modelBase.length));
      }
    }
    
    const mad = computeMADPerModel(lowByModel, highByModel, baseByModel);
    if (!isNaN(mad)) mads.push(mad);
  }
  
  mads.sort((a, b) => a - b);
  
  const lo = mads[Math.floor(mads.length * 0.025)] ?? 0;
  const hi = mads[Math.floor(mads.length * 0.975)] ?? 0;
  const m = mean(mads);
  
  return { mean: m, ci95: [lo, hi] };
}

console.log('Bootstrap CIs for Table V (Multi-Domain MAD Rankings)');
console.log('=' .repeat(70));
console.log(`Models: ${PAPER_MODELS.join(', ')}`);
console.log(`Bootstrap iterations: ${N_BOOTSTRAP}`);
console.log(`Using per-model baseline-none as reference`);
console.log();

const allResults: Map<string, { technique: string; mad: number; ci: [number, number] }[]> = new Map();

for (const domain of DOMAINS) {
  const trials = loadDomainTrials(domain);
  console.log(`\n## ${domain.toUpperCase()} (${trials.length} trials)`);
  
  // Get baseline-none values for reference (per model)
  const baselineNone = trials.filter(t => t.technique === 'baseline' && t.anchor === 'none');
  
  if (baselineNone.length < 10) {
    console.log(`  Insufficient baseline-none data (${baselineNone.length} trials)`);
    continue;
  }
  
  const results: { technique: string; mad: number; ci: [number, number] }[] = [];
  
  for (const technique of TECHNIQUES) {
    // Get low and high anchor values for this technique
    const lowVals = trials.filter(t => t.technique === technique && t.anchor === 'low');
    const highVals = trials.filter(t => t.technique === technique && t.anchor === 'high');
    
    if (lowVals.length < 10 || highVals.length < 10) {
      console.log(`  ${technique.padEnd(18)} insufficient anchor data (low=${lowVals.length}, high=${highVals.length})`);
      continue;
    }
    
    // Use baseline-none as reference for all techniques
    const { mean: madMean, ci95 } = bootstrapMADPerModel(lowVals, highVals, baselineNone);
    results.push({ technique, mad: madMean, ci: ci95 });
    
    const width = ci95[1] - ci95[0];
    console.log(`  ${technique.padEnd(18)} MAD=${madMean.toFixed(1)}% [${ci95[0].toFixed(1)}, ${ci95[1].toFixed(1)}] (width=${width.toFixed(1)})`);
  }
  
  // Determine ranking stability
  if (results.length >= 2) {
    results.sort((a, b) => a.mad - b.mad);
    const best = results[0];
    const second = results[1];
    
    // Check if CIs overlap
    const overlap = best.ci[1] >= second.ci[0];
    console.log(`  → RANKING: ${best.technique} #1 (${overlap ? '⚠️ CIs OVERLAP with #2' : '✓ SIGNIFICANT vs #2'})`);
  }
  
  allResults.set(domain, results);
}

console.log('\n' + '='.repeat(70));
console.log('SUMMARY: Ranking Stability (lower MAD = better)');
console.log('='.repeat(70));
console.log('Domain'.padEnd(28) + '#1 Technique'.padEnd(18) + 'MAD [95% CI]'.padEnd(25) + 'Status');
console.log('-'.repeat(70));

for (const [domain, results] of allResults) {
  if (results.length >= 2) {
    const sorted = [...results].sort((a, b) => a.mad - b.mad);
    const best = sorted[0];
    const second = sorted[1];
    const overlap = best.ci[1] >= second.ci[0];
    const ciStr = `${best.mad.toFixed(1)}% [${best.ci[0].toFixed(1)}, ${best.ci[1].toFixed(1)}]`;
    console.log(`${domain.padEnd(28)} ${best.technique.padEnd(18)} ${ciStr.padEnd(25)} ${overlap ? '⚠️ CI overlap' : '✓ Significant'}`);
  }
}
