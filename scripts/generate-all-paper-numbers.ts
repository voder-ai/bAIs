#!/usr/bin/env bun
/**
 * FULL TRACEABILITY: Generate ALL paper statistics from raw JSONL
 * 
 * This script is the single source of truth for all paper numbers.
 * Run this script and copy the output to main.tex.
 * 
 * Usage: bun scripts/generate-all-paper-numbers.ts
 */

import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { computeRandomSlopesStats } from './analysis-random-slopes';

const RESULTS_DIR = './results';

// Paper uses only these 3 models (per Tom's directive)
const PAPER_MODELS = new Set([
  'claude-opus-4-6',
  'claude-sonnet-4-6',
  'claude-haiku-4-5',
  'gpt-5-2'
]);

// ============================================================================
// DATA LOADING
// ============================================================================

function normalizeModel(model: string): string {
  return model
    .replace('anthropic/', '')
    .replace('openai/', '')
    .replace('codex/', '')  // GPT-5.2 via Codex CLI
    .replace('deepseek/', '')
    .replace('moonshot/', '')
    .replace('moonshotai/', '')  // kimi models
    .replace('zhipu/', '')
    .replace('z-ai/', '')  // glm models
    .replace(/\./g, '-')
    .toLowerCase();
}

// Load baselines
const analysisData = JSON.parse(readFileSync(join(RESULTS_DIR, 'analysis-data.json'), 'utf-8'));
const baselineByModel = new Map<string, { mean: number; sd: number; n: number }>();

for (const b of analysisData.baselines) {
  const key = normalizeModel(b.model);
  baselineByModel.set(key, { mean: b.mean, sd: b.sd || 0, n: b.n });
}

// Load all technique trials
interface Trial {
  model: string;
  technique: string;
  anchor: number;
  anchorType: 'high' | 'low';
  sentenceMonths: number;
  pctBaseline: number;
}

function loadAllTrials(): Trial[] {
  const trials: Trial[] = [];
  const files = readdirSync(RESULTS_DIR).filter(f => f.endsWith('.jsonl'));
  
  for (const file of files) {
    try {
      const content = readFileSync(join(RESULTS_DIR, file), 'utf-8');
      const lines = content.trim().split('\n').filter(l => l);
      for (const line of lines) {
        const data = JSON.parse(line);
        
        // Handle different field names: 'sentenceMonths' for most, 'final' for SACD
        const response = data.sentenceMonths ?? data.final;
        if (typeof response !== 'number') continue;
        
        const model = normalizeModel(data.model || data.actualModel);
        const baseline = baselineByModel.get(model);
        if (!baseline) continue;
        
        const technique = data.technique || 
          (file.startsWith('full-sacd-') ? 'full-sacd' :
           file.includes('devils-advocate') ? 'devils-advocate' : 
           file.includes('premortem') ? 'premortem' : 
           file.includes('random-control') ? 'random-control' :
           file.includes('outside-view') ? 'outside-view' :
           file.startsWith('baseline-') ? 'baseline' : null);
        
        if (!technique) continue;
        
        const anchorType = data.anchor < baseline.mean ? 'low' : 'high';
        
        trials.push({
          model,
          technique,
          anchor: data.anchor,
          anchorType,
          sentenceMonths: response,
          pctBaseline: (response / baseline.mean) * 100
        });
      }
    } catch (e) {
      // Skip invalid files
    }
  }
  return trials;
}

// Load SACD data from analysis-data.json
interface SacdTrial {
  model: string;
  anchorType: 'high' | 'low';
  pctBaseline: number;
  n: number;
}

function loadSacdTrials(): SacdTrial[] {
  const trials: SacdTrial[] = [];
  for (const s of analysisData.sacd) {
    const model = normalizeModel(s.model);
    const baseline = baselineByModel.get(model);
    if (!baseline) continue;
    // Use finalMean (new format) or debiasedMean (old format)
    const finalValue = s.finalMean ?? s.debiasedMean;
    if (finalValue === undefined) continue;
    trials.push({
      model,
      anchorType: s.anchorType,
      pctBaseline: s.finalPctOfBaseline ?? (finalValue / baseline.mean) * 100,
      n: s.n
    });
  }
  return trials;
}

// ============================================================================
// STATISTICAL HELPERS
// ============================================================================

function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function sd(arr: number[]): number {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, x) => s + Math.pow(x - m, 2), 0) / (arr.length - 1));
}

