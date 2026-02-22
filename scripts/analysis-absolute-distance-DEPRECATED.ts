#!/usr/bin/env npx tsx
/**
 * analysis-absolute-distance.ts
 * 
 * Correct methodology: Measures whether techniques bring responses
 * CLOSER to the unbiased baseline, not just whether they move in some direction.
 * 
 * Key insight: A technique that moves from 36mo → 15mo when baseline is 29mo
 * has INCREASED distance from truth (7mo → 14mo), even though it "reduced" the estimate.
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const RESULTS_DIR = join(__dirname, '../results');

interface Trial {
  model: string;
  temperature: number;
  anchor?: number;
  response?: number;
}

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
          temperature: data.temperature ?? 0,
          anchor: data.anchor,
          response: data.response ?? data.sentenceMonths ?? data.months ?? data.final
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

function groupBy<T>(arr: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const item of arr) {
    const key = keyFn(item);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}

function mean(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

// Load all data
const baselines = loadJsonlFiles(/^baseline-/);
const highAnchors = loadJsonlFiles(/36mo|high-anchor/); // High anchor condition
const outsideView = loadJsonlFiles(/^outside-view-/);
const premortem = loadJsonlFiles(/^premortem-/);
const devilsAdvocate = loadJsonlFiles(/^devils-advocate-/);
const randomControl = loadJsonlFiles(/^random-control-/);

// Compute baseline means per model
const baselineByModel = groupBy(baselines, t => t.model);
const baselineMeans: Record<string, number> = {};
for (const [model, trials] of Object.entries(baselineByModel)) {
  const values = trials.map(t => t.response).filter((v): v is number => v !== undefined && !isNaN(v));
  baselineMeans[model] = mean(values);
}

// Get high-anchor means per model (the "before debiasing" state)
// For 36mo anchor experiments
const highAnchorByModel = groupBy(highAnchors, t => t.model);
const highAnchorMeans: Record<string, number> = {};
for (const [model, trials] of Object.entries(highAnchorByModel)) {
  const values = trials.map(t => t.response).filter((v): v is number => v !== undefined && !isNaN(v));
  highAnchorMeans[model] = mean(values);
}

console.log('# Absolute Distance Analysis');
console.log(`Generated: ${new Date().toISOString()}\n`);

console.log('## Methodology');
console.log('');
console.log('**Problem with prior analysis:** We measured whether techniques moved estimates');
console.log('DOWN from a high anchor. But this ignores whether the final estimate is CLOSER');
console.log('to the unbiased baseline (ground truth).\n');
console.log('**Correct metric:**');
console.log('- Distance BEFORE technique = |anchored_response - baseline|');
console.log('- Distance AFTER technique = |technique_response - baseline|');
console.log('- Calibration improvement = before - after (positive = technique helped)\n');

// Analyze each technique
const techniques = [
  { name: 'Outside View', data: outsideView },
  { name: 'Premortem', data: premortem },
  { name: "Devil's Advocate", data: devilsAdvocate },
  { name: 'Random Control', data: randomControl },
];

console.log('## Technique Comparison (Absolute Distance to Baseline)\n');

for (const { name, data } of techniques) {
  console.log(`### ${name}\n`);
  
  const byModel = groupBy(data, t => t.model);
  
  let calibratedCount = 0;
  let worsenedCount = 0;
  let totalModels = 0;
  
  const modelResults: {
    model: string;
    baseline: number;
    highAnchor: number;
    technique: number;
    distBefore: number;
    distAfter: number;
    improvement: number;
    assessment: string;
  }[] = [];
  
  for (const [model, trials] of Object.entries(byModel).sort()) {
    const values = trials.map(t => t.response).filter((v): v is number => v !== undefined && !isNaN(v));
    if (values.length === 0) continue;
    
    const techniqueMean = mean(values);
    const baselineMean = baselineMeans[model];
    const highAnchorMean = highAnchorMeans[model];
    
    if (!baselineMean) {
      console.log(`  ⚠️ ${model}: No baseline data`);
      continue;
    }
    
    // Use 36mo as anchor reference if no high-anchor data
    const anchorRef = highAnchorMean || 36;
    
    const distBefore = Math.abs(anchorRef - baselineMean);
    const distAfter = Math.abs(techniqueMean - baselineMean);
    const improvement = distBefore - distAfter;
    
    totalModels++;
    
    let assessment: string;
    if (improvement > 1) {
      calibratedCount++;
      assessment = '✅ Calibrated closer';
    } else if (improvement < -1) {
      worsenedCount++;
      assessment = '❌ Worsened (further from baseline)';
    } else {
      assessment = '➖ Negligible change';
    }
    
    modelResults.push({
      model,
      baseline: baselineMean,
      highAnchor: anchorRef,
      technique: techniqueMean,
      distBefore,
      distAfter,
      improvement,
      assessment
    });
  }
  
  // Output table
  console.log('| Model | Baseline | Technique | |Before| | |After| | Δ | Result |');
  console.log('|-------|----------|-----------|---------|--------|-----|--------|');
  
  for (const r of modelResults) {
    console.log(`| ${r.model} | ${r.baseline.toFixed(1)}mo | ${r.technique.toFixed(1)}mo | ${r.distBefore.toFixed(1)}mo | ${r.distAfter.toFixed(1)}mo | ${r.improvement >= 0 ? '+' : ''}${r.improvement.toFixed(1)} | ${r.assessment} |`);
  }
  
  console.log('');
  console.log(`**Summary:** ${calibratedCount}/${totalModels} calibrated closer, ${worsenedCount}/${totalModels} worsened\n`);
}

// Overall summary
console.log('## Summary: Direction vs Distance\n');
console.log('| Technique | "Improved" (old metric) | Calibrated (correct) | Worsened |');
console.log('|-----------|------------------------|----------------------|----------|');

for (const { name, data } of techniques) {
  const byModel = groupBy(data, t => t.model);
  
  let oldImproved = 0;
  let calibrated = 0;
  let worsened = 0;
  let total = 0;
  
  for (const [model, trials] of Object.entries(byModel)) {
    const values = trials.map(t => t.response).filter((v): v is number => v !== undefined && !isNaN(v));
    if (values.length === 0) continue;
    
    const techniqueMean = mean(values);
    const baselineMean = baselineMeans[model];
    if (!baselineMean) continue;
    
    const anchorRef = highAnchorMeans[model] || 36;
    
    total++;
    
    // Old metric: did response go down?
    if (techniqueMean < baselineMean - 0.5) oldImproved++;
    
    // New metric: is it closer to baseline?
    const distBefore = Math.abs(anchorRef - baselineMean);
    const distAfter = Math.abs(techniqueMean - baselineMean);
    
    if (distAfter < distBefore - 1) calibrated++;
    else if (distAfter > distBefore + 1) worsened++;
  }
  
  console.log(`| ${name} | ${oldImproved}/${total} | ${calibrated}/${total} | ${worsened}/${total} |`);
}

console.log('');
console.log('## Key Insight\n');
console.log('The discrepancy between "Improved" and "Calibrated" reveals the methodological flaw:');
console.log('techniques were being credited for moving estimates in a consistent direction,');
console.log('regardless of whether that direction brought them closer to ground truth.\n');
console.log('**Implication:** A technique with an implicit prior (e.g., ~15mo) will appear to');
console.log('"work" on any high-anchored model, but actually WORSENS calibration if the true');
console.log('baseline is >20mo.\n');
