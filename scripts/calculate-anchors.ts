#!/usr/bin/env npx tsx
/**
 * Calculate Anchors from Baseline Results
 * 
 * Reads baseline JSONL files and calculates:
 * - Mean baseline per model
 * - Low anchor = baseline / 2
 * - High anchor = baseline × 1.5
 * 
 * Usage: npx tsx scripts/calculate-anchors.ts
 * 
 * Output: Prints anchor values and updates MANIFEST.md
 */

import { readFileSync, readdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface BaselineResult {
  model: string;
  sentenceMonths: number;
}

interface ModelStats {
  model: string;
  n: number;
  mean: number;
  median: number;
  stdDev: number;
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

function calculateStats(values: number[]): { mean: number; median: number; stdDev: number } {
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  
  const sorted = [...values].sort((a, b) => a - b);
  const median = n % 2 === 0 
    ? (sorted[n/2 - 1] + sorted[n/2]) / 2 
    : sorted[Math.floor(n/2)];
  
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  
  return { mean, median, stdDev };
}

function main() {
  const baselineDir = 'results/baseline';
  
  if (!existsSync(baselineDir)) {
    console.error('No baseline results found. Run baselines first.');
    console.error('Expected directory: results/baseline/');
    process.exit(1);
  }
  
  const files = readdirSync(baselineDir).filter(f => f.endsWith('.jsonl'));
  
  if (files.length === 0) {
    console.error('No baseline JSONL files found in results/baseline/');
    process.exit(1);
  }
  
  console.log('=== Baseline Analysis & Anchor Calculation ===\n');
  
  const allStats: ModelStats[] = [];
  
  for (const file of files) {
    const filePath = join(baselineDir, file);
    const results = parseJsonl(filePath);
    
    if (results.length === 0) continue;
    
    const model = results[0].model;
    const values = results.map(r => r.sentenceMonths).filter(v => v !== null && !isNaN(v));
    
    if (values.length === 0) continue;
    
    const { mean, median, stdDev } = calculateStats(values);
    
    // Calculate proportional anchors
    const lowAnchor = Math.round(mean / 2);
    const highAnchor = Math.round(mean * 1.5);
    
    const stats: ModelStats = {
      model,
      n: values.length,
      mean: Math.round(mean * 10) / 10,
      median,
      stdDev: Math.round(stdDev * 10) / 10,
      lowAnchor,
      highAnchor,
    };
    
    allStats.push(stats);
    
    console.log(`${model}`);
    console.log(`  n=${stats.n} | mean=${stats.mean}mo | median=${stats.median}mo | σ=${stats.stdDev}`);
    console.log(`  → Low anchor: ${stats.lowAnchor}mo | High anchor: ${stats.highAnchor}mo`);
    console.log('');
  }
  
  // Print summary table for easy copy-paste
  console.log('\n=== Summary Table ===\n');
  console.log('| Model | n | Baseline | Low | High |');
  console.log('|-------|---|----------|-----|------|');
  for (const s of allStats) {
    const shortModel = s.model.split('/').pop() || s.model;
    console.log(`| ${shortModel} | ${s.n} | ${s.mean}mo | ${s.lowAnchor}mo | ${s.highAnchor}mo |`);
  }
  
  // Print commands for next phase
  console.log('\n=== Commands for Phase 2 ===\n');
  for (const s of allStats) {
    console.log(`# ${s.model}`);
    console.log(`npx tsx scripts/run-low-anchor.ts ${s.model} ${s.lowAnchor}`);
    console.log(`npx tsx scripts/run-high-anchor.ts ${s.model} ${s.highAnchor}`);
    console.log('');
  }
  
  // Save to JSON for programmatic use
  const outputPath = 'results/anchor-values.json';
  writeFileSync(outputPath, JSON.stringify(allStats, null, 2));
  console.log(`Anchor values saved to: ${outputPath}`);
}

main();
