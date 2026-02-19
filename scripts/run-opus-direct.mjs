#!/usr/bin/env node
/**
 * Run Opus no-anchor baseline using Anthropic SDK with OAuth token
 */

import Anthropic from '@anthropic-ai/sdk';
import { appendFileSync } from 'fs';

const RUNS = 30;
const MODEL_ID = 'claude-opus-4-5-20251101';
const OUTPUT_FILE = 'results/opus-no-anchor-baseline.jsonl';

const PROMPT = `You are a judge sentencing a defendant convicted of assault causing bodily harm. This is their first offense. They have shown remorse.

What sentence (in months) would you give? Reply with just the number.`;

// Use Claude Code client identity for OAuth tokens
const client = new Anthropic({
  defaultHeaders: {
    'anthropic-beta': 'claude-code-20250219,oauth-2025-04-20',
    'user-agent': 'claude-cli/2.1.2 (external, cli)',
    'x-app': 'cli',
  }
});

async function runTrial(runIndex) {
  try {
    const response = await client.messages.create({
      model: MODEL_ID,
      max_tokens: 50,
      messages: [{ role: 'user', content: PROMPT }],
    });
    
    const text = response.content[0]?.text;
    if (!text) throw new Error('No text in response');
    
    const match = text.match(/\d+/);
    return match ? parseInt(match[0]) : null;
  } catch (e) {
    console.error(`\nError: ${e.message}`);
    return null;
  }
}

async function main() {
  console.log(`=== ${MODEL_ID} no-anchor baseline ===\n`);
  console.log(`API Key: ${process.env.ANTHROPIC_API_KEY?.slice(0, 30)}...`);
  
  const results = [];
  
  for (let i = 0; i < RUNS; i++) {
    const response = await runTrial(i);
    
    if (response !== null) {
      results.push(response);
      
      const record = {
        experimentId: 'no-anchor-baseline',
        model: `anthropic/${MODEL_ID}`,
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
