#!/usr/bin/env node
/**
 * Top up MiniMax anchoring experiment to n=30
 */

import { appendFileSync, readFileSync, existsSync } from 'fs';

const TARGET_VALID = 30;
const OUTPUT = 'results/minimax-anchoring-30.jsonl';
const MODEL = 'minimax/minimax-01';
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
      experimentId: 'anchoring-prosecutor-sentencing',
      model: `openrouter/${MODEL}`,
      conditionId: anchor === 3 ? 'low-anchor' : 'high-anchor',
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
      experimentId: 'anchoring-prosecutor-sentencing',
      model: `openrouter/${MODEL}`,
      conditionId: anchor === 3 ? 'low-anchor' : 'high-anchor',
      runIndex,
      params: { prosecutorRecommendationMonths: anchor },
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
  
  console.log('Running MiniMax anchoring top-up');
  console.log(`Target: ${TARGET_VALID} valid results (per condition)`);
  
  // Check existing data
  let lowCount = 0, highCount = 0;
  let totalLines = 0;
  
  // Check all existing minimax files
  const files = ['results/minimax-m25-anchoring-30.jsonl', 'results/minimax-anchoring-30.jsonl'];
  for (const f of files) {
    if (existsSync(f)) {
      const lines = readFileSync(f, 'utf-8').trim().split('\n').filter(l => l);
      for (const line of lines) {
        try {
          const r = JSON.parse(line);
          const months = r.sentenceMonths ?? r.result?.sentenceMonths;
          const anchor = r.prosecutorRecommendationMonths ?? r.params?.prosecutorRecommendationMonths;
          if (typeof months === 'number') {
            if (anchor === 3) lowCount++;
            else if (anchor === 9) highCount++;
          }
        } catch {}
      }
    }
  }
  
  console.log(`Current: low=${lowCount}, high=${highCount}`);
  
  const needLow = Math.max(0, 15 - lowCount);
  const needHigh = Math.max(0, 15 - highCount);
  
  if (needLow + needHigh === 0) {
    console.log('Already at target!');
    return;
  }
  
  console.log(`Need: low=${needLow}, high=${needHigh}\n`);
  
  let runIndex = 0;
  
  // Run low anchor trials
  for (let i = 0; i < needLow; i++) {
    process.stdout.write(`Low anchor ${i+1}/${needLow}... `);
    const record = await runTrial(runIndex++, 3);
    appendFileSync(OUTPUT, JSON.stringify(record) + '\n');
    if (record.result) {
      console.log(`✓ sentence=${record.result.sentenceMonths}mo`);
    } else {
      console.log(`✗ ${record.error}`);
    }
    await new Promise(r => setTimeout(r, 500));
  }
  
  // Run high anchor trials
  for (let i = 0; i < needHigh; i++) {
    process.stdout.write(`High anchor ${i+1}/${needHigh}... `);
    const record = await runTrial(runIndex++, 9);
    appendFileSync(OUTPUT, JSON.stringify(record) + '\n');
    if (record.result) {
      console.log(`✓ sentence=${record.result.sentenceMonths}mo`);
    } else {
      console.log(`✗ ${record.error}`);
    }
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('\n=== COMPLETE ===');
}

main().catch(console.error);
