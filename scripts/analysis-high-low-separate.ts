#!/usr/bin/env bun
/**
 * Separate high/low anchor analysis
 * Shows % of baseline broken down by anchor condition
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const RESULTS_DIR = './results';

// Model name normalization
function normalizeModel(model: string): string {
  return model
    .replace('anthropic/', '')
    .replace('openai/', '')
    .replace('deepseek/', '')
    .replace('moonshot/', '')
    .replace('zhipu/', '')
    .replace(/\./g, '-')
    .toLowerCase();
}

// Load baselines
const analysisData = JSON.parse(readFileSync(join(RESULTS_DIR, 'analysis-data.json'), 'utf-8'));
const baselineByModel = new Map<string, number>();

for (const b of analysisData.baselines) {
  const key = normalizeModel(b.model);
  if (!baselineByModel.has(key)) {
    baselineByModel.set(key, b.mean);
  } else {
    baselineByModel.set(key, (baselineByModel.get(key)! + b.mean) / 2);
  }
}

// Load technique trials from JSONL files
interface Trial {
  model: string;
  technique: string;
  anchor: number;
  anchorType: 'high' | 'low';
  sentenceMonths: number;
}

function loadTechniqueTrials(): Trial[] {
  const trials: Trial[] = [];
  const files = readdirSync(RESULTS_DIR).filter(f => 
    f.endsWith('.jsonl') && 
    (f.includes('devils-advocate') || f.includes('premortem') || f.includes('random-control') || f.includes('full-sacd') || f.includes('sacd'))
  );
  
  for (const file of files) {
    try {
      const content = readFileSync(join(RESULTS_DIR, file), 'utf-8');
      const lines = content.trim().split('\n').filter(l => l);
      for (const line of lines) {
        const data = JSON.parse(line);
        if (typeof data.sentenceMonths === 'number') {
          const model = normalizeModel(data.model || data.actualModel);
          const baseline = baselineByModel.get(model);
          if (!baseline) continue;
          
          // Determine anchor type from anchor value vs baseline
          const anchorType = data.anchor < baseline ? 'low' : 'high';
          
          trials.push({
            model,
            technique: data.technique || file.split('-')[0],
            anchor: data.anchor,
            anchorType,
            sentenceMonths: data.sentenceMonths
          });
        }
      }
    } catch (e) {
      // Skip invalid files
    }
  }
  return trials;
}

const trials = loadTechniqueTrials();
console.log(`Loaded ${trials.length} technique trials\n`);

// Analyze by technique and anchor type
const techniques = ['full-sacd', 'sacd', 'premortem', 'devils-advocate', 'random-control'];

console.log('=== % OF BASELINE BY TECHNIQUE AND ANCHOR TYPE ===\n');

interface Result {
  technique: string;
  anchorType: string;
  meanPct: number;
  deviation: number;
  n: number;
}

const results: Result[] = [];

for (const technique of techniques) {
  for (const anchorType of ['low', 'high'] as const) {
    const filtered = trials.filter(t => 
      (t.technique === technique || t.technique.includes(technique)) && 
      t.anchorType === anchorType
    );
    
    if (filtered.length === 0) continue;
    
    const pcts = filtered.map(t => {
      const baseline = baselineByModel.get(t.model)!;
      return (t.sentenceMonths / baseline) * 100;
    });
    
    const mean = pcts.reduce((a, b) => a + b, 0) / pcts.length;
    const deviation = Math.abs(mean - 100);
    
    results.push({
      technique,
      anchorType,
      meanPct: mean,
      deviation,
      n: pcts.length
    });
  }
}

// Display results
console.table(results.map(r => ({
  technique: r.technique,
  anchor: r.anchorType,
  n: r.n,
  '% of baseline': r.meanPct.toFixed(1) + '%',
  'deviation': r.deviation.toFixed(1) + '%'
})));

// Summary by technique showing both conditions
console.log('\n=== TECHNIQUE SUMMARY (High vs Low Anchor) ===\n');

for (const technique of techniques) {
  const low = results.find(r => r.technique === technique && r.anchorType === 'low');
  const high = results.find(r => r.technique === technique && r.anchorType === 'high');
  
  if (!low || !high) continue;
  
  console.log(`${technique.toUpperCase()}:`);
  console.log(`  Low anchor:  ${low.meanPct.toFixed(1)}% (n=${low.n})`);
  console.log(`  High anchor: ${high.meanPct.toFixed(1)}% (n=${high.n})`);
  console.log(`  Asymmetry:   ${(high.meanPct - low.meanPct).toFixed(1)} percentage points`);
  console.log('');
}

// Key insight
console.log('=== KEY INSIGHT ===\n');
console.log('If technique works symmetrically, both conditions should be near 100%.');
console.log('Asymmetry suggests technique works better for one anchor direction.\n');

const fullSacdLow = results.find(r => (r.technique === 'full-sacd' || r.technique === 'sacd') && r.anchorType === 'low');
const fullSacdHigh = results.find(r => (r.technique === 'full-sacd' || r.technique === 'sacd') && r.anchorType === 'high');
const daLow = results.find(r => r.technique === 'devils-advocate' && r.anchorType === 'low');
const daHigh = results.find(r => r.technique === 'devils-advocate' && r.anchorType === 'high');

if (fullSacdLow && fullSacdHigh) {
  console.log(`Full SACD: Low=${fullSacdLow.meanPct.toFixed(1)}%, High=${fullSacdHigh.meanPct.toFixed(1)}%`);
}
if (daLow && daHigh) {
  console.log(`Devil's Advocate: Low=${daLow.meanPct.toFixed(1)}%, High=${daHigh.meanPct.toFixed(1)}%`);
}
