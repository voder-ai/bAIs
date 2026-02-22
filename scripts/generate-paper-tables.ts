#!/usr/bin/env npx tsx
/**
 * Canonical paper table generator
 * 
 * Reads raw JSONL trial data and outputs:
 * 1. Markdown tables (for review)
 * 2. LaTeX tables (for paper)
 * 
 * Run: npx tsx scripts/generate-paper-tables.ts
 * 
 * All paper statistics should be derived from this script.
 */

import { readFileSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";

const RESULTS_DIR = "./results";
const OUTPUT_DIR = "./paper/generated";

interface Trial {
  model: string;
  anchor: number;
  response: number;
  temperature: number;
}

function normalizeModel(m: string): string {
  return m
    .replace(/^(anthropic|openai|deepseek|moonshotai|z-ai|minimax)\//, "")
    .replace(/-20\d{6}$/, "");
}

function loadTrials(pattern: RegExp): Trial[] {
  const files = readdirSync(RESULTS_DIR).filter(
    (f) => pattern.test(f) && f.endsWith(".jsonl")
  );
  const trials: Trial[] = [];

  for (const file of files) {
    const lines = readFileSync(join(RESULTS_DIR, file), "utf-8")
      .split("\n")
      .filter(Boolean);
    const anchorMatch = file.match(/(\d+)mo/);
    const anchor = anchorMatch ? parseInt(anchorMatch[1]) : 0;
    const tempMatch = file.match(/-t(\d+)/);
    const temp = tempMatch
      ? tempMatch[1] === "0"
        ? 0
        : tempMatch[1] === "07"
          ? 0.7
          : 1.0
      : 0;

    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        const response =
          data.response ??
          data.sentenceMonths ??
          data.final ??
          data.debiasedSentence;
        if (typeof response !== "number") continue;

        trials.push({
          model: normalizeModel(data.model || ""),
          anchor: data.anchor ?? anchor,
          response,
          temperature: data.temperature ?? temp,
        });
      } catch {}
    }
  }
  return trials;
}

function loadHighAnchorTrials(): Trial[] {
  const dir = join(RESULTS_DIR, "high-anchor");
  const trials: Trial[] = [];

  for (const file of readdirSync(dir).filter((f) => f.endsWith(".jsonl"))) {
    const lines = readFileSync(join(dir, file), "utf-8")
      .split("\n")
      .filter(Boolean);
    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        trials.push({
          model: normalizeModel(data.model || ""),
          anchor: 36,
          response: data.response ?? data.sentenceMonths ?? data.months,
          temperature: 0,
        });
      } catch {}
    }
  }
  return trials;
}

