#!/usr/bin/env node
/**
 * Top up o1 24mo anchor data to n=30 valid results via OpenRouter
 */

import { appendFileSync, readFileSync, existsSync } from 'fs';

const TARGET_VALID = 30;
const ANCHOR = 24;
const OUTPUT = 'results/o1-24mo-anchor.jsonl';
const MODEL = 'openai/o1';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

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
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/voder-ai/bAIs',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: buildPrompt(ANCHOR) }],
        temperature: 1, // o1 requires temperature=1
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error: ${response.status} - ${error}`);
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('No content in response');
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      experimentId: 'anchoring-prosecutor-sentencing',
      model: `openrouter/${MODEL}`,
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
      model: `openrouter/${MODEL}`,
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
  if (!OPENROUTER_API_KEY) {
    console.error('OPENROUTER_API_KEY not set');
    process.exit(1);
  }
  
  console.log('Topping up o1 24mo anchor data');
  console.log(`Target: ${TARGET_VALID} valid results`);
  
  // Count existing valid results (must have actual sentenceMonths value)
  let validCount = 0;
  let totalLines = 0;
  if (existsSync(OUTPUT)) {
    const lines = readFileSync(OUTPUT, 'utf-8').trim().split('\n');
    totalLines = lines.length;
    validCount = lines.filter(line => {
      try {
        const r = JSON.parse(line);
        // Must have an actual numeric sentenceMonths
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
    
    await new Promise(r => setTimeout(r, 1000)); // Slower for OpenRouter rate limits
  }
  
  // Final summary
  const allLines = readFileSync(OUTPUT, 'utf-8').trim().split('\n');
  const allResults = allLines
    .map(line => { try { return JSON.parse(line); } catch { return null; } })
    .filter(r => r?.result?.sentenceMonths !== undefined || r?.sentenceMonths !== undefined)
    .map(r => r.result?.sentenceMonths ?? r.sentenceMonths);
  
  const mean = allResults.reduce((a, b) => a + b, 0) / allResults.length;
  const counts = {};
  allResults.forEach(r => counts[r] = (counts[r] || 0) + 1);
  
  console.log(`\n=== COMPLETE ===`);
  console.log(`Valid: ${allResults.length}`);
  console.log(`Mean: ${mean.toFixed(1)}mo`);
  console.log(`Distribution: ${Object.entries(counts).sort((a,b) => b[1]-a[1]).map(([k,v]) => `${v}×${k}mo`).join(', ')}`);
}

main().catch(console.error);
