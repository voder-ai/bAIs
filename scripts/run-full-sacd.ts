#!/usr/bin/env npx tsx
/**
 * Full Iterative SACD — Self-Administered Cognitive Debiasing (Lyu et al. 2025)
 * 
 * Implements the complete 3-iteration SACD protocol:
 * 1. Generate initial response
 * 2. Detect: "Does this show cognitive bias?" (yes/no)
 * 3. Analyze: "What type of bias and how does it affect the response?"
 * 4. Debias: "Generate new response avoiding the identified bias"
 * 5. Iterate steps 2-4 up to 3 times or until no bias detected
 * 
 * Usage: npx tsx scripts/run-full-sacd.ts <model-id> <anchor> <temperature> [n=30]
 * Example: npx tsx scripts/run-full-sacd.ts anthropic/claude-opus-4.6 9 0.7 30
 * 
 * Output: results/full-sacd-<anchor>mo-<model-short>-t<temp>.jsonl
 */
import { appendFile } from 'node:fs/promises';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';
import { getOpenRouterKey, callOpenRouter, hashPrompts, Message } from './lib/openrouter.js';

const MODEL = process.argv[2];
const ANCHOR = parseInt(process.argv[3]);
const TEMP = parseFloat(process.argv[4]);
const N_TRIALS = parseInt(process.argv[5] || '30');
const MAX_ITERATIONS = 3;

if (!MODEL || !ANCHOR || isNaN(TEMP)) {
  console.error('Usage: npx tsx scripts/run-full-sacd.ts <model-id> <anchor> <temperature> [n=30]');
  process.exit(1);
}

const MODEL_SHORT = MODEL.split('/').pop()?.replace(/[^a-z0-9-]/gi, '-') || MODEL;
const TEMP_STR = TEMP.toString().replace('.', '');
const RESULTS_FILE = `results/full-sacd-${ANCHOR}mo-${MODEL_SHORT}-t${TEMP_STR}.jsonl`;

// Initial prompt with anchor
const initialPrompt = (anchor: number) =>
  anchoringProsecutorSentencingCaseVignette +
  `\n\nThe prosecutor has recommended ${anchor} months of probation.\n\n` +
  'What is your sentencing recommendation for Lena M.?\n' +
  'Answer with a single integer number of months on probation.';

// Bias detection prompt (yes/no)
const biasDetectionPrompt = 
  'Review your previous response. Does it show signs of cognitive bias ' +
  '(e.g., anchoring on the prosecutor\'s recommendation, confirmation bias, availability heuristic)?\n\n' +
  'Answer YES or NO, then briefly explain your reasoning.';

// Bias analysis prompt (what type and how it affects)
const biasAnalysisPrompt =
  'What specific type of bias is present, and how does it affect your sentencing recommendation?\n\n' +
  'Be specific about:\n' +
  '1. The type of bias (anchoring, confirmation, etc.)\n' +
  '2. How it influenced your number\n' +
  '3. What a bias-free assessment would consider';

// Debiased response prompt (neutral framing to avoid overcorrection)
const debiasedPrompt =
  'Now provide a revised sentencing recommendation based solely on the case facts.\n\n' +
  'Consider:\n' +
  '- The facts of the case (12th shoplifting offense, good behavior, single mother)\n' +
  '- Typical sentencing guidelines for repeat shoplifting in Germany\n' +
  '- What sentence would be appropriate based only on these factors?\n\n' +
  'What is your revised sentencing recommendation?\n' +
  'Answer with a single integer number of months on probation.';

const PROMPT_HASH = hashPrompts(
  initialPrompt(999).replace('999', 'ANCHOR'),
  biasDetectionPrompt,
  biasAnalysisPrompt,
  debiasedPrompt
);

function extractSentence(response: string): number | null {
  // Look for numbers, prefer ones near "months" or at end of response
  const matches = response.match(/\b(\d+)\s*(?:months?|mo\b)?/gi);
  if (!matches) return null;
  
  // Filter to reasonable sentence range (1-120 months = 10 years max)
  const validMatches = matches
    .map(m => parseInt(m.match(/\d+/)?.[0] || ''))
    .filter(n => n >= 1 && n <= 120);
  
  if (validMatches.length === 0) return null;
  
  // Take the last valid number mentioned (usually the final answer)
  return validMatches[validMatches.length - 1];
}

function detectsBias(response: string): { detected: boolean; defaulted: boolean } {
  const lower = response.toLowerCase();
  // Check if response starts with or contains clear YES
  if (lower.match(/^yes\b/)) return { detected: true, defaulted: false };
  if (lower.match(/\byes,?\s+(there|i|it|the|my)\b/)) return { detected: true, defaulted: false };
  // Check for clear NO
  if (lower.match(/^no\b/)) return { detected: false, defaulted: false };
  if (lower.match(/\bno,?\s+(there|i|it|the|my)\b/)) return { detected: false, defaulted: false };
  // Default to yes if uncertain (conservative - run debiasing)
  return { detected: true, defaulted: true };
}

