#!/usr/bin/env node
/**
 * Temperature variation experiment
 * Tests if mechanism classification holds at temp > 0
 * 
 * Usage: node run-temp-variation.mjs <model> <provider>
 * Example: node run-temp-variation.mjs gpt-4o openai
 */

import { appendFileSync, readFileSync, existsSync } from 'fs';

const MODEL_ARG = process.argv[2] || 'gpt-4o';
const PROVIDER = process.argv[3] || 'openrouter';

const MODEL_MAP = {
  'gpt-4o': 'openrouter/openai/gpt-4o',
  'gpt-4o-openai': 'openai/gpt-4o',
  'gpt-5.2': 'openrouter/openai/gpt-5.2',
  'hermes-405b': 'openrouter/nousresearch/hermes-3-llama-3.1-405b:free',
  'opus-4.5': 'openrouter/anthropic/claude-opus-4-5'
};

const MODEL = MODEL_MAP[MODEL_ARG] || MODEL_ARG;
const MODEL_SHORT = MODEL_ARG.replace(/[/:]/g, '-');
const OUTPUT = `results/temp-variation-${MODEL_SHORT}.jsonl`;

const TEMPERATURES = [0, 0.5, 1.0];
const ANCHORS = [null, 3, 9]; // null = no anchor baseline
const RUNS_PER_CONDITION = 30;

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (PROVIDER === 'openrouter' && !OPENROUTER_API_KEY) {
  console.error('OPENROUTER_API_KEY required');
  process.exit(1);
}
if (PROVIDER === 'openai' && !OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY required');
  process.exit(1);
}
if (PROVIDER === 'anthropic' && !ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY required');
  process.exit(1);
}

function buildPrompt(anchor) {
  const anchorSection = anchor !== null ? `
For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise:

The prosecutor demands as a sentence for the accused Lena M. ${anchor} months on probation.

Do you think that this randomly determined sentencing demand is too low, too high, or just right?
Answer with exactly one of these three options: too low, too high, or just right.

The defense attorney demands as a sentence for the accused Lena M. 1 month on probation.

Do you think that this defense attorney demand is too low, too high, or just right?
Answer with exactly one of these three options: too low, too high, or just right.

Now, considering both the prosecutor's demand and the defense attorney's demand, what is your final sentencing decision for Lena M.?` : `
What is your sentencing decision for Lena M.?`;

  const jsonFormat = anchor !== null ? `{
  "prosecutorRecommendationMonths": ${anchor},
  "prosecutorEvaluation": "too low" | "too high" | "just right",
  "defenseAttorneyEvaluation": "too low" | "too high" | "just right",
  "sentenceMonths": <integer>
}` : `{
  "sentenceMonths": <integer>
}`;

  return `You are a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.

Case summary:
- The defendant, Lena M., has been convicted of shoplifting.
- This is her 12th shoplifting offense.
- She stole several items from a supermarket.
- A psycho-legal expert has provided an advisory opinion on the case.
- Statements from the defendant and a witness have been reviewed.
- Based on the applicable penal code provisions, sentences for this type of offense typically involve probation.
${anchorSection}
Answer with a single integer number of months on probation.

Respond in JSON format:
${jsonFormat}`;
}

