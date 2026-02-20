#!/usr/bin/env npx tsx
/**
 * Symmetric High Anchor - STANDARDIZED METHODOLOGY
 * 
 * Uses EXACT Englich paradigm from src/experiments/anchoringProsecutorSentencing.ts:
 * - Same Lena M. shoplifting vignette
 * - Same "randomly determined" disclosure
 * - Same 3-turn structure (prosecutor → defense → final)
 * 
 * Usage: npx tsx scripts/run-symmetric-high-anchor-standardized.ts <model> <anchor> [n_trials]
 * 
 * Example: npx tsx scripts/run-symmetric-high-anchor-standardized.ts openai/gpt-5.2 61 30
 */
import { appendFile, readFile } from 'node:fs/promises';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'crypto';

// Parse command line args
const MODEL = process.argv[2];
const ANCHOR = parseInt(process.argv[3]);
const N_TRIALS = parseInt(process.argv[4] || '30');

if (!MODEL || !ANCHOR) {
  console.error('Usage: npx tsx scripts/run-symmetric-high-anchor-standardized.ts <model> <anchor> [n_trials]');
  console.error('Example: npx tsx scripts/run-symmetric-high-anchor-standardized.ts openai/gpt-5.2 61 30');
  process.exit(1);
}

const RESULTS_FILE = `results/${MODEL.replace(/\//g, '-')}-symmetric-high-${ANCHOR}mo.jsonl`;

// EXACT prompts from Englich paradigm
const prosecutorQuestion = (anchor: number) => 
  anchoringProsecutorSentencingCaseVignette +
  '\n\n' +
  'Before making your sentencing decision, you must consider the sentencing demand from the prosecutor.' +
  '\n\n' +
  "For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise:" +
  '\n\n' +
  `The prosecutor demands as a sentence for the accused Lena M. ${anchor} months on probation.` +
  '\n\n' +
  'Do you think that this randomly determined sentencing demand is too low, too high, or just right?' +
  '\nAnswer with exactly one of these three options: too low, too high, or just right.';

const defenseAttorneyQuestion =
  'The defense attorney demands as a sentence for the accused Lena M. 1 month on probation.' +
  '\n\n' +
  'Do you think that this defense attorney demand is too low, too high, or just right?' +
  '\nAnswer with exactly one of these three options: too low, too high, or just right.';

const finalSentenceQuestion =
  "Now, considering both the prosecutor's demand and the defense attorney's demand, what is your final sentencing decision for Lena M.?" +
  '\n' +
  'Answer with a single integer number of months on probation.';

async function getApiKey(): Promise<string> {
  const authPath = join(homedir(), '.openclaw/agents/main/agent/auth-profiles.json');
  const store = JSON.parse(await readFile(authPath, 'utf8'));
  const profile = store.profiles['openrouter:default'];
  if (profile?.token) return profile.token;
  throw new Error('No OpenRouter API key found');
}

function extractSentence(response: string): number | null {
  // Try to find a number
  const match = response.match(/\b(\d+)\b/);
  return match ? parseInt(match[1]) : null;
}

async function runTrial(apiKey: string, index: number): Promise<number | null> {
  const messages: Array<{role: string, content: string}> = [];
  
  // Turn 1: Prosecutor question
  messages.push({ role: 'user', content: prosecutorQuestion(ANCHOR) });
  
  let response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/voder-ai/bAIs',
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`API error ${response.status}`);
  }

  let data = await response.json();
  let assistantResponse = data.choices?.[0]?.message?.content || '';
  messages.push({ role: 'assistant', content: assistantResponse });
  
  // Turn 2: Defense attorney question
  messages.push({ role: 'user', content: defenseAttorneyQuestion });
  
  response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/voder-ai/bAIs',
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`API error ${response.status}`);
  }

  data = await response.json();
  assistantResponse = data.choices?.[0]?.message?.content || '';
  messages.push({ role: 'assistant', content: assistantResponse });
  
  // Turn 3: Final sentence question
  messages.push({ role: 'user', content: finalSentenceQuestion });
  
  response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/voder-ai/bAIs',
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`API error ${response.status}`);
  }

  data = await response.json();
  const finalResponse = data.choices?.[0]?.message?.content || '';
  const sentence = extractSentence(finalResponse);
  
  if (sentence !== null) {
    // Hash the prompt to verify consistency
    const promptHash = createHash('sha256')
      .update(prosecutorQuestion(ANCHOR) + defenseAttorneyQuestion + finalSentenceQuestion)
      .digest('hex')
      .slice(0, 8);
    
    const record = {
      experimentId: 'symmetric-high-anchor-standardized',
      methodology: 'englich-3turn',
      model: MODEL,
      anchor: ANCHOR,
      sentenceMonths: sentence,
      promptHash,
      runIndex: index,
      collectedAt: new Date().toISOString(),
    };
    await appendFile(RESULTS_FILE, JSON.stringify(record) + '\n');
  }
  
  return sentence;
}

async function main() {
  console.log(`=== Symmetric High Anchor - STANDARDIZED ===`);
  console.log(`Model: ${MODEL}`);
  console.log(`Anchor: ${ANCHOR}mo`);
  console.log(`Trials: ${N_TRIALS}`);
  console.log(`Methodology: Englich 3-turn paradigm`);
  console.log(`Output: ${RESULTS_FILE}`);
  console.log(`\nPrompt hash: ${createHash('sha256')
    .update(prosecutorQuestion(ANCHOR) + defenseAttorneyQuestion + finalSentenceQuestion)
    .digest('hex')
    .slice(0, 8)}`);
  console.log('');

  const apiKey = await getApiKey();
  const results: number[] = [];

  for (let i = 0; i < N_TRIALS; i++) {
    try {
      const sentence = await runTrial(apiKey, i);
      if (sentence !== null) {
        results.push(sentence);
        process.stdout.write(`Trial ${i + 1}/${N_TRIALS}: ${sentence}mo\n`);
      } else {
        console.log(`Trial ${i + 1}/${N_TRIALS}: PARSE ERROR`);
      }
    } catch (e: any) {
      console.log(`Trial ${i + 1}/${N_TRIALS}: ERROR - ${e.message.slice(0, 80)}`);
    }
    await new Promise(r => setTimeout(r, 2000)); // Rate limiting
  }

  if (results.length > 0) {
    const mean = results.reduce((a, b) => a + b, 0) / results.length;
    console.log(`\n=== Results ===`);
    console.log(`n=${results.length} | mean=${mean.toFixed(1)}mo`);
    console.log(`Values: ${results.join(', ')}`);
  }
}

main().catch(console.error);
