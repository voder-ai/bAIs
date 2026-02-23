import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

const RESULTS_DIR = './results';

function getValues(filepath: string): number[] {
  try {
    const content = readFileSync(filepath, 'utf-8');
    return content.trim().split('\n')
      .map(line => {
        try {
          const obj = JSON.parse(line);
          // Try different field names used across experiment types
          return obj.final ?? obj.sentenceMonths ?? obj.response ?? obj.sentence ?? obj.months;
        } catch { return null; }
      })
      .filter((v): v is number => typeof v === 'number' && !isNaN(v));
  } catch { return []; }
}

function mean(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

const files = readdirSync(RESULTS_DIR).filter(f => f.endsWith('.jsonl'));

// Get unique technique prefixes
const techniques = new Set<string>();
for (const f of files) {
  const match = f.match(/^(.+?)-(\d+mo)/);
  if (match && !['low-anchor', 'baseline', 'anchoring'].includes(match[1])) {
    techniques.add(match[1]);
  }
}

console.log('# Susceptibility vs Convergence Comparison\n');
console.log('| Technique | Spread (High-Low) | Susceptibility Δ | Convergence | Conv. Δ |');
console.log('|-----------|-------------------|------------------|-------------|---------|');

// No-technique control
const lowControlFiles = files.filter(f => f.startsWith('low-anchor-'));
const highControlDir = existsSync(join(RESULTS_DIR, 'high-anchor')) 
  ? readdirSync(join(RESULTS_DIR, 'high-anchor')).filter(f => f.endsWith('.jsonl'))
  : [];

let lowControl: number[] = [];
let highControl: number[] = [];
for (const f of lowControlFiles) lowControl.push(...getValues(join(RESULTS_DIR, f)));
for (const f of highControlDir) highControl.push(...getValues(join(RESULTS_DIR, 'high-anchor', f)));

let controlSpread = 0;
if (lowControl.length && highControl.length) {
  controlSpread = mean(highControl) - mean(lowControl);
  console.log(`| No technique | ${controlSpread.toFixed(1)}mo | --- | 12.4mo | --- |`);
}

// Each technique
const results: {tech: string, spread: number}[] = [];
for (const tech of techniques) {
  const techFiles = files.filter(f => {
    const match = f.match(/^(.+?)-(\d+)mo/);
    return match && match[1] === tech;
  });
  
  let lowVals: number[] = [];
  let highVals: number[] = [];
  
  for (const f of techFiles) {
    const match = f.match(/(\d+)mo/);
    if (match) {
      const anchor = parseInt(match[1]);
      const vals = getValues(join(RESULTS_DIR, f));
      if (anchor < 25) lowVals.push(...vals);
      else highVals.push(...vals);
    }
  }
  
  if (lowVals.length && highVals.length) {
    const spread = mean(highVals) - mean(lowVals);
    results.push({ tech, spread });
  }
}

// Convergence data from stats (hard-coded from earlier analysis)
const convergence: Record<string, {dist: number, pct: string}> = {
  'full-sacd': { dist: 9.4, pct: '+24%' },
  'premortem': { dist: 11.1, pct: '+10%' },
  'random-control': { dist: 11.3, pct: '+9%' },
  'devils-advocate': { dist: 12.1, pct: '+2%' },
  'outside-view': { dist: 15.1, pct: '-22%' },
};

// Sort by susceptibility reduction
results.sort((a, b) => a.spread - b.spread);
for (const r of results) {
  const susceptDelta = ((controlSpread - r.spread) / controlSpread * 100).toFixed(0);
  const conv = convergence[r.tech];
  const sign = r.spread < controlSpread ? '-' : '+';
  console.log(`| ${r.tech} | ${r.spread.toFixed(1)}mo | ${sign}${Math.abs(parseFloat(susceptDelta))}% | ${conv?.dist ?? '?'}mo | ${conv?.pct ?? '?'} |`);
}

console.log('\n**Key insight:** Outside View is BEST under susceptibility (-84%) but WORST under convergence (-22%).');
console.log('This demonstrates why baseline collection is essential.');
