#!/usr/bin/env npx tsx
/**
 * Statistical analysis for 6-Turn Random Control experiment
 * Adds: Bootstrap CIs, Chi-square test, Cohen's h effect sizes, MAD analysis
 */
import { readFile } from 'node:fs/promises';
import { glob } from 'glob';

interface Trial {
  model: string;
  anchor: number;
  initialSentence: number;
  finalSentence: number;
}

const MODEL_BASELINES: Record<string, number> = {
  'anthropic/claude-haiku-4.5': 29.1,
  'anthropic/claude-sonnet-4-6': 24.1,
  'anthropic/claude-opus-4-6': 18.0,
  'openai/gpt-5.2': 31.8,
};

const MODEL_SHORT: Record<string, string> = {
  'anthropic/claude-haiku-4.5': 'Haiku 4.5',
  'anthropic/claude-sonnet-4-6': 'Sonnet 4.6',
  'anthropic/claude-opus-4-6': 'Opus 4.6',
  'openai/gpt-5.2': 'GPT-5.2',
};

// Bootstrap CI for proportion
function bootstrapCI(data: boolean[], nBoot = 10000, alpha = 0.05): [number, number] {
  const n = data.length;
  const proportions: number[] = [];
  
  for (let i = 0; i < nBoot; i++) {
    let sum = 0;
    for (let j = 0; j < n; j++) {
      sum += data[Math.floor(Math.random() * n)] ? 1 : 0;
    }
    proportions.push(sum / n);
  }
  
  proportions.sort((a, b) => a - b);
  const lower = proportions[Math.floor(nBoot * (alpha / 2))];
  const upper = proportions[Math.floor(nBoot * (1 - alpha / 2))];
  
  return [lower, upper];
}

// Cohen's h effect size for proportions
function cohensH(p1: number, p2: number): number {
  const phi1 = 2 * Math.asin(Math.sqrt(p1));
  const phi2 = 2 * Math.asin(Math.sqrt(p2));
  return phi1 - phi2;
}

// Chi-square test for independence
function chiSquareTest(contingency: number[][]): { chi2: number; df: number; p: number } {
  const rowSums = contingency.map(row => row.reduce((a, b) => a + b, 0));
  const colSums = contingency[0].map((_, j) => contingency.reduce((sum, row) => sum + row[j], 0));
  const total = rowSums.reduce((a, b) => a + b, 0);
  
  let chi2 = 0;
  for (let i = 0; i < contingency.length; i++) {
    for (let j = 0; j < contingency[i].length; j++) {
      const expected = (rowSums[i] * colSums[j]) / total;
      if (expected > 0) {
        chi2 += Math.pow(contingency[i][j] - expected, 2) / expected;
      }
    }
  }
  
  const df = (contingency.length - 1) * (contingency[0].length - 1);
  
  // Approximate p-value using chi-square distribution
  // For large chi2, p is very small
  const p = chi2 > 20 ? 0.0001 : (chi2 > 10 ? 0.01 : (chi2 > 5 ? 0.05 : 0.1));
  
  return { chi2, df, p };
}

// Mean Absolute Deviation from baseline
function mad(values: number[], baseline: number): number {
  return values.reduce((sum, v) => sum + Math.abs(v - baseline), 0) / values.length;
}

async function loadTrials(): Promise<Trial[]> {
  const files = await glob('results/6turn-rc-englich-*.jsonl');
  const trials: Trial[] = [];
  
  for (const file of files) {
    const content = await readFile(file, 'utf-8');
    const lines = content.trim().split('\n').filter(l => l.trim());
    for (const line of lines) {
      try {
        trials.push(JSON.parse(line));
      } catch {}
    }
  }
  
  return trials;
}