function mean(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function groupBy<T>(arr: T[], key: (t: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const t of arr) {
    const k = key(t);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(t);
  }
  return map;
}

// Load all data
console.log("Loading trial data...");
const baselines = loadTrials(/^baseline-/);
const highAnchored = loadHighAnchorTrials();
const outsideView = loadTrials(/^outside-view-/);
const devilsAdvocate = loadTrials(/^devils-advocate-/);
const premortem = loadTrials(/^premortem-/);
const randomControl = loadTrials(/^random-control-/);
const fullSacd = loadTrials(/^full-sacd-/);

// Compute baseline means
const baselineMeans: Record<string, number> = {};
for (const [model, trials] of groupBy(baselines, (t) => t.model)) {
  baselineMeans[model] = mean(trials.map((t) => t.response));
}

// Compute high-anchor means
const highAnchoredMeans: Record<string, number> = {};
for (const [model, trials] of groupBy(highAnchored, (t) => t.model)) {
  highAnchoredMeans[model] = mean(trials.map((t) => t.response));
}

// Analysis function
function analyzeTechnique(
  name: string,
  trials: Trial[],
  anchorType: "low" | "high"
): { improved: number; total: number; details: any[] } {
  const anchorCutoff = anchorType === "low" ? 20 : 25;
  const filtered = trials.filter((t) =>
    anchorType === "low" ? t.anchor <= anchorCutoff : t.anchor >= anchorCutoff
  );

  const techGroups = groupBy(filtered, (t) => t.model);
  let improved = 0;
  const details: any[] = [];

  for (const [model, modelTrials] of techGroups) {
    const baseline = baselineMeans[model];
    const anchored = highAnchoredMeans[model];
    if (!baseline || !anchored) continue;

    const techResponse = mean(modelTrials.map((t) => t.response));
    const distAnch = Math.abs(anchored - baseline);
    const distTech = Math.abs(techResponse - baseline);
    const isImproved = distTech < distAnch;

    if (isImproved) improved++;
    details.push({
      model,
      baseline: baseline.toFixed(1),
      anchored: anchored.toFixed(1),
      technique: techResponse.toFixed(1),
      distAnch: distAnch.toFixed(1),
      distTech: distTech.toFixed(1),
      improved: isImproved,
    });
  }

  return { improved, total: details.length, details };
}

// Generate tables
console.log("\n# Paper Tables (Generated)\n");

// Table 1: Baselines
console.log("## Table 1: Baseline Responses\n");
console.log("| Model | Baseline (mo) |");
console.log("|-------|---------------|");
for (const [model, val] of Object.entries(baselineMeans).sort(
  (a, b) => b[1] - a[1]
)) {
  console.log(`| ${model} | ${val.toFixed(1)} |`);
}

// Table 2: Technique Rankings (High Anchor)
console.log("\n## Table 2: Technique Effectiveness (High Anchor)\n");
console.log("| Technique | Improved | Success Rate |");
console.log("|-----------|----------|--------------|");

const techniques = [
  { name: "Random Control", trials: randomControl },
  { name: "Premortem", trials: premortem },
  { name: "Full SACD", trials: fullSacd },
  { name: "Devil's Advocate", trials: devilsAdvocate },
  { name: "Outside View", trials: outsideView },
];

const highResults: { name: string; improved: number; total: number }[] = [];
for (const { name, trials } of techniques) {
  const result = analyzeTechnique(name, trials, "high");
  highResults.push({ name, ...result });
  const rate = Math.round((result.improved / result.total) * 100);
  console.log(`| ${name} | ${result.improved}/${result.total} | ${rate}% |`);
}

// Table 3: Temperature × Technique
console.log("\n## Table 3: Temperature × Technique (High Anchor)\n");
console.log("| Technique | t=0 | t=0.7 | t=1 |");
console.log("|-----------|-----|-------|-----|");

for (const { name, trials } of techniques) {
  const byTemp: Record<number, { improved: number; total: number }> = {};

  for (const temp of [0, 0.7, 1]) {
    const filtered = trials.filter(
      (t) => t.temperature === temp && t.anchor >= 25
    );
    const techGroups = groupBy(filtered, (t) => t.model);

    let improved = 0,
      total = 0;
    for (const [model, modelTrials] of techGroups) {
      const baseline = baselineMeans[model];
      const anchored = highAnchoredMeans[model];
      if (!baseline || !anchored) continue;

      const techResponse = mean(modelTrials.map((t) => t.response));
      const distAnch = Math.abs(anchored - baseline);
      const distTech = Math.abs(techResponse - baseline);
      if (distTech < distAnch) improved++;
      total++;
    }
    byTemp[temp] = { improved, total };
  }

  const t0 =
    byTemp[0]?.total > 0
      ? `${Math.round((byTemp[0].improved / byTemp[0].total) * 100)}%`
      : "-";
  const t07 =
    byTemp[0.7]?.total > 0
      ? `${Math.round((byTemp[0.7].improved / byTemp[0.7].total) * 100)}%`
      : "-";
  const t1 =
    byTemp[1]?.total > 0
      ? `${Math.round((byTemp[1].improved / byTemp[1].total) * 100)}%`
      : "-";

  console.log(`| ${name} | ${t0} | ${t07} | ${t1} |`);
}

// Summary stats
console.log("\n## Summary Statistics\n");
console.log(`- Total baseline trials: ${baselines.length}`);
console.log(`- Total high-anchor trials: ${highAnchored.length}`);
console.log(`- Models evaluated: ${Object.keys(baselineMeans).length}`);
console.log(
  `- Total technique trials: ${outsideView.length + devilsAdvocate.length + premortem.length + randomControl.length + fullSacd.length}`
);

// Output totals
const totalTrials =
  baselines.length +
  highAnchored.length +
  outsideView.length +
  devilsAdvocate.length +
  premortem.length +
  randomControl.length +
  fullSacd.length;
console.log(`- **Grand total trials: ${totalTrials}**`);
