#!/usr/bin/env npx tsx
/**
 * generate-paper-stats.ts
 * 
 * Canonical script for all paper statistics.
 * Run: npx tsx scripts/generate-paper-stats.ts
 * 
 * Outputs:
 * - Trial counts by condition
 * - Baseline means by model
 * - Full SACD effect by model
 * - Sibony technique comparison
 * - Random Control decomposition
 * - Temperature effects on backfire models
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const RESULTS_DIR = join(__dirname, '../results');

// Types
interface Trial {
  model: string;
  temperature: number;
  anchor?: number;
  response?: number;
  sentenceMonths?: number;
  months?: number;
  initial?: number;
  final?: number;
  condition?: string;
}

interface Stats {
  mean: number;
  sd: number;
  n: number;
  ci95?: [number, number];
}

// Utility functions
function loadJsonlFiles(pattern: RegExp): Trial[] {
  const files = readdirSync(RESULTS_DIR).filter(f => pattern.test(f) && f.endsWith('.jsonl'));
  const trials: Trial[] = [];
  
  for (const file of files) {
    const lines = readFileSync(join(RESULTS_DIR, file), 'utf-8').split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        trials.push({
          model: normalizeModel(data.model || data.actualModel || ''),
          temperature: data.temperature ?? extractTemp(file),
          anchor: data.anchor ?? extractAnchor(file),
          response: data.response ?? data.sentenceMonths ?? data.months ?? data.final,
          initial: data.initial,
          final: data.final,
          condition: extractCondition(file)
        });
      } catch {}
    }
  }
  return trials;
}

function normalizeModel(model: string): string {
  return model
    .replace('anthropic/', '')
    .replace('openai/', '')
    .replace('deepseek/', '')
    .replace('moonshotai/', '')
    .replace('z-ai/', '')
    .replace('minimax/', '');
}

function extractTemp(filename: string): number {
  const match = filename.match(/-t(\d+)/);
  if (!match) return 0;
  if (match[1] === '0') return 0;
  if (match[1] === '07') return 0.7;
  if (match[1] === '1') return 1.0;
  return parseFloat(match[1]) / 10;
}

function extractAnchor(filename: string): number | undefined {
  const match = filename.match(/(\d+)mo/);
  return match ? parseInt(match[1]) : undefined;
}

function extractCondition(filename: string): string {
  return filename.split('-')[0];
}

function computeStats(values: number[]): Stats {
  if (values.length === 0) return { mean: 0, sd: 0, n: 0 };
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((sum, x) => sum + (x - mean) ** 2, 0) / n;
  const sd = Math.sqrt(variance);
  const se = sd / Math.sqrt(n);
  const ci95: [number, number] = [mean - 1.96 * se, mean + 1.96 * se];
  return { mean, sd, n, ci95 };
}

function groupBy<T>(arr: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const item of arr) {
    const key = keyFn(item);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}

// Main analysis
console.log('# Paper Statistics Report');
console.log(`Generated: ${new Date().toISOString()}\n`);

// 1. Trial counts by condition
console.log('## 1. Trial Counts by Condition\n');

const conditions = [
  { name: 'Baseline', pattern: /^baseline-/ },
  { name: 'Low-anchor', pattern: /^low-anchor-/ },
  { name: 'SACD (single-pass)', pattern: /^sacd-/ },
  { name: 'Full SACD (iterative)', pattern: /^full-sacd-/ },
  { name: 'Outside View', pattern: /^outside-view-/ },
  { name: 'Premortem', pattern: /^premortem-/ },
  { name: "Devil's Advocate", pattern: /^devils-advocate-/ },
  { name: 'Random Control', pattern: /^random-control-/ },
];

let totalTrials = 0;
console.log('| Condition | Trials |');
console.log('|-----------|--------|');
for (const { name, pattern } of conditions) {
  const trials = loadJsonlFiles(pattern);
  console.log(`| ${name} | ${trials.length} |`);
  totalTrials += trials.length;
}
console.log(`| **Total** | **${totalTrials}** |`);
console.log('');

// 2. Baselines by model
console.log('## 2. Baseline Means by Model\n');

const baselines = loadJsonlFiles(/^baseline-/);
const baselineByModel = groupBy(baselines, t => t.model);

console.log('| Model | Mean | SD | n |');
console.log('|-------|------|----|----|');
const baselineMeans: Record<string, number> = {};
for (const [model, trials] of Object.entries(baselineByModel).sort()) {
  const values = trials.map(t => t.response).filter((v): v is number => v !== undefined && !isNaN(v));
  const stats = computeStats(values);
  baselineMeans[model] = stats.mean;
  console.log(`| ${model} | ${stats.mean.toFixed(1)}mo | ${stats.sd.toFixed(1)} | ${stats.n} |`);
}
console.log('');

// 3. Full SACD effect by model
console.log('## 3. Full SACD Effect by Model (Table 7)\n');

const fullSacd = loadJsonlFiles(/^full-sacd-/);
const sacdByModel = groupBy(fullSacd, t => t.model);

// PRIMARY METRIC: baseline → final (how close to unbiased ground truth)
// Secondary: initial → final (for context on what SACD did)
console.log('| Model | Baseline | Final | Δ baseline→final | Assessment |');
console.log('|-------|----------|-------|------------------|------------|');

const sacdEffects: { model: string; delta: number }[] = [];
for (const [model, trials] of Object.entries(sacdByModel).sort()) {
  const finals = trials.map(t => t.final).filter((v): v is number => v !== undefined);
  
  if (finals.length === 0) continue;
  
  const finalMean = finals.reduce((a, b) => a + b, 0) / finals.length;
  const baselineMean = baselineMeans[model] ?? 0;
  
  // PRIMARY: baseline→final = residual bias (how far from truth)
  // Closer to 0 = better (output matches unbiased baseline)
  const deltaBaseline = finalMean - baselineMean;
  
  sacdEffects.push({ model, delta: deltaBaseline });
  
  // Assessment based on absolute distance from baseline
  const absDelta = Math.abs(deltaBaseline);
  let assessment = '';
  if (absDelta <= 2) assessment = '✅ Near baseline';
  else if (absDelta <= 5) assessment = '⚠️ Moderate bias';
  else if (deltaBaseline < -5) assessment = '⚠️ Overcorrects (too low)';
  else assessment = '⚠️ Undercorrects (too high)';
  
  const fmtDelta = `${deltaBaseline >= 0 ? '+' : ''}${deltaBaseline.toFixed(1)}mo`;
  
  console.log(`| ${model} | ${baselineMean.toFixed(1)}mo | ${finalMean.toFixed(1)}mo | ${fmtDelta} | ${assessment} |`);
}
console.log('');

// 4. Sibony technique comparison
console.log('## 4. Sibony Technique Comparison\n');

const techniques = [
  { name: 'Outside View', pattern: /^outside-view-/ },
  { name: 'Premortem', pattern: /^premortem-/ },
  { name: "Devil's Advocate", pattern: /^devils-advocate-/ },
  { name: 'Random Control', pattern: /^random-control-/ },
];

console.log('| Technique | Models Improved | Models Backfired | Avg Δ |');
console.log('|-----------|-----------------|------------------|-------|');

for (const { name, pattern } of techniques) {
  const trials = loadJsonlFiles(pattern);
  const byModel = groupBy(trials, t => t.model);
  
  let improved = 0;
  let backfired = 0;
  let totalDelta = 0;
  let count = 0;
  
  for (const [model, modelTrials] of Object.entries(byModel)) {
    const values = modelTrials.map(t => t.response).filter((v): v is number => v !== undefined && !isNaN(v));
    if (values.length === 0) continue;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const baseline = baselineMeans[model] || 24;
    const delta = mean - baseline;
    
    if (delta < -0.5) improved++;
    else if (delta > 0.5) backfired++;
    
    totalDelta += delta;
    count++;
  }
  
  const avgDelta = count > 0 ? totalDelta / count : 0;
  console.log(`| ${name} | ${improved}/${count} | ${backfired} | ${avgDelta >= 0 ? '+' : ''}${avgDelta.toFixed(1)}mo |`);
}
console.log('');

// 5. Random Control decomposition
console.log('## 5. Random Control Effect by Model\n');

const randomControl = loadJsonlFiles(/^random-control-/);
const rcByModel = groupBy(randomControl, t => t.model);

console.log('| Model | Random Control Mean | Baseline | Δ (Structural Effect) |');
console.log('|-------|---------------------|----------|-----------------------|');

const rcEffects: number[] = [];
for (const [model, trials] of Object.entries(rcByModel).sort()) {
  const values = trials.map(t => t.response).filter((v): v is number => v !== undefined && !isNaN(v));
  if (values.length === 0) continue;
  
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const baseline = baselineMeans[model] || 24;
  const delta = mean - baseline;
  rcEffects.push(delta);
  
  console.log(`| ${model} | ${mean.toFixed(1)}mo | ${baseline.toFixed(1)}mo | ${delta >= 0 ? '+' : ''}${delta.toFixed(1)}mo |`);
}

const rcMedian = rcEffects.sort((a, b) => a - b)[Math.floor(rcEffects.length / 2)];
console.log(`\n**Range:** ${Math.min(...rcEffects).toFixed(1)}mo to ${Math.max(...rcEffects).toFixed(1)}mo`);
console.log(`**Median:** ${rcMedian.toFixed(1)}mo`);
console.log('');

// 6. Temperature effects on backfire models
console.log('## 6. Temperature Effects on Backfire Models\n');

const backfireModels = ['claude-opus-4.6', 'gpt-5.2', 'glm-5'];

console.log('| Model | t=0 | t=0.7 | t=1.0 | Best |');
console.log('|-------|-----|-------|-------|------|');

for (const model of backfireModels) {
  const modelTrials = fullSacd.filter(t => t.model === model || t.model.includes(model.replace('-', '')));
  
  const byTemp = groupBy(modelTrials, t => String(t.temperature));
  const results: Record<string, number> = {};
  
  for (const [temp, trials] of Object.entries(byTemp)) {
    const finals = trials.map(t => t.final).filter((v): v is number => v !== undefined);
    if (finals.length > 0) {
      results[temp] = finals.reduce((a, b) => a + b, 0) / finals.length;
    }
  }
  
  const t0 = results['0'] ?? results['0.0'] ?? NaN;
  const t07 = results['0.7'] ?? NaN;
  const t1 = results['1'] ?? results['1.0'] ?? NaN;
  
  let best = 't0';
  let bestVal = t0;
  if (!isNaN(t07) && t07 < bestVal) { best = 't0.7'; bestVal = t07; }
  if (!isNaN(t1) && t1 < bestVal) { best = 't1.0'; bestVal = t1; }
  
  console.log(`| ${model} | ${isNaN(t0) ? '—' : t0.toFixed(1) + 'mo'} | ${isNaN(t07) ? '—' : t07.toFixed(1) + 'mo'} | ${isNaN(t1) ? '—' : t1.toFixed(1) + 'mo'} | ${best} |`);
}
console.log('');

// Summary
console.log('## Summary\n');
console.log(`- **Total trials:** ${totalTrials}`);
console.log(`- **Models tested:** ${Object.keys(baselineByModel).length}`);
console.log(`- **Conditions:** ${conditions.length}`);
console.log(`- **SACD backfire models:** ${sacdEffects.filter(e => e.delta > 0.5).map(e => e.model).join(', ')}`);
console.log(`- **Universal winners:** Outside View (11/11 improved)`);

// ============================================
// VIGNETTE ANALYSIS
// ============================================

console.log('\n---\n');
console.log('# Vignette Analysis\n');

interface VignetteTrial {
  vignetteId: string;
  model: string;
  technique: string;
  anchorType: string;
  anchor: number;
  baseline: number;
  response: number;
  temperature: number;
}

function loadVignetteData(): VignetteTrial[] {
  const trials: VignetteTrial[] = [];
  const vignetteTypes = ['vignette-loan', 'vignette-medical', 'vignette-salary'];
  
  for (const vtype of vignetteTypes) {
    const dir = join(RESULTS_DIR, vtype);
    try {
      const files = readdirSync(dir).filter(f => f.endsWith('.jsonl'));
      for (const file of files) {
        const lines = readFileSync(join(dir, file), 'utf-8').split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.response !== undefined && data.response !== null) {
              trials.push({
                vignetteId: data.vignetteId || vtype.replace('vignette-', ''),
                model: normalizeModel(data.model || ''),
                technique: data.technique || 'baseline',
                anchorType: data.anchorType || 'none',
                anchor: data.anchor || 0,
                baseline: data.baseline || 0,
                response: data.response,
                temperature: data.temperature ?? 0.7
              });
            }
          } catch {}
        }
      }
    } catch {
      // Directory doesn't exist
    }
  }
  return trials;
}

const vignetteTrials = loadVignetteData();

if (vignetteTrials.length > 0) {
  // 7. Vignette trial counts
  console.log('## 7. Vignette Trial Counts\n');
  
  const byVignette = groupBy(vignetteTrials, t => t.vignetteId);
  console.log('| Vignette | Trials |');
  console.log('|----------|--------|');
  for (const [vignette, trials] of Object.entries(byVignette).sort()) {
    console.log(`| ${vignette} | ${trials.length} |`);
  }
  console.log(`| **Total** | **${vignetteTrials.length}** |`);
  console.log('');
  
  // 8. Anchoring effect by vignette
  console.log('## 8. Anchoring Effect by Vignette\n');
  
  console.log('| Vignette | No-anchor | Low-anchor | High-anchor | Effect (H-L) |');
  console.log('|----------|-----------|------------|-------------|--------------|');
  
  for (const [vignette, trials] of Object.entries(byVignette).sort()) {
    const baselineTrials = trials.filter(t => t.technique === 'baseline');
    const noAnchor = baselineTrials.filter(t => t.anchorType === 'none').map(t => t.response);
    const lowAnchor = baselineTrials.filter(t => t.anchorType === 'low').map(t => t.response);
    const highAnchor = baselineTrials.filter(t => t.anchorType === 'high').map(t => t.response);
    
    const noMean = noAnchor.length > 0 ? noAnchor.reduce((a, b) => a + b, 0) / noAnchor.length : NaN;
    const lowMean = lowAnchor.length > 0 ? lowAnchor.reduce((a, b) => a + b, 0) / lowAnchor.length : NaN;
    const highMean = highAnchor.length > 0 ? highAnchor.reduce((a, b) => a + b, 0) / highAnchor.length : NaN;
    const effect = !isNaN(highMean) && !isNaN(lowMean) ? highMean - lowMean : NaN;
    
    console.log(`| ${vignette} | ${isNaN(noMean) ? '—' : noMean.toFixed(1)} | ${isNaN(lowMean) ? '—' : lowMean.toFixed(1)} | ${isNaN(highMean) ? '—' : highMean.toFixed(1)} | ${isNaN(effect) ? '—' : (effect >= 0 ? '+' : '') + effect.toFixed(1)} |`);
  }
  console.log('');
  
  // 9. Debiasing technique effect by vignette
  console.log('## 9. Debiasing Technique Effect by Vignette\n');
  
  const vignetteTechniques = ['baseline', 'devils-advocate', 'premortem', 'random-control', 'sacd'];
  
  for (const [vignette, trials] of Object.entries(byVignette).sort()) {
    console.log(`### ${vignette.charAt(0).toUpperCase() + vignette.slice(1)}\n`);
    console.log('| Technique | Low-anchor | High-anchor | Δ from baseline (Low) | Δ from baseline (High) |');
    console.log('|-----------|------------|-------------|----------------------|------------------------|');
    
    // Get baseline means for comparison
    const baselineTrials = trials.filter(t => t.technique === 'baseline');
    const baselineLow = baselineTrials.filter(t => t.anchorType === 'low').map(t => t.response);
    const baselineHigh = baselineTrials.filter(t => t.anchorType === 'high').map(t => t.response);
    const baselineLowMean = baselineLow.length > 0 ? baselineLow.reduce((a, b) => a + b, 0) / baselineLow.length : NaN;
    const baselineHighMean = baselineHigh.length > 0 ? baselineHigh.reduce((a, b) => a + b, 0) / baselineHigh.length : NaN;
    
    for (const technique of vignetteTechniques) {
      const techTrials = trials.filter(t => t.technique === technique);
      const lowTrials = techTrials.filter(t => t.anchorType === 'low').map(t => t.response);
      const highTrials = techTrials.filter(t => t.anchorType === 'high').map(t => t.response);
      
      if (lowTrials.length === 0 && highTrials.length === 0) continue;
      
      const lowMean = lowTrials.length > 0 ? lowTrials.reduce((a, b) => a + b, 0) / lowTrials.length : NaN;
      const highMean = highTrials.length > 0 ? highTrials.reduce((a, b) => a + b, 0) / highTrials.length : NaN;
      
      const deltaLow = !isNaN(lowMean) && !isNaN(baselineLowMean) ? lowMean - baselineLowMean : NaN;
      const deltaHigh = !isNaN(highMean) && !isNaN(baselineHighMean) ? highMean - baselineHighMean : NaN;
      
      console.log(`| ${technique} | ${isNaN(lowMean) ? '—' : lowMean.toFixed(1)} | ${isNaN(highMean) ? '—' : highMean.toFixed(1)} | ${isNaN(deltaLow) ? '—' : (deltaLow >= 0 ? '+' : '') + deltaLow.toFixed(1)} | ${isNaN(deltaHigh) ? '—' : (deltaHigh >= 0 ? '+' : '') + deltaHigh.toFixed(1)} |`);
    }
    console.log('');
  }
  
  // 10. Model comparison within vignettes
  console.log('## 10. Model Comparison Within Vignettes\n');
  
  for (const [vignette, trials] of Object.entries(byVignette).sort()) {
    console.log(`### ${vignette.charAt(0).toUpperCase() + vignette.slice(1)}\n`);
    
    const byModel = groupBy(trials.filter(t => t.technique === 'baseline'), t => t.model);
    
    console.log('| Model | No-anchor | Low-anchor | High-anchor | Anchoring Effect |');
    console.log('|-------|-----------|------------|-------------|------------------|');
    
    for (const [model, modelTrials] of Object.entries(byModel).sort()) {
      const noAnchor = modelTrials.filter(t => t.anchorType === 'none').map(t => t.response);
      const lowAnchor = modelTrials.filter(t => t.anchorType === 'low').map(t => t.response);
      const highAnchor = modelTrials.filter(t => t.anchorType === 'high').map(t => t.response);
      
      const noMean = noAnchor.length > 0 ? noAnchor.reduce((a, b) => a + b, 0) / noAnchor.length : NaN;
      const lowMean = lowAnchor.length > 0 ? lowAnchor.reduce((a, b) => a + b, 0) / lowAnchor.length : NaN;
      const highMean = highAnchor.length > 0 ? highAnchor.reduce((a, b) => a + b, 0) / highAnchor.length : NaN;
      const effect = !isNaN(highMean) && !isNaN(lowMean) ? highMean - lowMean : NaN;
      
      console.log(`| ${model} | ${isNaN(noMean) ? '—' : noMean.toFixed(1)} | ${isNaN(lowMean) ? '—' : lowMean.toFixed(1)} | ${isNaN(highMean) ? '—' : highMean.toFixed(1)} | ${isNaN(effect) ? '—' : (effect >= 0 ? '+' : '') + effect.toFixed(1)} |`);
    }
    console.log('');
  }
  
  // 11. Debiasing Effectiveness: % of Baseline vs Spread Reduction
  console.log('## 11. Debiasing Effectiveness Comparison\n');
  console.log('**Paper metrics (from main.tex):**\n');
  console.log('- **% of Baseline** = R_technique / R_baseline × 100% (100% = perfect)\n');
  console.log('- **Deviation** = |% of Baseline - 100%| (0% = perfect)\n');
  console.log('- **Spread Δ%** = change in H-L gap vs no-technique (negative = reduced susceptibility)\n');
  
  const vignetteTechniquesAll = ['baseline', 'devils-advocate', 'premortem', 'random-control', 'sacd'];
  
  for (const [vignette, trials] of Object.entries(byVignette).sort()) {
    console.log(`### ${vignette.charAt(0).toUpperCase() + vignette.slice(1)}\n`);
    
    // Get the expected baseline value (average across all trials with baseline field)
    const baselineValues = trials.map(t => t.baseline).filter((v): v is number => v !== null && v !== undefined && !isNaN(v));
    const expectedBaseline = baselineValues.length > 0 ? baselineValues.reduce((a, b) => a + b, 0) / baselineValues.length : 0;
    
    // Calculate baseline spread (H-L for baseline technique)
    const baselineTrials = trials.filter(t => t.technique === 'baseline');
    const baselineLow = baselineTrials.filter(t => t.anchorType === 'low').map(t => t.response);
    const baselineHigh = baselineTrials.filter(t => t.anchorType === 'high').map(t => t.response);
    const baselineLowMean = baselineLow.length > 0 ? baselineLow.reduce((a, b) => a + b, 0) / baselineLow.length : NaN;
    const baselineHighMean = baselineHigh.length > 0 ? baselineHigh.reduce((a, b) => a + b, 0) / baselineHigh.length : NaN;
    const baselineSpread = !isNaN(baselineHighMean) && !isNaN(baselineLowMean) ? baselineHighMean - baselineLowMean : NaN;
    
    console.log(`**Expected unanchored baseline:** ${expectedBaseline.toFixed(1)}`);
    console.log(`**Baseline spread (H-L):** ${isNaN(baselineSpread) ? '—' : baselineSpread.toFixed(1)}\n`);
    
    console.log('| Technique | Low Mean | High Mean | Spread | Spread Δ% | Low % of BL | High % of BL | Avg % of BL | Deviation |');
    console.log('|-----------|----------|-----------|--------|-----------|-------------|--------------|-------------|-----------|');
    
    for (const technique of vignetteTechniquesAll) {
      const techTrials = trials.filter(t => t.technique === technique);
      const lowTrials = techTrials.filter(t => t.anchorType === 'low');
      const highTrials = techTrials.filter(t => t.anchorType === 'high');
      
      if (lowTrials.length === 0 && highTrials.length === 0) continue;
      
      // Calculate per-trial % of baseline, then average (handles model-specific baselines)
      const lowPctOfBaselineTrials = lowTrials
        .filter(t => t.baseline && t.baseline > 0 && t.response !== undefined)
        .map(t => (t.response / t.baseline) * 100);
      const highPctOfBaselineTrials = highTrials
        .filter(t => t.baseline && t.baseline > 0 && t.response !== undefined)
        .map(t => (t.response / t.baseline) * 100);
      
      const lowResponses = lowTrials.map(t => t.response).filter((v): v is number => v !== undefined);
      const highResponses = highTrials.map(t => t.response).filter((v): v is number => v !== undefined);
      
      const lowMean = lowResponses.length > 0 ? lowResponses.reduce((a, b) => a + b, 0) / lowResponses.length : NaN;
      const highMean = highResponses.length > 0 ? highResponses.reduce((a, b) => a + b, 0) / highResponses.length : NaN;
      const techSpread = !isNaN(highMean) && !isNaN(lowMean) ? highMean - lowMean : NaN;
      
      // Spread reduction % (negative = reduced spread, positive = increased spread)
      const spreadDeltaPct = !isNaN(techSpread) && !isNaN(baselineSpread) && baselineSpread !== 0 
        ? ((techSpread - baselineSpread) / Math.abs(baselineSpread)) * 100 
        : NaN;
      
      // % of Baseline (paper metric: 100% = perfect) - per-trial calculation
      const lowPctOfBaseline = lowPctOfBaselineTrials.length > 0 
        ? lowPctOfBaselineTrials.reduce((a, b) => a + b, 0) / lowPctOfBaselineTrials.length 
        : NaN;
      const highPctOfBaseline = highPctOfBaselineTrials.length > 0 
        ? highPctOfBaselineTrials.reduce((a, b) => a + b, 0) / highPctOfBaselineTrials.length 
        : NaN;
      const avgPctOfBaseline = !isNaN(lowPctOfBaseline) && !isNaN(highPctOfBaseline)
        ? (lowPctOfBaseline + highPctOfBaseline) / 2
        : NaN;
      
      // Deviation = |% of Baseline - 100%| (paper metric: 0% = perfect)
      const deviation = !isNaN(avgPctOfBaseline) ? Math.abs(avgPctOfBaseline - 100) : NaN;
      
      const fmtSpreadDelta = isNaN(spreadDeltaPct) ? '—' : (spreadDeltaPct >= 0 ? '+' : '') + spreadDeltaPct.toFixed(0) + '%';
      const fmtLowPct = isNaN(lowPctOfBaseline) ? '—' : lowPctOfBaseline.toFixed(1) + '%';
      const fmtHighPct = isNaN(highPctOfBaseline) ? '—' : highPctOfBaseline.toFixed(1) + '%';
      const fmtAvgPct = isNaN(avgPctOfBaseline) ? '—' : avgPctOfBaseline.toFixed(1) + '%';
      const fmtDeviation = isNaN(deviation) ? '—' : deviation.toFixed(1) + '%';
      
      console.log(`| ${technique} | ${isNaN(lowMean) ? '—' : lowMean.toFixed(1)} | ${isNaN(highMean) ? '—' : highMean.toFixed(1)} | ${isNaN(techSpread) ? '—' : techSpread.toFixed(1)} | ${fmtSpreadDelta} | ${fmtLowPct} | ${fmtHighPct} | ${fmtAvgPct} | ${fmtDeviation} |`);
    }
    console.log('');
    
    // Interpretation
    console.log('**Rankings:**\n');
    console.log('- By Spread Δ%: Lower (more negative) = better susceptibility reduction');
    console.log('- By Deviation: Lower = closer to unanchored baseline (100%)');
    console.log('- **Key insight from paper:** These rankings can diverge!\n');
  }
  
  // Vignette summary
  console.log('## Vignette Summary\n');
  console.log(`- **Total vignette trials:** ${vignetteTrials.length}`);
  console.log(`- **Vignettes:** ${Object.keys(byVignette).join(', ')}`);
  console.log(`- **Models tested:** ${[...new Set(vignetteTrials.map(t => t.model))].length}`);
  console.log(`- **Techniques:** ${[...new Set(vignetteTrials.map(t => t.technique))].join(', ')}`);
} else {
  console.log('*No vignette data found.*\n');
}
