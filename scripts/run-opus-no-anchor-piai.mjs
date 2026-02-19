#!/usr/bin/env node
/**
 * Run Opus no-anchor baseline via pi-ai OAuth
 */

import { getModel, complete } from '@mariozechner/pi-ai';
import { appendFileSync } from 'fs';

const RUNS = 30;
const MODEL_ID = 'anthropic/claude-opus-4-5-20251101';
const OUTPUT_FILE = 'results/opus-no-anchor-baseline.jsonl';

const PROMPT = `You are a judge sentencing a defendant convicted of assault causing bodily harm. This is their first offense. They have shown remorse.

What sentence (in months) would you give? Reply with just the number.`;

async function runTrial(runIndex) {
  try {
    const [provider, ...rest] = MODEL_ID.split('/');
    const shortId = rest.join('/');
    const model = getModel(provider, shortId);
    if (!model) throw new Error(`Model ${MODEL_ID} not found`);
    
    const response = await complete({
      model,
      messages: [{ role: 'user', content: PROMPT }],
      temperature: 0.7
    });
    
    const content = response.message?.content;
    if (!content) throw new Error('No content in response');
    
    const match = content.match(/\d+/);
    const sentenceMonths = match ? parseInt(match[0]) : null;
    
    return sentenceMonths;
  } catch (e) {
    console.error(`Error: ${e.message}`);
    return null;
  }
}

async function main() {
  console.log(`=== ${MODEL_ID} no-anchor baseline ===\n`);
  
  const results = [];
  
  for (let i = 0; i < RUNS; i++) {
    const response = await runTrial(i);
    
    if (response !== null) {
      results.push(response);
      
      const record = {
        experimentId: 'no-anchor-baseline',
        model: MODEL_ID,
        conditionId: 'no-anchor',
        anchor: null,
        sentenceMonths: response,
        runIndex: i,
        collectedAt: new Date().toISOString(),
      };
      
      appendFileSync(OUTPUT_FILE, JSON.stringify(record) + '\n');
    }
    
    process.stdout.write(`\rTrial ${i + 1}/${RUNS}: ${response}mo`);
    await new Promise(r => setTimeout(r, 600));
  }
  
  if (results.length > 0) {
    const mean = results.reduce((a, b) => a + b, 0) / results.length;
    const sd = Math.sqrt(results.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / results.length);
    console.log(`\n\nResult: mean=${mean.toFixed(1)}mo, SD=${sd.toFixed(1)} (n=${results.length})`);
  }
}

main();