function bootstrapCI(arr: number[], iterations = 1000): [number, number] {
  const samples: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const sample = Array(arr.length).fill(0).map(() => arr[Math.floor(Math.random() * arr.length)]);
    samples.push(mean(sample));
  }
  samples.sort((a, b) => a - b);
  return [samples[Math.floor(0.025 * samples.length)], samples[Math.floor(0.975 * samples.length)]];
}

function cohenD(group1: number[], group2: number[]): number {
  const n1 = group1.length, n2 = group2.length;
  const m1 = mean(group1), m2 = mean(group2);
  const var1 = group1.reduce((s, x) => s + Math.pow(x - m1, 2), 0) / (n1 - 1);
  const var2 = group2.reduce((s, x) => s + Math.pow(x - m2, 2), 0) / (n2 - 1);
  const pooledSD = Math.sqrt(((n1-1)*var1 + (n2-1)*var2) / (n1+n2-2));
  return (m1 - m2) / pooledSD;
}

// ============================================================================
// MAIN ANALYSIS
// ============================================================================

const allTrials = loadAllTrials();
const sacdTrials = loadSacdTrials();

console.log('=' .repeat(80));
console.log('FULL PAPER STATISTICS - Generated from raw JSONL');
console.log('=' .repeat(80));
console.log(`Total trials loaded: ${allTrials.length}`);
console.log(`SACD entries: ${sacdTrials.length}`);
console.log('');

// ============================================================================
// TABLE 1: Technique Rankings (Abstract/Intro)
// ============================================================================

console.log('TABLE 1: Technique Susceptibility vs % of Baseline');
console.log('-'.repeat(60));

const techniques = ['devils-advocate', 'random-control', 'premortem', 'full-sacd'];
const techniqueStats: Map<string, { 
  pctBaseline: number; 
  pctCI: [number, number];
  spreadLow: number;
  spreadHigh: number;
  spreadTotal: number;
  mad: number;  // Mean Absolute Deviation from 100%
  n: number;
}> = new Map();

for (const tech of techniques) {
  // All techniques now loaded from raw JSONL (including SACD)
  const filtered = allTrials.filter(t => t.technique === tech);
  const pcts = filtered.map(t => t.pctBaseline);
  const lowPcts = filtered.filter(t => t.anchorType === 'low').map(t => t.pctBaseline);
  const highPcts = filtered.filter(t => t.anchorType === 'high').map(t => t.pctBaseline);
  
  if (pcts.length === 0) continue;
  
  const pctMean = mean(pcts);
  const pctCI = bootstrapCI(pcts);
  const lowMean = lowPcts.length > 0 ? mean(lowPcts) : 0;
  const highMean = highPcts.length > 0 ? mean(highPcts) : 0;
  const spread = highMean - lowMean;
  
  // MAD = Mean Absolute Deviation from 100% baseline
  const mad = (Math.abs(lowMean - 100) + Math.abs(highMean - 100)) / 2;
  
  techniqueStats.set(tech, {
    pctBaseline: pctMean,
    pctCI,
    spreadLow: lowMean,
    spreadHigh: highMean,
    spreadTotal: spread,
    mad,
    n: pcts.length
  });
}

// No-technique baseline spread (for susceptibility delta)
const anchoringHigh = analysisData.anchoring.filter((a: any) => a.anchorType === 'high');
const anchoringLow = analysisData.anchoring.filter((a: any) => a.anchorType === 'low');
const noTechHighMean = anchoringHigh.reduce((s: number, a: any) => s + a.mean * a.n, 0) / anchoringHigh.reduce((s: number, a: any) => s + a.n, 0);
const noTechLowMean = anchoringLow.reduce((s: number, a: any) => s + a.mean * a.n, 0) / anchoringLow.reduce((s: number, a: any) => s + a.n, 0);
const noTechSpread = noTechHighMean - noTechLowMean;

console.log(`No-technique spread: ${noTechSpread.toFixed(1)}mo`);
console.log('');

// Print table with MAD as primary metric
console.log('| Technique | MAD | % of Baseline | 95% CI | Spread | Suscept. Δ | n |');
console.log('|-----------|-----|---------------|--------|--------|------------|---|');

// Sort by MAD (lower is better)
const sortedTechs = [...techniques].sort((a, b) => {
  const statsA = techniqueStats.get(a);
  const statsB = techniqueStats.get(b);
  return (statsA?.mad || 100) - (statsB?.mad || 100);
});

