#!/usr/bin/env npx tsx
/**
 * Calibration-based paper analysis
 * 
 * Primary metric: |response - baseline| (distance from unbiased truth)
 * This catches overcorrection, unlike spread reduction.
 * 
 * Taxonomy:
 * - Distance techniques (dilute anchor): Random Control, Full SACD
 * - Doubt techniques (undermine without replacing): Premortem
 * - Replacement techniques (swap anchors): Outside View
 * - Confrontation techniques (argue with anchor): Devil's Advocate
 * 
 * Run: npx tsx scripts/generate-calibration-analysis.ts
 */

import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const RESULTS_DIR = './results';
const OUTPUT_DIR = './paper/generated';

// Ensure output directory exists
if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

// Model configurations with proportional anchors
const MODELS = [
  { id: 'claude-opus-4-6', baseline: 18.0, low: 9, high: 27 },
  { id: 'claude-sonnet-4-6', baseline: 24.1, low: 12, high: 36 },
  { id: 'claude-haiku-4-5', baseline: 29.1, low: 15, high: 44 },
  { id: 'gpt-5-2', baseline: 31.8, low: 16, high: 48 },
  { id: 'gpt-4-1', baseline: 25.1, low: 13, high: 38 },
  { id: 'o3', baseline: 33.7, low: 17, high: 51 },
  { id: 'o4-mini', baseline: 35.7, low: 18, high: 54 },
  { id: 'deepseek-v3-2', baseline: 29.6, low: 15, high: 44 },
  { id: 'glm-5', baseline: 31.9, low: 16, high: 48 },
  { id: 'kimi-k2-5', baseline: 30.6, low: 15, high: 46 },
];

// Technique taxonomy
const TECHNIQUES = {
  distance: ['full-sacd', 'random-control'],
  doubt: ['premortem'],
  replacement: ['outside-view'],
  confrontation: ['devils-advocate'],
};

const ALL_TECHNIQUES = Object.values(TECHNIQUES).flat();

function getValues(filepath: string): number[] {
  if (!existsSync(filepath)) return [];
  const values: number[] = [];
  const content = readFileSync(filepath, 'utf-8');
  for (const line of content.trim().split('\n')) {
    if (!line) continue;
    try {
      const t = JSON.parse(line);
      const val = t.final ?? t.sentenceMonths ?? t.response ?? t.debiasedSentence;
      if (typeof val === 'number') values.push(val);
    } catch {}
  }
  return values;
}

function mean(arr: number[]): number | null {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
}

