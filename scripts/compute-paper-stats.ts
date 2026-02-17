#!/usr/bin/env npx tsx
// @ts-nocheck
/**
 * Compute proper statistical tests for paper tables
 * - 95% bootstrap confidence intervals
 * - Two-sample t-tests (Welch's)
 * - Cohen's d effect sizes
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

interface Trial {
  anchor?: number;
  sentenceMonths?: number;
  result?: { sentenceMonths?: number } | null;
  params?: { prosecutorRecommendationMonths?: number };
  error?: string;
}

// Load trials from JSONL file
function loadTrials(filepath: string): Trial[] {
  try {
    const content = readFileSync(filepath, 'utf8');
    return content.trim().split('\n').map(line => JSON.parse(line));
  } catch {
    return [];
  }
}

// Extract sentence values by anchor condition
function extractByAnchor(trials: Trial[]): { low: number[]; high: number[] } {
  const low: number[] = [];
  const high: number[] = [];
  
  for (const t of trials) {
    // Skip trials with errors
    if (t.error) continue;
    
    const sentence = t.sentenceMonths ?? t.result?.sentenceMonths;
    if (sentence == null) continue;
    
    // Handle different anchor field formats
    const anchor = t.anchor ?? t.params?.prosecutorRecommendationMonths;
    
    if (anchor === 3) low.push(sentence);
    else if (anchor === 9) high.push(sentence);
  }
  
  return { low, high };
}

// Compute mean
function mean(arr: number[]): number {
  if (arr.length === 0) return NaN;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// Compute standard deviation
function std(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((sum, x) => sum + (x - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

// Bootstrap 95% CI for mean
function bootstrapCI(arr: number[], iterations = 1000): { lower: number; upper: number } {
  if (arr.length === 0) return { lower: NaN, upper: NaN };
  
  const means: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const sample = Array.from({ length: arr.length }, () => 
      arr[Math.floor(Math.random() * arr.length)]
    );
    means.push(mean(sample));
  }
  
  means.sort((a, b) => a - b);
  return {
    lower: means[Math.floor(iterations * 0.025)],
    upper: means[Math.floor(iterations * 0.975)]
  };
}

// Welch's t-test (two-sample, unequal variance)
function welchTTest(a: number[], b: number[]): { t: number; df: number; p: number } {
  const n1 = a.length, n2 = b.length;
  const m1 = mean(a), m2 = mean(b);
  const v1 = std(a) ** 2, v2 = std(b) ** 2;
  
  const se = Math.sqrt(v1 / n1 + v2 / n2);
  const t = (m1 - m2) / se;
  
  // Welch-Satterthwaite degrees of freedom
  const num = (v1 / n1 + v2 / n2) ** 2;
  const denom = (v1 / n1) ** 2 / (n1 - 1) + (v2 / n2) ** 2 / (n2 - 1);
  const df = num / denom;
  
  // Approximate p-value using normal distribution (good for df > 30)
  const p = 2 * (1 - normalCDF(Math.abs(t)));
  
  return { t, df, p };
}

// Standard normal CDF approximation
function normalCDF(x: number): number {
  const a1 =  0.254829592, a2 = -0.284496736, a3 =  1.421413741;
  const a4 = -1.453152027, a5 =  1.061405429, p  =  0.3275911;
  
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  
  return 0.5 * (1 + sign * y);
}

// Cohen's d effect size
function cohensD(a: number[], b: number[]): number {
  const pooledStd = Math.sqrt(
    ((a.length - 1) * std(a) ** 2 + (b.length - 1) * std(b) ** 2) / 
    (a.length + b.length - 2)
  );
  return (mean(a) - mean(b)) / pooledStd;
}

// Format number for paper
function fmt(n: number, decimals = 2): string {
  if (isNaN(n)) return '---';
  return n.toFixed(decimals);
}

// Main analysis
const resultsDir = join(import.meta.dirname, '../results');

// Models to analyze (matching paper Table 2)
const models = [
  { name: 'GPT-4o (OpenRouter)', file: 'gpt4o-anchoring-30.jsonl' },
  { name: 'GPT-4o (Copilot)', file: 'github-copilot-gpt-4o-anchoring-temp0-30.jsonl' },
  { name: 'Opus 4.5', file: 'claude-opus45-anchoring-30.jsonl' },
  { name: 'Sonnet 4.5', file: 'anthropic-claude-sonnet-4-5-anchoring-temp0-30.jsonl' },
  { name: 'Llama 3.3 70B', file: 'llama33-free-anchoring-30.jsonl' },
  { name: 'Hermes 405B', file: 'hermes-405b-anchoring-30.jsonl' },
  { name: 'Haiku 4.5', file: 'haiku45-anchoring-30.jsonl' },
  { name: 'MiniMax M2.5', file: 'minimax-m25-anchoring-baseline.jsonl' },
  { name: 'o3-mini', file: 'o3-mini-anchoring-30.jsonl' },
  { name: 'o1', file: 'o1-baseline-openrouter.jsonl' },
  { name: 'Codex', file: 'codex-anchoring-30.jsonl' },
];

console.log('# Statistical Analysis for Paper Tables\n');
console.log('## Mechanism Classification Table (Table 2)\n');
console.log('| Model | n (low/high) | Low Anchor Mean [95% CI] | High Anchor Mean [95% CI] | Effect | t-test | Cohen\'s d |');
console.log('|-------|--------------|--------------------------|---------------------------|--------|--------|-----------|');

for (const model of models) {
  const filepath = join(resultsDir, model.file);
  const trials = loadTrials(filepath);
  const { low, high } = extractByAnchor(trials);
  
  if (low.length === 0 && high.length === 0) {
    console.log(`| ${model.name} | 0/0 | --- | --- | --- | --- | --- |`);
    continue;
  }
  
  const lowMean = mean(low);
  const highMean = mean(high);
  const lowCI = bootstrapCI(low);
  const highCI = bootstrapCI(high);
  const effect = highMean - lowMean;
  
  let tTest = '---';
  let d = '---';
  
  if (low.length >= 2 && high.length >= 2 && std(low) > 0 && std(high) > 0) {
    const { t, df, p } = welchTTest(high, low);
    const sig = p < 0.001 ? '***' : p < 0.01 ? '**' : p < 0.05 ? '*' : '';
    tTest = `t(${fmt(df, 0)})=${fmt(t)}${sig}`;
    d = fmt(cohensD(high, low));
  } else if (std(low) === 0 && std(high) === 0) {
    // Deterministic outputs
    tTest = 'det.';
    d = effect !== 0 ? '∞' : '0';
  }
  
  console.log(`| ${model.name} | ${low.length}/${high.length} | ${fmt(lowMean)} [${fmt(lowCI.lower)}, ${fmt(lowCI.upper)}] | ${fmt(highMean)} [${fmt(highCI.lower)}, ${fmt(highCI.upper)}] | ${fmt(effect)} | ${tTest} | ${d} |`);
}

console.log('\n## Notes');
console.log('- 95% CIs computed via 1000-iteration bootstrap');
console.log('- t-tests: Welch\'s two-sample t-test (unequal variance)');
console.log('- Significance: * p<0.05, ** p<0.01, *** p<0.001');
console.log('- "det." = deterministic outputs (temp=0, SD=0)');
console.log('- Cohen\'s d: 0.2=small, 0.5=medium, 0.8=large');