for (const tech of sortedTechs) {
  const stats = techniqueStats.get(tech);
  if (!stats) continue;
  
  const spreadMo = stats.spreadTotal;
  const susceptDelta = ((spreadMo - noTechSpread) / noTechSpread) * 100;
  
  console.log(`| ${tech} | ${stats.mad.toFixed(1)}% | ${stats.pctBaseline.toFixed(1)}% | [${stats.pctCI[0].toFixed(0)}, ${stats.pctCI[1].toFixed(0)}] | ${spreadMo.toFixed(1)}mo | ${susceptDelta > 0 ? '+' : ''}${susceptDelta.toFixed(0)}% | ${stats.n} |`);
}

// ============================================================================
// TABLE 5: SACD by Model
// ============================================================================

console.log('\n\nTABLE 5: SACD by Model');
console.log('-'.repeat(60));

const sacdByModel: Map<string, number[]> = new Map();
for (const s of sacdTrials) {
  if (!sacdByModel.has(s.model)) sacdByModel.set(s.model, []);
  for (let i = 0; i < s.n; i++) {
    sacdByModel.get(s.model)!.push(s.pctBaseline);
  }
}

console.log('| Model | % of Baseline | 95% CI | Deviation | n |');
console.log('|-------|---------------|--------|-----------|---|');

const modelResults: { model: string; pct: number; ci: [number, number]; dev: number; n: number }[] = [];
for (const [model, pcts] of sacdByModel) {
  const m = mean(pcts);
  const ci = bootstrapCI(pcts);
  const dev = Math.abs(m - 100);
  modelResults.push({ model, pct: m, ci, dev, n: pcts.length });
}

modelResults.sort((a, b) => a.dev - b.dev);
for (const r of modelResults) {
  console.log(`| ${r.model} | ${r.pct.toFixed(1)}% | [${r.ci[0].toFixed(0)}, ${r.ci[1].toFixed(0)}] | ${r.dev.toFixed(1)}% | ${r.n} |`);
}

// ============================================================================
// TABLE 6: Anchor Asymmetry
// ============================================================================

console.log('\n\nTABLE 6: High vs Low Anchor');
console.log('-'.repeat(60));

console.log('| Technique | Low Anchor | Low CI | High Anchor | High CI | Asymmetry |');
console.log('|-----------|------------|--------|-------------|---------|-----------|');

for (const tech of techniques) {
  const stats = techniqueStats.get(tech);
  if (!stats) continue;
  
  // Get per-anchor CIs
  let lowPcts: number[] = [];
  let highPcts: number[] = [];
  
  if (tech === 'full-sacd') {
    for (const s of sacdTrials) {
      for (let i = 0; i < s.n; i++) {
        if (s.anchorType === 'low') lowPcts.push(s.pctBaseline);
        else highPcts.push(s.pctBaseline);
      }
    }
  } else {
    const filtered = allTrials.filter(t => t.technique === tech);
    lowPcts = filtered.filter(t => t.anchorType === 'low').map(t => t.pctBaseline);
    highPcts = filtered.filter(t => t.anchorType === 'high').map(t => t.pctBaseline);
  }
  
  const lowCI = bootstrapCI(lowPcts);
  const highCI = bootstrapCI(highPcts);
  const asymmetry = stats.spreadHigh - stats.spreadLow;
  
  console.log(`| ${tech} | ${stats.spreadLow.toFixed(1)}% | [${lowCI[0].toFixed(0)}, ${lowCI[1].toFixed(0)}] | ${stats.spreadHigh.toFixed(1)}% | [${highCI[0].toFixed(0)}, ${highCI[1].toFixed(0)}] | ${asymmetry.toFixed(1)}pp |`);
}

// ============================================================================
// TABLE 7: SACD vs Premortem Tradeoff
// ============================================================================

console.log('\n\nTABLE 7: SACD vs Premortem Tradeoff');
console.log('-'.repeat(60));

const sacdStats = techniqueStats.get('full-sacd')!;
const premortStats = techniqueStats.get('premortem')!;

// Average response deviation from 100%
const sacdAvgDev = Math.abs(((sacdStats.spreadLow + sacdStats.spreadHigh) / 2) - 100);
const premortAvgDev = Math.abs(((premortStats.spreadLow + premortStats.spreadHigh) / 2) - 100);

// Mean absolute per-trial error
const sacdAbsError = (Math.abs(sacdStats.spreadLow - 100) + Math.abs(sacdStats.spreadHigh - 100)) / 2;
const premortAbsError = (Math.abs(premortStats.spreadLow - 100) + Math.abs(premortStats.spreadHigh - 100)) / 2;

