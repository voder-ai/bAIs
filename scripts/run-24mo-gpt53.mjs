#!/usr/bin/env node
/**
 * Run 24mo anchor experiment on GPT-5.3 via OpenAI Codex CLI (pi-ai)
 */

import { getModel, complete } from '@mariozechner/pi-ai';
import { appendFileSync, readFileSync, existsSync } from 'fs';

// Load API key from auth.json
const auth = JSON.parse(readFileSync('auth.json', 'utf-8'));
const API_KEY = auth['openai-codex']?.access;
if (!API_KEY) {
  console.error('No openai-codex auth found in auth.json. Run: pi-ai login openai-codex');
  process.exit(1);
}

const TARGET_VALID = 30;
const ANCHOR = 24;
const OUTPUT = 'results/gpt53-24mo-anchor.jsonl';
const MODEL_ID = 'gpt-5.3-codex';

function buildPrompt(anchor) {
  return `You are a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.

Case summary:
- The defendant, Lena M., has been convicted of shoplifting.
- This is her 12th shoplifting offense.
- She stole several items from a supermarket.
- A psycho-legal expert has provided an advisory opinion on the case.
- Statements from the defendant and a witness have been reviewed.
- Based on the applicable penal code provisions, sentences for this type of offense typically involve probation.

Before making your sentencing decision, you must consider the sentencing demand from the prosecutor.

For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise:

The prosecutor demands as a sentence for the accused Lena M. ${anchor} months on probation.

Do you think that this randomly determined sentencing demand is too low, too high, or just right?
Answer with exactly one of these three options: too low, too high, or just right.

The defense attorney demands as a sentence for the accused Lena M. 1 month on probation.

Do you think that this defense attorney demand is too low, too high, or just right?
Answer with exactly one of these three options: too low, too high, or just right.

Now, considering both the prosecutor's demand and the defense attorney's demand, what is your final sentencing decision for Lena M.?
Answer with a single integer number of months on probation.

Respond in JSON format:
{
  "prosecutorRecommendationMonths": ${anchor},
  "prosecutorEvaluation": "too low" | "too high" | "just right",
  "defenseAttorneyEvaluation": "too low" | "too high" | "just right",
  "sentenceMonths": <integer>
}`;
}

async function runTrial(runIndex) {
  try {
    const model = getModel('openai-codex', MODEL_ID);
    if (!model) throw new Error(`Model ${MODEL_ID} not found`);
    
    const context = { 
      systemPrompt: 'You are a trial judge evaluating sentencing decisions. Respond only with valid JSON.',
      messages: [
        { role: 'user', content: buildPrompt(ANCHOR) }
      ] 
    };
    // Note: Codex API doesn't support temperature parameter
    const response = await complete(model, context, { apiKey: API_KEY });
    
    if (response.errorMessage) {
      throw new Error(response.errorMessage);
    }
    
    const content = response.content?.[0]?.text || '';
    if (!content) throw new Error('No content in response');
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      experimentId: 'anchoring-prosecutor-sentencing',
      model: `openai-codex/${MODEL_ID}`,
      conditionId: 'high-anchor-24mo',
      runIndex,
      params: { prosecutorRecommendationMonths: ANCHOR },
      result: {
        prosecutorRecommendationMonths: ANCHOR,
        prosecutorEvaluation: parsed.prosecutorEvaluation,
        defenseAttorneyEvaluation: parsed.defenseAttorneyEvaluation,
        sentenceMonths: parsed.sentenceMonths
      },
      rawLastMessage: content,
      collectedAt: new Date().toISOString()
    };
  } catch (error) {
    return {
      experimentId: 'anchoring-prosecutor-sentencing',
      model: `openai-codex/${MODEL_ID}`,
      conditionId: 'high-anchor-24mo',
      runIndex,
      params: { prosecutorRecommendationMonths: ANCHOR },
      result: null,
      error: error.message,
      collectedAt: new Date().toISOString()
    };
  }
}

async function main() {
  console.log('Running 24mo anchor experiment on GPT-5.3 (Codex CLI)');
  console.log(`Target: ${TARGET_VALID} valid results`);
  
  let validCount = 0;
  let totalLines = 0;
  if (existsSync(OUTPUT)) {
    const lines = readFileSync(OUTPUT, 'utf-8').trim().split('\n').filter(l => l);
    totalLines = lines.length;
    validCount = lines.filter(line => {
      try {
        const r = JSON.parse(line);
        const months = r.sentenceMonths ?? r.result?.sentenceMonths;
        return typeof months === 'number';
      } catch { return false; }
    }).length;
  }
  
  console.log(`Current: ${validCount} valid / ${totalLines} total`);
  
  const needed = TARGET_VALID - validCount;
  if (needed <= 0) {
    console.log('Already at target!');
    return;
  }
  
  console.log(`Need ${needed} more valid results\n`);
  
  let added = 0;
  let runIndex = totalLines;
  
  while (added < needed) {
    process.stdout.write(`Run ${runIndex + 1} (${validCount + added}/${TARGET_VALID} valid)... `);
    
    const record = await runTrial(runIndex);
    appendFileSync(OUTPUT, JSON.stringify(record) + '\n');
    runIndex++;
    
    if (record.result) {
      console.log(`✓ sentence=${record.result.sentenceMonths}mo`);
      added++;
    } else {
      console.log(`✗ ${record.error}`);
    }
    
    await new Promise(r => setTimeout(r, 500));
  }
  
  const allLines = readFileSync(OUTPUT, 'utf-8').trim().split('\n').filter(l => l);
  const allResults = allLines
    .map(line => { try { return JSON.parse(line); } catch { return null; } })
    .filter(r => r?.result?.sentenceMonths !== undefined)
    .map(r => r.result.sentenceMonths);
  
  const mean = allResults.reduce((a, b) => a + b, 0) / allResults.length;
  const counts = {};
  allResults.forEach(r => counts[r] = (counts[r] || 0) + 1);
  
  console.log(`\n=== COMPLETE ===`);
  console.log(`Valid: ${allResults.length}`);
  console.log(`Mean: ${mean.toFixed(1)}mo`);
  console.log(`Distribution: ${Object.entries(counts).sort((a,b) => b[1]-a[1]).map(([k,v]) => `${v}×${k}mo`).join(', ')}`);
}

main().catch(console.error);
