#!/usr/bin/env npx tsx
/**
 * proper-analysis.ts
 * 
 * Correct methodology: Measure absolute distance from baseline before vs after technique.
 * A technique "works" if |technique_response - baseline| < |anchored_response - baseline|
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const RESULTS_DIR = join(__dirname, '../results');

// Load all JSONL files matching pattern
function loadTrials(pattern: RegExp): any[] {
  const files = readdirSync(RESULTS_DIR).filter(f => pattern.test(f) && f.endsWith('.jsonl'));
  const trials: any[] = [];
  
  for (const file of files) {
    const lines = readFileSync(join(RESULTS_DIR, file), 'utf-8').split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        trials.push({
          ...data,
          _file: file,
          _response: data.response ?? data.sentenceMonths ?? data.months ?? data.final
        });
      } catch {}
    }
  }
  return trials;
}

// Normalize model names
function normalizeModel(model: string): string {
  return model
    .replace('anthropic/', '')
    .replace('openai/', '')
    .replace('deepseek/', '')
    .replace('moonshotai/', '')
    .replace('z-ai/', '')
    .replace('minimax/', '');
}

// Compute mean
function mean(arr: number[]): number {
  if (arr.length === 0) return NaN;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

console.log('# Proper Analysis: Absolute Distance from Baseline\n');
console.log(`Generated: ${new Date().toISOString()}\n`);

// Step 1: Compute baselines per model
console.log('## 1. Baselines (No Anchor)\n');
const baselines = loadTrials(/^baseline-/);
const baselineByModel: Record<string, number> = {};

const baselineGroups: Record<string, number[]> = {};
for (const t of baselines) {
  const model = normalizeModel(t.model || '');
  if (!baselineGroups[model]) baselineGroups[model] = [];
  if (t._response && !isNaN(t._response)) {
    baselineGroups[model].push(t._response);
  }
}

console.log('| Model | Baseline Mean | n |');
console.log('|-------|---------------|---|');
for (const [model, values] of Object.entries(baselineGroups).sort()) {
  const m = mean(values);
  baselineByModel[model] = m;
  console.log(`| ${model} | ${m.toFixed(1)}mo | ${values.length} |`);
}
console.log('');

// Step 2: Compute anchored responses (no technique)
console.log('## 2. Anchored Responses (No Technique)\n');
const lowAnchors = loadTrials(/^low-anchor-/);

const anchoredByModel: Record<string, { anchor: number; responses: number[] }[]> = {};
for (const t of lowAnchors) {
  const model = normalizeModel(t.model || '');
  const anchor = t.anchor ?? t.prosecutorRecommendationMonths;
  if (!anchoredByModel[model]) anchoredByModel[model] = [];
  
  let entry = anchoredByModel[model].find(e => e.anchor === anchor);
  if (!entry) {
    entry = { anchor, responses: [] };
    anchoredByModel[model].push(entry);
  }
  if (t._response && !isNaN(t._response)) {
    entry.responses.push(t._response);
  }
}

console.log('| Model | Anchor | Anchored Mean | Distance from Baseline |');
console.log('|-------|--------|---------------|------------------------|');
for (const [model, entries] of Object.entries(anchoredByModel).sort()) {
  const baseline = baselineByModel[model] || NaN;
  for (const entry of entries) {
    const anchoredMean = mean(entry.responses);
    const distance = Math.abs(anchoredMean - baseline);
    console.log(`| ${model} | ${entry.anchor}mo | ${anchoredMean.toFixed(1)}mo | ${distance.toFixed(1)}mo |`);
  }
}
console.log('');

// Step 3: For each technique, compute improvement
const techniques = [
  { name: 'Outside View', pattern: /^outside-view-/ },
  { name: 'Premortem', pattern: /^premortem-/ },
  { name: "Devil's Advocate", pattern: /^devils-advocate-/ },
  { name: 'Random Control', pattern: /^random-control-/ },
  { name: 'Full SACD', pattern: /^full-sacd-/ },
];

console.log('## 3. Technique Effectiveness (Absolute Distance Reduction)\n');

for (const { name, pattern } of techniques) {
  console.log(`### ${name}\n`);
  
  const trials = loadTrials(pattern);
  
  // Group by model and anchor
  const groups: Record<string, { anchor: number; responses: number[] }[]> = {};
  for (const t of trials) {
    const model = normalizeModel(t.model || t.actualModel || '');
    const anchor = t.anchor;
    if (!anchor) continue;
    
    if (!groups[model]) groups[model] = [];
    let entry = groups[model].find(e => e.anchor === anchor);
    if (!entry) {
      entry = { anchor, responses: [] };
      groups[model].push(entry);
    }
    
    const response = t._response ?? t.final;
    if (response && !isNaN(response)) {
      entry.responses.push(response);
    }
  }
  
  console.log('| Model | Anchor | Baseline | Anchored (no tech) | With Technique | Bias Before | Bias After | Improved? |');
  console.log('|-------|--------|----------|-------------------|----------------|-------------|------------|-----------|');
  
  let improved = 0;
  let worsened = 0;
  let total = 0;
  
  for (const [model, entries] of Object.entries(groups).sort()) {
    const baseline = baselineByModel[model];
    if (!baseline || isNaN(baseline)) continue;
    
    // Find corresponding anchored response (no technique)
    const anchoredEntries = anchoredByModel[model] || [];
    
    for (const entry of entries) {
      const anchoredEntry = anchoredEntries.find(e => e.anchor === entry.anchor);
      if (!anchoredEntry || anchoredEntry.responses.length === 0) continue;
      
      const anchoredMean = mean(anchoredEntry.responses);
      const techMean = mean(entry.responses);
      
      const biasBefore = Math.abs(anchoredMean - baseline);
      const biasAfter = Math.abs(techMean - baseline);
      
      const isImproved = biasAfter < biasBefore;
      if (isImproved) improved++;
      else worsened++;
      total++;
      
      console.log(`| ${model} | ${entry.anchor}mo | ${baseline.toFixed(1)}mo | ${anchoredMean.toFixed(1)}mo | ${techMean.toFixed(1)}mo | ${biasBefore.toFixed(1)}mo | ${biasAfter.toFixed(1)}mo | ${isImproved ? '✅' : '❌'} |`);
    }
  }
  
  console.log('');
  console.log(`**Summary:** ${improved}/${total} improved (${(improved/total*100).toFixed(0)}%), ${worsened}/${total} worsened\n`);
}

// Step 4: Summary
console.log('## 4. Summary\n');
console.log('The correct metric for "debiasing effectiveness" is:');
console.log('- Compute |anchored_response - baseline| (bias WITHOUT technique)');
console.log('- Compute |technique_response - baseline| (bias WITH technique)');
console.log('- Technique "works" if bias_after < bias_before');
console.log('');
console.log('This measures whether the technique brings the response closer to the unbiased baseline,');
console.log('not just whether it "moved" the response in some direction.');