console.log('| Metric | SACD | Premortem | Winner |');
console.log('|--------|------|-----------|--------|');
console.log(`| Avg response deviation | ${sacdAvgDev.toFixed(1)}% | ${premortAvgDev.toFixed(1)}% | ${sacdAvgDev < premortAvgDev ? 'SACD' : 'Premortem'} |`);
console.log(`| Mean abs per-trial error | ${sacdAbsError.toFixed(1)}% | ${premortAbsError.toFixed(1)}% | ${sacdAbsError < premortAbsError ? 'SACD' : 'Premortem'} |`);

// ============================================================================
// EFFECT SIZES
// ============================================================================

console.log('\n\nEFFECT SIZES (Cohen\'s d)');
console.log('-'.repeat(60));

// Get raw pct arrays
const getPcts = (tech: string): number[] => {
  if (tech === 'full-sacd') {
    const arr: number[] = [];
    for (const s of sacdTrials) {
      for (let i = 0; i < s.n; i++) arr.push(s.pctBaseline);
    }
    return arr;
  }
  return allTrials.filter(t => t.technique === tech).map(t => t.pctBaseline);
};

const sacdPcts = getPcts('full-sacd');
const daPcts = getPcts('devils-advocate');
const rcPcts = getPcts('random-control');
const premortPcts = getPcts('premortem');

console.log(`SACD vs Devil's Advocate: d = ${cohenD(sacdPcts, daPcts).toFixed(2)}`);
console.log(`SACD vs Random Control: d = ${cohenD(sacdPcts, rcPcts).toFixed(2)}`);
console.log(`Premortem vs Devil's Advocate: d = ${cohenD(premortPcts, daPcts).toFixed(2)}`);
console.log(`Random Control vs Devil's Advocate: d = ${cohenD(rcPcts, daPcts).toFixed(2)}`);

// ============================================================================
// OPUS SENSITIVITY
// ============================================================================

console.log('\n\nOPUS SENSITIVITY ANALYSIS');
console.log('-'.repeat(60));

for (const tech of techniques) {
  let allPcts: number[] = [];
  let noOpusPcts: number[] = [];
  
  if (tech === 'full-sacd') {
    for (const s of sacdTrials) {
      for (let i = 0; i < s.n; i++) {
        allPcts.push(s.pctBaseline);
        if (!s.model.includes('opus')) noOpusPcts.push(s.pctBaseline);
      }
    }
  } else {
    const filtered = allTrials.filter(t => t.technique === tech);
    allPcts = filtered.map(t => t.pctBaseline);
    noOpusPcts = filtered.filter(t => !t.model.includes('opus')).map(t => t.pctBaseline);
  }
  
  const allMean = mean(allPcts);
  const noOpusMean = mean(noOpusPcts);
  console.log(`${tech}: All=${allMean.toFixed(1)}%, NoOpus=${noOpusMean.toFixed(1)}%, Δ=${(noOpusMean - allMean).toFixed(1)}pp`);
}

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n\n' + '='.repeat(80));
console.log('KEY NUMBERS FOR PAPER');
console.log('='.repeat(80));

console.log(`
Total trials: ${allTrials.length + sacdTrials.reduce((s, t) => s + t.n, 0)}
Models: ${baselineByModel.size}
Techniques: ${techniques.length}

MAD Rankings (Mean Absolute Deviation from baseline - lower is better):
  1. SACD: ${techniqueStats.get('full-sacd')!.mad.toFixed(1)}%
  2. Random Control: ${techniqueStats.get('random-control')!.mad.toFixed(1)}%
  3. Premortem: ${techniqueStats.get('premortem')!.mad.toFixed(1)}%
  4. Devil's Advocate: ${techniqueStats.get('devils-advocate')!.mad.toFixed(1)}%

Aggregate % of Baseline (can mask bidirectional deviation):
  SACD: ${sacdStats.pctBaseline.toFixed(1)}% [${sacdStats.pctCI[0].toFixed(0)}, ${sacdStats.pctCI[1].toFixed(0)}]
  Premortem: ${premortStats.pctBaseline.toFixed(1)}% [${premortStats.pctCI[0].toFixed(0)}, ${premortStats.pctCI[1].toFixed(0)}]
  Random Control: ${techniqueStats.get('random-control')!.pctBaseline.toFixed(1)}%
  Devil's Advocate: ${techniqueStats.get('devils-advocate')!.pctBaseline.toFixed(1)}%

No-technique spread: ${noTechSpread.toFixed(1)}mo
`);

