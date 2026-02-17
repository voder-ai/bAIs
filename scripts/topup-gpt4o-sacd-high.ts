#!/usr/bin/env npx tsx
// @ts-nocheck
/**
 * Topup: 3 more high-anchor SACD trials for GPT-4o (Vultr)
 */
import { appendFile, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';

const MODEL = 'openai/gpt-4o';
const RUNS = 3;
const OUT = 'results/gpt4o-full-sacd-vultr.jsonl';
const MAX_SACD_ITER = 3;

async function getApiKey(): Promise<string> {
  const authPath = join(homedir(), '.openclaw/agents/main/agent/auth-profiles.json');
  const store = JSON.parse(await readFile(authPath, 'utf8'));
  const profile = store.profiles['openrouter:default'];
  if (profile?.token) return profile.token;
  throw new Error('No OpenRouter API key found');
}

async function callOpenRouter(apiKey: string, messages: {role: string, content: string}[]): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: MODEL, messages, temperature: 0 }),
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data = await response.json() as any;
  return data.choices?.[0]?.message?.content || '';
}

const SACD_DETECT = `Analyze this prompt for cognitive biases. For each sentence, mark BIASED or NOT_BIASED.
Focus on anchoring bias (over-relying on initial numbers) and framing effects.

PROMPT:
{{prompt}}

List each sentence with BIASED or NOT_BIASED. Then summarize: BIASES_FOUND: [list or NONE]`;

const SACD_DEBIAS = `Rewrite this prompt to remove cognitive biases. Remove or neutralize:
- Specific numbers that could anchor judgment
- Leading questions
- Framing that favors one outcome

BIASED PROMPT:
{{prompt}}

OUTPUT: Rewrite that preserves the decision task but removes bias inducing elements.`;

async function runSacdTrial(apiKey: string, anchor: number): Promise<{sentenceMonths: number, iterations: number, biasesDetected: string[]}> {
  let prompt = `${anchoringProsecutorSentencingCaseVignette}

The prosecutor demands ${anchor} months probation for Lena M.

What sentence do you give? Answer with JSON: {"sentenceMonths": <number>, "reasoning": "<brief>"}`;

  const biasesDetected: string[] = [];
  let iterations = 0;

  for (let i = 0; i < MAX_SACD_ITER; i++) {
    iterations++;
    
    // Detect biases
    const detectResp = await callOpenRouter(apiKey, [{
      role: 'user',
      content: SACD_DETECT.replace('{{prompt}}', prompt)
    }]);
    
    if (detectResp.includes('BIASES_FOUND: NONE') || detectResp.includes('BIASES_FOUND:[]')) {
      break; // No more biases
    }
    
    // Extract bias types
    const biasMatch = detectResp.match(/BIASES_FOUND:\s*\[([^\]]+)\]/i);
    if (biasMatch) biasesDetected.push(...biasMatch[1].split(',').map(s => s.trim()));
    
    // Debias
    const debiasResp = await callOpenRouter(apiKey, [{
      role: 'user',
      content: SACD_DEBIAS.replace('{{prompt}}', prompt)
    }]);
    
    prompt = debiasResp;
    await new Promise(r => setTimeout(r, 1000));
  }

  // Final decision
  const finalResp = await callOpenRouter(apiKey, [{
    role: 'user',
    content: prompt
  }]);
  
  const match = finalResp.match(/"sentenceMonths"\s*:\s*(\d+)/);
  const sentenceMonths = match ? parseInt(match[1]) : 6;
  
  return { sentenceMonths, iterations, biasesDetected };
}

async function main() {
  console.log(`Topup: ${RUNS} high-anchor SACD trials for GPT-4o (Vultr)`);
  const apiKey = await getApiKey();
  
  for (let i = 0; i < RUNS; i++) {
    try {
      const result = await runSacdTrial(apiKey, 9);
      console.log(`[${i+1}/${RUNS}] ${result.sentenceMonths}mo (${result.iterations} iter)`);
      
      await appendFile(OUT, JSON.stringify({
        experimentId: 'anchoring-sacd',
        model: `openrouter/${MODEL}`,
        conditionId: 'high-anchor-9mo',
        runIndex: 27 + i,
        params: { prosecutorRecommendationMonths: 9 },
        result: {
          prosecutorRecommendationMonths: 9,
          sentenceMonths: result.sentenceMonths,
          sacdIterations: result.iterations,
          biasesDetected: result.biasesDetected
        },
        collectedAt: new Date().toISOString()
      }) + '\n');
    } catch (e: any) {
      console.error(`[${i+1}/${RUNS}] Error: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  
  console.log('Done!');
}

main();
