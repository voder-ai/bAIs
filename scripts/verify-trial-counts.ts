#!/usr/bin/env npx tsx
/**
 * TRIAL COUNT VERIFICATION
 * Ensures all numbers in paper are traceable and sum correctly
 */
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const RESULTS_DIR = './results';

console.log('='.repeat(60));
console.log('TRIAL COUNT VERIFICATION');
console.log('='.repeat(60));

// Count raw JSONL files
function countLines(filepath: string): number {
  try {
    const content = readFileSync(filepath, 'utf-8');
    return content.trim().split('\n').filter(l => l.trim()).length;
  } catch { return 0; }
}

const files = readdirSync(RESULTS_DIR).filter(f => f.endsWith('.jsonl'));
const highAnchorFiles = readdirSync(join(RESULTS_DIR, 'high-anchor')).filter(f => f.endsWith('.jsonl'));

// Categorize files
const categories: Record<string, { files: string[], count: number }> = {
  'Baseline': { files: [], count: 0 },
  'Low Anchor': { files: [], count: 0 },
  'High Anchor': { files: [], count: 0 },
  'Devils Advocate': { files: [], count: 0 },
  'Premortem': { files: [], count: 0 },
  'Random Control': { files: [], count: 0 },
  'Outside View': { files: [], count: 0 },
  'Full SACD': { files: [], count: 0 },
  'Other': { files: [], count: 0 },
};

for (const f of files) {
  const count = countLines(join(RESULTS_DIR, f));
  if (f.startsWith('baseline-')) {
    categories['Baseline'].files.push(f);
    categories['Baseline'].count += count;
  } else if (f.startsWith('low-anchor-')) {
    categories['Low Anchor'].files.push(f);
    categories['Low Anchor'].count += count;
  } else if (f.startsWith('devils-advocate-')) {
    categories['Devils Advocate'].files.push(f);
    categories['Devils Advocate'].count += count;
  } else if (f.startsWith('premortem-')) {
    categories['Premortem'].files.push(f);
    categories['Premortem'].count += count;
  } else if (f.startsWith('random-control-')) {
    categories['Random Control'].files.push(f);
    categories['Random Control'].count += count;
  } else if (f.startsWith('outside-view-')) {
    categories['Outside View'].files.push(f);
    categories['Outside View'].count += count;
  } else if (f.startsWith('full-sacd-')) {
    categories['Full SACD'].files.push(f);
    categories['Full SACD'].count += count;
  } else if (!f.includes('analysis') && !f.includes('anchor-values')) {
    categories['Other'].files.push(f);
    categories['Other'].count += count;
  }
}

// Count high-anchor separately
for (const f of highAnchorFiles) {
  const count = countLines(join(RESULTS_DIR, 'high-anchor', f));
  categories['High Anchor'].files.push(f);
  categories['High Anchor'].count += count;
}

// Print breakdown
console.log('\n=== BREAKDOWN BY CATEGORY ===\n');

let total = 0;
for (const [cat, data] of Object.entries(categories)) {
  if (data.count > 0) {
    console.log(`${cat}: ${data.count.toLocaleString()} (${data.files.length} files)`);
    total += data.count;
  }
}

// Calculate subtotals
const techniqueTotal = 
  categories['Devils Advocate'].count +
  categories['Premortem'].count +
  categories['Random Control'].count +
  categories['Outside View'].count +
  categories['Full SACD'].count;

const anchoringTotal = categories['Low Anchor'].count + categories['High Anchor'].count;

console.log('\n=== SUBTOTALS ===\n');
console.log(`Baseline trials: ${categories['Baseline'].count.toLocaleString()}`);
console.log(`Anchoring trials (no technique): ${anchoringTotal.toLocaleString()}`);
console.log(`  - Low anchor: ${categories['Low Anchor'].count.toLocaleString()}`);
console.log(`  - High anchor: ${categories['High Anchor'].count.toLocaleString()}`);
console.log(`Technique trials: ${techniqueTotal.toLocaleString()}`);
console.log(`  - Devils Advocate: ${categories['Devils Advocate'].count.toLocaleString()}`);
console.log(`  - Premortem: ${categories['Premortem'].count.toLocaleString()}`);
console.log(`  - Random Control: ${categories['Random Control'].count.toLocaleString()}`);
console.log(`  - Outside View: ${categories['Outside View'].count.toLocaleString()}`);
console.log(`  - Full SACD: ${categories['Full SACD'].count.toLocaleString()}`);
if (categories['Other'].count > 0) {
  console.log(`Other/Uncategorized: ${categories['Other'].count.toLocaleString()}`);
  console.log(`  Files: ${categories['Other'].files.join(', ')}`);
}

console.log('\n' + '-'.repeat(40));
const computedTotal = categories['Baseline'].count + anchoringTotal + techniqueTotal + categories['Other'].count;
console.log(`COMPUTED TOTAL: ${computedTotal.toLocaleString()}`);

// Load analysis-data.json for comparison
const analysisData = JSON.parse(readFileSync(join(RESULTS_DIR, 'analysis-data.json'), 'utf-8'));
console.log(`ANALYSIS-DATA.JSON TOTAL: ${analysisData.summary.totalTrials.toLocaleString()}`);

// Verification
console.log('\n=== VERIFICATION ===\n');
if (computedTotal === analysisData.summary.totalTrials) {
  console.log('✅ MATCH: Raw file count matches analysis-data.json');
} else {
  console.log(`❌ MISMATCH: ${computedTotal} vs ${analysisData.summary.totalTrials}`);
  console.log(`   Difference: ${Math.abs(computedTotal - analysisData.summary.totalTrials)}`);
  process.exit(1);
}

// Paper should use this number
console.log(`\n📄 PAPER SHOULD REPORT: ${computedTotal.toLocaleString()} total trials`);
