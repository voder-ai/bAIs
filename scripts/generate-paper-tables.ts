#!/usr/bin/env npx tsx
/**
 * Generate all paper tables from experimental data
 * Validates data completeness and outputs summary statistics
 */
import { readFileSync, readdirSync } from 'node:fs';

interface Trial {
  model?: string;
  technique?: string;
  anchor?: number;
  baseline?: number;
  sentenceMonths?: number;
  result?: { sentenceMonths?: number };
  condition?: string;
}

function loadJsonl(path: string): Trial[] {
  try {
    return readFileSync(path, 'utf-8')
      .trim()
      .split('\n')
      .filter(l => l)
      .map(l => JSON.parse(l));
  } catch {
    return [];
  }
}

function getSentence(t: Trial): number | null {
  return t.sentenceMonths ?? t.result?.sentenceMonths ?? null;
}

function calcStats(trials: Trial[]) {
  const valid = trials.map(getSentence).filter((s): s is number => s !== null);
  if (valid.length === 0) return { n: 0, mean: 0, valid: 0 };
  const mean = valid.reduce((a, b) => a + b, 0) / valid.length;
  return { n: trials.length, valid: valid.length, mean: Math.round(mean * 10) / 10 };
}

function calcDebiasing(mean: number, anchor: number, baseline: number): number {
  if (anchor === baseline) return 0;
  return Math.round(((anchor - mean) / (anchor - baseline)) * 100);
}

console.log('=== bAIs Paper Data Verification ===\n');

// SACD High Anchor Results
console.log('## SACD at Symmetric High Anchors\n');
const sacdFiles = [
  { file: 'sacd-high-anchor-43mo-opus-4.5.jsonl', model: 'Opus 4.5', anchor: 43, baseline: 22 },
  { file: 'sacd-high-anchor-33mo-opus-4.6.jsonl', model: 'Opus 4.6', anchor: 33, baseline: 18 },
  { file: 'sacd-high-anchor-43mo-sonnet-4.5.jsonl', model: 'Sonnet 4.5', anchor: 43, baseline: 22 },
  { file: 'sacd-high-anchor-67mo-haiku-4.5.jsonl', model: 'Haiku 4.5', anchor: 67, baseline: 34 },
  { file: 'sacd-high-anchor-21mo-hermes-3-llama-3.1-405b.jsonl', model: 'Hermes 405B', anchor: 21, baseline: 12 },
  { file: 'sacd-high-anchor-21mo-llama-3.3-70b-instruct.jsonl', model: 'Llama 3.3', anchor: 21, baseline: 12 },
  { file: 'sacd-high-anchor-21mo-o3-mini.jsonl', model: 'o3-mini', anchor: 21, baseline: 12 },
  { file: 'sacd-high-anchor-45mo-gpt-4o.jsonl', model: 'GPT-4o', anchor: 45, baseline: 24 },
  { file: 'sacd-high-anchor-45mo-gpt-5.2.jsonl', model: 'GPT-5.2', anchor: 45, baseline: 24 },
  { file: 'sacd-high-anchor-21mo-minimax-m2.5.jsonl', model: 'MiniMax', anchor: 21, baseline: 12 },
];

console.log('| Model | Anchor | Baseline | n | Mean | Debiasing |');
console.log('|-------|--------|----------|---|------|-----------|');

for (const { file, model, anchor, baseline } of sacdFiles) {
  const trials = loadJsonl(`results/${file}`);
  const stats = calcStats(trials);
  const debiasing = stats.valid > 0 ? calcDebiasing(stats.mean, anchor, baseline) : 'N/A';
  const status = stats.valid >= 30 ? '✅' : stats.valid >= 20 ? '⚠️' : '❌';
  console.log(`| ${model} | ${anchor}mo | ${baseline}mo | ${stats.valid} | ${stats.mean}mo | ${status} ${debiasing}% |`);
}

// Sibony High Anchor Results
console.log('\n## Sibony at Symmetric High Anchors\n');

const sibonyConfigs = [
  { model: 'Hermes 405B', file: 'sibony-high-anchor-21mo-hermes-3-llama-3.1-405b.jsonl', anchor: 21, baseline: 12 },
  { model: 'Llama 3.3', file: 'sibony-high-anchor-21mo-llama-3.3-70b-instruct.jsonl', anchor: 21, baseline: 12 },
  { model: 'o3-mini', file: 'sibony-high-anchor-21mo-o3-mini.jsonl', anchor: 21, baseline: 12 },
  { model: 'GPT-4o', file: 'sibony-high-anchor-45mo-gpt-4o.jsonl', anchor: 45, baseline: 24 },
  { model: 'GPT-5.2', file: 'sibony-high-anchor-45mo-gpt-5.2.jsonl', anchor: 45, baseline: 24 },
  { model: 'MiniMax (C-H)', file: 'sibony-high-anchor-21mo-minimax-m2.5.jsonl', anchor: 21, baseline: 12 },
  { model: 'MiniMax (Pre)', file: 'sibony-high-anchor-21mo-minimax-m2.5-premortem.jsonl', anchor: 21, baseline: 12 },
];

