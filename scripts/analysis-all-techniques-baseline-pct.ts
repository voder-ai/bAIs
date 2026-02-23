#!/usr/bin/env bun
/**
 * Analyze ALL techniques using % of baseline metric
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const RESULTS_DIR = './results';

// Model name normalization
function normalizeModel(model: string): string {
  return model
    .replace('anthropic/', '')
    .replace('openai/', '')
    .replace('deepseek/', '')
    .replace('moonshot/', '')
    .replace('zhipu/', '')
    .replace(/\./g, '-')
    .toLowerCase();
}

// Load baselines from analysis-data.json
interface BaselineEntry {
  model: string;
  temperature: number;
  n: number;
  mean: number;
}

const analysisData = JSON.parse(readFileSync(join(RESULTS_DIR, 'analysis-data.json'), 'utf-8'));
const baselineByModel = new Map<string, number>();

for (const b of analysisData.baselines as BaselineEntry[]) {
  const key = normalizeModel(b.model);
  if (!baselineByModel.has(key)) {
    baselineByModel.set(key, b.mean);
  } else {
    // Average across temperatures
    baselineByModel.set(key, (baselineByModel.get(key)! + b.mean) / 2);
  }
}

console.log('=== BASELINES ===');
for (const [model, baseline] of baselineByModel) {
  console.log(`${model}: ${baseline.toFixed(1)}mo`);
}

// Load all technique results from JSONL files
interface Trial {
  model: string;
  technique: string;
  anchor: number;
  sentenceMonths: number;
  temperature: number;
}

function loadTechniqueTrials(): Trial[] {
  const trials: Trial[] = [];
  const files = readdirSync(RESULTS_DIR).filter(f => 
    f.endsWith('.jsonl') && 
    (f.includes('devils-advocate') || f.includes('premortem') || f.includes('random-control') || f.includes('outside-view'))
  );
  
  for (const file of files) {
    try {
      const content = readFileSync(join(RESULTS_DIR, file), 'utf-8');
      const lines = content.trim().split('\n').filter(l => l);
      for (const line of lines) {
        const data = JSON.parse(line);
        if (typeof data.sentenceMonths === 'number') {
          trials.push({
            model: normalizeModel(data.model || data.actualModel),
            technique: data.technique || file.split('-')[0],
            anchor: data.anchor,
            sentenceMonths: data.sentenceMonths,
            temperature: data.temperature
          });
        }
      }
    } catch (e) {
      // Skip invalid files
    }
  }
  return trials;
}

// Also load SACD from the structured data
function loadSacdTrials(): Trial[] {
  const trials: Trial[] = [];
  for (const s of analysisData.sacd) {
    // Each entry represents n trials with that mean
    for (let i = 0; i < s.n; i++) {
      trials.push({
        model: normalizeModel(s.model),
        technique: 'full-sacd',
        anchor: s.anchor,
        sentenceMonths: s.debiasedMean,
        temperature: s.temperature
      });
    }
  }
  return trials;
}

// Main analysis
const techniqueTrials = loadTechniqueTrials();
const sacdTrials = loadSacdTrials();
const allTrials = [...techniqueTrials, ...sacdTrials];

console.log(`\nLoaded ${allTrials.length} technique trials`);

// Group by technique
const byTechnique = new Map<string, {pcts: number[], models: Set<string>}>();

for (const t of allTrials) {
  const baseline = baselineByModel.get(t.model);
  if (!baseline || baseline === 0) continue;
  
  const pct = (t.sentenceMonths / baseline) * 100;
  
  if (!byTechnique.has(t.technique)) {
    byTechnique.set(t.technique, {pcts: [], models: new Set()});
  }
  const d = byTechnique.get(t.technique)!;
  d.pcts.push(pct);
  d.models.add(t.model);
}

console.log('\n=== ALL TECHNIQUES (% of baseline) ===');
console.log('100% = at baseline (perfect). Lower deviation = better.\n');

interface TechResult {
  technique: string;
  n: number;
  meanPct: number;
  deviation: number;
  direction: string;
  models: number;
}

const results: TechResult[] = [];

for (const [technique, d] of byTechnique) {
  if (d.pcts.length < 10) continue; // Skip small samples
  
  const meanPct = d.pcts.reduce((a, b) => a + b, 0) / d.pcts.length;
  const deviation = Math.abs(meanPct - 100);
  
  results.push({
    technique,
    n: d.pcts.length,
    meanPct,
    deviation,
    direction: meanPct > 100 ? 'above' : 'below',
    models: d.models.size
  });
}

// Sort by deviation (best = lowest)
results.sort((a, b) => a.deviation - b.deviation);

console.table(results.map(r => ({
  technique: r.technique,
  n: r.n,
  models: r.models,
  'mean %': r.meanPct.toFixed(1) + '%',
  'deviation from 100%': r.deviation.toFixed(1) + '%',
  direction: r.direction
})));

// Model-specific breakdown for each technique
console.log('\n=== MODEL-SPECIFIC BREAKDOWN ===\n');

for (const technique of ['full-sacd', 'premortem', 'devils-advocate', 'random-control']) {
  const techTrials = allTrials.filter(t => t.technique === technique);
  if (techTrials.length === 0) continue;
  
  const byModel = new Map<string, number[]>();
  for (const t of techTrials) {
    const baseline = baselineByModel.get(t.model);
    if (!baseline) continue;
    const pct = (t.sentenceMonths / baseline) * 100;
    if (!byModel.has(t.model)) byModel.set(t.model, []);
    byModel.get(t.model)!.push(pct);
  }
  
  console.log(`${technique.toUpperCase()}:`);
  const modelResults = Array.from(byModel.entries())
    .map(([model, pcts]) => {
      const mean = pcts.reduce((a, b) => a + b, 0) / pcts.length;
      return { model, mean, deviation: Math.abs(mean - 100), n: pcts.length };
    })
    .sort((a, b) => a.deviation - b.deviation);
  
  for (const r of modelResults) {
    const dir = r.mean > 100 ? '↑' : r.mean < 100 ? '↓' : '=';
    console.log(`  ${r.model}: ${r.mean.toFixed(1)}% ${dir} (dev=${r.deviation.toFixed(1)}%, n=${r.n})`);
  }
  console.log('');
}

// Summary
console.log('=== SUMMARY ===\n');
console.log('Ranking by deviation from baseline (lower = better):');
for (let i = 0; i < results.length; i++) {
  const r = results[i];
  console.log(`${i + 1}. ${r.technique}: ${r.deviation.toFixed(1)}% deviation (${r.meanPct.toFixed(1)}% of baseline)`);
}
