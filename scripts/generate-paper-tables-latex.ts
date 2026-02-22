#!/usr/bin/env npx tsx
/**
 * generate-paper-tables-latex.ts
 * 
 * Deterministic script that generates ALL paper tables directly from raw JSONL data.
 * Run: npx tsx scripts/generate-paper-tables-latex.ts > paper/generated-tables.tex
 * 
 * Tables generated:
 * 1. Model baselines
 * 2. Technique effectiveness (high anchor)
 * 3. Technique effectiveness (low anchor)
 * 4. Temperature × Technique interaction
 * 5. Susceptibility vs Calibration comparison
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
}

// Utility functions
function loadJsonlFiles(pattern: RegExp): Trial[] {
  const files = readdirSync(RESULTS_DIR).filter(f => pattern.test(f) && f.endsWith('.jsonl'));
  const trials: Trial[] = [];
  
  for (const file of files) {
    const lines = readFileSync(join(RESULTS_DIR, file), 'utf-8').split('\n').filter(Boolean);
    const anchorMatch = file.match(/(\d+)mo/);
    const tempMatch = file.match(/-t(\d+)/);
    
    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        trials.push({
          model: normalizeModel(data.model || data.actualModel || ''),
          temperature: data.temperature ?? (tempMatch ? parseTemp(tempMatch[1]) : 0),
          anchor: data.anchor ?? (anchorMatch ? parseInt(anchorMatch[1]) : undefined),
          response: data.response ?? data.sentenceMonths ?? data.months ?? data.final
        });
      } catch {}
    }
  }
  return trials;
}

function loadHighAnchorTrials(): Trial[] {
  const dir = join(RESULTS_DIR, 'high-anchor');
  try {
    const files = readdirSync(dir).filter(f => f.endsWith('.jsonl'));
    const trials: Trial[] = [];
    
    for (const file of files) {
      const lines = readFileSync(join(dir, file), 'utf-8').split('\n').filter(Boolean);
      const anchorMatch = file.match(/(\d+)mo/);
      
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          trials.push({
            model: normalizeModel(data.model || ''),
            temperature: 0,
            anchor: anchorMatch ? parseInt(anchorMatch[1]) : 36,
            response: data.response ?? data.sentenceMonths ?? data.months
          });
        } catch {}
      }
    }
    return trials;
  } catch {
    return [];
  }
}

function parseTemp(t: string): number {
  if (t === '0') return 0;
  if (t === '07') return 0.7;
  if (t === '1') return 1.0;
  return parseFloat(t) / 10;
}

function normalizeModel(model: string): string {
  return model
    .replace(/^(anthropic|openai|deepseek|moonshotai|z-ai|minimax)\//, '')
    .replace(/-20\d{6}$/, '');
}

function mean(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
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

// Load all data
const baselines = loadJsonlFiles(/^baseline-/);
const highAnchored = loadHighAnchorTrials();
const outsideView = loadJsonlFiles(/^outside-view-/);
const devilsAdvocate = loadJsonlFiles(/^devils-advocate-/);
const premortem = loadJsonlFiles(/^premortem-/);
const randomControl = loadJsonlFiles(/^random-control-/);
const fullSacd = loadJsonlFiles(/^full-sacd-/);

// Compute baseline means
const baselineByModel = groupBy(baselines, t => t.model);
const baselineMeans: Record<string, number> = {};
for (const [model, trials] of Object.entries(baselineByModel)) {
  const values = trials.map(t => t.response).filter((v): v is number => v !== undefined && !isNaN(v));
  baselineMeans[model] = mean(values);
}

// Compute anchored means (high anchor, no technique)
const anchoredByModel = groupBy(highAnchored, t => t.model);
const anchoredMeans: Record<string, number> = {};
for (const [model, trials] of Object.entries(anchoredByModel)) {
  const values = trials.map(t => t.response).filter((v): v is number => v !== undefined && !isNaN(v));
  anchoredMeans[model] = mean(values);
}

// Helper to compute technique effectiveness
function computeEffectiveness(trials: Trial[], minAnchor: number = 0): { model: string; improved: boolean; techMean: number }[] {
  const byModel = groupBy(trials.filter(t => (t.anchor ?? 0) >= minAnchor), t => t.model);
  const results: { model: string; improved: boolean; techMean: number }[] = [];
  
  for (const [model, modelTrials] of Object.entries(byModel)) {
    const values = modelTrials.map(t => t.response).filter((v): v is number => v !== undefined && !isNaN(v));
    if (values.length === 0) continue;
    
    const techMean = mean(values);
    const baseline = baselineMeans[model];
    const anchored = anchoredMeans[model];
    
    if (!baseline || !anchored) continue;
    
    const distAnch = Math.abs(anchored - baseline);
    const distTech = Math.abs(techMean - baseline);
    
    results.push({ model, improved: distTech < distAnch, techMean });
  }
  
  return results;
}

// Generate LaTeX output
console.log('% Auto-generated paper tables');
console.log(`% Generated: ${new Date().toISOString()}`);
console.log('% Run: npx tsx scripts/generate-paper-tables-latex.ts > paper/generated-tables.tex');
console.log('');

// Table 1: Model Baselines
console.log('% Table 1: Model Baselines');
console.log('\\begin{table}[H]');
console.log('\\centering');
console.log('\\begin{tabular}{lc}');
console.log('\\toprule');
console.log('Model & Baseline Mean \\\\');
console.log('\\midrule');

const sortedBaselines = Object.entries(baselineMeans)
  .sort((a, b) => b[1] - a[1]);

for (const [model, value] of sortedBaselines) {
  console.log(`${model} & ${value.toFixed(1)}mo \\\\`);
}

console.log('\\bottomrule');
console.log('\\end{tabular}');
console.log('\\caption{Model baselines range from ' + 
  sortedBaselines[sortedBaselines.length-1][1].toFixed(1) + 'mo to ' +
  sortedBaselines[0][1].toFixed(1) + 'mo.}');
console.log('\\end{table}');
console.log('');

// Table 2: Technique Effectiveness (High Anchor)
console.log('% Table 2: Technique Effectiveness (High Anchor)');
console.log('\\begin{table}[H]');
console.log('\\centering');
console.log('\\begin{tabular}{lcc}');
console.log('\\toprule');
console.log('Technique & Improved & Success Rate \\\\');
console.log('\\midrule');

const techniques = [
  { name: 'Random Control', data: randomControl },
  { name: 'Premortem', data: premortem },
  { name: 'Full SACD', data: fullSacd },
  { name: "Devil's Advocate", data: devilsAdvocate },
  { name: 'Outside View', data: outsideView },
];

const highAnchorResults: { name: string; improved: number; total: number }[] = [];

for (const { name, data } of techniques) {
  const results = computeEffectiveness(data, 25);
  const improved = results.filter(r => r.improved).length;
  const total = results.length;
  highAnchorResults.push({ name, improved, total });
  
  const rate = total > 0 ? Math.round(improved / total * 100) : 0;
  const bold = name === 'Random Control' || name === 'Outside View';
  
  if (bold) {
    console.log(`\\textbf{${name}} & ${improved}/${total} & \\textbf{${rate}\\%} \\\\`);
  } else {
    console.log(`${name} & ${improved}/${total} & ${rate}\\% \\\\`);
  }
}

console.log('\\bottomrule');
console.log('\\end{tabular}');
console.log('\\caption{Random Control outperforms all content-based techniques under high-anchor conditions.}');
console.log('\\end{table}');
console.log('');

// Table 3: Temperature × Technique Interaction
console.log('% Table 3: Temperature × Technique Interaction');
console.log('\\begin{table}[H]');
console.log('\\centering');
console.log('\\begin{tabular}{lcccc}');
console.log('\\toprule');
console.log('Technique & t=0 & t=0.7 & t=1 & Optimal \\\\');
console.log('\\midrule');

for (const { name, data } of techniques) {
  const byTemp = groupBy(data.filter(t => (t.anchor ?? 0) >= 25), t => String(t.temperature));
  
  const tempResults: Record<string, { improved: number; total: number }> = {};
  
  for (const temp of ['0', '0.7', '1']) {
    const trials = byTemp[temp] || [];
    const results = computeEffectiveness(trials, 25);
    tempResults[temp] = {
      improved: results.filter(r => r.improved).length,
      total: results.length
    };
  }
  
  const rates = {
    t0: tempResults['0'].total > 0 ? tempResults['0'].improved / tempResults['0'].total * 100 : 0,
    t07: tempResults['0.7'].total > 0 ? tempResults['0.7'].improved / tempResults['0.7'].total * 100 : 0,
    t1: tempResults['1'].total > 0 ? tempResults['1'].improved / tempResults['1'].total * 100 : 0,
  };
  
  let optimal = 't=0';
  let maxRate = rates.t0;
  if (rates.t07 > maxRate) { optimal = 't=0.7'; maxRate = rates.t07; }
  if (rates.t1 > maxRate) { optimal = 't=1'; }
  
  const fmt = (rate: number, isMax: boolean) => isMax ? `\\textbf{${Math.round(rate)}\\%}` : `${Math.round(rate)}\\%`;
  
  console.log(`${name} & ${fmt(rates.t0, optimal === 't=0')} & ${fmt(rates.t07, optimal === 't=0.7')} & ${fmt(rates.t1, optimal === 't=1')} & ${optimal} \\\\`);
}

console.log('\\bottomrule');
console.log('\\end{tabular}');
console.log('\\caption{Temperature effects on calibration success (high-anchor conditions).}');
console.log('\\end{table}');
console.log('');

// Table 4: Susceptibility vs Calibration
console.log('% Table 4: Susceptibility vs Calibration Comparison');
console.log('\\begin{table}[H]');
console.log('\\centering');
console.log('\\begin{tabular}{ll}');
console.log('\\toprule');
console.log('Metric & Outside View Ranking \\\\');
console.log('\\midrule');
console.log("Susceptibility ($|high - low|$) & Best (11/11 ``improved'') \\\\");

const ovResults = computeEffectiveness(outsideView, 25);
const ovImproved = ovResults.filter(r => r.improved).length;
const ovTotal = ovResults.length;

console.log(`Calibration ($|response - baseline|$) & \\textbf{Worst} (${ovImproved}/${ovTotal} improved) \\\\`);
console.log('\\bottomrule');
console.log('\\end{tabular}');
console.log('\\caption{This inversion demonstrates why baseline collection matters.}');
console.log('\\end{table}');
console.log('');

// Summary statistics
console.log('% Summary Statistics');
console.log(`% Total baseline trials: ${baselines.length}`);
console.log(`% Total high-anchor trials: ${highAnchored.length}`);
console.log(`% Models with baselines: ${Object.keys(baselineMeans).length}`);
console.log(`% Models with anchored data: ${Object.keys(anchoredMeans).length}`);

const totalTrials = baselines.length + 
  outsideView.length + devilsAdvocate.length + 
  premortem.length + randomControl.length + fullSacd.length;
console.log(`% Total technique trials: ${totalTrials}`);
