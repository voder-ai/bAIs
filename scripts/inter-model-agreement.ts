// @ts-nocheck
#!/usr/bin/env npx tsx
/**
 * Inter-Model Agreement Analysis
 * 
 * Purpose: Do models shift in the same direction when anchored?
 * Compare: no-anchor baseline vs low-anchor vs high-anchor
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

interface Trial {
  model: string;
  sentenceMonths: number;
  anchor?: number;
  conditionId?: string;
}

function loadJsonl(filepath: string): Trial[] {
  try {
    const content = readFileSync(filepath, 'utf8');
    return content.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
  } catch {
    return [];
  }
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function main() {
  const resultsDir = 'results';
  
  console.log('Inter-Model Agreement Analysis');
  console.log('==============================');
  console.log('');
  
  // Model data: { model: { noAnchor, low, high } }
  const modelData: Record<string, { noAnchor: number[], low: number[], high: number[] }> = {};
  
  // Load no-anchor data
  const noAnchorFiles = ['no-anchor-control.jsonl', 'gpt52-no-anchor-control.jsonl', 
                         'opus45-no-anchor-control.jsonl', 'hermes405b-no-anchor-control.jsonl'];
  
  for (const file of noAnchorFiles) {
    const trials = loadJsonl(join(resultsDir, file));
    for (const t of trials) {
      const model = t.model.split('/').pop() || t.model;
      if (!modelData[model]) modelData[model] = { noAnchor: [], low: [], high: [] };
      modelData[model].noAnchor.push(t.sentenceMonths);
    }
  }
  
  // Load baseline data (anchored)
  const baselineFiles = readdirSync(resultsDir).filter(f => 
    f.includes('baseline') && f.endsWith('.jsonl') && !f.includes('no-anchor')
  );
  
  for (const file of baselineFiles) {
    const trials = loadJsonl(join(resultsDir, file));
    for (const t of trials) {
      if (t.sentenceMonths === undefined) continue;
      const model = t.model?.split('/').pop() || file.split('-')[0];
      if (!modelData[model]) modelData[model] = { noAnchor: [], low: [], high: [] };
      
      const anchor = t.anchor || (t.conditionId?.includes('low') ? 3 : t.conditionId?.includes('high') ? 9 : null);
      if (anchor === 3) modelData[model].low.push(t.sentenceMonths);
      else if (anchor === 9) modelData[model].high.push(t.sentenceMonths);
    }
  }
  
  // Also check full-sacd files for baseline comparison
  const sacdFiles = readdirSync(resultsDir).filter(f => f.includes('full-sacd') && f.endsWith('.jsonl'));
  
  // Analysis
  console.log('Model Direction Analysis:');
  console.log('-------------------------');
  console.log('');
  console.log('| Model | No-Anchor | Low (3mo) | High (9mo) | Low Shift | High Shift | Direction |');
  console.log('|-------|-----------|-----------|------------|-----------|------------|-----------|');
  
  let consistentModels = 0;
  let inconsistentModels = 0;
  let analyzedModels = 0;
  
  for (const [model, data] of Object.entries(modelData)) {
    if (data.noAnchor.length === 0) continue;
    if (data.low.length === 0 && data.high.length === 0) continue;
    
    const noAnchorMean = mean(data.noAnchor);
    const lowMean = data.low.length > 0 ? mean(data.low) : null;
    const highMean = data.high.length > 0 ? mean(data.high) : null;
    
    let lowShift = lowMean !== null ? (lowMean - noAnchorMean) : null;
    let highShift = highMean !== null ? (highMean - noAnchorMean) : null;
    
    // Determine direction
    let direction = 'N/A';
    if (lowShift !== null && highShift !== null) {
      if (lowShift < 0 && highShift > 0) {
        direction = '✅ Consistent';
        consistentModels++;
      } else if (lowShift > 0 && highShift < 0) {
        direction = '❌ Reversed';
        inconsistentModels++;
      } else {
        direction = '⚠️ Asymmetric';
        inconsistentModels++;
      }
      analyzedModels++;
    }
    
    console.log(`| ${model.padEnd(20)} | ${noAnchorMean.toFixed(1).padStart(9)} | ${lowMean?.toFixed(1).padStart(9) || 'N/A'.padStart(9)} | ${highMean?.toFixed(1).padStart(10) || 'N/A'.padStart(10)} | ${lowShift?.toFixed(1).padStart(9) || 'N/A'.padStart(9)} | ${highShift?.toFixed(1).padStart(10) || 'N/A'.padStart(10)} | ${direction} |`);
  }
  
  console.log('');
  console.log('Summary:');
  console.log('--------');
  console.log(`Models with no-anchor + anchored data: ${analyzedModels}`);
  console.log(`Consistent direction (low↓, high↑): ${consistentModels}`);
  console.log(`Inconsistent direction: ${inconsistentModels}`);
  console.log('');
  
  if (analyzedModels > 0) {
    const agreementRate = (consistentModels / analyzedModels * 100).toFixed(0);
    console.log(`Agreement rate: ${agreementRate}%`);
    console.log('');
    console.log('For paper:');
    console.log('---------');
    console.log(`"Of the ${analyzedModels} models with no-anchor control data, ${consistentModels} (${agreementRate}%)`);
    console.log(`showed consistent anchoring direction (shifting toward the anchor value)."`);
  }
}

main();
