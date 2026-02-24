#!/usr/bin/env npx tsx
/**
 * Analyze vignette data using % of baseline metric (Jacowitz & Kahneman 1995)
 * Compare to "reduces spread" approach to show methodological difference.
 */

import * as fs from "fs";
import * as path from "path";

interface Trial {
  anchor: number;
  baseline: number;
  response: number;
  vignetteId: string;
  model: string;
  technique: string;
  anchorType: string; // "none" | "low" | "high"
}

interface ConditionStats {
  vignette: string;
  model: string;
  technique: string;
  anchorType: string;
  n: number;
  meanResponse: number;
  meanBaseline: number;
  meanAnchor: number;
  pctOfBaseline: number | null; // null for no-anchor conditions
  stdDev: number;
}

function loadVignetteData(vignetteDir: string): Trial[] {
  const trials: Trial[] = [];
  const files = fs.readdirSync(vignetteDir).filter(f => f.endsWith('.jsonl'));
  
  for (const file of files) {
    const lines = fs.readFileSync(path.join(vignetteDir, file), 'utf-8')
      .split('\n')
      .filter(l => l.trim());
    
    for (const line of lines) {
      try {
        const record = JSON.parse(line);
        if (record.response !== null && typeof record.response === 'number') {
          trials.push({
            anchor: record.anchor ?? record.meanAnchor ?? 0,
            baseline: record.baseline ?? record.noAnchorBaseline ?? 0,
            response: record.response,
            vignetteId: record.vignetteId,
            model: record.model?.replace('anthropic/', '') || 'unknown',
            technique: record.technique,
            anchorType: record.anchorType
          });
        }
      } catch (e) {
        // Skip invalid lines
      }
    }
  }
  
  return trials;
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((sum, val) => sum + Math.pow(val - m, 2), 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

function calculateStats(trials: Trial[]): ConditionStats[] {
  // Group by vignette, model, technique, anchorType
  const groups = new Map<string, Trial[]>();
  
  for (const trial of trials) {
    const key = `${trial.vignetteId}|${trial.model}|${trial.technique}|${trial.anchorType}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(trial);
  }
  
  const stats: ConditionStats[] = [];
  
  for (const [key, groupTrials] of groups) {
    const [vignette, model, technique, anchorType] = key.split('|');
    const responses = groupTrials.map(t => t.response);
    const baselines = groupTrials.map(t => t.baseline);
    const anchors = groupTrials.map(t => t.anchor);
    
    const meanResponse = mean(responses);
    const meanBaseline = mean(baselines);
    const meanAnchor = mean(anchors);
    
    // Calculate % of baseline (J&K 1995 formula)
    // % = (response - baseline) / (anchor - baseline)
    let pctOfBaseline: number | null = null;
    if (anchorType !== 'none' && meanAnchor !== meanBaseline) {
      pctOfBaseline = ((meanResponse - meanBaseline) / (meanAnchor - meanBaseline)) * 100;
    }
    
    stats.push({
      vignette,
      model,
      technique,
      anchorType,
      n: groupTrials.length,
      meanResponse,
      meanBaseline,
      meanAnchor,
      pctOfBaseline,
      stdDev: stdDev(responses)
    });
  }
  
  return stats;
}

// Main
const vignetteBasePath = "results";
const vignettes = ['vignette-salary', 'vignette-loan', 'vignette-medical'];

let allTrials: Trial[] = [];

for (const vignette of vignettes) {
  const vignetteDir = path.join(vignetteBasePath, vignette);
  if (fs.existsSync(vignetteDir)) {
    const trials = loadVignetteData(vignetteDir);
    allTrials = allTrials.concat(trials);
    console.log(`Loaded ${trials.length} trials from ${vignette}`);
  }
}

console.log(`\nTotal trials: ${allTrials.length}\n`);

const stats = calculateStats(allTrials);

// Sort by vignette, model, technique, anchorType
stats.sort((a, b) => {
  if (a.vignette !== b.vignette) return a.vignette.localeCompare(b.vignette);
  if (a.model !== b.model) return a.model.localeCompare(b.model);
  if (a.technique !== b.technique) return a.technique.localeCompare(b.technique);
  return a.anchorType.localeCompare(b.anchorType);
});

// Output analysis
console.log("# Vignette Analysis: % of Baseline Metric\n");

// Group by vignette for reporting
const byVignette = new Map<string, ConditionStats[]>();
for (const s of stats) {
  if (!byVignette.has(s.vignette)) byVignette.set(s.vignette, []);
  byVignette.get(s.vignette)!.push(s);
}

for (const [vignette, vignetteStats] of byVignette) {
  console.log(`\n## ${vignette.replace('vignette-', '').toUpperCase()}\n`);
  
  // Get baselines first
  const baselines = vignetteStats.filter(s => s.anchorType === 'none');
  console.log("### Baselines (No Anchor)\n");
  console.log("| Model | Technique | Mean | StdDev | N |");
  console.log("|-------|-----------|------|--------|---|");
  for (const b of baselines) {
    console.log(`| ${b.model} | ${b.technique} | ${b.meanResponse.toFixed(1)} | ${b.stdDev.toFixed(1)} | ${b.n} |`);
  }
  
  // Now anchored conditions with % of baseline
  const anchored = vignetteStats.filter(s => s.anchorType !== 'none');
  
  console.log("\n### Anchored Conditions\n");
  console.log("| Model | Technique | Anchor | Response | Baseline | % of Baseline | N |");
  console.log("|-------|-----------|--------|----------|----------|---------------|---|");
  
  for (const a of anchored) {
    const pct = a.pctOfBaseline !== null ? `${a.pctOfBaseline.toFixed(1)}%` : 'N/A';
    console.log(`| ${a.model} | ${a.technique} | ${a.anchorType} (${a.meanAnchor.toFixed(0)}) | ${a.meanResponse.toFixed(1)} | ${a.meanBaseline.toFixed(1)} | ${pct} | ${a.n} |`);
  }
  
  // Calculate technique effectiveness summary
  console.log("\n### Technique Effectiveness (% of Baseline by Technique)\n");
  
  const techniques = [...new Set(anchored.map(a => a.technique))];
  const models = [...new Set(anchored.map(a => a.model))];
  
  console.log("| Technique | Model | Low Anchor % | High Anchor % | Avg |");
  console.log("|-----------|-------|--------------|---------------|-----|");
  
  for (const technique of techniques) {
    for (const model of models) {
      const low = anchored.find(a => a.technique === technique && a.model === model && a.anchorType === 'low');
      const high = anchored.find(a => a.technique === technique && a.model === model && a.anchorType === 'high');
      
      const lowPct = low?.pctOfBaseline;
      const highPct = high?.pctOfBaseline;
      
      const lowStr = lowPct !== null && lowPct !== undefined ? `${lowPct.toFixed(1)}%` : 'N/A';
      const highStr = highPct !== null && highPct !== undefined ? `${highPct.toFixed(1)}%` : 'N/A';
      
      let avgStr = 'N/A';
      if (lowPct !== null && lowPct !== undefined && highPct !== null && highPct !== undefined) {
        avgStr = `${((Math.abs(lowPct) + Math.abs(highPct)) / 2).toFixed(1)}%`;
      }
      
      console.log(`| ${technique} | ${model} | ${lowStr} | ${highStr} | ${avgStr} |`);
    }
  }
}

// Summary: Compare "reduces spread" vs "% of baseline" conclusions
console.log("\n\n# METHODOLOGY COMPARISON\n");
console.log("## 'Reduces Spread' vs '% of Baseline' Conclusions\n");

for (const [vignette, vignetteStats] of byVignette) {
  console.log(`\n### ${vignette.replace('vignette-', '').toUpperCase()}\n`);
  
  const techniques = [...new Set(vignetteStats.filter(s => s.anchorType !== 'none').map(s => s.technique))];
  
  console.log("| Technique | Reduces Spread? | % of Baseline (avg) | Same Conclusion? |");
  console.log("|-----------|-----------------|---------------------|------------------|");
  
  for (const technique of techniques) {
    const low = vignetteStats.filter(s => s.technique === technique && s.anchorType === 'low');
    const high = vignetteStats.filter(s => s.technique === technique && s.anchorType === 'high');
    const baseline = vignetteStats.filter(s => s.technique === 'baseline' && s.anchorType === 'none');
    
    if (low.length === 0 || high.length === 0) continue;
    
    // "Reduces spread" = |high - low| for technique < |high - low| for baseline
    const baselineLow = vignetteStats.filter(s => s.technique === 'baseline' && s.anchorType === 'low');
    const baselineHigh = vignetteStats.filter(s => s.technique === 'baseline' && s.anchorType === 'high');
    
    const baselineSpread = Math.abs(mean(baselineHigh.map(s => s.meanResponse)) - mean(baselineLow.map(s => s.meanResponse)));
    const techniqueSpread = Math.abs(mean(high.map(s => s.meanResponse)) - mean(low.map(s => s.meanResponse)));
    
    const reducesSpread = techniqueSpread < baselineSpread;
    
    // % of baseline average
    const allPcts = [...low, ...high]
      .filter(s => s.pctOfBaseline !== null)
      .map(s => Math.abs(s.pctOfBaseline!));
    const avgPct = allPcts.length > 0 ? mean(allPcts) : null;
    
    // "Effective" by % of baseline = avg < 100% (pulling less than full anchor distance)
    // Lower is better
    const effectiveByPct = avgPct !== null && avgPct < 100;
    
    const sameConclusion = reducesSpread === effectiveByPct ? "✓" : "**DIFFERS**";
    
    console.log(`| ${technique} | ${reducesSpread ? 'Yes' : 'No'} | ${avgPct !== null ? avgPct.toFixed(1) + '%' : 'N/A'} | ${sameConclusion} |`);
  }
}

console.log("\n\n**Key:** % of Baseline < 100% means response pulled less than full distance to anchor (good).");
console.log("**Reduces Spread** looks at convergence of high/low responses.");
console.log("**DIFFERS** indicates the two metrics give opposite conclusions about technique effectiveness.");
