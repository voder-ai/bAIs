#!/usr/bin/env npx tsx
/**
 * Comprehensive Validation Script for bAIs Paper
 * 
 * Validates ALL experiments across:
 * - Baseline (no anchor)
 * - Low anchor (3mo)
 * - High anchor (symmetric: 2×baseline - 3)
 * 
 * With all debiasing techniques:
 * - None (raw anchoring)
 * - SACD (multi-turn protocol)
 * - Context-Hygiene (Sibony)
 * - Premortem (Sibony)
 * - Disclosure ("randomly determined")
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const RESULTS_DIR = join(__dirname, '../results');

// Model baseline mappings (from paper)
const MODEL_BASELINES: Record<string, number> = {
  'opus-4.5': 22,
  'opus-4.6': 18,
  'sonnet-4.5': 22,
  'haiku-4.5': 34,
  'haiku-3.5': 12,
  'hermes-405b': 12,
  'llama-3.3': 12,
  'o3-mini': 12,
  'o1': 12,
  'gpt-4o': 24,
  'gpt-5.2': 24,
  'minimax': 12,
};

// Symmetric high anchor formula: 2×baseline - 3
const getHighAnchor = (model: string) => {
  const baseline = MODEL_BASELINES[model] || 12;
  return 2 * baseline - 3;
};

interface ExperimentResult {
  model: string;
  anchor: number | null;
  anchorType: 'baseline' | 'low' | 'high';
  technique: string;
  response: number;
  file: string;
}

interface Stats {
  n: number;
  mean: number;
  sd: number;
  responses: number[];
}

function normalizeModel(raw: string, filename: string): string {
  const s = (raw || '').toLowerCase() + ' ' + filename.toLowerCase();
  
  if (s.includes('opus-4-5') || s.includes('opus-4.5') || s.includes('opus45')) return 'opus-4.5';
  if (s.includes('opus-4-6') || s.includes('opus-4.6') || s.includes('opus46')) return 'opus-4.6';
  if (s.includes('sonnet-4-5') || s.includes('sonnet-4.5') || s.includes('sonnet4') || s.includes('sonnet45')) return 'sonnet-4.5';
  if (s.includes('haiku-4-5') || s.includes('haiku-4.5') || s.includes('haiku45')) return 'haiku-4.5';
  if (s.includes('haiku-3-5') || s.includes('haiku-3.5') || s.includes('haiku35')) return 'haiku-3.5';
  if (s.includes('hermes') || s.includes('405b')) return 'hermes-405b';
  if (s.includes('llama-3.3') || s.includes('llama33') || s.includes('llama-3-3')) return 'llama-3.3';
  if (s.includes('o3-mini') || s.includes('o3mini')) return 'o3-mini';
  if ((s.includes('o1') || s.includes('/o1')) && !s.includes('o3')) return 'o1';
  if (s.includes('gpt-4o') || s.includes('gpt4o')) return 'gpt-4o';
  if (s.includes('gpt-5') || s.includes('gpt5') || s.includes('gpt52') || s.includes('gpt53')) return 'gpt-5.2';
  if (s.includes('minimax') || s.includes('m2.5') || s.includes('m25')) return 'minimax';
  
  return '';
}

function classifyAnchor(anchor: number | null, model: string): 'baseline' | 'low' | 'high' | 'other' {
  if (anchor === null || anchor === 0) return 'baseline';
  if (anchor <= 9) return 'low';
  
  const highAnchor = getHighAnchor(model);
  // Allow some tolerance for high anchor matching
  if (Math.abs(anchor - highAnchor) <= 5) return 'high';
  if (anchor >= 20) return 'high'; // Treat all large anchors as high
  
  return 'other';
}

function detectTechnique(obj: any, filename: string): string {
  const f = filename.toLowerCase();
  const cond = (obj.condition || obj.conditionId || '').toLowerCase();
  const exp = (obj.experimentId || '').toLowerCase();
  const tech = (obj.technique || '').toLowerCase();
  
  // Direct technique field (Sibony files have this)
  if (tech === 'context-hygiene' || tech === 'ch') return 'context-hygiene';
  if (tech === 'premortem') return 'premortem';
  if (tech === 'sacd') return 'sacd';
  if (tech === 'disclosure') return 'disclosure';
  if (tech === 'none' || tech === 'baseline') return 'none';
  
  // Sibony techniques from filename/condition
  if (f.includes('sibony') || cond.includes('sibony')) {
    if (f.includes('premortem') || cond.includes('premortem')) return 'premortem';
    if (f.includes('context-hygiene') || cond.includes('context-hygiene') || cond.includes('ch')) return 'context-hygiene';
    // Default sibony = context-hygiene
    return 'context-hygiene';
  }
  
  // SACD
  if (f.includes('sacd') || exp.includes('sacd') || cond.includes('sacd')) return 'sacd';
  
  // Disclosure (Englich-style)
  if (f.includes('englich') || exp.includes('disclosure') || cond.includes('englich')) return 'disclosure';
  
  // Baseline/anchoring without debiasing
  if (f.includes('baseline') || f.includes('no-anchor') || cond.includes('baseline')) return 'none';
  if (f.includes('anchoring') && !f.includes('sacd') && !f.includes('sibony')) return 'anchored';
  
  return 'unknown';
}

function parseFile(filename: string): ExperimentResult[] {
  const filepath = join(RESULTS_DIR, filename);
  const content = readFileSync(filepath, 'utf-8');
  const lines = content.trim().split('\n').filter(l => l.trim());
  const results: ExperimentResult[] = [];
  
  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      
      // Extract model
      const model = normalizeModel(obj.model || obj.modelId || '', filename);
      if (!model) continue;
      
      // Extract anchor
      let anchor: number | null = null;
      if (obj.anchor !== undefined) anchor = Number(obj.anchor);
      else if (obj.params?.prosecutorRecommendationMonths !== undefined) anchor = obj.params.prosecutorRecommendationMonths;
      else if (obj.condition?.anchor !== undefined) anchor = obj.condition.anchor;
      
      // Extract response (sentenceMonths)
      let response: number | null = null;
      if (obj.sentenceMonths !== undefined) response = Number(obj.sentenceMonths);
      else if (obj.result?.sentenceMonths !== undefined) response = Number(obj.result.sentenceMonths);
      else if (obj.response !== undefined) response = Number(obj.response);
      else if (obj.recommendation !== undefined) response = Number(obj.recommendation);
      
      if (response === null || isNaN(response)) continue;
      
      // Classify anchor type
      const anchorType = classifyAnchor(anchor, model);
      if (anchorType === 'other') continue;
      
      // Detect technique
      const technique = detectTechnique(obj, filename);
      
      results.push({
        model,
        anchor,
        anchorType,
        technique,
        response,
        file: filename,
      });
    } catch (e) {
      // Skip malformed lines
    }
  }
  
  return results;
}

function computeStats(responses: number[]): Stats {
  if (responses.length === 0) return { n: 0, mean: 0, sd: 0, responses: [] };
  const n = responses.length;
  const mean = responses.reduce((a, b) => a + b, 0) / n;
  const variance = responses.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
  return { n, mean, sd: Math.sqrt(variance), responses };
}

function main() {
  console.log('='.repeat(90));
  console.log('bAIs COMPREHENSIVE EXPERIMENT VALIDATION');
  console.log('='.repeat(90));
  console.log();
  
  // Read all JSONL files
  const files = readdirSync(RESULTS_DIR).filter(f => f.endsWith('.jsonl'));
  console.log(`Found ${files.length} result files\n`);
  
  // Parse all files
  const allResults: ExperimentResult[] = [];
  for (const file of files) {
    const results = parseFile(file);
    allResults.push(...results);
  }
  console.log(`Parsed ${allResults.length} valid trials\n`);
  
  // Group by model → anchorType → technique
  const matrix: Record<string, Record<string, Record<string, number[]>>> = {};
  
  for (const r of allResults) {
    if (!matrix[r.model]) matrix[r.model] = {};
    if (!matrix[r.model][r.anchorType]) matrix[r.model][r.anchorType] = {};
    if (!matrix[r.model][r.anchorType][r.technique]) matrix[r.model][r.anchorType][r.technique] = [];
    matrix[r.model][r.anchorType][r.technique].push(r.response);
  }
  
  // Models in paper order
  const models = ['opus-4.5', 'opus-4.6', 'sonnet-4.5', 'haiku-4.5', 'haiku-3.5', 
                  'hermes-405b', 'llama-3.3', 'o3-mini', 'o1', 'gpt-4o', 'gpt-5.2', 'minimax'];
  const anchorTypes = ['baseline', 'low', 'high'];
  const techniques = ['none', 'anchored', 'sacd', 'context-hygiene', 'premortem', 'disclosure'];
  
  // Print summary tables
  for (const anchorType of anchorTypes) {
    console.log('='.repeat(90));
    console.log(`${anchorType.toUpperCase()} ANCHOR EXPERIMENTS`);
    console.log('='.repeat(90));
    console.log();
    
    // Header
    console.log('| Model       | Baseline | None   | Anchored | SACD   | C-H    | Pre    | Disc   |');
    console.log('|-------------|----------|--------|----------|--------|--------|--------|--------|');
    
    for (const model of models) {
      const data = matrix[model]?.[anchorType] || {};
      const baseline = MODEL_BASELINES[model] || 12;
      
      const format = (t: string) => {
        const responses = data[t];
        if (!responses || responses.length === 0) return '-      ';
        const stats = computeStats(responses);
        return `${stats.mean.toFixed(0).padStart(2)}mo(${stats.n})`;
      };
      
      console.log(`| ${model.padEnd(11)} | ${String(baseline).padEnd(8)} | ${format('none')} | ${format('anchored')} | ${format('sacd')} | ${format('context-hygiene')} | ${format('premortem')} | ${format('disclosure')} |`);
    }
    console.log();
  }
  
  // HIGH ANCHOR DETAILED TABLE (for paper)
  console.log('='.repeat(90));
  console.log('HIGH ANCHOR PAPER TABLE (Debiasing Effect %)');
  console.log('='.repeat(90));
  console.log();
  console.log('| Model       | Anchor | Raw→Baseline | SACD | C-H  | Pre  | Disc |');
  console.log('|-------------|--------|--------------|------|------|------|------|');
  
  for (const model of models) {
    const baseline = MODEL_BASELINES[model];
    const highAnchor = getHighAnchor(model);
    const data = matrix[model]?.high || {};
    
    // Get raw anchored response (no debiasing)
    const rawResponses = data['anchored'] || data['none'] || [];
    const rawStats = computeStats(rawResponses);
    
    const calcEffect = (technique: string) => {
      const responses = data[technique];
      if (!responses || responses.length === 0) return '-    ';
      const stats = computeStats(responses);
      // Effect = how close to baseline vs raw anchored
      // Positive = moved toward baseline, negative = over-corrected past baseline
      if (rawStats.n === 0) {
        // No raw data, compare to baseline directly
        const effect = ((baseline - stats.mean) / baseline * 100);
        return `${effect >= 0 ? '+' : ''}${effect.toFixed(0)}%`.padStart(5);
      }
      // Debiasing effect as % of gap closed
      const rawGap = rawStats.mean - baseline;
      const newGap = stats.mean - baseline;
      if (Math.abs(rawGap) < 1) return '0%   '; // Already at baseline
      const effect = ((rawGap - newGap) / rawGap * 100);
      return `${effect >= 0 ? '+' : ''}${effect.toFixed(0)}%`.padStart(5);
    };
    
    const rawVal = rawStats.n > 0 ? `${rawStats.mean.toFixed(0)}→${baseline}` : `-`;
    
    console.log(`| ${model.padEnd(11)} | ${String(highAnchor).padEnd(6)} | ${rawVal.padEnd(12)} | ${calcEffect('sacd')} | ${calcEffect('context-hygiene')} | ${calcEffect('premortem')} | ${calcEffect('disclosure')} |`);
  }
  console.log();
  
  // Coverage gaps
  console.log('='.repeat(90));
  console.log('COVERAGE SUMMARY');
  console.log('='.repeat(90));
  console.log();
  
  const TARGET_N = 30;
  let gapCount = 0;
  
  for (const model of models) {
    for (const anchorType of ['high']) { // Focus on high anchor gaps
      for (const technique of ['sacd', 'context-hygiene', 'premortem']) {
        const responses = matrix[model]?.[anchorType]?.[technique] || [];
        if (responses.length < TARGET_N) {
          console.log(`⚠️  ${model} @ ${anchorType} × ${technique}: n=${responses.length} (need ${TARGET_N - responses.length} more)`);
          gapCount++;
        }
      }
    }
  }
  
  if (gapCount === 0) {
    console.log('✅ All HIGH ANCHOR experiments have n≥30 for SACD, C-H, and Premortem');
  }
  
  // File summary
  console.log();
  console.log('='.repeat(90));
  console.log('FILES BY EXPERIMENT TYPE');
  console.log('='.repeat(90));
  console.log();
  
  // Count files by type
  const fileCounts: Record<string, number> = {};
  for (const r of allResults) {
    const key = `${r.anchorType}/${r.technique}`;
    fileCounts[key] = (fileCounts[key] || 0) + 1;
  }
  
  for (const [key, count] of Object.entries(fileCounts).sort()) {
    console.log(`  ${key}: ${count} trials`);
  }
  
  console.log();
  console.log('='.repeat(90));
  console.log('VALIDATION COMPLETE');
  console.log('='.repeat(90));
}

main();
