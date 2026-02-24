#!/usr/bin/env bun
/**
 * Multi-Vignette Analysis Script
 * 
 * Analyzes anchoring effects across all vignettes (salary, loan, medical).
 * Produces paper-ready statistics and tables.
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, basename } from 'path';

interface Trial {
  timestamp: string;
  model: string;
  vignette: string;
  technique: string;
  anchorType: string;
  anchor?: number;
  response: number | null;
  raw: string;
}

interface ConditionStats {
  vignette: string;
  model: string;
  technique: string;
  anchorType: string;
  anchor?: number;
  n: number;
  mean: number;
  std: number;
  min: number;
  max: number;
}

function loadResults(vignette: string): Trial[] {
  const dir = join(import.meta.dir, `../results/vignette-${vignette}`);
  if (!existsSync(dir)) return [];
  
  const trials: Trial[] = [];
  
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.jsonl')) continue;
    
    // Parse filename: technique-anchorType-model-t07.jsonl
    const parts = basename(file, '.jsonl').split('-');
    const technique = parts[0];
    const anchorType = parts[1]; // none, low, high
    const model = parts.slice(2, -1).join('-'); // claude-sonnet-4-5 or claude-opus-4-6
    
    const content = readFileSync(join(dir, file), 'utf-8');
    for (const line of content.split('\n').filter(l => l.trim())) {
      try {
        const data = JSON.parse(line);
        if (data.response !== null && typeof data.response === 'number') {
          trials.push({
            timestamp: data.timestamp,
            model: model.replace('claude-', ''),
            vignette,
            technique,
            anchorType,
            anchor: data.anchor,
            response: data.response,
            raw: data.raw || '',
          });
        }
      } catch {}
    }
  }
  
  return trials;
}

function calculateStats(values: number[]): { mean: number; std: number; min: number; max: number } {
  if (values.length === 0) return { mean: 0, std: 0, min: 0, max: 0 };
  
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const std = Math.sqrt(variance);
  
  return {
    mean,
    std,
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

function analyzeVignette(vignette: string): ConditionStats[] {
  const trials = loadResults(vignette);
  const stats: ConditionStats[] = [];
  
  // Group by model, technique, anchorType
  const groups = new Map<string, Trial[]>();
  for (const t of trials) {
    const key = `${t.model}|${t.technique}|${t.anchorType}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }
  
  for (const [key, groupTrials] of groups) {
    const [model, technique, anchorType] = key.split('|');
    const values = groupTrials.map(t => t.response!);
    const { mean, std, min, max } = calculateStats(values);
    
    stats.push({
      vignette,
      model,
      technique,
      anchorType,
      anchor: groupTrials[0]?.anchor,
      n: values.length,
      mean,
      std,
      min,
      max,
    });
  }
  
  return stats;
}

function printAnchoringEffects(stats: ConditionStats[], vignette: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`ANCHORING EFFECTS: ${vignette.toUpperCase()}`);
  console.log('='.repeat(60));
  
  const models = [...new Set(stats.map(s => s.model))].sort();
  
  for (const model of models) {
    const modelStats = stats.filter(s => s.model === model && s.technique === 'baseline');
    const baseline = modelStats.find(s => s.anchorType === 'none');
    const low = modelStats.find(s => s.anchorType === 'low');
    const high = modelStats.find(s => s.anchorType === 'high');
    
    console.log(`\n${model}:`);
    if (baseline) {
      console.log(`  Baseline (no anchor): ${baseline.mean.toFixed(1)} ± ${baseline.std.toFixed(1)} (n=${baseline.n})`);
    }
    if (low) {
      const effect = baseline ? (low.mean - baseline.mean).toFixed(1) : 'N/A';
      const pct = baseline ? ((low.mean - baseline.mean) / baseline.mean * 100).toFixed(1) : 'N/A';
      console.log(`  Low anchor (${low.anchor}): ${low.mean.toFixed(1)} ± ${low.std.toFixed(1)} (n=${low.n}) | Effect: ${effect} (${pct}%)`);
    }
    if (high) {
      const effect = baseline ? (high.mean - baseline.mean).toFixed(1) : 'N/A';
      const pct = baseline ? ((high.mean - baseline.mean) / baseline.mean * 100).toFixed(1) : 'N/A';
      console.log(`  High anchor (${high.anchor}): ${high.mean.toFixed(1)} ± ${high.std.toFixed(1)} (n=${high.n}) | Effect: ${effect} (${pct}%)`);
    }
  }
}

function printDebiasingSummary(stats: ConditionStats[], vignette: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`DEBIASING TECHNIQUES: ${vignette.toUpperCase()}`);
  console.log('='.repeat(60));
  
  const models = [...new Set(stats.map(s => s.model))].sort();
  const techniques = ['baseline', 'devils-advocate', 'premortem', 'sacd', 'random-control'];
  
  for (const model of models) {
    console.log(`\n${model}:`);
    
    // Get baseline for comparison
    const baselineNone = stats.find(s => s.model === model && s.technique === 'baseline' && s.anchorType === 'none');
    const baselineLow = stats.find(s => s.model === model && s.technique === 'baseline' && s.anchorType === 'low');
    const baselineHigh = stats.find(s => s.model === model && s.technique === 'baseline' && s.anchorType === 'high');
    
    console.log(`  ${'Technique'.padEnd(20)} | ${'Low'.padEnd(15)} | ${'High'.padEnd(15)} | Low Effect | High Effect`);
    console.log(`  ${'-'.repeat(80)}`);
    
    for (const tech of techniques) {
      const low = stats.find(s => s.model === model && s.technique === tech && s.anchorType === 'low');
      const high = stats.find(s => s.model === model && s.technique === tech && s.anchorType === 'high');
      
      const lowStr = low ? `${low.mean.toFixed(1)} (n=${low.n})` : 'N/A';
      const highStr = high ? `${high.mean.toFixed(1)} (n=${high.n})` : 'N/A';
      
      // Effect = how much did the technique move response toward baseline (less anchoring = positive)
      let lowEffect = 'N/A';
      let highEffect = 'N/A';
      
      if (low && baselineLow && baselineNone) {
        const originalBias = baselineLow.mean - baselineNone.mean;
        const newBias = low.mean - baselineNone.mean;
        const reduction = originalBias - newBias;
        lowEffect = `${reduction > 0 ? '+' : ''}${reduction.toFixed(1)}`;
      }
      
      if (high && baselineHigh && baselineNone) {
        const originalBias = baselineHigh.mean - baselineNone.mean;
        const newBias = high.mean - baselineNone.mean;
        const reduction = originalBias - newBias;
        highEffect = `${reduction > 0 ? '+' : ''}${reduction.toFixed(1)}`;
      }
      
      console.log(`  ${tech.padEnd(20)} | ${lowStr.padEnd(15)} | ${highStr.padEnd(15)} | ${lowEffect.padEnd(10)} | ${highEffect}`);
    }
  }
}

function main() {
  console.log('='.repeat(60));
  console.log('MULTI-VIGNETTE ANALYSIS');
  console.log('='.repeat(60));
  
  const vignettes = ['salary', 'loan', 'medical'];
  const allStats: ConditionStats[] = [];
  
  for (const vignette of vignettes) {
    const stats = analyzeVignette(vignette);
    allStats.push(...stats);
    
    console.log(`\n${vignette}: ${stats.length} conditions, ${stats.reduce((sum, s) => sum + s.n, 0)} trials`);
    
    printAnchoringEffects(stats, vignette);
    printDebiasingSummary(stats, vignette);
  }
  
  // Cross-vignette summary
  console.log('\n' + '='.repeat(60));
  console.log('CROSS-VIGNETTE SUMMARY');
  console.log('='.repeat(60));
  
  const models = [...new Set(allStats.map(s => s.model))].sort();
  
  for (const model of models) {
    console.log(`\n${model}:`);
    
    for (const vignette of vignettes) {
      const baseline = allStats.find(s => s.model === model && s.vignette === vignette && s.technique === 'baseline' && s.anchorType === 'none');
      const low = allStats.find(s => s.model === model && s.vignette === vignette && s.technique === 'baseline' && s.anchorType === 'low');
      const high = allStats.find(s => s.model === model && s.vignette === vignette && s.technique === 'baseline' && s.anchorType === 'high');
      
      if (baseline && low && high) {
        const lowEffect = ((low.mean - baseline.mean) / baseline.mean * 100).toFixed(1);
        const highEffect = ((high.mean - baseline.mean) / baseline.mean * 100).toFixed(1);
        console.log(`  ${vignette.padEnd(10)}: baseline=${baseline.mean.toFixed(1)}, low effect=${lowEffect}%, high effect=${highEffect}%`);
      }
    }
  }
  
  // Total trial count
  const totalTrials = allStats.reduce((sum, s) => sum + s.n, 0);
  console.log(`\nTotal trials analyzed: ${totalTrials}`);
}

main();
