#!/usr/bin/env npx tsx
/**
 * Generate all paper statistics from raw JSONL trial data.
 * 
 * This is the canonical source for all stats in the paper.
 * Run: npx tsx scripts/generate-all-paper-stats.ts
 * 
 * Output: Markdown tables matching paper format.
 * If paper stats differ from this output, the paper is wrong.
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// ============================================================================
// Data Loading
// ============================================================================

interface Trial {
  model: string;
  temperature: number;
  anchor: number | null;
  response: number;
  condition: string;
  file: string;
}

function loadAllTrials(): Trial[] {
  const resultsDir = join(process.cwd(), 'results');
  const files = readdirSync(resultsDir).filter(f => f.endsWith('.jsonl'));
  const trials: Trial[] = [];

  for (const file of files) {
    const content = readFileSync(join(resultsDir, file), 'utf-8');
    const lines = content.split('\n').filter(Boolean);
    
    // Parse filename for metadata
    const condition = parseCondition(file);
    const tempMatch = file.match(/-t(\d+)\.jsonl$/);
    const defaultTemp = tempMatch ? parseInt(tempMatch[1]) / 10 : 0;
    const anchorMatch = file.match(/-(\d+)mo-/);
    const defaultAnchor = anchorMatch ? parseInt(anchorMatch[1]) : null;

    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        // Handle different response field names across experiment types
        const response = data.response ?? data.sentenceMonths ?? data.months ?? data.final ?? data.debiasedSentence ?? data.sentence;
        if (typeof response !== 'number' || isNaN(response)) continue;

        trials.push({
          model: normalizeModel(data.model || parseModelFromFile(file)),
          temperature: data.temperature ?? defaultTemp,
          anchor: data.anchor ?? defaultAnchor,
          response,
          condition,
          file,
        });
      } catch {
        // Skip malformed lines
      }
    }
  }

  return trials;
}

function parseCondition(file: string): string {
  if (file.startsWith('baseline-')) return 'baseline';
  if (file.startsWith('low-anchor-')) return 'low-anchor';
  if (file.startsWith('full-sacd-')) return 'full-sacd';
  if (file.startsWith('sacd-')) return 'sacd';
  if (file.startsWith('outside-view-')) return 'outside-view';
  if (file.startsWith('premortem-')) return 'premortem';
  if (file.startsWith('devils-advocate-')) return 'devils-advocate';
  if (file.startsWith('random-control-')) return 'random-control';
  if (file.startsWith('anchoring-')) return 'other';
  return 'unknown';
}

function parseModelFromFile(file: string): string {
  // Extract model from filename patterns like "baseline-claude-haiku-4-5-t0.jsonl"
  const parts = file.replace('.jsonl', '').split('-');
  // Remove condition prefix and temperature suffix
  const filtered = parts.filter((p, i) => {
    if (i === 0 && ['baseline', 'low', 'full', 'sacd', 'outside', 'premortem', 'devils', 'random', 'anchoring'].includes(p)) return false;
    if (p === 'anchor' || p === 'view' || p === 'advocate' || p === 'control' || p === 'sacd') return false;
    if (/^t\d+$/.test(p)) return false;
    if (/^\d+mo$/.test(p)) return false;
    return true;
  });
  return filtered.join('-');
}

function normalizeModel(model: string): string {
  return model
    .replace(/^anthropic\//, '')
    .replace(/^openai\//, '')
    .replace(/^deepseek\//, '')
    .replace(/^moonshotai\//, '')
    .replace(/^zhipu-ai\//, '')
    .replace(/^minimax\//, '')
    .replace(/^openrouter\//, '')
    .replace(/-20\d{6}$/, '') // Remove date suffixes
    .replace('claude-', '')
    .replace('gpt-', 'gpt-')
    .toLowerCase();
}

// ============================================================================
// Statistics
// ============================================================================

interface Stats {
  mean: number;
  sd: number;
  n: number;
  min: number;
  max: number;
}

function computeStats(values: number[]): Stats {
  if (values.length === 0) return { mean: 0, sd: 0, n: 0, min: 0, max: 0 };
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.map(x => (x - mean) ** 2).reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(variance);
  const min = Math.min(...values);
  const max = Math.max(...values);
  return { mean, sd, n, min, max };
}

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const item of arr) {
    const k = key(item);
    if (!groups[k]) groups[k] = [];
    groups[k].push(item);
  }
  return groups;
}

// ============================================================================
// Paper Tables
// ============================================================================

function generateTrialDistributionTable(trials: Trial[]): void {
  console.log('# Table: Trial Distribution by Condition\n');
  console.log('| Condition | Trials | Purpose |');
  console.log('|-----------|--------|---------|');
  
  const conditions = [
    { key: 'baseline', purpose: 'Unanchored responses' },
    { key: 'low-anchor', purpose: 'Standard anchoring effect' },
    { key: 'sacd', purpose: 'Single-pass SACD (Lyu et al.)' },
    { key: 'full-sacd', purpose: 'Iterative SACD (multi-round)' },
    { key: 'outside-view', purpose: 'Sibony: Outside View' },
    { key: 'premortem', purpose: 'Sibony: Premortem' },
    { key: 'devils-advocate', purpose: 'Sibony: Devil\'s Advocate' },
    { key: 'random-control', purpose: 'Structural baseline (irrelevant turns)' },
  ];

  let total = 0;
  for (const { key, purpose } of conditions) {
    const count = trials.filter(t => t.condition === key).length;
    total += count;
    console.log(`| ${key} | ${count.toLocaleString()} | ${purpose} |`);
  }
  
  const other = trials.filter(t => !conditions.map(c => c.key).includes(t.condition)).length;
  if (other > 0) {
    total += other;
    console.log(`| other | ${other.toLocaleString()} | Misc experiments |`);
  }
  
  console.log(`| **Total** | **${total.toLocaleString()}** | |`);
  console.log('');
}

function generateFullSacdTable(trials: Trial[]): void {
  console.log('# Table: Full SACD (Iterative) Effect by Model\n');
  console.log('| Model | SACD Mean | Baseline Mean | Δ | Assessment |');
  console.log('|-------|-----------|---------------|---|------------|');
  
  const baselineTrials = trials.filter(t => t.condition === 'baseline');
  const sacdTrials = trials.filter(t => t.condition === 'full-sacd');
  
  const baselineByModel = groupBy(baselineTrials, t => t.model);
  const sacdByModel = groupBy(sacdTrials, t => t.model);
  
  const models = [...new Set([...Object.keys(baselineByModel), ...Object.keys(sacdByModel)])].sort();
  
  const results: { model: string; delta: number; sacdMean: number; baselineMean: number }[] = [];
  
  for (const model of models) {
    const baselineStats = computeStats((baselineByModel[model] || []).map(t => t.response));
    const sacdStats = computeStats((sacdByModel[model] || []).map(t => t.response));
    
    if (sacdStats.n === 0 || baselineStats.n === 0) continue;
    
    const delta = sacdStats.mean - baselineStats.mean;
    results.push({ model, delta, sacdMean: sacdStats.mean, baselineMean: baselineStats.mean });
  }
  
  // Sort by delta (best debiasing first)
  results.sort((a, b) => a.delta - b.delta);
  
  for (const { model, delta, sacdMean, baselineMean } of results) {
    const assessment = delta < -5 ? '🔥 Strong debiasing' :
                       delta < -1 ? 'Moderate debiasing' :
                       delta < 1 ? 'Minimal effect' :
                       delta < 3 ? '⚠️ Mild backfire' :
                       '⚠️ Backfire';
    console.log(`| ${model} | ${sacdMean.toFixed(1)}mo | ${baselineMean.toFixed(1)}mo | ${delta >= 0 ? '+' : ''}${delta.toFixed(1)}mo | ${assessment} |`);
  }
  console.log('');
}

function generateTechniqueComparisonTable(trials: Trial[]): void {
  console.log('# Table: Sibony Technique Effectiveness (vs Baseline)\n');
  console.log('| Technique | Models Improved | Models Backfired | Avg Δ (raw) |');
  console.log('|-----------|-----------------|------------------|-------------|');
  
  const techniques = ['outside-view', 'devils-advocate', 'random-control', 'premortem', 'full-sacd'];
  const baselineTrials = trials.filter(t => t.condition === 'baseline');
  const baselineByModel = groupBy(baselineTrials, t => t.model);
  
  for (const technique of techniques) {
    const techTrials = trials.filter(t => t.condition === technique);
    const techByModel = groupBy(techTrials, t => t.model);
    
    let improved = 0;
    let backfired = 0;
    const deltas: number[] = [];
    
    for (const model of Object.keys(techByModel)) {
      const baselineStats = computeStats((baselineByModel[model] || []).map(t => t.response));
      const techStats = computeStats(techByModel[model].map(t => t.response));
      
      if (techStats.n === 0 || baselineStats.n === 0) continue;
      
      const delta = techStats.mean - baselineStats.mean;
      deltas.push(delta);
      
      // For anchoring, improvement means moving TOWARD baseline (lower delta magnitude)
      // But we measure vs baseline, so negative delta = lower response = improved
      if (delta < -0.5) improved++;
      else if (delta > 0.5) backfired++;
      else improved++; // Neutral counts as not-backfire
    }
    
    const totalModels = improved + backfired;
    const avgDelta = deltas.length > 0 ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0;
    
    console.log(`| ${technique} | ${improved}/${totalModels} | ${backfired} | ${avgDelta >= 0 ? '+' : ''}${avgDelta.toFixed(1)}mo |`);
  }
  console.log('');
}

function generateRandomControlTable(trials: Trial[]): void {
  console.log('# Table: Random Control Effect by Model\n');
  console.log('| Model | Random Control Δ | Improved? |');
  console.log('|-------|------------------|-----------|');
  
  const baselineTrials = trials.filter(t => t.condition === 'baseline');
  const rcTrials = trials.filter(t => t.condition === 'random-control');
  
  const baselineByModel = groupBy(baselineTrials, t => t.model);
  const rcByModel = groupBy(rcTrials, t => t.model);
  
  const results: { model: string; delta: number }[] = [];
  
  for (const model of Object.keys(rcByModel)) {
    const baselineStats = computeStats((baselineByModel[model] || []).map(t => t.response));
    const rcStats = computeStats(rcByModel[model].map(t => t.response));
    
    if (rcStats.n === 0 || baselineStats.n === 0) continue;
    
    const delta = rcStats.mean - baselineStats.mean;
    results.push({ model, delta });
  }
  
  results.sort((a, b) => a.delta - b.delta);
  
  for (const { model, delta } of results) {
    const improved = delta < 0 ? '✓' : '✗';
    console.log(`| ${model} | ${delta >= 0 ? '+' : ''}${delta.toFixed(1)}mo | ${improved} |`);
  }
  
  const median = results.map(r => r.delta).sort((a, b) => a - b)[Math.floor(results.length / 2)];
  console.log(`\n**Median Random Control effect: ${median.toFixed(1)}mo**`);
  console.log(`**Range: ${Math.min(...results.map(r => r.delta)).toFixed(1)}mo to ${Math.max(...results.map(r => r.delta)).toFixed(1)}mo**`);
  console.log('');
}

function generateTemperatureTable(trials: Trial[]): void {
  console.log('# Table: Temperature × Full SACD Interaction (Backfire Models)\n');
  console.log('| Model | t=0 | t=0.7 | t=1.0 | Best |');
  console.log('|-------|-----|-------|-------|------|');
  
  const sacdTrials = trials.filter(t => t.condition === 'full-sacd');
  
  // Focus on models that showed backfire - use normalized names
  const backfirePatterns = ['opus', 'gpt-5', 'glm'];
  
  // Group by model and temperature (normalize temp to 0, 0.7, 1)
  const byModelTemp: Record<string, Trial[]> = {};
  for (const t of sacdTrials) {
    const normTemp = t.temperature >= 0.9 ? 1 : t.temperature >= 0.5 ? 0.7 : 0;
    const key = `${t.model}|${normTemp}`;
    if (!byModelTemp[key]) byModelTemp[key] = [];
    byModelTemp[key].push(t);
  }
  
  const models = [...new Set(sacdTrials.map(t => t.model))].filter(m => 
    backfirePatterns.some(p => m.toLowerCase().includes(p))
  );
  
  for (const model of models) {
    const t0 = computeStats((byModelTemp[`${model}|0`] || []).map(t => t.response));
    const t07 = computeStats((byModelTemp[`${model}|0.7`] || byModelTemp[`${model}|7`] || []).map(t => t.response));
    const t1 = computeStats((byModelTemp[`${model}|1`] || []).map(t => t.response));
    
    if (t0.n === 0 && t07.n === 0 && t1.n === 0) continue;
    
    const temps = [
      { t: 0, mean: t0.mean, n: t0.n },
      { t: 0.7, mean: t07.mean, n: t07.n },
      { t: 1, mean: t1.mean, n: t1.n },
    ].filter(x => x.n > 0);
    
    const best = temps.reduce((a, b) => a.mean < b.mean ? a : b);
    
    console.log(`| ${model} | ${t0.n > 0 ? t0.mean.toFixed(1) + 'mo' : '-'} | ${t07.n > 0 ? t07.mean.toFixed(1) + 'mo' : '-'} | ${t1.n > 0 ? t1.mean.toFixed(1) + 'mo' : '-'} | t=${best.t} |`);
  }
  console.log('');
}

function generateSummary(trials: Trial[]): void {
  console.log('# Summary Statistics\n');
  
  const byCondition = groupBy(trials, t => t.condition);
  const byModel = groupBy(trials, t => t.model);
  
  console.log(`**Total trials:** ${trials.length.toLocaleString()}`);
  console.log(`**Unique models:** ${Object.keys(byModel).length}`);
  console.log(`**Conditions:** ${Object.keys(byCondition).length}`);
  console.log('');
  
  console.log('## Trials by Condition');
  for (const [condition, t] of Object.entries(byCondition).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`- ${condition}: ${t.length.toLocaleString()}`);
  }
  console.log('');
  
  console.log('## Models');
  for (const model of Object.keys(byModel).sort()) {
    console.log(`- ${model}: ${byModel[model].length} trials`);
  }
}

// ============================================================================
// Main
// ============================================================================

console.log('# bAIs Paper Statistics (Canonical Source)\n');
console.log(`Generated: ${new Date().toISOString()}\n`);
console.log('---\n');

const trials = loadAllTrials();

generateTrialDistributionTable(trials);
generateFullSacdTable(trials);
generateTechniqueComparisonTable(trials);
generateRandomControlTable(trials);
generateTemperatureTable(trials);
generateSummary(trials);

console.log('\n---');
console.log('If paper stats differ from above, update the paper.');