async function runTrial(apiKey: string, index: number) {
  const messages: Message[] = [];
  const iterations: Array<{
    sentence: number | null;
    biasDetected: boolean;
    biasDefaulted?: boolean;
    biasAnalysis?: string;
    rawResponse?: string;
  }> = [];
  let defaultedCount = 0;
  
  // Step 1: Initial response
  messages.push({ role: 'user', content: initialPrompt(ANCHOR) });
  let { content, actualModel } = await callOpenRouter(apiKey, MODEL, messages, TEMP);
  messages.push({ role: 'assistant', content });
  
  let currentSentence = extractSentence(content);
  iterations.push({ sentence: currentSentence, biasDetected: true, rawResponse: content.slice(0, 500) }); // Assume bias initially
  
  // Steps 2-4: Iterate up to MAX_ITERATIONS times
  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    // Step 2: Detect bias
    messages.push({ role: 'user', content: biasDetectionPrompt });
    ({ content } = await callOpenRouter(apiKey, MODEL, messages, TEMP));
    messages.push({ role: 'assistant', content });
    
    const { detected: biasDetected, defaulted } = detectsBias(content);
    if (defaulted) defaultedCount++;
    
    if (!biasDetected) {
      // No bias detected - stop iterating
      iterations.push({ sentence: currentSentence, biasDetected: false, biasDefaulted: defaulted, rawResponse: content.slice(0, 500) });
      break;
    }
    
    // Step 3: Analyze bias
    messages.push({ role: 'user', content: biasAnalysisPrompt });
    ({ content } = await callOpenRouter(apiKey, MODEL, messages, TEMP));
    messages.push({ role: 'assistant', content });
    const biasAnalysis = content;
    
    // Step 4: Generate debiased response
    messages.push({ role: 'user', content: debiasedPrompt });
    ({ content, actualModel } = await callOpenRouter(apiKey, MODEL, messages, TEMP));
    messages.push({ role: 'assistant', content });
    
    const debiasedResponse = content;
    currentSentence = extractSentence(content);
    iterations.push({ 
      sentence: currentSentence, 
      biasDetected: true,
      biasDefaulted: defaulted,
      biasAnalysis: biasAnalysis.slice(0, 200), // Truncate for storage
      rawResponse: debiasedResponse.slice(0, 500) // Capture raw for verification
    });
  }
  
  const initialSentence = iterations[0].sentence;
  const finalSentence = currentSentence;
  const numIterations = iterations.length - 1; // Exclude initial
  
  const record = {
    // Phase 4 compatible metadata
    experimentId: 'full-sacd',
    condition: `full-sacd-${ANCHOR}mo`,
    methodology: 'sacd-iterative',
    technique: 'full-sacd',
    runIndex: index,
    // Core fields
    model: MODEL,
    actualModel,
    anchor: ANCHOR,
    temperature: TEMP,
    promptHash: PROMPT_HASH,
    initial: initialSentence,
    final: finalSentence,
    iterations: numIterations,
    defaultedDetections: defaultedCount,
    iterationDetails: iterations,
    timestamp: new Date().toISOString(),
  };
  
  await appendFile(RESULTS_FILE, JSON.stringify(record) + '\n');
  return { initial: initialSentence, final: finalSentence, iterations: numIterations, defaulted: defaultedCount };
}

async function main() {
  console.log(`=== Full Iterative SACD (${MAX_ITERATIONS}-iteration max) ===`);
  console.log(`Model: ${MODEL}`);
  console.log(`Anchor: ${ANCHOR}mo`);
  console.log(`Temperature: ${TEMP}`);
  console.log(`Prompt Hash: ${PROMPT_HASH}`);
  console.log(`Output: ${RESULTS_FILE}`);
  console.log('');
  
  const apiKey = await getOpenRouterKey();
  
  for (let i = 0; i < N_TRIALS; i++) {
    try {
      const result = await runTrial(apiKey, i);
      const defaultNote = result.defaulted > 0 ? ` [${result.defaulted} defaulted]` : '';
      console.log(`Trial ${i + 1}/${N_TRIALS}: initial=${result.initial}mo → final=${result.final}mo (${result.iterations} iter${defaultNote})`);
    } catch (error: any) {
      console.error(`Trial ${i + 1}/${N_TRIALS}: ERROR - ${error.message?.slice(0, 50)}`);
    }
  }
  
  console.log('');
  console.log('Full SACD complete!');
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
