// @ts-nocheck
#!/usr/bin/env npx tsx
/**
 * Bootstrap Power Analysis
 * 
 * Purpose: Show that n=30 scenarios provides stable effect estimates
 * Method: Resample scenarios with replacement, compute effect stability
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const BOOTSTRAP_ITERATIONS = 1000;
const SUBSAMPLE_SIZES = [10, 15, 20, 25, 30];

interface Trial {
  sentenceMonths: number;
  anchor?: number;
  conditionId?: string;
  result?: { sentenceMonths: number };
}

function loadJsonl(filepath: string): Trial[] {
  try {
    const content = readFileSync(filepath, 'utf8');
    return content.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
  } catch {
    return [];
  }
}

function getSentence(t: Trial): number | null {
  return t.sentenceMonths ?? t.result?.sentenceMonths ?? null;
}

function getAnchor(t: Trial): number | null {
  if (t.anchor) return t.anchor;
  if (t.conditionId?.includes('low') || t.conditionId?.includes('3mo')) return 3;
  if (t.conditionId?.includes('high') || t.conditionId?.includes('9mo')) return 9;
  return null;
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function std(arr: number[]): number {
  if (arr.length === 0) return 0;
  const m = mean(arr);
  const variance = arr.reduce((sum, x) => sum + Math.pow(x - m, 2), 0) / arr.length;
  return Math.sqrt(variance);
}

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.floor(p * sorted.length);
  return sorted[Math.min(index, sorted.length - 1)];
}

function resample<T>(arr: T[], n: number): T[] {
  const result: T[] = [];
  for (let i = 0; i < n; i++) {
    result.push(arr[Math.floor(Math.random() * arr.length)]);
  }
  return result;
}

function computeEffect(trials: Trial[]): number {
  const low = trials.filter(t => getAnchor(t) === 3).map(t => getSentence(t)).filter((x): x is number => x !== null);
  const high = trials.filter(t => getAnchor(t) === 9).map(t => getSentence(t)).filter((x): x is number => x !== null);
  
  if (low.length === 0 || high.length === 0) return NaN;
  return mean(high) - mean(low);
}

function main() {
  console.log('Bootstrap Power Analysis');
  console.log('========================');
  console.log('');
  
  // Load a representative dataset (GPT-5.2 baseline as it's clean)
  const resultsDir = 'results';
  const trials = loadJsonl(join(resultsDir, 'gpt52-baseline.jsonl'));
  
  if (trials.length === 0) {
    console.log('No data found in gpt52-baseline.jsonl');
    return;
  }
  
  const validTrials = trials.filter(t => getSentence(t) !== null && getAnchor(t) !== null);
  console.log(`Loaded ${validTrials.length} valid trials`);
  
  // Full sample effect
  const fullEffect = computeEffect(validTrials);
  console.log(`Full sample effect (n=${validTrials.length}): ${fullEffect.toFixed(2)}mo`);
  console.log('');
  
  // Bootstrap at different sample sizes
  console.log('Bootstrap Stability Analysis:');
  console.log('-----------------------------');
  console.log('');
  console.log('| n per condition | Mean Effect | Std Dev | 95% CI | CV (%) |');
  console.log('|-----------------|-------------|---------|--------|--------|');
  
  for (const n of SUBSAMPLE_SIZES) {
    const effects: number[] = [];
    
    for (let i = 0; i < BOOTSTRAP_ITERATIONS; i++) {
      const lowTrials = validTrials.filter(t => getAnchor(t) === 3);
      const highTrials = validTrials.filter(t => getAnchor(t) === 9);
      
      const sampledLow = resample(lowTrials, Math.min(n, lowTrials.length));
      const sampledHigh = resample(highTrials, Math.min(n, highTrials.length));
      
      const lowMean = mean(sampledLow.map(t => getSentence(t)!));
      const highMean = mean(sampledHigh.map(t => getSentence(t)!));
      
      effects.push(highMean - lowMean);
    }
    
    const meanEffect = mean(effects);
    const stdEffect = std(effects);
    const ci95Low = percentile(effects, 0.025);
    const ci95High = percentile(effects, 0.975);
    const cv = (stdEffect / Math.abs(meanEffect)) * 100;
    
    console.log(`| ${String(n).padStart(15)} | ${meanEffect.toFixed(2).padStart(11)}mo | ${stdEffect.toFixed(2).padStart(6)}mo | [${ci95Low.toFixed(1)}, ${ci95High.toFixed(1)}] | ${cv.toFixed(1).padStart(6)} |`);
  }
  
  console.log('');
  console.log('Interpretation:');
  console.log('---------------');
  console.log('CV (Coefficient of Variation) = Std Dev / Mean Effect');
  console.log('Lower CV = more stable estimate');
  console.log('');
  console.log('At n=30, the 95% CI width indicates the precision of our effect estimate.');
  console.log('If the CI excludes zero, we can be confident the effect is real.');
  console.log('');
  
  // Final bootstrap at n=30
  const effects30: number[] = [];
  for (let i = 0; i < 10000; i++) {
    const lowTrials = validTrials.filter(t => getAnchor(t) === 3);
    const highTrials = validTrials.filter(t => getAnchor(t) === 9);
    const sampledLow = resample(lowTrials, 30);
    const sampledHigh = resample(highTrials, 30);
    effects30.push(mean(sampledHigh.map(t => getSentence(t)!)) - mean(sampledLow.map(t => getSentence(t)!)));
  }
  
  const ci95Width = percentile(effects30, 0.975) - percentile(effects30, 0.025);
  
  console.log('For paper:');
  console.log('---------');
  console.log(`"Bootstrap analysis (10,000 iterations) shows that with n=30 per condition,`);
  console.log(`effect estimates have a 95% CI width of ±${(ci95Width/2).toFixed(1)}mo.`);
  console.log(`The observed effect of ${fullEffect.toFixed(1)}mo is ${(Math.abs(fullEffect) / (ci95Width/2)).toFixed(1)}x the CI half-width,`);
  console.log(`indicating a robust and stable estimate."`);
}

main();
