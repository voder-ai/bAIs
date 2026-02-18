import * as fs from 'fs';
import * as path from 'path';

interface DataPoint {
  file: string;
  model: string;
  condition: string;
  sentence: number;
  timestamp?: string;
}

const resultsDir = './results';
const files = fs.readdirSync(resultsDir).filter(f => f.endsWith('.jsonl'));

const allData: DataPoint[] = [];

for (const file of files) {
  const content = fs.readFileSync(path.join(resultsDir, file), 'utf-8');
  const lines = content.trim().split('\n').filter(l => l.trim());
  
  for (const line of lines) {
    try {
      const data = JSON.parse(line);
      const model = data.model || 'unknown';
      const sentence = data.result?.sentenceMonths ?? data.sentenceMonths;
      const cond = data.conditionId || data.control || 'unknown';
      const timestamp = data.collectedAt || data.timestamp;
      
      if (sentence !== null && sentence !== undefined && typeof sentence === 'number') {
        allData.push({ file, model, condition: cond, sentence, timestamp });
      }
    } catch {}
  }
}

console.log(`Total valid data points: ${allData.length}`);
console.log(`Files processed: ${files.length}`);
console.log('');

// Group by model
const byModel = new Map<string, DataPoint[]>();
for (const d of allData) {
  const key = d.model.replace('anthropic/', '').replace('openrouter/', '').replace('github-copilot/', '').replace('openai/', '').replace('openai-codex/', '');
  if (!byModel.has(key)) byModel.set(key, []);
  byModel.get(key)!.push(d);
}

console.log('=== DATA BY MODEL ===');
console.log('');

for (const [model, points] of [...byModel.entries()].sort((a,b) => b[1].length - a[1].length)) {
  if (points.length < 20) continue;
  
  // Group by condition
  const byCond = new Map<string, number[]>();
  for (const p of points) {
    let condKey = 'other';
    if (p.condition.includes('no-anchor') || p.condition.includes('baseline')) condKey = 'no-anchor';
    else if (p.condition.includes('3mo') || (p.condition.includes('low') && !p.condition.includes('24'))) condKey = 'low-3mo';
    else if (p.condition.includes('9mo') || (p.condition.includes('high') && !p.condition.includes('24'))) condKey = 'high-9mo';
    else if (p.condition.includes('24mo')) condKey = 'high-24mo';
    
    if (!byCond.has(condKey)) byCond.set(condKey, []);
    byCond.get(condKey)!.push(p.sentence);
  }
  
  const stats = (arr: number[]) => {
    if (!arr || arr.length === 0) return { mean: NaN, sd: NaN, n: 0 };
    const mean = arr.reduce((a,b) => a+b, 0) / arr.length;
    const variance = arr.reduce((a,b) => a + (b-mean)**2, 0) / arr.length;
    return { mean, sd: Math.sqrt(variance), n: arr.length };
  };
  
  console.log(`### ${model} (n=${points.length})`);
  for (const cond of ['no-anchor', 'low-3mo', 'high-9mo', 'high-24mo']) {
    const s = stats(byCond.get(cond) || []);
    if (s.n > 0) {
      console.log(`  ${cond}: ${s.mean.toFixed(1)} ± ${s.sd.toFixed(1)} (n=${s.n})`);
    }
  }
  console.log('');
}