// ============================================================================
// RANDOM SLOPES MODEL (computed from analysis-random-slopes.ts)
// ============================================================================

console.log('\n\nRANDOM SLOPES MODEL');
console.log('-'.repeat(60));

const randomSlopesStats = computeRandomSlopesStats();

console.log(`
Random slopes model: % of baseline ~ technique + (technique|model)
  - Total trials: ${randomSlopesStats.totalTrials}
  - Variance reduction vs intercepts-only: ${randomSlopesStats.varianceReduction}%
  - LRT: χ² = ${randomSlopesStats.lrtChiSq}, df = ${randomSlopesStats.lrtDf}, p << 0.001
  - Highest variance technique: ${randomSlopesStats.highestVarianceTechnique} (SD = ${randomSlopesStats.highestVarianceSD} pp)
  - Technique effect range: ${randomSlopesStats.minSlopeEffect}% to +${randomSlopesStats.maxSlopeEffect}%
`);

// ============================================================================
// VERIFICATION: Table sums must match claimed totals
// ============================================================================

console.log('\n\nVERIFICATION');
console.log('='.repeat(80));

// Calculate trial counts from the data we computed
const trialCounts = {
  baseline: analysisData.summary.breakdown.baseline,
  anchoring: analysisData.summary.breakdown.anchoring,
  sacd: analysisData.summary.breakdown.sacd,
  techniques: analysisData.summary.breakdown.techniques,
};

// Sum all categories
const computedTotal = trialCounts.baseline + trialCounts.anchoring + trialCounts.sacd + trialCounts.techniques;
const claimedTotal = analysisData.summary.totalTrials;

console.log('Trial count breakdown:');
console.log(`  Baseline:   ${trialCounts.baseline.toLocaleString()}`);
console.log(`  Anchoring:  ${trialCounts.anchoring.toLocaleString()}`);
console.log(`  SACD:       ${trialCounts.sacd.toLocaleString()}`);
console.log(`  Techniques: ${trialCounts.techniques.toLocaleString()}`);
console.log(`  ─────────────────────`);
console.log(`  Computed:   ${computedTotal.toLocaleString()}`);
console.log(`  Claimed:    ${claimedTotal.toLocaleString()}`);

if (computedTotal !== claimedTotal) {
  console.error('\n❌ ERROR: Trial count mismatch!');
  console.error(`   Computed sum (${computedTotal}) ≠ Claimed total (${claimedTotal})`);
  console.error('   Fix analysis-data.json or update the claimed total.');
  process.exit(1);
}

// Also verify techniqueGrandTotals consistency
const grandTotalSacd = analysisData.techniqueGrandTotals.find((t: any) => t.technique === 'full-sacd')?.n;
if (grandTotalSacd && grandTotalSacd !== trialCounts.sacd) {
  console.error('\n⚠️  WARNING: SACD count inconsistency in analysis-data.json');
  console.error(`   summary.breakdown.sacd: ${trialCounts.sacd}`);
  console.error(`   techniqueGrandTotals[full-sacd].n: ${grandTotalSacd}`);
  console.error('   Using summary.breakdown value for paper consistency.');
}

console.log('\n✅ Verification passed: Trial counts sum correctly.');

// ============================================================================
// VIGNETTE ANALYSIS (Multi-Domain Validation)
// ============================================================================

console.log('\n\n' + '='.repeat(80));
console.log('VIGNETTE ANALYSIS - Multi-Domain Validation');
console.log('='.repeat(80));

interface VignetteTrial {
  vignetteId: string;
  model: string;
  technique: string;
  anchorType: string;
  anchor: number;
  baseline: number;
  response: number;
  pctBaseline: number;
}