async function main() {
  const trials = await loadTrials();
  console.log(`Loaded ${trials.length} trials\n`);
  
  const models = [...new Set(trials.map(t => t.model))];
  
  // 1. Bootstrap CIs for revision rates
  console.log('=== Bootstrap 95% CIs for Revision Rates ===\n');
  
  const revisionData: Record<string, { rate: number; ci: [number, number]; n: number }> = {};
  
  for (const model of models) {
    const modelTrials = trials.filter(t => t.model === model);
    const revised = modelTrials.map(t => t.initialSentence !== t.finalSentence);
    const rate = revised.filter(r => r).length / revised.length;
    const ci = bootstrapCI(revised);
    
    revisionData[model] = { rate, ci, n: modelTrials.length };
    
    console.log(`${MODEL_SHORT[model] || model}:`);
    console.log(`  Rate: ${(rate * 100).toFixed(1)}% [95% CI: ${(ci[0] * 100).toFixed(1)}%-${(ci[1] * 100).toFixed(1)}%]`);
    console.log(`  n = ${modelTrials.length}\n`);
  }
  
  // 2. Chi-square test: Model × Revision interaction
  console.log('=== Chi-Square Test: Model × Revision ===\n');
  
  const contingency: number[][] = [];
  for (const model of models) {
    const modelTrials = trials.filter(t => t.model === model);
    const revised = modelTrials.filter(t => t.initialSentence !== t.finalSentence).length;
    const notRevised = modelTrials.length - revised;
    contingency.push([revised, notRevised]);
  }
  
  const { chi2, df, p } = chiSquareTest(contingency);
  console.log(`χ² = ${chi2.toFixed(2)}, df = ${df}, p < ${p}`);
  console.log(`Interpretation: ${p < 0.05 ? 'Significant model × revision interaction' : 'No significant interaction'}\n`);
  
  // 3. Cohen's h effect sizes (vs Sonnet as reference)
  console.log('=== Effect Sizes (Cohen\'s h vs Sonnet) ===\n');
  
  const sonnetRate = revisionData['anthropic/claude-sonnet-4-6']?.rate || 0.2;
  
  for (const model of models) {
    if (model === 'anthropic/claude-sonnet-4-6') continue;
    const rate = revisionData[model]?.rate || 0;
    const h = cohensH(rate, sonnetRate);
    const interpretation = Math.abs(h) >= 0.8 ? 'Large' : (Math.abs(h) >= 0.5 ? 'Medium' : 'Small');
    
    console.log(`${MODEL_SHORT[model]} vs Sonnet: h = ${h.toFixed(3)} (${interpretation})`);
  }
  
  // 4. MAD analysis: Does revision improve accuracy?
  console.log('\n=== MAD Analysis: Does Revision Improve Accuracy? ===\n');
  
  for (const model of models) {
    const baseline = MODEL_BASELINES[model] || 24;
    const modelTrials = trials.filter(t => t.model === model);
    
    const initials = modelTrials.map(t => t.initialSentence).filter(x => x != null);
    const finals = modelTrials.map(t => t.finalSentence).filter(x => x != null);
    
    const initialMAD = mad(initials, baseline);
    const finalMAD = mad(finals, baseline);
    const improvement = initialMAD - finalMAD;
    
    console.log(`${MODEL_SHORT[model]} (baseline: ${baseline}mo):`);
    console.log(`  Initial MAD: ${initialMAD.toFixed(2)}mo`);
    console.log(`  Final MAD: ${finalMAD.toFixed(2)}mo`);
    console.log(`  Improvement: ${improvement > 0 ? '+' : ''}${improvement.toFixed(2)}mo (${improvement > 0 ? 'BETTER' : 'WORSE'})\n`);
  }
  
  // 5. Direction of change analysis
  console.log('=== Direction of Change Analysis ===\n');
  
  for (const model of models) {
    const baseline = MODEL_BASELINES[model] || 24;
    const modelTrials = trials.filter(t => t.model === model);
    
    let towardBaseline = 0;
    let awayFromBaseline = 0;
    let unchanged = 0;
    
    for (const t of modelTrials) {
      if (t.initialSentence === t.finalSentence) {
        unchanged++;
      } else {
        const initialDist = Math.abs(t.initialSentence - baseline);
        const finalDist = Math.abs(t.finalSentence - baseline);
        if (finalDist < initialDist) towardBaseline++;
        else awayFromBaseline++;
      }
    }
    
    console.log(`${MODEL_SHORT[model]}:`);
    console.log(`  Toward baseline: ${towardBaseline} (${(towardBaseline / modelTrials.length * 100).toFixed(1)}%)`);
    console.log(`  Away from baseline: ${awayFromBaseline} (${(awayFromBaseline / modelTrials.length * 100).toFixed(1)}%)`);
    console.log(`  Unchanged: ${unchanged} (${(unchanged / modelTrials.length * 100).toFixed(1)}%)\n`);
  }
}

main().catch(console.error);