console.log('| Model | Technique | Anchor | n | Mean | Debiasing |');
console.log('|-------|-----------|--------|---|------|-----------|');

for (const { model, file, anchor, baseline } of sibonyConfigs) {
  const trials = loadJsonl(`results/${file}`);
  
  // Split by technique if mixed file
  const chTrials = trials.filter(t => t.technique === 'context-hygiene' || t.condition === 'context-hygiene');
  const preTrials = trials.filter(t => t.technique === 'premortem' || t.condition === 'premortem');
  
  if (chTrials.length > 0 && preTrials.length > 0) {
    // Mixed file
    const chStats = calcStats(chTrials);
    const preStats = calcStats(preTrials);
    const chDeb = calcDebiasing(chStats.mean, anchor, baseline);
    const preDeb = calcDebiasing(preStats.mean, anchor, baseline);
    console.log(`| ${model} | context-hygiene | ${anchor}mo | ${chStats.valid} | ${chStats.mean}mo | ${chDeb}% |`);
    console.log(`| ${model} | premortem | ${anchor}mo | ${preStats.valid} | ${preStats.mean}mo | ${preDeb}% |`);
  } else {
    // Single technique file
    const stats = calcStats(trials);
    const technique = file.includes('premortem') ? 'premortem' : 'context-hygiene';
    const debiasing = calcDebiasing(stats.mean, anchor, baseline);
    console.log(`| ${model} | ${technique} | ${anchor}mo | ${stats.valid} | ${stats.mean}mo | ${debiasing}% |`);
  }
}

// Summary comparison table
console.log('\n## SACD vs Sibony Comparison\n');
console.log('| Model | SACD | Sibony C-H | Sibony Pre | Pattern |');
console.log('|-------|------|------------|------------|---------|');

const comparisons = [
  { model: 'Hermes 405B', sacdFile: 'sacd-high-anchor-21mo-hermes-3-llama-3.1-405b.jsonl', sibFile: 'sibony-high-anchor-21mo-hermes-3-llama-3.1-405b.jsonl', anchor: 21, baseline: 12 },
  { model: 'Llama 3.3', sacdFile: 'sacd-high-anchor-21mo-llama-3.3-70b-instruct.jsonl', sibFile: 'sibony-high-anchor-21mo-llama-3.3-70b-instruct.jsonl', anchor: 21, baseline: 12 },
  { model: 'o3-mini', sacdFile: 'sacd-high-anchor-21mo-o3-mini.jsonl', sibFile: 'sibony-high-anchor-21mo-o3-mini.jsonl', anchor: 21, baseline: 12 },
  { model: 'GPT-4o', sacdFile: 'sacd-high-anchor-45mo-gpt-4o.jsonl', sibFile: 'sibony-high-anchor-45mo-gpt-4o.jsonl', anchor: 45, baseline: 24 },
  { model: 'GPT-5.2', sacdFile: 'sacd-high-anchor-45mo-gpt-5.2.jsonl', sibFile: 'sibony-high-anchor-45mo-gpt-5.2.jsonl', anchor: 45, baseline: 24 },
];

for (const { model, sacdFile, sibFile, anchor, baseline } of comparisons) {
  const sacdTrials = loadJsonl(`results/${sacdFile}`);
  const sibTrials = loadJsonl(`results/${sibFile}`);
  
  const sacdStats = calcStats(sacdTrials);
  const sacdDeb = calcDebiasing(sacdStats.mean, anchor, baseline);
  
  const chTrials = sibTrials.filter(t => t.technique === 'context-hygiene');
  const preTrials = sibTrials.filter(t => t.technique === 'premortem');
  
  const chStats = calcStats(chTrials);
  const preStats = calcStats(preTrials);
  const chDeb = calcDebiasing(chStats.mean, anchor, baseline);
  const preDeb = calcDebiasing(preStats.mean, anchor, baseline);
  
  let pattern = '';
  if (sacdDeb < 0 && chDeb > 50) pattern = '✅ SACD fails, Sibony works';
  else if (sacdDeb > 50 && chDeb < 0) pattern = '🔴 SACD works, Sibony fails';
  else if (sacdDeb > 50 && chDeb > 50) pattern = '✅ Both work';
  else if (sacdDeb < 20 && chDeb < 0) pattern = '❌ Neither works';
  else pattern = '⚠️ Mixed';
  
  console.log(`| ${model} | ${sacdDeb}% | ${chDeb}% | ${preDeb}% | ${pattern} |`);
}

console.log('\n=== Data Verification Complete ===');
