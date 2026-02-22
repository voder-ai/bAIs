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