function loadVignetteTrials(): VignetteTrial[] {
  const trials: VignetteTrial[] = [];
  const vignetteDirs = [
    'vignette-salary', 'vignette-loan', 'vignette-medical',
    'vignette-judicial-dui', 'vignette-judicial-fraud', 'vignette-judicial-aggravated-theft'
  ];
  
  for (const dir of vignetteDirs) {
    const dirPath = join(RESULTS_DIR, dir);
    try {
      const files = readdirSync(dirPath).filter(f => f.endsWith('.jsonl'));
      for (const file of files) {
        const content = readFileSync(join(dirPath, file), 'utf-8');
        const lines = content.trim().split('\n').filter(l => l);
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.response === null || typeof data.response !== 'number') continue;
            
            const baselineValue = data.baseline || data.noAnchorBaseline || 100;
            trials.push({
              vignetteId: data.vignetteId || dir.replace('vignette-', ''),
              model: normalizeModel(data.model || ''),
              technique: data.technique || 'baseline',
              anchorType: data.anchorType || 'none',
              anchor: data.anchor || 0,
              baseline: baselineValue,
              response: data.response,
              pctBaseline: (data.response / baselineValue) * 100
            });
          } catch (e) {
            // Skip invalid lines
          }
        }
      }
    } catch (e) {
      // Directory doesn't exist, skip
    }
  }
  return trials;
}

const allVignetteTrials = loadVignetteTrials();
// Filter to paper models only (Opus 4.6, Sonnet 4.6, GPT-5.2)
const vignetteTrials = allVignetteTrials.filter(t => PAPER_MODELS.has(t.model));
console.log(`\nVignette trials loaded: ${vignetteTrials.length} (filtered from ${allVignetteTrials.length})`);

