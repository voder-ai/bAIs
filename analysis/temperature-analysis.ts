#!/usr/bin/env npx tsx
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const RESULTS_DIR = './results';

function extractTemp(filename: string): number {
  const match = filename.match(/-t(\d+)/);
  if (!match) return 0;
  if (match[1] === '0') return 0;
  if (match[1] === '07') return 0.7;
  if (match[1] === '1') return 1.0;
  return parseFloat(match[1]) / 10;
}

function loadTrials(pattern: RegExp) {
  const files = readdirSync(RESULTS_DIR).filter((f) => pattern.test(f) && f.endsWith('.jsonl'));
  const trials: any[] = [];
  for (const file of files) {
    const temp = extractTemp(file);
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
          temperature: data.temperature ?? temp,
          response,
        });
      } catch {}
    }
  }
  return trials;
}

// Load baselines by temperature
const baselines = loadTrials(/^baseline-/);
const baselineByModelTemp: Record<string, Record<number, number[]>> = {};
for (const t of baselines) {
  if (!baselineByModelTemp[t.model]) baselineByModelTemp[t.model] = {};
  if (!baselineByModelTemp[t.model][t.temperature])
    baselineByModelTemp[t.model][t.temperature] = [];
  baselineByModelTemp[t.model][t.temperature].push(t.response);
}

// Compute means
const baselineMeans: Record<string, Record<number, number>> = {};
for (const [model, temps] of Object.entries(baselineByModelTemp)) {
  baselineMeans[model] = {};
  for (const [temp, responses] of Object.entries(temps)) {
    baselineMeans[model][parseFloat(temp)] =
      responses.reduce((a, b) => a + b, 0) / responses.length;
  }
}

// Overall baseline mean per model (across all temps)
const overallBaseline: Record<string, number> = {};
for (const [model, temps] of Object.entries(baselineMeans)) {
  const allVals = Object.values(temps);
  overallBaseline[model] = allVals.reduce((a, b) => a + b, 0) / allVals.length;
}

// Load high-anchor baseline
const highDir = join(RESULTS_DIR, 'high-anchor');
const highAnchoredMeans: Record<string, number> = {};
const hg = new Map<string, number[]>();
for (const file of readdirSync(highDir).filter((f) => f.endsWith('.jsonl'))) {
  const lines = readFileSync(join(highDir, file), 'utf-8').split('\n').filter(Boolean);
  for (const line of lines) {
    try {
      const data = JSON.parse(line);
      const model = (data.model || '').replace(
        /^(anthropic|openai|deepseek|moonshotai|z-ai|minimax)\//,
        '',
      );
      if (!hg.has(model)) hg.set(model, []);
      hg.get(model)!.push(data.response ?? data.sentenceMonths ?? data.months);
    } catch {}
  }
}
for (const [m, r] of hg) highAnchoredMeans[m] = r.reduce((a, b) => a + b, 0) / r.length;

function analyzeByTemp(name: string, pattern: RegExp) {
  const trials = loadTrials(pattern);

  // Group by temperature
  const byTemp: Record<number, { improved: number; total: number }> = {
    0: { improved: 0, total: 0 },
    0.7: { improved: 0, total: 0 },
    1: { improved: 0, total: 0 },
  };

  // Group responses by model and temperature (high anchor only)
  const techGroups: Record<string, Record<number, number[]>> = {};
  for (const t of trials) {
    if (t.anchor < 25) continue; // High anchor only
    if (!techGroups[t.model]) techGroups[t.model] = {};
    if (!techGroups[t.model][t.temperature]) techGroups[t.model][t.temperature] = [];
    techGroups[t.model][t.temperature].push(t.response);
  }

  for (const [model, temps] of Object.entries(techGroups)) {
    const baseline = overallBaseline[model];
    const anchored = highAnchoredMeans[model];
    if (!baseline || !anchored) continue;

    const distAnch = Math.abs(anchored - baseline);

    for (const [temp, responses] of Object.entries(temps)) {
      const t = parseFloat(temp);
      const techResp = responses.reduce((a, b) => a + b, 0) / responses.length;
      const distTech = Math.abs(techResp - baseline);

      if (byTemp[t]) {
        byTemp[t].total++;
        if (distTech < distAnch) byTemp[t].improved++;
      }
    }
  }

  console.log(`\n### ${name}\n`);
  console.log('| Temperature | Improved | Rate |');
  console.log('|-------------|----------|------|');
  for (const temp of [0, 0.7, 1]) {
    const r = byTemp[temp];
    if (r.total > 0) {
      console.log(
        `| t=${temp} | ${r.improved}/${r.total} | ${Math.round((r.improved / r.total) * 100)}% |`,
      );
    }
  }
}

console.log('# Temperature × Technique Analysis (High Anchors)\n');

const techniques = [
  { name: 'Full SACD', pattern: /^full-sacd-/ },
  { name: 'Premortem', pattern: /^premortem-/ },
  { name: 'Outside View', pattern: /^outside-view-/ },
  { name: "Devil's Advocate", pattern: /^devils-advocate-/ },
  { name: 'Random Control', pattern: /^random-control-/ },
];

for (const { name, pattern } of techniques) {
  analyzeByTemp(name, pattern);
}
