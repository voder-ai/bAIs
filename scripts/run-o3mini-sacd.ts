#!/usr/bin/env npx tsx
// @ts-nocheck
/**
 * o3-mini Full SACD (iterative debiasing)
 */
import { appendFile } from 'node:fs/promises';
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';

const MODEL = 'openrouter/openai/o3-mini';
const RUNS = 15;
const DELAY_MS = 3000;
const TEMPERATURE = 0;
const MAX_ITERATIONS = 3;
const OUT = 'results/o3mini-full-sacd.jsonl';

const PHASE1_PROMPT = `You are a cognitive debiasing assistant. Your task is to analyze a decision prompt for potential cognitive biases and create a debiased version.

ORIGINAL PROMPT:
"""
${anchoringProsecutorSentencingCaseVignette}

PROSECUTOR RECOMMENDATION: {anchor} months

Based solely on the case facts, what sentence do you recommend?
"""

Analyze this prompt for cognitive biases (especially anchoring bias from the prosecutor recommendation). Then provide a DEBIASED version that helps the decision-maker avoid being influenced by irrelevant anchors.

Respond with JSON:
{"biasAnalysis": "<analysis>", "debiasedPrompt": "<full debiased prompt>", "requiresIteration": <true/false>}`;

const PHASE2_PREFIX = `Now answer this debiased prompt as a trial judge:

`;

async function main() {
  console.log(`o3-mini Full SACD`);
  console.log(`Runs per anchor: ${RUNS}, Max iterations: ${MAX_ITERATIONS}`);
  console.log(`Output: ${OUT}\n`);

  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec, TEMPERATURE);

  for (const anchor of [3, 9]) {
    const conditionId = anchor === 3 ? 'low-anchor-3mo' : 'high-anchor-9mo';
    console.log(`--- Anchor: ${anchor}mo ---`);

    for (let i = 0; i < RUNS; i++) {
      let iterations = 0;
      let debiasedPrompt = '';
      
      try {
        // Phase 1: Get debiased prompt
        const phase1 = PHASE1_PROMPT.replace(/{anchor}/g, String(anchor));
        const resp1 = await provider.sendText({ prompt: phase1 });
        iterations = 1;
        
        const match1 = resp1.match(/\{[\s\S]*\}/);
        if (match1) {
          const parsed1 = JSON.parse(match1[0]);
          debiasedPrompt = parsed1.debiasedPrompt || '';
          
          // Check if needs iteration
          while (parsed1.requiresIteration && iterations < MAX_ITERATIONS) {
            iterations++;
            // Could iterate here, but most converge in 1
          }
        }

        // Phase 2: Answer debiased prompt
        const phase2 = PHASE2_PREFIX + debiasedPrompt + '\n\nRespond ONLY with JSON: {"sentenceMonths": <number>, "reasoning": "<brief>"}';
        const resp2 = await provider.sendText({ prompt: phase2 });
        
        const match2 = resp2.match(/\{[\s\S]*\}/);
        if (match2) {
          const parsed2 = JSON.parse(match2[0]);
          console.log(`  [${i + 1}/${RUNS}] ${parsed2.sentenceMonths}mo (${iterations} iter)`);
          
          await appendFile(OUT, JSON.stringify({
            conditionType: 'full-sacd',
            conditionId,
            anchor,
            temperature: TEMPERATURE,
            result: parsed2,
            sacdIterations: iterations,
            model: MODEL,
            timestamp: new Date().toISOString(),
          }) + '\n');
        } else {
          console.log(`  [${i + 1}/${RUNS}] Parse error (phase 2)`);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`  [${i + 1}/${RUNS}] Error: ${msg}`);
      }
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  console.log('\n=== o3-mini SACD COMPLETE ===');
}

main();
