#!/usr/bin/env npx tsx
/**
 * Check ALL existing technique files and report gaps
 * Scans actual files rather than assuming model configs
 */
import { readdirSync, readFileSync } from 'fs';

const TECHNIQUES = ['full-sacd', 'outside-view', 'devils-advocate', 'premortem', 'random-control'];
const TARGET = 30;

console.log('=== ALL TECHNIQUES GAP CHECK ===\n');

const files = readdirSync('results').filter(f => f.endsWith('.jsonl'));
const gaps: { file: string; count: number; need: number }[] = [];

for (const tech of TECHNIQUES) {
  const techFiles = files.filter(f => f.startsWith(tech + '-'));
  
  for (const file of techFiles) {
    const content = readFileSync(`results/${file}`, 'utf-8').trim();
    const count = content ? content.split('\n').length : 0;
    
    if (count < TARGET) {
      gaps.push({ file: file.replace('.jsonl', ''), count, need: TARGET - count });
    }
  }
}

// Group by technique
const byTech: Record<string, typeof gaps> = {};
for (const g of gaps) {
  const tech = g.file.split('-')[0] + '-' + g.file.split('-')[1];
  const techKey = TECHNIQUES.find(t => g.file.startsWith(t)) || 'other';
  byTech[techKey] = byTech[techKey] || [];
  byTech[techKey].push(g);
}

let totalGaps = 0;
let totalNeeded = 0;

for (const tech of TECHNIQUES) {
  const techGaps = byTech[tech] || [];
  if (techGaps.length > 0) {
    console.log(`${tech.toUpperCase()} (${techGaps.length} gaps):`);
    for (const g of techGaps.sort((a, b) => a.file.localeCompare(b.file))) {
      console.log(`  ${g.file}: ${g.count}/${TARGET} (need ${g.need})`);
      totalGaps++;
      totalNeeded += g.need;
    }
    console.log('');
  }
}

console.log('=== SUMMARY ===');
console.log(`Total gaps: ${totalGaps} conditions`);
console.log(`Total trials needed: ${totalNeeded}`);
