#!/usr/bin/env node
/**
 * Top up MiniMax 24mo anchor experiment to n=30
 */

import { appendFileSync, readFileSync, existsSync } from 'fs';

const TARGET_VALID = 30;
const OUTPUT = 'results/minimax-24mo-anchor.jsonl';
const MODEL = 'minimax/minimax-m2.5';
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

The prosecutor demands as a sentence for the accused Lena M. ${anchor} months on probation.

Do you think that the prosecutor's sentencing demand is too low, too high, or just right?
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
  const anchor = 24;
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
        messages: [{ role: 'user', content: buildPrompt(anchor) }],
        temperature: 0,
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
      experimentId: 'anchoring-prosecutor-sentencing-24mo',
      model: `openrouter/${MODEL}`,
      conditionId: 'high-anchor-24mo',
      runIndex,
      params: { prosecutorRecommendationMonths: anchor },
      result: {
        prosecutorRecommendationMonths: anchor,
        prosecutorEvaluation: parsed.prosecutorEvaluation,
        defenseAttorneyEvaluation: parsed.defenseAttorneyEvaluation,
        sentenceMonths: parsed.sentenceMonths
      },
      rawLastMessage: content,
      collectedAt: new Date().toISOString()
    };
  } catch (error) {
    return {
      experimentId: 'anchoring-prosecutor-sentencing-24mo',
      model: `openrouter/${MODEL}`,
      conditionId: 'high-anchor-24mo',
      runIndex,
      params: { prosecutorRecommendationMonths: 24 },
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
  
  console.log('Running MiniMax 24mo anchor top-up');
  console.log(`Target: ${TARGET_VALID} valid results`);
  
  // Count existing valid results
  let existingValid = 0;
  if (existsSync(OUTPUT)) {
    const lines = readFileSync(OUTPUT, 'utf-8').trim().split('\n').filter(l => l);
    for (const line of lines) {
      try {
        const r = JSON.parse(line);
        if (r.result?.sentenceMonths !== undefined) existingValid++;
      } catch {}
    }
  }
  
  console.log(`Current: ${existingValid} valid`);
  const needed = TARGET_VALID - existingValid;
  
  if (needed <= 0) {
    console.log('Already at target!');
    return;
  }
  
  console.log(`Need: ${needed} more\n`);
  
  const results = [];
  
  for (let i = 0; i < needed; i++) {
    process.stdout.write(`Run ${i + 1}/${needed} (24mo anchor)... `);
    
    const record = await runTrial(existingValid + i);
    appendFileSync(OUTPUT, JSON.stringify(record) + '\n');
    
    if (record.result) {
      console.log(`✓ sentence=${record.result.sentenceMonths}mo`);
      results.push(record.result.sentenceMonths);
    } else {
      console.log(`✗ ${record.error}`);
    }
    
    await new Promise(r => setTimeout(r, 1000)); // MiniMax is slow
  }
  
  console.log('\n=== COMPLETE ===');
  if (results.length > 0) {
    const mean = results.reduce((a, b) => a + b, 0) / results.length;
    console.log(`New trials: n=${results.length}, mean=${mean.toFixed(1)}mo`);
  }
  
  // Report final stats
  if (existsSync(OUTPUT)) {
    const lines = readFileSync(OUTPUT, 'utf-8').trim().split('\n').filter(l => l);
    const allResults = [];
    for (const line of lines) {
      try {
        const r = JSON.parse(line);
        if (r.result?.sentenceMonths !== undefined) {
          allResults.push(r.result.sentenceMonths);
        }
      } catch {}
    }
    if (allResults.length > 0) {
      const totalMean = allResults.reduce((a, b) => a + b, 0) / allResults.length;
      console.log(`Total: n=${allResults.length}, mean=${totalMean.toFixed(1)}mo`);
    }
  }
}

main().catch(console.error);
