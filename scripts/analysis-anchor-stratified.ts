#!/usr/bin/env npx tsx
/**
 * Anchor-stratified direction of change analysis
 */
import { readFile } from 'node:fs/promises';
import { glob } from 'glob';

interface Trial {
  model: string;
  anchor: number;
  initialSentence: number;
  finalSentence: number;
}

const MODEL_BASELINES: Record<string, number> = {
  'anthropic/claude-haiku-4.5': 29.1,
  'anthropic/claude-sonnet-4-6': 24.1,
  'anthropic/claude-opus-4-6': 18.0,
  'openai/gpt-5.2': 31.8,
};

const MODEL_SHORT: Record<string, string> = {
  'anthropic/claude-haiku-4.5': 'Haiku 4.5',
  'anthropic/claude-sonnet-4-6': 'Sonnet 4.6',
  'anthropic/claude-opus-4-6': 'Opus 4.6',
  'openai/gpt-5.2': 'GPT-5.2',
};

async function loadTrials(): Promise<Trial[]> {
  const files = await glob('results/6turn-rc-englich-*.jsonl');
  const trials: Trial[] = [];
  for (const file of files) {
    const content = await readFile(file, 'utf-8');
    for (const line of content.trim().split('\n').filter(l => l.trim())) {
      try { trials.push(JSON.parse(line)); } catch {}
    }
  }
  return trials;
}

async function main() {
  const trials = await loadTrials();
  const models = [...new Set(trials.map(t => t.model))];
  
  console.log('=== Anchor-Stratified Direction of Change ===\n');
  console.log('| Model | Anchor | n | Toward | Away | Unchanged |');
  console.log('|-------|--------|---|--------|------|-----------|');
  
  for (const model of models) {
    const baseline = MODEL_BASELINES[model] || 24;
    const modelTrials = trials.filter(t => t.model === model);
    const lowTrials = modelTrials.filter(t => t.anchor <= baseline);
    const highTrials = modelTrials.filter(t => t.anchor > baseline);
    
    const analyze = (condTrials: Trial[]) => {
      let toward = 0, away = 0, unchanged = 0;
      for (const t of condTrials) {
        if (t.initialSentence === t.finalSentence) unchanged++;
        else {
          const initialDist = Math.abs(t.initialSentence - baseline);
          const finalDist = Math.abs(t.finalSentence - baseline);
          if (finalDist < initialDist) toward++;
          else away++;
        }
      }
      return { toward, away, unchanged, n: condTrials.length };
    };
    
    const low = analyze(lowTrials);
    const high = analyze(highTrials);
    
    console.log(`| ${MODEL_SHORT[model]} | Low | ${low.n} | ${(low.toward/low.n*100).toFixed(0)}% | ${(low.away/low.n*100).toFixed(0)}% | ${(low.unchanged/low.n*100).toFixed(0)}% |`);
    console.log(`| | High | ${high.n} | ${(high.toward/high.n*100).toFixed(0)}% | ${(high.away/high.n*100).toFixed(0)}% | ${(high.unchanged/high.n*100).toFixed(0)}% |`);
  }
}

main().catch(console.error);
