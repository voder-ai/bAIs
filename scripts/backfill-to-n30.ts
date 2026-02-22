#!/usr/bin/env npx tsx
/**
 * Backfill all conditions to n=30
 * 
 * Reads current trial counts and runs missing trials.
 */

import { readFileSync, readdirSync, appendFileSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const RESULTS_DIR = "./results";
const MIN_N = 30;

interface BackfillJob {
  technique: string;
  model: string;
  anchor: "low" | "high";
  temp: string;
  need: number;
}

function normalizeModel(m: string): string {
  return m.replace(/^(anthropic|openai|deepseek|moonshotai|z-ai|minimax)\//, "").replace(/-20\d{6}$/, "");
}

function countTrials(): Record<string, number> {
  const counts: Record<string, number> = {};
  
  const techniques = [
    { pattern: /^outside-view-/, name: "outside-view" },
    { pattern: /^devils-advocate-/, name: "devils-advocate" },
    { pattern: /^premortem-/, name: "premortem" },
    { pattern: /^random-control-/, name: "random-control" },
    { pattern: /^full-sacd-/, name: "full-sacd" },
  ];

  for (const { pattern, name } of techniques) {
    const files = readdirSync(RESULTS_DIR).filter(f => pattern.test(f) && f.endsWith(".jsonl"));
    for (const file of files) {
      const lines = readFileSync(join(RESULTS_DIR, file), "utf-8").split("\n").filter(Boolean);
      const anchorMatch = file.match(/(\d+)mo/);
      const anchor = anchorMatch ? parseInt(anchorMatch[1]) : 0;
      const tempMatch = file.match(/-t(\d+)/);
      const temp = tempMatch ? (tempMatch[1] === "0" ? "t0" : tempMatch[1] === "07" ? "t0.7" : "t1") : "t0";
      const anchorType = anchor > 20 ? "high" : "low";
      
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          const model = normalizeModel(data.model || "");
          const key = `${name}|${model}|${anchorType}|${temp}`;
          counts[key] = (counts[key] || 0) + 1;
        } catch {}
      }
    }
  }
  
  return counts;
}

const counts = countTrials();
const jobs: BackfillJob[] = [];

for (const [key, count] of Object.entries(counts)) {
  if (count < MIN_N) {
    const [technique, model, anchor, temp] = key.split("|");
    jobs.push({
      technique,
      model,
      anchor: anchor as "low" | "high",
      temp,
      need: MIN_N - count
    });
  }
}

console.log(`=== BACKFILL JOBS: ${jobs.length} ===`);
console.log(`Total trials needed: ${jobs.reduce((a, j) => a + j.need, 0)}`);
console.log("");

// Sort by most needed first
jobs.sort((a, b) => b.need - a.need);

// Output as JSON for runner script
console.log(JSON.stringify(jobs, null, 2));
