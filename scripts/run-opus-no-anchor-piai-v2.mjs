#!/usr/bin/env node
/**
 * Run Opus no-anchor baseline via pi-ai OAuth
 * Loads auth from auth.json and registers with pi-ai
 */

import { getModel, complete, registerApi, getApis } from '@mariozechner/pi-ai';
import { appendFileSync, readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const RUNS = 30;
const MODEL_ID = 'anthropic/claude-opus-4-5-20251101';
const OUTPUT_FILE = 'results/opus-no-anchor-baseline.jsonl';

const PROMPT = `You are a judge sentencing a defendant convicted of assault causing bodily harm. This is their first offense. They have shown remorse.

What sentence (in months) would you give? Reply with just the number.`;

// Load auth from auth.json (pi-ai CLI format)
function loadPiAiAuth() {
  const paths = [
    './auth.json',
    join(homedir(), '.pi-ai/auth.json'),
  ];
  
  for (const p of paths) {
    if (existsSync(p)) {
      console.log(`Loading auth from ${p}`);
      try {
        return JSON.parse(readFileSync(p, 'utf-8'));
      } catch (e) {
        console.error(`Failed to parse ${p}:`, e);
      }
    }
  }
  return null;
}

async function runTrial(model, runIndex) {
  try {
    const response = await complete({
      model,
      messages: [{ role: 'user', content: PROMPT }],
      temperature: 0.7
    });
    
    const content = response.message?.content;
    if (!content) throw new Error('No content in response');
    
    // Get text from content array
    const text = Array.isArray(content) 
      ? content.find(c => c.type === 'text')?.text 
      : content;
    
    if (!text) throw new Error('No text in response');
    
    const match = text.match(/\d+/);
    return match ? parseInt(match[0]) : null;
  } catch (e) {
    console.error(`Error: ${e.message}`);
    return null;
  }
}

async function main() {
  // Load auth
  const auth = loadPiAiAuth();
  if (!auth || !auth.anthropic) {
    console.error('No Anthropic auth found in auth.json');
    process.exit(1);
  }
  
  console.log('Auth loaded, access token:', auth.anthropic.access?.slice(0, 30) + '...');
  
  // Get model
  const [provider, ...rest] = MODEL_ID.split('/');
  const shortId = rest.join('/');
  
  console.log(`Getting model: provider=${provider}, id=${shortId}`);
  
  const model = getModel(provider, shortId);
  if (!model) {
    console.error(`Model ${MODEL_ID} not found`);
    console.log('Available APIs:', getApis ? getApis() : 'getApis not available');
    process.exit(1);
  }
  
  console.log(`=== ${MODEL_ID} no-anchor baseline ===\n`);
  
  const results = [];
  
  for (let i = 0; i < RUNS; i++) {
    const response = await runTrial(model, i);
    
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