function std(arr: number[]): number | null {
  if (arr.length < 2) return null;
  const m = mean(arr)!;
  const variance = arr.reduce((sum, x) => sum + (x - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

// Get anchored response distances from baseline
function getAnchoredDistances(model: typeof MODELS[0]): { low: number, high: number } | null {
  let lowVals: number[] = [];
  let highVals: number[] = [];
  
  for (const t of ['t0', 't07', 't1']) {
    lowVals = lowVals.concat(getValues(join(RESULTS_DIR, `low-anchor-${model.id}-${t}.jsonl`)));
    highVals = highVals.concat(getValues(join(RESULTS_DIR, 'high-anchor', `${t}-${model.high}mo-${model.id}.jsonl`)));
  }
  
  const lowMean = mean(lowVals);
  const highMean = mean(highVals);
  
  if (lowMean === null || highMean === null) return null;
  
  return {
    low: Math.abs(lowMean - model.baseline),
    high: Math.abs(highMean - model.baseline),
  };
}

// Get technique response distances from baseline
function getTechniqueDistances(tech: string, model: typeof MODELS[0]): { low: number, high: number } | null {
  let lowVals: number[] = [];
  let highVals: number[] = [];
  
  for (const t of ['t0', 't07', 't1']) {
    lowVals = lowVals.concat(getValues(join(RESULTS_DIR, `${tech}-${model.low}mo-${model.id}-${t}.jsonl`)));
    highVals = highVals.concat(getValues(join(RESULTS_DIR, `${tech}-${model.high}mo-${model.id}-${t}.jsonl`)));
  }
  
  const lowMean = mean(lowVals);
  const highMean = mean(highVals);
  
  if (lowMean === null || highMean === null) return null;
  
  return {
    low: Math.abs(lowMean - model.baseline),
    high: Math.abs(highMean - model.baseline),
  };
}

function generateReport(): string {
  let output = '';
  
  output += '# bAIs Calibration Analysis\n\n';
  output += 'Primary metric: |response - baseline| (lower = better calibration)\n\n';
  output += `Generated: ${new Date().toISOString()}\n\n`;
  
  // 1. Baseline distances per model
  output += '## 1. Anchored Response Distances from Baseline\n\n';
  output += 'How far anchored responses deviate from unbiased baseline:\n\n';
  
  const anchoredDistances: Record<string, { low: number, high: number }> = {};
  
  for (const model of MODELS) {
    const dist = getAnchoredDistances(model);
    if (dist) {
      anchoredDistances[model.id] = dist;
      output += `- ${model.id}: low=${dist.low.toFixed(1)}mo, high=${dist.high.toFixed(1)}mo, avg=${((dist.low + dist.high) / 2).toFixed(1)}mo\n`;
    }
  }
  
  // 2. Technique calibration results
  output += '\n## 2. Technique Calibration (Primary Results)\n\n';
  output += 'Improvement = reduction in |response - baseline|\n\n';
  
  const techniqueResults: Record<string, { avgAnchored: number, avgAfter: number, improvement: number, pct: number }> = {};
  
  for (const tech of ALL_TECHNIQUES) {
    let totalAnchored = 0, totalAfter = 0, count = 0;
    
    for (const model of MODELS) {
      if (!anchoredDistances[model.id]) continue;
      
      const techDist = getTechniqueDistances(tech, model);
      if (!techDist) continue;
      
      const avgAnchored = (anchoredDistances[model.id].low + anchoredDistances[model.id].high) / 2;
      const avgTech = (techDist.low + techDist.high) / 2;
      
      totalAnchored += avgAnchored;
      totalAfter += avgTech;
      count++;
    }
    
    if (count > 0) {
      const avgAnchored = totalAnchored / count;
      const avgAfter = totalAfter / count;
      const improvement = avgAnchored - avgAfter;
      const pct = Math.round(improvement / avgAnchored * 100);
      techniqueResults[tech] = { avgAnchored, avgAfter, improvement, pct };
    }
  }
  
  // Sort by improvement
  const sortedTechniques = Object.entries(techniqueResults)
    .sort((a, b) => b[1].pct - a[1].pct);
  
  for (const [tech, result] of sortedTechniques) {
    const category = Object.entries(TECHNIQUES).find(([_, techs]) => techs.includes(tech))?.[0] || 'unknown';
    output += `- **${tech}** (${category}): ${result.avgAnchored.toFixed(1)}mo → ${result.avgAfter.toFixed(1)}mo (${result.pct > 0 ? '+' : ''}${result.pct}% ${result.pct > 0 ? 'better' : 'worse'})\n`;
  }
  
  // 3. Taxonomy summary
  output += '\n## 3. Taxonomy Summary\n\n';
  
  for (const [category, techs] of Object.entries(TECHNIQUES)) {
    const categoryResults = techs.map(t => techniqueResults[t]).filter(Boolean);
    if (categoryResults.length === 0) continue;
    
    const avgPct = Math.round(categoryResults.reduce((sum, r) => sum + r.pct, 0) / categoryResults.length);
    output += `**${category.charAt(0).toUpperCase() + category.slice(1)} techniques:** ${avgPct > 0 ? '+' : ''}${avgPct}% avg calibration improvement\n`;
    for (const tech of techs) {
      if (techniqueResults[tech]) {
        output += `  - ${tech}: ${techniqueResults[tech].pct > 0 ? '+' : ''}${techniqueResults[tech].pct}%\n`;
      }
    }
    output += '\n';
  }
  
  // 4. Model-specific results
  output += '## 4. Model-Specific Calibration\n\n';
  
  for (const tech of ['full-sacd', 'random-control', 'premortem', 'outside-view', 'devils-advocate']) {
    output += `### ${tech}\n\n`;
    
    let improved = 0, worsened = 0;
    
    for (const model of MODELS) {
      if (!anchoredDistances[model.id]) continue;
      
      const techDist = getTechniqueDistances(tech, model);
      if (!techDist) continue;
      
      const avgAnchored = (anchoredDistances[model.id].low + anchoredDistances[model.id].high) / 2;
      const avgTech = (techDist.low + techDist.high) / 2;
      const improvement = avgAnchored - avgTech;
      const pct = Math.round(improvement / avgAnchored * 100);
      
      if (improvement > 0) improved++;
      else worsened++;
      
      const emoji = improvement > 0 ? '✓' : '✗';
      output += `- ${emoji} ${model.id}: ${pct > 0 ? '+' : ''}${pct}%\n`;
    }
    
    output += `\nModels improved: ${improved}/${improved + worsened}\n\n`;
  }
  
  // 5. Trial counts
  output += '## 5. Trial Counts\n\n';
  
  let totalTrials = 0;
  const counts: Record<string, number> = {};
  
  const files = readdirSync(RESULTS_DIR).filter(f => f.endsWith('.jsonl'));
  for (const file of files) {
    const lines = readFileSync(join(RESULTS_DIR, file), 'utf-8').trim().split('\n').filter(Boolean);
    totalTrials += lines.length;
    
    const match = file.match(/^([a-z-]+)-\d+mo/);
    if (match) {
      counts[match[1]] = (counts[match[1]] || 0) + lines.length;
    }
  }
  
  // Add high-anchor directory
  if (existsSync(join(RESULTS_DIR, 'high-anchor'))) {
    const haFiles = readdirSync(join(RESULTS_DIR, 'high-anchor')).filter(f => f.endsWith('.jsonl'));
    for (const file of haFiles) {
      const lines = readFileSync(join(RESULTS_DIR, 'high-anchor', file), 'utf-8').trim().split('\n').filter(Boolean);
      totalTrials += lines.length;
      counts['high-anchor'] = (counts['high-anchor'] || 0) + lines.length;
    }
  }
  
  for (const [condition, count] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    output += `- ${condition}: ${count.toLocaleString()}\n`;
  }
  output += `\n**Total trials: ${totalTrials.toLocaleString()}**\n`;
  
  return output;
}

// Generate and save
const report = generateReport();
console.log(report);
writeFileSync(join(OUTPUT_DIR, 'calibration-analysis.md'), report);
console.log(`\nSaved to ${OUTPUT_DIR}/calibration-analysis.md`);
