import { readFileSync, readdirSync } from 'fs';

interface Trial {
  model: string;
  temperature: number;
  anchor: number;
  response: number;
  condition?: string;
}

function loadTrials(pattern: RegExp): Trial[] {
  const files = readdirSync('results').filter(f => pattern.test(f) && f.endsWith('.jsonl'));
  const trials: Trial[] = [];
  
  for (const file of files) {
    const lines = readFileSync(`results/${file}`, 'utf-8').split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        trials.push({
          model: data.model || file.replace(/.*-([^-]+)-t\d+\.jsonl/, '$1'),
          temperature: data.temperature ?? parseFloat(file.match(/t(\d+\.?\d*)/)?.[1] || '0') / 10,
          anchor: data.anchor ?? parseInt(file.match(/(\d+)mo/)?.[1] || '0'),
          response: data.response ?? data.sentenceMonths ?? data.months,
          condition: file.split('-')[0]
        });
      } catch {}
    }
  }
  return trials;
}

// Load all data
const baselines = loadTrials(/^baseline-/);
const lowAnchors = loadTrials(/^low-anchor-/);
const fullSacd = loadTrials(/^full-sacd-/);
const outsideView = loadTrials(/^outside-view-/);
const premortem = loadTrials(/^premortem-/);
const devilsAdvocate = loadTrials(/^devils-advocate-/);
const randomControl = loadTrials(/^random-control-/);

function stats(arr: number[]): { mean: number; sd: number; n: number } {
  if (arr.length === 0) return { mean: 0, sd: 0, n: 0 };
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const sd = Math.sqrt(arr.map(x => (x - mean) ** 2).reduce((a, b) => a + b, 0) / arr.length);
  return { mean, sd, n: arr.length };
}

// Group by model
function byModel(trials: Trial[]): Record<string, number[]> {
  const groups: Record<string, number[]> = {};
  for (const t of trials) {
    const model = t.model.replace('anthropic/', '').replace('openai/', '').replace('deepseek/', '').replace('moonshotai/', '').replace('z-ai/', '').replace('minimax/', '');
    if (!groups[model]) groups[model] = [];
    if (t.response && !isNaN(t.response)) groups[model].push(t.response);
  }
  return groups;
}

console.log('# Quick Analysis - bAIs Full Dataset\n');

console.log('## Baselines by Model\n');
const baselineByModel = byModel(baselines);
for (const [model, values] of Object.entries(baselineByModel).sort()) {
  const s = stats(values);
  console.log(`${model}: ${s.mean.toFixed(1)}mo (SD=${s.sd.toFixed(1)}, n=${s.n})`);
}

console.log('\n## Full SACD by Model (Iterative Debiasing)\n');
const sacdByModel = byModel(fullSacd);
for (const [model, values] of Object.entries(sacdByModel).sort()) {
  const s = stats(values);
  const baseline = stats(baselineByModel[model] || []);
  const diff = s.mean - baseline.mean;
  console.log(`${model}: ${s.mean.toFixed(1)}mo (Δ${diff >= 0 ? '+' : ''}${diff.toFixed(1)} from baseline, n=${s.n})`);
}

console.log('\n## Sibony Techniques vs Baseline\n');
const techniques = [
  { name: 'Outside View', data: outsideView },
  { name: 'Premortem', data: premortem },
  { name: "Devil's Advocate", data: devilsAdvocate },
  { name: 'Random Control', data: randomControl },
];

for (const { name, data } of techniques) {
  const byM = byModel(data);
  console.log(`### ${name}`);
  for (const [model, values] of Object.entries(byM).sort()) {
    const s = stats(values);
    const baseline = stats(baselineByModel[model] || []);
    const diff = s.mean - baseline.mean;
    console.log(`  ${model}: ${s.mean.toFixed(1)}mo (Δ${diff >= 0 ? '+' : ''}${diff.toFixed(1)}, n=${s.n})`);
  }
  console.log('');
}

console.log('## Summary Totals\n');
console.log(`Baselines: ${baselines.length}`);
console.log(`Low Anchors: ${lowAnchors.length}`);
console.log(`Full SACD: ${fullSacd.length}`);
console.log(`Outside View: ${outsideView.length}`);
console.log(`Premortem: ${premortem.length}`);
console.log(`Devils Advocate: ${devilsAdvocate.length}`);
console.log(`Random Control: ${randomControl.length}`);
console.log(`\n**Total: ${baselines.length + lowAnchors.length + fullSacd.length + outsideView.length + premortem.length + devilsAdvocate.length + randomControl.length}**`);
