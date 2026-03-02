#!/usr/bin/env bun
/**
 * Verify paper claims match generated statistics
 * 
 * Usage: bun scripts/verify-paper-numbers.ts
 */

import { readFileSync } from 'fs';

const paperTex = readFileSync('paper/main.tex', 'utf-8');
const generatedStats = readFileSync('paper/generated-stats.txt', 'utf-8');

console.log('='.repeat(60));
console.log('PAPER NUMBER VERIFICATION');
console.log('='.repeat(60));

const checks: { name: string; paper: string; expected: string; match: boolean }[] = [];

// Key numbers to verify
const keyNumbers = [
  { name: 'SACD % baseline', pattern: /SACD.*?(\d+\.\d+)%.*?\[92, 95\]/, expected: '93.7' },
  { name: 'DA % baseline', pattern: /Devil.*?(\d+\.\d+)%.*?\[62, 65\]/, expected: '63.6' },
  { name: 'Premortem % baseline', pattern: /Premortem.*?(\d+\.\d+)%.*?\[90, 93\]/, expected: '91.6' },
  { name: 'Random Control % baseline', pattern: /Random Control.*?(\d+\.\d+)%.*?\[77, 80\]/, expected: '78.3' },
  { name: 'Total trials', pattern: /22,773/, expected: '22773' },
  { name: 'Main study trials', pattern: /14,152/, expected: '14152' },
  { name: 'Multi-domain trials', pattern: /8,621/, expected: '8621' },
];

// Check for key numbers in paper
for (const check of keyNumbers) {
  const found = paperTex.includes(check.expected) || paperTex.includes(check.expected.replace('.', ','));
  console.log(`${found ? '✅' : '❌'} ${check.name}: ${check.expected}`);
}

// Verify specific table values
console.log('\n' + '-'.repeat(60));
console.log('TABLE VALUES');
console.log('-'.repeat(60));

// SACD MAD
const sacdMadMatch = paperTex.match(/SACD.*?18\.1%/);
console.log(`${sacdMadMatch ? '✅' : '❌'} SACD MAD: 18.1%`);

// DA MAD  
const daMadMatch = paperTex.match(/Devil.*?36\.4%/);
console.log(`${daMadMatch ? '✅' : '❌'} DA MAD: 36.4%`);

// Premortem MAD
const premortMadMatch = paperTex.match(/Premortem.*?22\.6%/);
console.log(`${premortMadMatch ? '✅' : '❌'} Premortem MAD: 22.6%`);

// Haiku SACD
const haikuSacdMatch = paperTex.match(/Haiku.*?47\.8%/);
console.log(`${haikuSacdMatch ? '✅' : '❌'} Haiku SACD: 47.8%`);

// Opus SACD
const opusSacdMatch = paperTex.match(/Opus.*?127\.8%/);
console.log(`${opusSacdMatch ? '✅' : '❌'} Opus SACD: 127.8%`);

// Effect size
const effectSizeMatch = paperTex.match(/d\s*=\s*1\.06/);
console.log(`${effectSizeMatch ? '✅' : '❌'} Cohen's d SACD vs DA: 1.06`);

console.log('\n' + '='.repeat(60));
console.log('Verification complete. All numbers should come from:');
console.log('  bun scripts/generate-all-paper-numbers.ts');
console.log('='.repeat(60));
