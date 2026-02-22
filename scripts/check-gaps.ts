#!/usr/bin/env npx tsx
/**
 * Check all gaps across models, anchors, and temperatures.
 * Uses --dry-run mode of each technique script to report gaps.
 * 
 * Usage: npx tsx scripts/check-gaps.ts [--technique=full-sacd|all]
 */
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

// Model configurations with their specific anchors
// Note: gpt-4-1 uses different anchors for full-sacd vs other techniques (data inconsistency)
const MODELS: Record<string, { id: string; lowAnchor: number; highAnchor: number; fullSacdAnchors?: [number, number] }> = {
  'claude-opus-4-6': { id: 'anthropic/claude-opus-4.6', lowAnchor: 9, highAnchor: 27 },
  'claude-sonnet-4-6': { id: 'anthropic/claude-sonnet-4.6', lowAnchor: 12, highAnchor: 36 },
  'claude-haiku-4-5': { id: 'anthropic/claude-haiku-4.5', lowAnchor: 15, highAnchor: 44 },
  'gpt-5-2': { id: 'openai/gpt-5.2', lowAnchor: 16, highAnchor: 48 },
  'gpt-4-1': { id: 'openai/gpt-4.1', lowAnchor: 15, highAnchor: 44, fullSacdAnchors: [13, 38] },
  'o3': { id: 'openai/o3', lowAnchor: 17, highAnchor: 51 },
  'o4-mini': { id: 'openai/o4-mini', lowAnchor: 18, highAnchor: 54 },
  'deepseek-v3-2': { id: 'deepseek/deepseek-v3.2', lowAnchor: 15, highAnchor: 44 },
  'glm-5': { id: 'z-ai/glm-5', lowAnchor: 16, highAnchor: 48 },
  'kimi-k2-5': { id: 'moonshotai/kimi-k2.5', lowAnchor: 15, highAnchor: 46 },
};

const TECHNIQUES = ['full-sacd', 'outside-view', 'devils-advocate', 'premortem', 'random-control'];
const TEMPERATURES = [0, 0.7, 1];
const TARGET = 30;

interface GapInfo {
  technique: string;
  model: string;
  anchor: number;
  temp: number;
  current: number;
  target: number;
  gap: number;
  file: string;
}

async function countTrials(filePath: string): Promise<number> {
  if (!existsSync(filePath)) return 0;
  try {
    const content = await readFile(filePath, 'utf-8');
    return content.trim().split('\n').filter(line => line.trim()).length;
  } catch {
    return 0;
  }
}

function getTempStr(temp: number): string {
  return temp.toString().replace('.', '');
}

async function checkAllGaps(): Promise<GapInfo[]> {
  const gaps: GapInfo[] = [];
  const complete: GapInfo[] = [];
  
  for (const technique of TECHNIQUES) {
    for (const [modelShort, config] of Object.entries(MODELS)) {
      // Use special anchors for full-sacd if defined
      const anchors = (technique === 'full-sacd' && config.fullSacdAnchors)
        ? config.fullSacdAnchors
        : [config.lowAnchor, config.highAnchor];
      
      for (const anchor of anchors) {
        for (const temp of TEMPERATURES) {
          const tempStr = getTempStr(temp);
          const file = `results/${technique}-${anchor}mo-${modelShort}-t${tempStr}.jsonl`;
          const current = await countTrials(file);
          const gap = TARGET - current;
          
          const info: GapInfo = {
            technique,
            model: modelShort,
            anchor,
            temp,
            current,
            target: TARGET,
            gap: Math.max(0, gap),
            file,
          };
          
          if (gap > 0) {
            gaps.push(info);
          } else {
            complete.push(info);
          }
        }
      }
    }
  }
  
  return gaps;
}

async function main() {
  console.log('=== bAIs Gap Analysis ===');
  console.log(`Target: ${TARGET} trials per condition`);
  console.log(`Models: ${Object.keys(MODELS).length}`);
  console.log(`Techniques: ${TECHNIQUES.length}`);
  console.log(`Temperatures: ${TEMPERATURES.join(', ')}`);
  console.log('');
  
  const gaps = await checkAllGaps();
  
  if (gaps.length === 0) {
    console.log('✅ No gaps! All conditions have n≥30.');
    return;
  }
  
  // Group by technique
  const byTechnique: Record<string, GapInfo[]> = {};
  for (const gap of gaps) {
    if (!byTechnique[gap.technique]) byTechnique[gap.technique] = [];
    byTechnique[gap.technique].push(gap);
  }
  
  // Print gaps by technique
  let totalGaps = 0;
  let totalTrials = 0;
  
  for (const technique of TECHNIQUES) {
    const techGaps = byTechnique[technique] || [];
    if (techGaps.length === 0) continue;
    
    console.log(`\n## ${technique} (${techGaps.length} gaps)`);
    console.log('');
    
    // Sort by model, then anchor, then temp
    techGaps.sort((a, b) => {
      if (a.model !== b.model) return a.model.localeCompare(b.model);
      if (a.anchor !== b.anchor) return a.anchor - b.anchor;
      return a.temp - b.temp;
    });
    
    for (const gap of techGaps) {
      const tempDisplay = gap.temp === 0.7 ? 't0.7' : `t${gap.temp}`;
      console.log(`  ${gap.model} ${gap.anchor}mo ${tempDisplay}: ${gap.current}/${gap.target} (need +${gap.gap})`);
      totalGaps++;
      totalTrials += gap.gap;
    }
  }
  
  console.log('');
  console.log('=== SUMMARY ===');
  console.log(`Total gaps: ${totalGaps}`);
  console.log(`Total trials needed: ${totalTrials}`);
  
  // Group by model for quick view
  const byModel: Record<string, number> = {};
  for (const gap of gaps) {
    byModel[gap.model] = (byModel[gap.model] || 0) + gap.gap;
  }
  
  console.log('');
  console.log('Trials needed by model:');
  for (const [model, trials] of Object.entries(byModel).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${model}: ${trials}`);
  }
}

main().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
