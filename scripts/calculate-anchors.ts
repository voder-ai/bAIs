#!/usr/bin/env npx tsx
/**
 * Calculate Anchors from Baseline Results
 * 
 * Reads baseline JSONL files across ALL temperatures and calculates:
 * - Mean baseline per model (averaged across temps)
 * - Low anchor = baseline / 2
 * - High anchor = baseline × 1.5
 * 
 * Option B approach: Same anchors for all temps (enables clean temp comparison)
 * 
 * Usage: npx tsx scripts/calculate-anchors.ts
 * 
 * Output: Prints anchor values and saves to results/anchor-values.json
 */

import { readFileSync, readdirSync, writeFileSync, existsSync } from 'fs';

interface BaselineResult {
  model: string;
  temperature: number;
  sentenceMonths: number;
}

interface ModelStats {
  model: string;
  nTotal: number;
  nPerTemp: { [temp: string]: number };
  meanPerTemp: { [temp: string]: number };
  meanOverall: number;
  lowAnchor: number;
  highAnchor: number;
}

function parseJsonl(filePath: string): BaselineResult[] {
  const content = readFileSync(filePath, 'utf-8');
  return content
    .trim()
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line));
}

function main() {
  const resultsDir = 'results';
  
  if (!existsSync(resultsDir)) {
    console.error('No results directory found.');
    process.exit(1);
  }
  
  // Find all baseline files (pattern: baseline-<model>-t<temp>.jsonl)
  const files = readdirSync(resultsDir).filter(f => f.startsWith('baseline-') && f.endsWith('.jsonl'));
  
  if (files.length === 0) {
    console.error('No baseline JSONL files found.');
    console.error('Expected pattern: results/baseline-<model>-t<temp>.jsonl');
    process.exit(1);
  }
  
  console.log('=== Baseline Analysis & Anchor Calculation ===');
  console.log('(Option B: Averaging across temps for same anchors)\n');
  
  // Group results by model
  const byModel: { [model: string]: BaselineResult[] } = {};
  
  for (const file of files) {
    const filePath = `${resultsDir}/${file}`;
    const results = parseJsonl(filePath);
    
    for (const r of results) {
      if (r.sentenceMonths === null || isNaN(r.sentenceMonths)) continue;
      if (!byModel[r.model]) byModel[r.model] = [];
      byModel[r.model].push(r);
    }
  }
  
  const allStats: ModelStats[] = [];
  
  for (const model of Object.keys(byModel).sort()) {
    const results = byModel[model];
    
    // Group by temp
    const byTemp: { [temp: string]: number[] } = {};
    for (const r of results) {
      const tempKey = r.temperature.toString();
      if (!byTemp[tempKey]) byTemp[tempKey] = [];
      byTemp[tempKey].push(r.sentenceMonths);
    }
    
    // Calculate mean per temp
    const meanPerTemp: { [temp: string]: number } = {};
    const nPerTemp: { [temp: string]: number } = {};
    for (const [temp, values] of Object.entries(byTemp)) {
      nPerTemp[temp] = values.length;
      meanPerTemp[temp] = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
    }
    
    // Calculate overall mean (average of temp means for equal weighting)
    const tempMeans = Object.values(meanPerTemp);
    const meanOverall = Math.round((tempMeans.reduce((a, b) => a + b, 0) / tempMeans.length) * 10) / 10;
    
    // Calculate proportional anchors from overall mean
    const lowAnchor = Math.round(meanOverall / 2);
    const highAnchor = Math.round(meanOverall * 1.5);
    
    const stats: ModelStats = {
      model,
      nTotal: results.length,
      nPerTemp,
      meanPerTemp,
      meanOverall,
      lowAnchor,
      highAnchor,
    };
    
    allStats.push(stats);
    
    const shortModel = model.split('/').pop() || model;
    console.log(`${shortModel}`);
    for (const [temp, mean] of Object.entries(meanPerTemp)) {
      console.log(`  temp=${temp}: n=${nPerTemp[temp]} | mean=${mean}mo`);
    }
    console.log(`  → Overall mean: ${meanOverall}mo`);
    console.log(`  → Anchors: low=${lowAnchor}mo | high=${highAnchor}mo`);
    console.log('');
  }
  
  // Print summary table
  console.log('\n=== Summary Table ===\n');
  console.log('| Model | n | Baseline | Low | High |');
  console.log('|-------|---|----------|-----|------|');
  for (const s of allStats) {
    const shortModel = s.model.split('/').pop() || s.model;
    console.log(`| ${shortModel} | ${s.nTotal} | ${s.meanOverall}mo | ${s.lowAnchor}mo | ${s.highAnchor}mo |`);
  }
  
  // Print commands for Phase 2 (include all temps)
  console.log('\n=== Commands for Phase 2 ===\n');
  const temps = ['0', '0.7', '1'];
  for (const s of allStats) {
    console.log(`# ${s.model} (low=${s.lowAnchor}mo, high=${s.highAnchor}mo)`);
    for (const t of temps) {
      console.log(`npx tsx scripts/run-low-anchor.ts ${s.model} ${s.lowAnchor} ${t}`);
      console.log(`npx tsx scripts/run-high-anchor.ts ${s.model} ${s.highAnchor} ${t}`);
    }
    console.log('');
  }
  
  // Save to JSON
  const outputPath = 'results/anchor-values.json';
  writeFileSync(outputPath, JSON.stringify(allStats, null, 2));
  console.log(`Anchor values saved to: ${outputPath}`);
}

main();
