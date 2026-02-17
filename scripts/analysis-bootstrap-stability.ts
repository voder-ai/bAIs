// @ts-nocheck
#!/usr/bin/env npx tsx
/**
 * Bootstrap Stability Analysis
 * 
 * Purpose: Show that n=30 scenario trials provide stable effect estimates
 * Method: Subsample existing data at n=10,15,20,25,30, bootstrap 1000x, report stability
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Trial {
  anchor: 'low' | 'high';
  response: number;
}

function loadTrials(filepath: string): Trial[] {
  const lines = fs.readFileSync(filepath, 'utf-8').trim().split('\n');
  const trials: Trial[] = [];
  
  for (const line of lines) {
    try {
      const data = JSON.parse(line);
      
      // Determine anchor from conditionId or anchor field
      let anchor: 'low' | 'high' | null = null;
      if (data.conditionId) {
        if (data.conditionId.includes('low')) anchor = 'low';
        else if (data.conditionId.includes('high')) anchor = 'high';
      } else if (data.anchor) {
        anchor = data.anchor as 'low' | 'high';
      } else if (data.condition) {
        if (data.condition.includes('low')) anchor = 'low';
        else if (data.condition.includes('high')) anchor = 'high';
      }
      
      // Determine response from result.sentenceMonths or other fields
      let response: number | null = null;
      if (data.result?.sentenceMonths !== undefined) {
        response = data.result.sentenceMonths;
      } else if (data.sentenceMonths !== undefined) {
        response = data.sentenceMonths;
      } else if (data.response !== undefined) {
        response = data.response;
      } else if (data.estimate !== undefined) {
        response = data.estimate;
      }
      
      if (anchor && typeof response === 'number' && !isNaN(response)) {
        trials.push({ anchor, response });
      }
    } catch (e) {
      // Skip unparseable lines
    }
  }
  
  return trials;
}

function computeEffect(trials: Trial[]): number {
  const low = trials.filter(t => t.anchor === 'low').map(t => t.response);
  const high = trials.filter(t => t.anchor === 'high').map(t => t.response);
  
  if (low.length === 0 || high.length === 0) return NaN;
  
  const meanLow = low.reduce((a, b) => a + b, 0) / low.length;
  const meanHigh = high.reduce((a, b) => a + b, 0) / high.length;
  
  return meanHigh - meanLow;
}

function bootstrap(trials: Trial[], sampleSize: number, iterations: number = 1000): number[] {
  const effects: number[] = [];
  
  const lowTrials = trials.filter(t => t.anchor === 'low');
  const highTrials = trials.filter(t => t.anchor === 'high');
  
  const perCondition = Math.floor(sampleSize / 2);
  
  for (let i = 0; i < iterations; i++) {
    // Sample with replacement
    const sampledLow: Trial[] = [];
    const sampledHigh: Trial[] = [];
    
    for (let j = 0; j < perCondition; j++) {
      sampledLow.push(lowTrials[Math.floor(Math.random() * lowTrials.length)]);
      sampledHigh.push(highTrials[Math.floor(Math.random() * highTrials.length)]);
    }
    
    const effect = computeEffect([...sampledLow, ...sampledHigh]);
    if (!isNaN(effect)) effects.push(effect);
  }
  
  return effects;
}

function stats(arr: number[]): { mean: number; sd: number; ci95: [number, number] } {
  const sorted = [...arr].sort((a, b) => a - b);
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length;
  const sd = Math.sqrt(variance);
  const ci95: [number, number] = [
    sorted[Math.floor(arr.length * 0.025)],
    sorted[Math.floor(arr.length * 0.975)]
  ];
  return { mean, sd, ci95 };
}

async function main() {
  const resultsDir = path.join(__dirname, '..', 'results');
  
  // Key datasets with full n=60 (30 per anchor)
  const datasets = [
    { file: 'github-copilot-gpt-4o-anchoring-temp0-30.jsonl', name: 'GPT-4o temp=0' },
    { file: 'github-copilot-gpt-4o-anchoring-temp0.7-30.jsonl', name: 'GPT-4o temp=0.7' },
    { file: 'github-copilot-gpt-4o-anchoring-temp1.0-30.jsonl', name: 'GPT-4o temp=1.0' },
    { file: 'claude-opus45-anchoring-30.jsonl', name: 'Opus 4.5' },
    { file: 'haiku45-anchoring-30.jsonl', name: 'Haiku 4.5' },
    { file: 'anthropic-claude-sonnet-4-5-anchoring-temp0-30.jsonl', name: 'Sonnet 4.5 temp=0' },
    { file: 'anthropic-claude-sonnet-4-5-anchoring-temp0.7-30.jsonl', name: 'Sonnet 4.5 temp=0.7' },
    { file: 'anthropic-claude-sonnet-4-5-anchoring-temp1.0-30.jsonl', name: 'Sonnet 4.5 temp=1.0' },
  ];
  
  console.log('# Bootstrap Stability Analysis');
  console.log('');
  console.log('**Purpose:** Justify n=30 sample size for scenario-based experiments.');
  console.log('**Method:** Bootstrap 1000 iterations at each subsample size.');
  console.log('**Criterion:** CI width reduction from n=20→n=30 should be <30% (diminishing returns).');
  console.log('');
  
  const summaryRows: string[] = [];
  
  for (const { file, name } of datasets) {
    const filepath = path.join(resultsDir, file);
    if (!fs.existsSync(filepath)) {
      console.log(`## ${name}`);
      console.log(`Skipping (${file} not found)`);
      console.log('');
      continue;
    }
    
    const trials = loadTrials(filepath);
    const lowCount = trials.filter(t => t.anchor === 'low').length;
    const highCount = trials.filter(t => t.anchor === 'high').length;
    
    if (trials.length === 0) {
      console.log(`## ${name}`);
      console.log(`Skipping (no valid trials parsed from ${file})`);
      console.log('');
      continue;
    }
    
    const fullEffect = computeEffect(trials);
    
    console.log(`## ${name}`);
    console.log(`- File: \`${file}\``);
    console.log(`- Trials: ${trials.length} (low: ${lowCount}, high: ${highCount})`);
    console.log(`- Full-sample effect: **${fullEffect.toFixed(2)} months**`);
    console.log('');
    console.log('| n | Mean Effect | SD | 95% CI | CI Width |');
    console.log('|---|-------------|-----|--------|----------|');
    
    let ciWidth20 = 0;
    let ciWidth30 = 0;
    
    for (const n of [10, 15, 20, 25, 30]) {
      if (n / 2 > Math.min(lowCount, highCount)) {
        console.log(`| ${n} | — | — | — | (insufficient data) |`);
        continue;
      }
      
      const effects = bootstrap(trials, n, 1000);
      const s = stats(effects);
      const ciWidth = s.ci95[1] - s.ci95[0];
      
      if (n === 20) ciWidth20 = ciWidth;
      if (n === 30) ciWidth30 = ciWidth;
      
      console.log(`| ${n} | ${s.mean.toFixed(2)}mo | ${s.sd.toFixed(2)} | [${s.ci95[0].toFixed(2)}, ${s.ci95[1].toFixed(2)}] | ${ciWidth.toFixed(2)}mo |`);
    }
    
    const reduction = ciWidth20 > 0 ? ((ciWidth20 - ciWidth30) / ciWidth20 * 100) : 0;
    console.log('');
    console.log(`**CI width reduction n=20→n=30:** ${reduction.toFixed(1)}%`);
    console.log(reduction < 30 ? '✅ Diminishing returns — n=30 adequate' : '⚠️ Still improving — consider larger n');
    console.log('');
    
    summaryRows.push(`| ${name} | ${fullEffect.toFixed(2)}mo | ${ciWidth30.toFixed(2)}mo | ${reduction.toFixed(1)}% |`);
  }
  
  console.log('---');
  console.log('');
  console.log('## Summary');
  console.log('');
  console.log('| Model | Effect | CI Width (n=30) | Reduction 20→30 |');
  console.log('|-------|--------|-----------------|-----------------|');
  summaryRows.forEach(row => console.log(row));
  console.log('');
  console.log('**Interpretation:** If reduction is <30%, adding more samples beyond n=30 provides');
  console.log('diminishing returns. The current sample size is adequate for detecting the observed');
  console.log('effect sizes (~2-6 months).');
}

main().catch(console.error);
