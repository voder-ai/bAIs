#!/usr/bin/env npx tsx
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const RESULTS_DIR = './results';

function loadTrials(pattern: RegExp) {
  const files = readdirSync(RESULTS_DIR).filter((f) => pattern.test(f) && f.endsWith('.jsonl'));
  const trials: any[] = [];
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
          model: (data.model || '').replace(
            /^(anthropic|openai|deepseek|moonshotai|z-ai|minimax)\//,
            '',
          ),
          anchor: data.anchor ?? anchor,
          response,
        });
      } catch {}
    }
  }
  return trials;
}

// Load baselines
const baselines = loadTrials(/^baseline-/);
const baselineMeans: Record<string, number> = {};
const groups = new Map<string, number[]>();
for (const t of baselines) {
  if (!groups.has(t.model)) groups.set(t.model, []);
  groups.get(t.model)!.push(t.response);
}
for (const [m, r] of groups) baselineMeans[m] = r.reduce((a, b) => a + b, 0) / r.length;

// Load low-anchor (no technique)
const lowAnchored = loadTrials(/^low-anchor-/);
const lowAnchoredMeans: Record<string, number> = {};
const lg = new Map<string, number[]>();
for (const t of lowAnchored) {
  if (!lg.has(t.model)) lg.set(t.model, []);
  lg.get(t.model)!.push(t.response);
}
for (const [m, r] of lg) lowAnchoredMeans[m] = r.reduce((a, b) => a + b, 0) / r.length;

// Load high-anchor (no technique)
const highDir = join(RESULTS_DIR, 'high-anchor');
const highAnchored: any[] = [];
for (const file of readdirSync(highDir).filter((f) => f.endsWith('.jsonl'))) {
  const lines = readFileSync(join(highDir, file), 'utf-8').split('\n').filter(Boolean);
  for (const line of lines) {
    try {
      const data = JSON.parse(line);
      highAnchored.push({
        model: (data.model || '').replace(
          /^(anthropic|openai|deepseek|moonshotai|z-ai|minimax)\//,
          '',
        ),
        response: data.response ?? data.sentenceMonths ?? data.months,
      });
    } catch {}
  }
}
const highAnchoredMeans: Record<string, number> = {};
const hg = new Map<string, number[]>();
for (const t of highAnchored) {
  if (!hg.has(t.model)) hg.set(t.model, []);
  hg.get(t.model)!.push(t.response);
}
for (const [m, r] of hg) highAnchoredMeans[m] = r.reduce((a, b) => a + b, 0) / r.length;

function analyzeTechnique(name: string, pattern: RegExp, anchorType: 'low' | 'high') {
  const trials = loadTrials(pattern);
  const anchorCutoff = anchorType === 'low' ? 20 : 25;
  const anchoredMeans = anchorType === 'low' ? lowAnchoredMeans : highAnchoredMeans;

  const techGroups = new Map<string, number[]>();
  for (const t of trials) {
    const matchesAnchor =
      anchorType === 'low' ? t.anchor <= anchorCutoff : t.anchor >= anchorCutoff;
    if (!matchesAnchor) continue;
    if (!techGroups.has(t.model)) techGroups.set(t.model, []);
    techGroups.get(t.model)!.push(t.response);
  }

  let improved = 0,
    worse = 0;
  for (const [model, responses] of techGroups) {
    const baseline = baselineMeans[model];
    const anchored = anchoredMeans[model];
    const techResp = responses.reduce((a, b) => a + b, 0) / responses.length;
    if (!baseline || !anchored) continue;

    const distAnch = Math.abs(anchored - baseline);
    const distTech = Math.abs(techResp - baseline);
    if (distTech < distAnch) improved++;
    else worse++;
  }
  return { improved, total: improved + worse };
}

console.log('# Full Anchor Analysis\n');

const techniques = [
  { name: 'Outside View', pattern: /^outside-view-/ },
  { name: "Devil's Advocate", pattern: /^devils-advocate-/ },
  { name: 'Premortem', pattern: /^premortem-/ },
  { name: 'Random Control', pattern: /^random-control-/ },
  { name: 'Full SACD', pattern: /^full-sacd-/ },
];

console.log('## LOW Anchor Conditions\n');
console.log('| Technique | Improved | Rate |');
console.log('|-----------|----------|------|');
for (const { name, pattern } of techniques) {
  const r = analyzeTechnique(name, pattern, 'low');
  console.log(
    `| ${name} | ${r.improved}/${r.total} | ${Math.round((r.improved / r.total) * 100)}% |`,
  );
}

console.log('\n## HIGH Anchor Conditions\n');
console.log('| Technique | Improved | Rate |');
console.log('|-----------|----------|------|');
for (const { name, pattern } of techniques) {
  const r = analyzeTechnique(name, pattern, 'high');
  console.log(
    `| ${name} | ${r.improved}/${r.total} | ${Math.round((r.improved / r.total) * 100)}% |`,
  );
}
