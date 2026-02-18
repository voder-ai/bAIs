#!/usr/bin/env node
/**
 * Run SACD experiment on o3-mini via OpenRouter
 * SACD = Self-Adaptive Cognitive Debiasing
 */

import { appendFileSync, readFileSync, existsSync } from 'fs';

const TARGET_VALID = 30;
const OUTPUT = 'results/o3-mini-sacd.jsonl';
const MODEL = 'openai/o3-mini';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// SACD prompt - asks model to identify and correct for anchoring bias
function buildSACDPrompt(anchor) {
  return `Before answering, please consider potential cognitive biases that might affect your judgment:

1. ANCHORING BIAS: The prosecutor's demand of ${anchor} months may serve as an anchor that unduly influences your judgment. Consider what sentence you would give if you hadn't seen this number.

2. Consider the case purely on its merits: the defendant's history, the offense severity, and typical sentences for similar cases.

3. Ask yourself: Am I being pulled toward the prosecutor's number, or am I making an independent judgment?

Now, with these potential biases in mind, please evaluate the case:

You are a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.

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

async function runTrial(runIndex, anchor) {
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
        messages: [{ role: 'user', content: buildSACDPrompt(anchor) }],
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
      experimentId: 'anchoring-prosecutor-sentencing-sacd',
      model: `openrouter/${MODEL}`,
      conditionId: anchor === 3 ? 'sacd-low-anchor' : 'sacd-high-anchor',
      runIndex,
      params: { prosecutorRecommendationMonths: anchor, sacd: true },
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
      experimentId: 'anchoring-prosecutor-sentencing-sacd',
      model: `openrouter/${MODEL}`,
      conditionId: anchor === 3 ? 'sacd-low-anchor' : 'sacd-high-anchor',
      runIndex,
      params: { prosecutorRecommendationMonths: anchor, sacd: true },
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
  
  console.log('Running SACD experiment on o3-mini');
  console.log(`Target: ${TARGET_VALID} valid results (per condition)`);
  
  const anchors = [3, 9];
  const results = { 3: [], 9: [] };
  
  for (const anchor of anchors) {
    console.log(`\n=== ANCHOR: ${anchor}mo ===`);
    
    for (let i = 0; i < TARGET_VALID / 2; i++) {
      process.stdout.write(`Run ${i + 1}/${TARGET_VALID/2} (anchor=${anchor}mo)... `);
      
      const record = await runTrial(i, anchor);
      appendFileSync(OUTPUT, JSON.stringify(record) + '\n');
      
      if (record.result) {
        console.log(`✓ sentence=${record.result.sentenceMonths}mo`);
        results[anchor].push(record.result.sentenceMonths);
      } else {
        console.log(`✗ ${record.error}`);
      }
      
      await new Promise(r => setTimeout(r, 500));
    }
  }
  
  console.log('\n=== COMPLETE ===');
  for (const anchor of anchors) {
    if (results[anchor].length > 0) {
      const mean = results[anchor].reduce((a, b) => a + b, 0) / results[anchor].length;
      console.log(`Anchor ${anchor}mo: n=${results[anchor].length}, mean=${mean.toFixed(1)}mo`);
    }
  }
  
  // Calculate effect
  if (results[3].length > 0 && results[9].length > 0) {
    const lowMean = results[3].reduce((a, b) => a + b, 0) / results[3].length;
    const highMean = results[9].reduce((a, b) => a + b, 0) / results[9].length;
    console.log(`SACD Effect: ${(highMean - lowMean).toFixed(1)}mo`);
  }
}

main().catch(console.error);
