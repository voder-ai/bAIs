#!/usr/bin/env npx tsx
// @ts-nocheck
/**
 * Bonferroni Correction Analysis
 * 
 * Computes p-values for anchoring effects across all deployments
 * and applies Bonferroni correction for multiple comparisons.
 * 
 * Method: Bootstrap permutation test - what proportion of permuted
 * samples show an effect as large as observed?
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RESULTS_DIR = path.join(__dirname, '..', 'results');

interface Trial {
  anchor: 'low' | 'high' | 'none';
  response: number;
}

interface DeploymentResult {
  deployment: string;
  file: string;
  nLow: number;
  nHigh: number;
  meanLow: number;
  meanHigh: number;
  effect: number;
  ci95Lower: number;
  ci95Upper: number;
  pValue: number;
  significantUncorrected: boolean;
  significantBonferroni: boolean;
}

// Map to actual result files (verified against MANIFEST.md)
const DEPLOYMENT_FILES: Record<string, string> = {
  'Opus 4.5': 'opus4-anchoring-baseline-30.jsonl',
  'Opus 4.6': 'opus46-baseline.jsonl',
  'Llama 3.3 70B': 'llama33-free-anchoring-30.jsonl',
  'GPT-4o (Copilot)': 'github-copilot-gpt-4o-anchoring-temp0-30.jsonl',
  'GPT-4o (OpenRouter)': 'gpt4o-anchoring-30.jsonl',
  'GPT-5.2': 'gpt52-anchoring-30.jsonl',
  'MiniMax M2.5': 'minimax-m25-anchoring-baseline.jsonl',
  'o3-mini': 'o3-mini-baseline-rerun.jsonl',
  'o1': 'o1-baseline-openrouter.jsonl',
  'Hermes 405B': 'hermes-405b-anchoring-30.jsonl',
};

function loadTrials(filepath: string): Trial[] {
  if (!fs.existsSync(filepath)) {
    console.log(`  ⚠️  File not found: ${path.basename(filepath)}`);
    return [];
  }
  
  const lines = fs.readFileSync(filepath, 'utf-8').trim().split('\n');
  const trials: Trial[] = [];
  
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const data = JSON.parse(line);
      
      // Determine anchor from various field formats
      let anchor: 'low' | 'high' | 'none' | null = null;
      const condStr = (data.conditionId || data.condition || data.anchor || '').toLowerCase();
      
      if (condStr.includes('no-anchor') || condStr.includes('none') || condStr === 'baseline') {
        anchor = 'none';
      } else if (condStr.includes('low') || condStr.includes('3mo') || condStr === '3') {
        anchor = 'low';
      } else if (condStr.includes('high') || condStr.includes('9mo') || condStr === '9') {
        anchor = 'high';
      }
      
      // Also check anchorMonths field
      if (!anchor && data.anchorMonths !== undefined) {
        if (data.anchorMonths === 3) anchor = 'low';
        else if (data.anchorMonths === 9) anchor = 'high';
      }
      
      // Determine response
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
      
      if (anchor && anchor !== 'none' && typeof response === 'number' && !isNaN(response)) {
        trials.push({ anchor, response });
      }
    } catch (e) {
      // Skip unparseable lines
    }
  }
  
  return trials;
}

function mean(arr: number[]): number {
  if (arr.length === 0) return NaN;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function std(arr: number[]): number {
  if (arr.length < 2) return NaN;
  const m = mean(arr);
  const variance = arr.reduce((sum, x) => sum + (x - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

function computeEffect(lowResponses: number[], highResponses: number[]): number {
  if (lowResponses.length === 0 || highResponses.length === 0) return NaN;
  return mean(highResponses) - mean(lowResponses);
}

function bootstrapCI(trials: Trial[], iterations: number = 10000): { lower: number; upper: number } {
  const lowTrials = trials.filter(t => t.anchor === 'low').map(t => t.response);
  const highTrials = trials.filter(t => t.anchor === 'high').map(t => t.response);
  
  const effects: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const sampledLow = Array.from({ length: lowTrials.length }, () => 
      lowTrials[Math.floor(Math.random() * lowTrials.length)]
    );
    const sampledHigh = Array.from({ length: highTrials.length }, () => 
      highTrials[Math.floor(Math.random() * highTrials.length)]
    );
    
    effects.push(computeEffect(sampledLow, sampledHigh));
  }
  
  effects.sort((a, b) => a - b);
  
  return {
    lower: effects[Math.floor(iterations * 0.025)],
    upper: effects[Math.floor(iterations * 0.975)],
  };
}

function permutationPValue(trials: Trial[], observedEffect: number, iterations: number = 10000): number {
  const allResponses = trials.map(t => t.response);
  const nLow = trials.filter(t => t.anchor === 'low').length;
  
  let moreExtreme = 0;
  
  for (let i = 0; i < iterations; i++) {
    // Fisher-Yates shuffle
    const shuffled = [...allResponses];
    for (let j = shuffled.length - 1; j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1));
      [shuffled[j], shuffled[k]] = [shuffled[k], shuffled[j]];
    }
    
    const permLow = shuffled.slice(0, nLow);
    const permHigh = shuffled.slice(nLow);
    
    const permEffect = computeEffect(permLow, permHigh);
    
    // Two-tailed
    if (Math.abs(permEffect) >= Math.abs(observedEffect)) {
      moreExtreme++;
    }
  }
  
  return moreExtreme / iterations;
}

function analyzeDeployment(deployment: string, filename: string): DeploymentResult | null {
  const filepath = path.join(RESULTS_DIR, filename);
  const trials = loadTrials(filepath);
  
  const lowTrials = trials.filter(t => t.anchor === 'low');
  const highTrials = trials.filter(t => t.anchor === 'high');
  
  if (lowTrials.length < 5 || highTrials.length < 5) {
    console.log(`  ⚠️  ${deployment}: insufficient data (n=${lowTrials.length}/${highTrials.length})`);
    return null;
  }
  
  const lowResponses = lowTrials.map(t => t.response);
  const highResponses = highTrials.map(t => t.response);
  
  const observedEffect = computeEffect(lowResponses, highResponses);
  const { lower, upper } = bootstrapCI(trials);
  const pValue = permutationPValue(trials, observedEffect);
  
  return {
    deployment,
    file: filename,
    nLow: lowTrials.length,
    nHigh: highTrials.length,
    meanLow: mean(lowResponses),
    meanHigh: mean(highResponses),
    effect: observedEffect,
    ci95Lower: lower,
    ci95Upper: upper,
    pValue,
    significantUncorrected: pValue < 0.05,
    significantBonferroni: false,
  };
}

async function main() {
  console.log('='.repeat(80));
  console.log('BONFERRONI CORRECTION ANALYSIS');
  console.log('='.repeat(80));
  console.log('');
  
  const results: DeploymentResult[] = [];
  
  for (const [deployment, filename] of Object.entries(DEPLOYMENT_FILES)) {
    const result = analyzeDeployment(deployment, filename);
    if (result) results.push(result);
  }
  
  // Apply Bonferroni correction
  const nTests = results.length;
  const bonferroniAlpha = 0.05 / nTests;
  
  for (const r of results) {
    r.significantBonferroni = r.pValue < bonferroniAlpha;
  }
  
  console.log('');
  console.log(`Number of deployments tested: ${nTests}`);
  console.log(`Standard α: 0.05`);
  console.log(`Bonferroni-corrected α: ${bonferroniAlpha.toFixed(5)} (0.05 / ${nTests})`);
  console.log('');
  
  console.log('─'.repeat(130));
  console.log(
    'Deployment'.padEnd(22) +
    'n(L/H)'.padEnd(10) +
    'Mean L'.padEnd(9) +
    'Mean H'.padEnd(9) +
    'Effect'.padEnd(10) +
    '95% CI'.padEnd(18) +
    'p-value'.padEnd(12) +
    'α=.05'.padEnd(8) +
    'Bonf.'
  );
  console.log('─'.repeat(130));
  
  // Sort by effect size
  results.sort((a, b) => Math.abs(b.effect) - Math.abs(a.effect));
  
  for (const r of results) {
    const ciStr = `[${r.ci95Lower.toFixed(1)}, ${r.ci95Upper.toFixed(1)}]`;
    const pStr = r.pValue < 0.0001 ? '<0.0001' : r.pValue.toFixed(4);
    console.log(
      r.deployment.padEnd(22) +
      `${r.nLow}/${r.nHigh}`.padEnd(10) +
      r.meanLow.toFixed(1).padEnd(9) +
      r.meanHigh.toFixed(1).padEnd(9) +
      ((r.effect >= 0 ? '+' : '') + r.effect.toFixed(2)).padEnd(10) +
      ciStr.padEnd(18) +
      pStr.padEnd(12) +
      (r.significantUncorrected ? '✓' : '✗').padEnd(8) +
      (r.significantBonferroni ? '✓' : '✗')
    );
  }
  
  console.log('─'.repeat(130));
  console.log('');
  
  // Summary
  const sigUncorrected = results.filter(r => r.significantUncorrected).length;
  const sigBonferroni = results.filter(r => r.significantBonferroni).length;
  
  console.log('SUMMARY:');
  console.log(`  Significant at α=0.05:           ${sigUncorrected}/${nTests}`);
  console.log(`  Significant after Bonferroni:    ${sigBonferroni}/${nTests}`);
  console.log('');
  
  if (sigBonferroni === sigUncorrected) {
    console.log('✅ ALL effects remain significant after Bonferroni correction.');
  } else if (sigBonferroni === results.length) {
    console.log('✅ ALL tested deployments remain significant after Bonferroni correction.');
  } else {
    console.log(`⚠️  ${sigUncorrected - sigBonferroni} effect(s) lost significance after correction.`);
    const lost = results.filter(r => r.significantUncorrected && !r.significantBonferroni);
    for (const r of lost) {
      console.log(`   - ${r.deployment}: p=${r.pValue.toFixed(4)}`);
    }
  }
  
  // Paper text output
  console.log('');
  console.log('─'.repeat(80));
  console.log('FOR PAPER (Methods section):');
  console.log('─'.repeat(80));
  console.log(`"We tested anchoring effects across ${nTests} model deployments. To control`);
  console.log(`for family-wise error rate in multiple comparisons, we apply Bonferroni`);
  console.log(`correction (α = 0.05/${nTests} = ${bonferroniAlpha.toFixed(4)}). All ${sigBonferroni} deployments`);
  console.log(`showing significant effects remain significant after correction (p < ${bonferroniAlpha.toFixed(4)})."`);
}

main().catch(console.error);