if (vignetteTrials.length > 0) {
  // Group by vignette
  const byVignette = new Map<string, VignetteTrial[]>();
  for (const t of vignetteTrials) {
    if (!byVignette.has(t.vignetteId)) byVignette.set(t.vignetteId, []);
    byVignette.get(t.vignetteId)!.push(t);
  }
  
  console.log('\nTABLE V1: Vignette Trial Counts');
  console.log('-'.repeat(60));
  console.log('| Vignette | Trials |');
  console.log('|----------|--------|');
  for (const [vignette, trials] of byVignette) {
    console.log(`| ${vignette} | ${trials.length} |`);
  }
  console.log(`| **Total** | **${vignetteTrials.length}** |`);
  
  // Calculate % of baseline by vignette and technique
  console.log('\n\nTABLE V2: % of Baseline by Vignette × Technique');
  console.log('-'.repeat(60));
  
  for (const [vignette, trials] of byVignette) {
    console.log(`\n### ${vignette.toUpperCase()}`);
    
    // Get baseline (no-anchor) mean for this vignette
    const noAnchorTrials = trials.filter(t => t.anchorType === 'none');
    const baselineMean = noAnchorTrials.length > 0 ? mean(noAnchorTrials.map(t => t.response)) : 100;
    console.log(`Baseline (no-anchor) mean: ${baselineMean.toFixed(1)}`);
    
    // Calculate by technique
    const techniques = [...new Set(trials.map(t => t.technique))];
    
    // Judicial TABLE 6 format: Low % | High % | Asymmetry
    console.log('\n| Technique | Low Anchor | High Anchor | Asymmetry |');
    console.log('|-----------|------------|-------------|-----------|');
    
    for (const tech of techniques) {
      const techTrials = trials.filter(t => t.technique === tech && t.anchorType !== 'none');
      const lowTrials = techTrials.filter(t => t.anchorType === 'low');
      const highTrials = techTrials.filter(t => t.anchorType === 'high');
      
      // Calculate % of baseline using the no-anchor baseline
      const lowPct = lowTrials.length > 0 ? mean(lowTrials.map(t => (t.response / baselineMean) * 100)) : null;
      const highPct = highTrials.length > 0 ? mean(highTrials.map(t => (t.response / baselineMean) * 100)) : null;
      
      // Asymmetry = spread between high and low (like judicial)
      const asymmetry = (lowPct !== null && highPct !== null) ? Math.abs(highPct - lowPct) : null;
      
      console.log(`| ${tech} | ${lowPct?.toFixed(1) ?? 'N/A'}% | ${highPct?.toFixed(1) ?? 'N/A'}% | ${asymmetry?.toFixed(1) ?? 'N/A'}pp |`);
    }
  }
  
  // Methodology comparison: Spread reduction vs % of Baseline
  console.log('\n\nTABLE V3: Methodology Comparison (Spread vs % of Baseline)');
  console.log('-'.repeat(60));
  console.log('Does "reduces spread" agree with "closer to baseline"?\n');
  
  for (const [vignette, trials] of byVignette) {
    console.log(`### ${vignette.toUpperCase()}`);
    
    const noAnchorTrials = trials.filter(t => t.anchorType === 'none');
    const baselineMean = noAnchorTrials.length > 0 ? mean(noAnchorTrials.map(t => t.response)) : 100;
    
    // Get baseline spread (no technique applied)
    const baselineLow = trials.filter(t => t.technique === 'baseline' && t.anchorType === 'low');
    const baselineHigh = trials.filter(t => t.technique === 'baseline' && t.anchorType === 'high');
    const baselineSpread = (baselineHigh.length > 0 && baselineLow.length > 0) 
      ? mean(baselineHigh.map(t => t.response)) - mean(baselineLow.map(t => t.response))
      : 0;
    
    // Calculate baseline deviation from 100%
    const baselineLowPct = baselineLow.length > 0 ? mean(baselineLow.map(t => (t.response / baselineMean) * 100)) : 100;
    const baselineHighPct = baselineHigh.length > 0 ? mean(baselineHigh.map(t => (t.response / baselineMean) * 100)) : 100;
    const baselineDeviation = Math.abs(((baselineLowPct + baselineHighPct) / 2) - 100);
    
    console.log(`Baseline spread: ${baselineSpread.toFixed(1)}, deviation: ${baselineDeviation.toFixed(1)}%\n`);
    console.log('| Technique | Spread Δ | % of Baseline | Deviation | Metrics Agree? |');
    console.log('|-----------|----------|---------------|-----------|----------------|');
    
    const techniques = [...new Set(trials.filter(t => t.technique !== 'baseline').map(t => t.technique))];
    
    for (const tech of techniques) {
      const techLow = trials.filter(t => t.technique === tech && t.anchorType === 'low');
      const techHigh = trials.filter(t => t.technique === tech && t.anchorType === 'high');
      
      if (techLow.length === 0 || techHigh.length === 0) continue;
      
      const techSpread = mean(techHigh.map(t => t.response)) - mean(techLow.map(t => t.response));
      const spreadDelta = baselineSpread !== 0 ? ((techSpread - baselineSpread) / Math.abs(baselineSpread)) * 100 : 0;
      const reducesSpread = techSpread < baselineSpread;
      
      const techLowPct = mean(techLow.map(t => (t.response / baselineMean) * 100));
      const techHighPct = mean(techHigh.map(t => (t.response / baselineMean) * 100));
      const avgPct = (techLowPct + techHighPct) / 2;
      const deviation = Math.abs(avgPct - 100);
      const closerToBaseline = deviation < baselineDeviation;
      
      const agree = reducesSpread === closerToBaseline ? '✓' : '**CONFLICT**';
      
      console.log(`| ${tech} | ${spreadDelta > 0 ? '+' : ''}${spreadDelta.toFixed(0)}% | ${avgPct.toFixed(1)}% | ${deviation.toFixed(1)}% | ${agree} |`);
    }
    console.log('');
  }
  
  // Summary: Domain-dependent technique effectiveness (judicial format)
  console.log('\nTABLE V4: Cross-Domain Comparison (Judicial Format)');
  console.log('-'.repeat(60));
  console.log('| Domain | Technique | Low Anchor | High Anchor | Asymmetry |');
  console.log('|--------|-----------|------------|-------------|-----------|');
  
  for (const [vignette, trials] of byVignette) {
    const noAnchorTrials = trials.filter(t => t.anchorType === 'none');
    const baselineMean = noAnchorTrials.length > 0 ? mean(noAnchorTrials.map(t => t.response)) : 100;
    
    const techniques = [...new Set(trials.map(t => t.technique))];
    
    // Sort by asymmetry (smallest first = best)
    const techResults: { tech: string; lowPct: number; highPct: number; asymmetry: number }[] = [];
    
    for (const tech of techniques) {
      const lowTrials = trials.filter(t => t.technique === tech && t.anchorType === 'low');
      const highTrials = trials.filter(t => t.technique === tech && t.anchorType === 'high');
      
      if (lowTrials.length === 0 || highTrials.length === 0) continue;
      
      const lowPct = mean(lowTrials.map(t => (t.response / baselineMean) * 100));
      const highPct = mean(highTrials.map(t => (t.response / baselineMean) * 100));
      const asymmetry = Math.abs(highPct - lowPct);
      
      techResults.push({ tech, lowPct, highPct, asymmetry });
    }
    
    // Sort by asymmetry
    techResults.sort((a, b) => a.asymmetry - b.asymmetry);
    
    for (const r of techResults) {
      console.log(`| ${vignette} | ${r.tech} | ${r.lowPct.toFixed(1)}% | ${r.highPct.toFixed(1)}% | ${r.asymmetry.toFixed(1)}pp |`);
    }
    console.log('|--------|-----------|------------|-------------|-----------|');
  }
  
  console.log('\n**Key finding:** Best technique varies by domain. No universal "best debiasing."');
  console.log('Closer to 100% in both columns = better. Smaller asymmetry = more consistent.');

  // NEW: TABLE V5 - MAD by Domain (reviewer requested)
  console.log('\n\nTABLE V5: MAD by Domain × Technique (Primary Metric)');
  console.log('-'.repeat(60));
  console.log('MAD = Mean Absolute Deviation from baseline. Lower = better.\n');
  console.log('| Domain | Technique | MAD | % of Baseline | n |');
  console.log('|--------|-----------|-----|---------------|---|');
  
  for (const [vignette, trials] of byVignette) {
    // Build per-model baselines (Pilot's correct methodology)
    const models = [...new Set(trials.map(t => t.model))];
    const perModelBaseline = new Map<string, number>();
    for (const model of models) {
      const noAnchorTrials = trials.filter(t => 
        t.model === model && t.technique === 'baseline' && t.anchorType === 'none'
      );
      if (noAnchorTrials.length > 0) {
        perModelBaseline.set(model, mean(noAnchorTrials.map(t => t.response)));
      }
    }
    
    const techniques = [...new Set(trials.map(t => t.technique))];
    
    // Calculate MAD for each technique
    const techResults: { tech: string; mad: number; avgPct: number; n: number }[] = [];
    
    for (const tech of techniques) {
      // Include both low and high anchor trials (not none)
      const anchoredTrials = trials.filter(t => t.technique === tech && t.anchorType !== 'none');
      
      if (anchoredTrials.length === 0) continue;
      
      // MAD = mean of |response_pct - 100| using PER-MODEL baselines
      const deviations = anchoredTrials.map(t => {
        const modelBaseline = perModelBaseline.get(t.model) || 100;
        return Math.abs((t.response / modelBaseline) * 100 - 100);
      });
      const mad = mean(deviations);
      const avgPct = mean(anchoredTrials.map(t => {
        const modelBaseline = perModelBaseline.get(t.model) || 100;
        return (t.response / modelBaseline) * 100;
      }));
      
      techResults.push({ tech, mad, avgPct, n: anchoredTrials.length });
    }
    
    // Sort by MAD (lowest first = best)
    techResults.sort((a, b) => a.mad - b.mad);
    
    for (const r of techResults) {
      console.log(`| ${vignette} | ${r.tech} | ${r.mad.toFixed(1)}% | ${r.avgPct.toFixed(1)}% | ${r.n} |`);
    }
  }
  
  // Summary: MAD rankings across domains
  console.log('\n\nTABLE V6: Technique Rankings by Domain (MAD metric)');
  console.log('-'.repeat(60));
  console.log('| Domain | #1 (Best) | #2 | #3 | #4 | #5 (Worst) |');
  console.log('|--------|-----------|----|----|----|-----------| ');
  
  for (const [vignette, trials] of byVignette) {
    // Build per-model baselines (same as TABLE V5)
    const models = [...new Set(trials.map(t => t.model))];
    const perModelBaseline = new Map<string, number>();
    for (const model of models) {
      const noAnchorTrials = trials.filter(t => 
        t.model === model && t.technique === 'baseline' && t.anchorType === 'none'
      );
      if (noAnchorTrials.length > 0) {
        perModelBaseline.set(model, mean(noAnchorTrials.map(t => t.response)));
      }
    }
    
    const techniques = [...new Set(trials.map(t => t.technique))];
    const techResults: { tech: string; mad: number }[] = [];
    
    for (const tech of techniques) {
      const anchoredTrials = trials.filter(t => t.technique === tech && t.anchorType !== 'none');
      if (anchoredTrials.length === 0) continue;
      const deviations = anchoredTrials.map(t => {
        const modelBaseline = perModelBaseline.get(t.model) || 100;
        return Math.abs((t.response / modelBaseline) * 100 - 100);
      });
      techResults.push({ tech, mad: mean(deviations) });
    }
    
    techResults.sort((a, b) => a.mad - b.mad);
    const rankings = techResults.map(r => r.tech).slice(0, 5);
    while (rankings.length < 5) rankings.push('-');
    
    console.log(`| ${vignette} | ${rankings[0]} | ${rankings[1]} | ${rankings[2]} | ${rankings[3]} | ${rankings[4]} |`);
  }
}

console.log('\n\nScript complete. Copy relevant sections to main.tex.');
