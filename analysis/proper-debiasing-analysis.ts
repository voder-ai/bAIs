#!/usr/bin/env npx tsx
/**
 * Proper debiasing analysis
 *
 * Correct metric: |technique_response - baseline| vs |anchored_response - baseline|
 * A technique "works" if it REDUCES absolute distance from baseline.
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const RESULTS_DIR = './results';

interface Trial {
  model: string;
  anchor: number;
  response: number;
  condition: string;
}

function loadTrials(pattern: RegExp): Trial[] {
  const files = readdirSync(RESULTS_DIR).filter((f) => pattern.test(f) && f.endsWith('.jsonl'));
  const trials: Trial[] = [];

  for (const file of files) {
    const lines = readFileSync(join(RESULTS_DIR, file), 'utf-8').split('\n').filter(Boolean);
    const anchorMatch = file.match(/(\d+)mo/);
    const anchor = anchorMatch ? parseInt(anchorMatch[1]) : 0;

    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        const response =
          data.response ?? data.sentenceMonths ?? data.final ?? data.debiasedSentence;
        if (typeof response !== 'number') continue;

        trials.push({
          model: normalizeModel(data.model || ''),
          anchor: data.anchor ?? anchor,
          response,
          condition: file.split('-')[0],
        });
      } catch {}
    }
  }
  return trials;
}

function loadHighAnchorTrials(): Trial[] {
  const dir = join(RESULTS_DIR, 'high-anchor');
  const files = readdirSync(dir).filter((f) => f.endsWith('.jsonl'));
  const trials: Trial[] = [];

  for (const file of files) {
    const lines = readFileSync(join(dir, file), 'utf-8').split('\n').filter(Boolean);
    const anchorMatch = file.match(/(\d+)mo/);
    const anchor = anchorMatch ? parseInt(anchorMatch[1]) : 0;

    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        const response = data.response ?? data.sentenceMonths ?? data.months;
        if (typeof response !== 'number') continue;

        trials.push({
          model: normalizeModel(data.model || ''),
          anchor,
          response,
          condition: 'high-anchor',
        });
      } catch {}
    }
  }
  return trials;
}

function normalizeModel(m: string): string {
  return m
    .replace(/^(anthropic|openai|deepseek|moonshotai|z-ai|minimax)\//, '')
    .replace(/-20\d{6}$/, '');
}

function mean(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

// Load all data
const baselines = loadTrials(/^baseline-/);
const highAnchored = loadHighAnchorTrials();
const outsideView = loadTrials(/^outside-view-/);
const devilsAdvocate = loadTrials(/^devils-advocate-/);
const premortem = loadTrials(/^premortem-/);
const randomControl = loadTrials(/^random-control-/);
const fullSacd = loadTrials(/^full-sacd-/);

// Compute baseline means per model
const baselineMeans: Record<string, number> = {};
const modelGroups = new Map<string, number[]>();
for (const t of baselines) {
  if (!modelGroups.has(t.model)) modelGroups.set(t.model, []);
  modelGroups.get(t.model)!.push(t.response);
}
for (const [model, responses] of modelGroups) {
  baselineMeans[model] = mean(responses);
}

// Compute anchored (no technique) means per model
const anchoredMeans: Record<string, number> = {};
const anchoredGroups = new Map<string, number[]>();
for (const t of highAnchored) {
  if (!anchoredGroups.has(t.model)) anchoredGroups.set(t.model, []);
  anchoredGroups.get(t.model)!.push(t.response);
}
for (const [model, responses] of anchoredGroups) {
  anchoredMeans[model] = mean(responses);
}

console.log('# Proper Debiasing Analysis');
console.log('## Metric: Does technique reduce |response - baseline|?\n');

console.log('## 1. Baselines (unanchored responses)\n');
console.log('| Model | Baseline Mean |');
console.log('|-------|---------------|');
for (const [model, val] of Object.entries(baselineMeans).sort()) {
  console.log(`| ${model} | ${val.toFixed(1)}mo |`);
}

console.log('\n## 2. Anchored Responses (high anchor, no technique)\n');
console.log('| Model | Anchor | Anchored Response | Baseline | Distance |');
console.log('|-------|--------|-------------------|----------|----------|');
for (const [model, val] of Object.entries(anchoredMeans).sort()) {
  const baseline = baselineMeans[model] ?? 0;
  const dist = Math.abs(val - baseline);
  console.log(
    `| ${model} | high | ${val.toFixed(1)}mo | ${baseline.toFixed(1)}mo | ${dist.toFixed(1)}mo |`,
  );
}

// Analyze each technique
function analyzeTechnique(name: string, trials: Trial[]) {
  console.log(`\n## ${name}\n`);
  console.log('| Model | Baseline | Anchored | Technique | |Δ Anch| | |Δ Tech| | Improved? |');
  console.log('|-------|----------|----------|-----------|--------|--------|-----------|');

  const techGroups = new Map<string, number[]>();
  for (const t of trials) {
    // Only high anchor trials for fair comparison
    if (t.anchor < 25) continue;
    if (!techGroups.has(t.model)) techGroups.set(t.model, []);
    techGroups.get(t.model)!.push(t.response);
  }

  let improved = 0,
    worse = 0,
    total = 0;

  for (const [model, responses] of [...techGroups.entries()].sort()) {
    const baseline = baselineMeans[model];
    const anchored = anchoredMeans[model];
    const techResponse = mean(responses);

    if (!baseline || !anchored) continue;

    const distAnch = Math.abs(anchored - baseline);
    const distTech = Math.abs(techResponse - baseline);
    const isImproved = distTech < distAnch;

    if (isImproved) improved++;
    else worse++;
    total++;

    console.log(
      `| ${model} | ${baseline.toFixed(1)} | ${anchored.toFixed(1)} | ${techResponse.toFixed(1)} | ${distAnch.toFixed(1)} | ${distTech.toFixed(1)} | ${isImproved ? '✅' : '❌'} |`,
    );
  }

  console.log(`\n**Summary: ${improved}/${total} improved, ${worse}/${total} got worse**\n`);
}

analyzeTechnique('Outside View', outsideView);
analyzeTechnique("Devil's Advocate", devilsAdvocate);
analyzeTechnique('Premortem', premortem);
analyzeTechnique('Random Control', randomControl);
analyzeTechnique('Full SACD', fullSacd);

console.log('\n## Key Finding\n');
console.log(
  'The correct metric for debiasing is: Does the technique reduce absolute distance from baseline?',
);
console.log('Direction of movement is irrelevant - only proximity to ground truth matters.');
