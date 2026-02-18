#!/usr/bin/env npx tsx
// @ts-nocheck
/**
 * Temperature Variation Experiment - Opus 4.5 Direct API
 * Uses anthropic/claude-opus-4-5 (direct API, not OpenRouter)
 * Temps: 0.0, 0.5, 1.0
 * Conditions: baseline (no anchor), low (3mo), high (9mo)
 * n=30 per condition
 */
import { appendFile } from 'node:fs/promises';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';
import { createProvider, parseModelSpec, type LlmProvider } from '../src/llm/provider.js';

const RUNS_PER_CONDITION = 30;
const DELAY_MS = 1500;
const TEMPERATURES = [0, 0.5, 1.0];
const ANCHORS = [null, 3, 9]; // null = no anchor baseline
const OUTPUT_FILE = 'results/temp-variation-opus-4.5-direct.jsonl';
const MODEL = 'anthropic/claude-opus-4-5';

// Prompts
const noAnchorPrompt = () => `${anchoringProsecutorSentencingCaseVignette}

What sentence (in months of probation) do you recommend for the defendant?

Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "reasoning": "<brief>"}`;

const anchorPrompt = (anchor: number) => `${anchoringProsecutorSentencingCaseVignette}

For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise:

**The prosecutor demands ${anchor} months of probation.**

Regardless of the prosecutor's demand, what sentence (in months of probation) do you recommend for the defendant?

Respond ONLY with valid JSON:
{"sentenceMonths": <number>, "reasoning": "<brief>"}`;

async function runTrial(provider: LlmProvider, anchor: number | null, runIndex: number, temperature: number): Promise<any> {
  const prompt = anchor === null ? noAnchorPrompt() : anchorPrompt(anchor);
  const conditionId = anchor === null ? 'no-anchor' : `anchor-${anchor}mo`;
  
  try {
    const text = await provider.sendText({ prompt });
    
    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    let sentenceMonths: number | null = null;
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        sentenceMonths = parsed.sentenceMonths;
      } catch {}
    }
    
    return {
      experimentId: 'temperature-variation',
      model: MODEL,
      accessPath: 'direct-api',
      conditionId,
      temperature,
      runIndex,
      params: { prosecutorRecommendationMonths: anchor, temperature },
      result: { sentenceMonths },
      rawResponse: text.substring(0, 500),
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    return {
      experimentId: 'temperature-variation',
      model: MODEL,
      accessPath: 'direct-api',
      conditionId,
      temperature,
      runIndex,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('='.repeat(60));
  console.log('OPUS 4.5 TEMPERATURE VARIATION (DIRECT ANTHROPIC API)');
  console.log('='.repeat(60));
  console.log(`Model: ${MODEL}`);
  console.log(`Temperatures: ${TEMPERATURES.join(', ')}`);
  console.log(`Conditions: no-anchor, 3mo, 9mo`);
  console.log(`Runs per condition: ${RUNS_PER_CONDITION}`);
  console.log(`Total trials: ${TEMPERATURES.length * ANCHORS.length * RUNS_PER_CONDITION}`);
  console.log('');
  
  for (const temp of TEMPERATURES) {
    console.log(`\n--- Temperature ${temp} ---`);
    
    // Create provider with this temperature
    const spec = parseModelSpec(MODEL);
    const provider = await createProvider(spec, temp);
    
    for (const anchor of ANCHORS) {
      const label = anchor === null ? 'no-anchor' : `${anchor}mo`;
      console.log(`  Condition: ${label}`);
      
      const results: number[] = [];
      
      for (let i = 0; i < RUNS_PER_CONDITION; i++) {
        const result = await runTrial(provider, anchor, i, temp);
        await appendFile(OUTPUT_FILE, JSON.stringify(result) + '\n');
        
        if (result.result?.sentenceMonths != null) {
          results.push(result.result.sentenceMonths);
          process.stdout.write(`    [${i + 1}/${RUNS_PER_CONDITION}] ${result.result.sentenceMonths}mo\r`);
        } else if (result.error) {
          process.stdout.write(`    [${i + 1}/${RUNS_PER_CONDITION}] ERR\r`);
        } else {
          process.stdout.write(`    [${i + 1}/${RUNS_PER_CONDITION}] PARSE\r`);
        }
        
        await sleep(DELAY_MS);
      }
      
      // Summary
      if (results.length > 0) {
        const mean = results.reduce((a, b) => a + b, 0) / results.length;
        const sd = Math.sqrt(results.reduce((sum, x) => sum + (x - mean) ** 2, 0) / results.length);
        console.log(`    temp=${temp} ${label}: mean=${mean.toFixed(1)}, SD=${sd.toFixed(2)}, n=${results.length}`);
      } else {
        console.log(`    temp=${temp} ${label}: NO VALID RESULTS`);
      }
    }
  }
  
  console.log('\n✅ Complete! Results in:', OUTPUT_FILE);
}

main().catch(console.error);
