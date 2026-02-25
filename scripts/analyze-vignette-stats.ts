#!/usr/bin/env bun
/**
 * Multi-Vignette Statistics Analysis
 * 
 * Produces paper-ready statistics for salary, loan, and medical vignettes.
 * Mirrors the analysis style of generate-all-paper-numbers.ts
 * 
 * Usage: bun scripts/analyze-vignette-stats.ts
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, basename } from 'path';

const RESULTS_DIR = './results';
const VIGNETTES = ['salary', 'loan', 'medical'];

// ============================================================================
// TYPES
// ============================================================================

interface Trial {
  vignette: string;
  model: string;
  technique: string;
  anchorType: 'none' | 'low' | 'high';
  anchor: number | null;
  response: number;
  baseline: number | null;
}

interface ConditionStats {
  n: number;
  mean: number;
  std: number;
  se: number;
  ci95: [number, number];
  values: number[];
}

// ============================================================================
// DATA LOADING
// ============================================================================

function loadVignetteTrials(vignette: string): Trial[] {
  const dir = join(RESULTS_DIR, `vignette-${vignette}`);
  if (!existsSync(dir)) return [];
  
  const trials: Trial[] = [];
  
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.jsonl')) continue;
    
    // Parse filename: technique-anchorType-model-t07.jsonl
    const parts = basename(file, '.jsonl').split('-');
    const technique = parts[0];
    const anchorType = parts[1] as 'none' | 'low' | 'high';
    
    const content = readFileSync(join(dir, file), 'utf-8');
    for (const line of content.split('\n').filter(l => l.trim())) {
      try {
        const data = JSON.parse(line);
        if (data.response === null || typeof data.response !== 'number') continue;
        
        trials.push({
          vignette,
          model: data.model?.replace('anthropic/', '') || 'unknown',
          technique,
          anchorType,
          anchor: data.anchor || null,
          response: data.response,
          baseline: data.baseline || null,
        });
      } catch {}
    }
  }
  
  return trials;
}

// ============================================================================
// STATISTICS
// ============================================================================

function calcStats(values: number[]): ConditionStats {
  const n = values.length;
  if (n === 0) return { n: 0, mean: 0, std: 0, se: 0, ci95: [0, 0], values: [] };
  
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (n - 1 || 1);
  const std = Math.sqrt(variance);
  const se = std / Math.sqrt(n);
  const t975 = 1.96; // Approximate for n>=30
  const ci95: [number, number] = [mean - t975 * se, mean + t975 * se];
  
  return { n, mean, std, se, ci95, values };
}

function welchT(a: number[], b: number[]): { t: number; p: string; significant: boolean; cohenD: number } {
  const statsA = calcStats(a);
  const statsB = calcStats(b);
  
  if (statsA.n === 0 || statsB.n === 0) {
    return { t: 0, p: 'N/A', significant: false, cohenD: 0 };
  }
  
  const pooledVar = ((statsA.n - 1) * statsA.std ** 2 + (statsB.n - 1) * statsB.std ** 2) / (statsA.n + statsB.n - 2);
  const pooledStd = Math.sqrt(pooledVar);
  const cohenD = pooledStd > 0 ? (statsA.mean - statsB.mean) / pooledStd : 0;
  
  const se = Math.sqrt(statsA.std ** 2 / statsA.n + statsB.std ** 2 / statsB.n);
  if (se === 0) {
    return { t: 0, p: 'identical', significant: false, cohenD };
  }
  
  const t = (statsA.mean - statsB.mean) / se;
  const significant = Math.abs(t) > 2.0; // Approximate α=0.05
  const p = significant ? '<0.05' : '>0.05';
  
  return { t, p, significant, cohenD };
}

// ============================================================================
// ANALYSIS
// ============================================================================

function analyzeVignette(vignette: string, trials: Trial[]) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`VIGNETTE: ${vignette.toUpperCase()}`);
  console.log('='.repeat(70));
  
  const models = [...new Set(trials.map(t => t.model))].sort();
  const techniques = [...new Set(trials.map(t => t.technique))].sort();
  
  // Get baselines first
  const baselineByModel = new Map<string, ConditionStats>();
  for (const model of models) {
    const baselineTrials = trials.filter(t => t.model === model && t.technique === 'baseline' && t.anchorType === 'none');
    baselineByModel.set(model, calcStats(baselineTrials.map(t => t.response)));
  }
  
  // Print baseline stats
  console.log('\n--- BASELINES (no anchor) ---');
  for (const model of models) {
    const stats = baselineByModel.get(model)!;
    console.log(`${model}: mean=${stats.mean.toFixed(2)}, std=${stats.std.toFixed(2)}, n=${stats.n}, 95%CI=[${stats.ci95[0].toFixed(2)}, ${stats.ci95[1].toFixed(2)}]`);
  }
  
  // Anchoring effects
  console.log('\n--- ANCHORING EFFECTS (baseline technique) ---');
  for (const model of models) {
    const baseline = baselineByModel.get(model)!;
    
    const lowTrials = trials.filter(t => t.model === model && t.technique === 'baseline' && t.anchorType === 'low');
    const highTrials = trials.filter(t => t.model === model && t.technique === 'baseline' && t.anchorType === 'high');
    
    const lowStats = calcStats(lowTrials.map(t => t.response));
    const highStats = calcStats(highTrials.map(t => t.response));
    
    const lowAnchor = lowTrials[0]?.anchor || 'N/A';
    const highAnchor = highTrials[0]?.anchor || 'N/A';
    
    console.log(`\n${model}:`);
    console.log(`  Baseline: ${baseline.mean.toFixed(2)} (n=${baseline.n})`);
    
    if (lowStats.n > 0) {
      const lowEffect = lowStats.mean - baseline.mean;
      const lowPct = (lowEffect / baseline.mean * 100);
      const lowTest = welchT(baseline.values, lowStats.values);
      console.log(`  Low anchor (${lowAnchor}): ${lowStats.mean.toFixed(2)} (n=${lowStats.n}) | Effect: ${lowEffect >= 0 ? '+' : ''}${lowEffect.toFixed(2)} (${lowPct >= 0 ? '+' : ''}${lowPct.toFixed(1)}%) | d=${lowTest.cohenD.toFixed(2)}, p${lowTest.p}`);
    }
    
    if (highStats.n > 0) {
      const highEffect = highStats.mean - baseline.mean;
      const highPct = (highEffect / baseline.mean * 100);
      const highTest = welchT(baseline.values, highStats.values);
      console.log(`  High anchor (${highAnchor}): ${highStats.mean.toFixed(2)} (n=${highStats.n}) | Effect: ${highEffect >= 0 ? '+' : ''}${highEffect.toFixed(2)} (${highPct >= 0 ? '+' : ''}${highPct.toFixed(1)}%) | d=${highTest.cohenD.toFixed(2)}, p${highTest.p}`);
    }
  }
  
  // Debiasing technique comparison
  console.log('\n--- DEBIASING TECHNIQUES ---');
  const debiaseTechniques = techniques.filter(t => t !== 'baseline');
  
  for (const model of models) {
    const baseline = baselineByModel.get(model)!;
    console.log(`\n${model}:`);
    console.log('  Technique'.padEnd(20) + 'Low Mean'.padEnd(12) + 'High Mean'.padEnd(12) + 'Low→Base'.padEnd(12) + 'High→Base');
    console.log('  ' + '-'.repeat(70));
    
    // First show baseline anchored
    const baselineLow = calcStats(trials.filter(t => t.model === model && t.technique === 'baseline' && t.anchorType === 'low').map(t => t.response));
    const baselineHigh = calcStats(trials.filter(t => t.model === model && t.technique === 'baseline' && t.anchorType === 'high').map(t => t.response));
    
    console.log(`  ${'baseline'.padEnd(18)} ${baselineLow.mean.toFixed(1).padEnd(12)} ${baselineHigh.mean.toFixed(1).padEnd(12)} (reference)`.padEnd(12));
    
    for (const tech of debiaseTechniques) {
      const lowTrials = trials.filter(t => t.model === model && t.technique === tech && t.anchorType === 'low');
      const highTrials = trials.filter(t => t.model === model && t.technique === tech && t.anchorType === 'high');
      
      const lowStats = calcStats(lowTrials.map(t => t.response));
      const highStats = calcStats(highTrials.map(t => t.response));
      
      if (lowStats.n === 0 && highStats.n === 0) continue;
      
      // Effect = how much closer to unanchored baseline
      const lowToBase = baselineLow.n > 0 ? (lowStats.mean - baselineLow.mean) : 0;
      const highToBase = baselineHigh.n > 0 ? (highStats.mean - baselineHigh.mean) : 0;
      
      const lowStr = lowStats.n > 0 ? lowStats.mean.toFixed(1) : 'N/A';
      const highStr = highStats.n > 0 ? highStats.mean.toFixed(1) : 'N/A';
      const lowEffect = lowStats.n > 0 ? `${lowToBase >= 0 ? '+' : ''}${lowToBase.toFixed(1)}` : 'N/A';
      const highEffect = highStats.n > 0 ? `${highToBase >= 0 ? '+' : ''}${highToBase.toFixed(1)}` : 'N/A';
      
      console.log(`  ${tech.padEnd(18)} ${lowStr.padEnd(12)} ${highStr.padEnd(12)} ${lowEffect.padEnd(12)} ${highEffect}`);
    }
  }
  
  return { models, techniques, trials };
}

// ============================================================================
// MAIN
// ============================================================================

function main() {
  console.log('='.repeat(70));
  console.log('MULTI-VIGNETTE STATISTICAL ANALYSIS');
  console.log('Generated: ' + new Date().toISOString());
  console.log('='.repeat(70));
  
  let totalTrials = 0;
  
  for (const vignette of VIGNETTES) {
    const trials = loadVignetteTrials(vignette);
    if (trials.length === 0) {
      console.log(`\n⚠️ No data for vignette: ${vignette}`);
      continue;
    }
    totalTrials += trials.length;
    analyzeVignette(vignette, trials);
  }
  
  // Also analyze spot-check if present
  const spotCheckDir = join(RESULTS_DIR, 'spot-check-judicial-piai');
  if (existsSync(spotCheckDir)) {
    console.log(`\n${'='.repeat(70)}`);
    console.log('SPOT-CHECK: JUDICIAL (pi-ai Direct)');
    console.log('='.repeat(70));
    
    const files = readdirSync(spotCheckDir);
    for (const file of files) {
      if (!file.endsWith('.jsonl')) continue;
      const name = basename(file, '.jsonl');
      const content = readFileSync(join(spotCheckDir, file), 'utf-8');
      const responses = content.split('\n')
        .filter(l => l.trim())
        .map(l => { try { return JSON.parse(l).response; } catch { return null; } })
        .filter((r): r is number => typeof r === 'number');
      
      const stats = calcStats(responses);
      console.log(`${name}: mean=${stats.mean.toFixed(2)}, std=${stats.std.toFixed(2)}, n=${stats.n}`);
      totalTrials += responses.length;
    }
  }
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`TOTAL TRIALS ANALYZED: ${totalTrials}`);
  console.log('='.repeat(70));
}

main();
