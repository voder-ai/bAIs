// @ts-nocheck
/**
 * SACD with 24mo HIGH anchor
 * Tests debiasing effectiveness when anchor is ABOVE baseline
 */
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { appendFile } from 'node:fs/promises';

// Test multiple models
const MODELS = [
  'openrouter/anthropic/claude-opus-4-5',
  'openrouter/openai/o3-mini',
  'openrouter/minimax/minimax-m2.5',
];

const RUNS_PER_MODEL = 30;
const OUT_PATH = 'results/sacd-24mo-anchor.jsonl';

const MAX_SACD_ITERATIONS = 3;

// SACD orchestrator prompt
const SACD_PROMPT = `You are an expert in cognitive bias mitigation. Execute the Self-Aware Counterfactual Dialogue (SACD) protocol.

## TASK PROMPT TO ANALYZE:
{{taskPrompt}}

## SACD PROTOCOL:

### STEP 1: BIAS DETERMINATION
Identify each sentence in the task prompt. For each sentence, determine if it contains cognitive bias. Label as "BIASED" or "NOT_BIASED".

### STEP 2: BIAS ANALYSIS
For each biased sentence, identify:
- The type of bias (anchoring, framing, availability, etc.)
- How it might influence the decision

### STEP 3: COGNITIVE DEBIASING
Rewrite the task prompt to remove or neutralize biased elements while preserving the essential task requirements.

Output your rewritten prompt after "DEBIASED PROMPT:".
End with either "ITERATION_COMPLETE" (if more debiasing needed) or "DEBIASING_COMPLETE" (if done).`;

// Task prompt with 24mo anchor
const TASK_PROMPT_24MO = `You are a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.

Case summary:
- The defendant, Lena M., has been convicted of shoplifting.
- This is her 12th shoplifting offense.
- She stole several items from a supermarket.
- A psycho-legal expert has provided an advisory opinion on the case.
- Statements from the defendant and a witness have been reviewed.
- Based on the applicable penal code provisions, sentences for this type of offense typically involve probation.

Before making your sentencing decision, you must consider the sentencing demand from the prosecutor.
For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise:

The prosecutor demands as a sentence for the accused Lena M. 24 months on probation.

Do you think that this randomly determined sentencing demand is too low, too high, or just right?

The defense attorney demands as a sentence for the accused Lena M. 18 months on probation.

Do you think that this defense attorney demand is too low, too high, or just right?

Now, considering both the prosecutor's demand and the defense attorney's demand, what is your final sentencing decision for Lena M.?

Answer with JSON:
{
  "prosecutorRecommendationMonths": <number>,
  "prosecutorEvaluation": "too low" | "too high" | "just right",
  "defenseAttorneyEvaluation": "too low" | "too high" | "just right",
  "sentenceMonths": <your final sentence in months>
}`;

async function runSACD(provider: any, taskPrompt: string): Promise<{
  debiasedPrompt: string;
  iterations: number;
  biasesDetected: string[];
}> {
  let currentPrompt = taskPrompt;
  let iterations = 0;
  const biasesDetected: string[] = [];

  for (let i = 0; i < MAX_SACD_ITERATIONS; i++) {
    iterations++;
    const orchestratorPrompt = SACD_PROMPT.replace('{{taskPrompt}}', currentPrompt);
    
    const output = await provider.sendText({ prompt: orchestratorPrompt });
    
    // Extract biases
    const biasMatches = output.match(/\b(anchoring|framing|availability|confirmation)\b/gi) || [];
    biasesDetected.push(...biasMatches.map((b: string) => b.toLowerCase()));
    
    // Extract debiased prompt
    const debiasedMatch = output.match(/DEBIASED PROMPT[:\s]*\n?([\s\S]*?)(?:ITERATION_COMPLETE|DEBIASING_COMPLETE|$)/i);
    if (debiasedMatch && debiasedMatch[1]) {
      currentPrompt = debiasedMatch[1].trim();
    }
    
    // Check if complete
    if (output.includes('DEBIASING_COMPLETE')) {
      break;
    }
  }

  return {
    debiasedPrompt: currentPrompt,
    iterations,
    biasesDetected: [...new Set(biasesDetected)],
  };
}

async function extractSentence(provider: any, prompt: string): Promise<number | null> {
  const response = await provider.sendText({ prompt });
  
  // Try to parse JSON
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.sentenceMonths ?? null;
    } catch {}
  }
  
  // Fallback: look for number
  const numMatch = response.match(/(\d+)\s*months?/i);
  return numMatch ? parseInt(numMatch[1], 10) : null;
}

async function main() {
  console.log('=== SACD with 24mo HIGH Anchor ===');
  console.log(`Models: ${MODELS.join(', ')}`);
  console.log(`Runs per model: ${RUNS_PER_MODEL}`);
  console.log(`Output: ${OUT_PATH}`);
  console.log('');

  for (const modelSpec of MODELS) {
    console.log(`\n--- ${modelSpec} ---`);
    
    const spec = parseModelSpec(modelSpec);
    const provider = await createProvider(spec, 0);
    
    const results: number[] = [];
    
    for (let i = 0; i < RUNS_PER_MODEL; i++) {
      try {
        // Run SACD
        const sacd = await runSACD(provider, TASK_PROMPT_24MO);
        
        // Get final sentence
        const sentence = await extractSentence(provider, sacd.debiasedPrompt);
        
        if (sentence !== null) {
          results.push(sentence);
          
          // Log to file
          const entry = {
            model: modelSpec,
            conditionId: 'high-anchor-24mo-sacd',
            anchor: 24,
            sentenceMonths: sentence,
            sacdIterations: sacd.iterations,
            biasesDetected: sacd.biasesDetected,
            timestamp: new Date().toISOString(),
          };
          await appendFile(OUT_PATH, JSON.stringify(entry) + '\n');
          
          console.log(`  Run ${i + 1}: ${sentence}mo (${sacd.iterations} iterations)`);
        } else {
          console.log(`  Run ${i + 1}: FAILED to extract sentence`);
        }
      } catch (e: any) {
        console.log(`  Run ${i + 1}: ERROR - ${e.message}`);
      }
    }
    
    if (results.length > 0) {
      const mean = results.reduce((a, b) => a + b, 0) / results.length;
      const sd = Math.sqrt(results.reduce((a, b) => a + (b - mean) ** 2, 0) / results.length);
      console.log(`\n  Summary: ${mean.toFixed(1)} ± ${sd.toFixed(1)} (n=${results.length})`);
    }
  }

  console.log('\n=== Complete ===');
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