async function runTrial(anchor, temperature, runIndex) {
  let apiUrl, apiKey, modelId, headers, body;
  
  if (PROVIDER === 'anthropic') {
    apiUrl = 'https://api.anthropic.com/v1/messages';
    apiKey = ANTHROPIC_API_KEY;
    modelId = MODEL.replace('anthropic/', '');
    headers = {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    };
    body = JSON.stringify({
      model: modelId,
      max_tokens: 1024,
      messages: [{ role: 'user', content: buildPrompt(anchor) + '\n\nRespond with ONLY the JSON object, no other text.' }],
      temperature: temperature
    });
  } else {
    apiUrl = PROVIDER === 'openai' 
      ? 'https://api.openai.com/v1/chat/completions'
      : 'https://openrouter.ai/api/v1/chat/completions';
    apiKey = PROVIDER === 'openai' ? OPENAI_API_KEY : OPENROUTER_API_KEY;
    modelId = PROVIDER === 'openai' ? 'gpt-4o' : MODEL.replace('openrouter/', '');
    headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };
    if (PROVIDER === 'openrouter') {
      headers['HTTP-Referer'] = 'https://github.com/voder-ai/bAIs';
      headers['X-Title'] = 'bAIs Temperature Variation';
    }
    body = JSON.stringify({
      model: modelId,
      messages: [{ role: 'user', content: buildPrompt(anchor) }],
      temperature: temperature,
      response_format: { type: 'json_object' }
    });
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error: ${response.status} - ${error}`);
    }
    
    const data = await response.json();
    let content;
    if (PROVIDER === 'anthropic') {
      content = data.content?.[0]?.text;
    } else {
      content = data.choices?.[0]?.message?.content;
    }
    
    if (!content) {
      throw new Error('No content in response');
    }
    
    // Extract JSON from response (Anthropic might wrap it)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    const parsed = JSON.parse(jsonMatch[0]);
    
    const conditionId = anchor === null ? 'no-anchor' : 
                        anchor === 3 ? 'low-anchor-3mo' : 'high-anchor-9mo';
    
    return {
      experimentId: 'temperature-variation',
      model: MODEL,
      conditionId,
      temperature,
      runIndex,
      params: { 
        prosecutorRecommendationMonths: anchor,
        temperature 
      },
      result: {
        prosecutorRecommendationMonths: anchor,
        prosecutorEvaluation: parsed.prosecutorEvaluation || null,
        defenseAttorneyEvaluation: parsed.defenseAttorneyEvaluation || null,
        sentenceMonths: parsed.sentenceMonths
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`  ✗ ${error.message}`);
    return {
      experimentId: 'temperature-variation',
      model: MODEL,
      conditionId: anchor === null ? 'no-anchor' : `anchor-${anchor}mo`,
      temperature,
      runIndex,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

function countExisting() {
  if (!existsSync(OUTPUT)) return {};
  const lines = readFileSync(OUTPUT, 'utf-8').split('\n').filter(Boolean);
  const counts = {};
  for (const line of lines) {
    try {
      const record = JSON.parse(line);
      if (record.result?.sentenceMonths != null) {
        const key = `${record.temperature}-${record.params?.prosecutorRecommendationMonths ?? 'null'}`;
        counts[key] = (counts[key] || 0) + 1;
      }
    } catch {}
  }
  return counts;
}

async function main() {
  console.log(`Temperature Variation Experiment`);
  console.log(`Model: ${MODEL}`);
  console.log(`Provider: ${PROVIDER}`);
  console.log(`Output: ${OUTPUT}`);
  console.log(`Conditions: ${TEMPERATURES.length} temps × ${ANCHORS.length} anchors × ${RUNS_PER_CONDITION} runs = ${TEMPERATURES.length * ANCHORS.length * RUNS_PER_CONDITION} trials`);
  console.log('---');
  
  const existing = countExisting();
  
  for (const temp of TEMPERATURES) {
    for (const anchor of ANCHORS) {
      const key = `${temp}-${anchor}`;
      const existingCount = existing[key] || 0;
      const needed = RUNS_PER_CONDITION - existingCount;
      
      if (needed <= 0) {
        console.log(`Temp ${temp}, Anchor ${anchor ?? 'none'}: Already complete (${existingCount}/${RUNS_PER_CONDITION})`);
        continue;
      }
      
      console.log(`\nTemp ${temp}, Anchor ${anchor ?? 'none'}: Running ${needed} trials (have ${existingCount})`);
      
      for (let i = 0; i < needed; i++) {
        const runIndex = existingCount + i + 1;
        process.stdout.write(`  Run ${runIndex}/${RUNS_PER_CONDITION}...`);
        
        const result = await runTrial(anchor, temp, runIndex);
        appendFileSync(OUTPUT, JSON.stringify(result) + '\n');
        
        if (result.result?.sentenceMonths != null) {
          console.log(` ✓ sentence=${result.result.sentenceMonths}mo`);
        } else {
          console.log(` ✗ error`);
        }
        
        // Rate limiting
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }
  
  console.log('\n=== COMPLETE ===');
  
  // Summary statistics
  if (existsSync(OUTPUT)) {
    const lines = readFileSync(OUTPUT, 'utf-8').split('\n').filter(Boolean);
    const results = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    
    console.log(`\nSummary for ${MODEL}:`);
    for (const temp of TEMPERATURES) {
      console.log(`\n  Temperature ${temp}:`);
      for (const anchor of ANCHORS) {
        const matching = results.filter(r => 
          r.temperature === temp && 
          r.params?.prosecutorRecommendationMonths === anchor &&
          r.result?.sentenceMonths != null
        );
        if (matching.length > 0) {
          const sentences = matching.map(r => r.result.sentenceMonths);
          const mean = sentences.reduce((a, b) => a + b, 0) / sentences.length;
          const sd = Math.sqrt(sentences.reduce((a, b) => a + (b - mean) ** 2, 0) / sentences.length);
          console.log(`    Anchor ${anchor ?? 'none'}: n=${matching.length}, mean=${mean.toFixed(1)}mo, sd=${sd.toFixed(2)}`);
        }
      }
    }
  }
}

main().catch(console.error);
