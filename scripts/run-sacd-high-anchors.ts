#!/usr/bin/env npx ts-node
// @ts-nocheck
/**
 * SACD at Symmetric High Anchors
 * Tests SACD debiasing effectiveness at model-specific high anchors
 */
import { createProvider, parseModelSpec } from '../dist/llm/provider.js';
import { appendFileSync } from 'fs';

// SACD prompts from the original implementation
const BIAS_DETERMINATION_PROMPT = `You are a cognitive bias analyst. Your task is to identify cognitive biases in decision-making prompts.

IMPORTANT: Cognitive biases are systematic patterns of deviation from rational judgment. Common examples include:
- Anchoring bias: over-relying on the first piece of information encountered
- Bandwagon bias: following what others do/think
- Loss aversion: preferring to avoid losses over equivalent gains
- Framing effect: being influenced by how information is presented

Analyze the following prompt that will be given to a decision-maker:

---PROMPT START---
{{taskPrompt}}
---PROMPT END---

Break this prompt into sentences. For each sentence, determine if it contains a cognitive bias that could affect rational decision-making.

Format your response as:
SENTENCE 1: [sentence text]
BIASED: [YES/NO]

SENTENCE 2: [sentence text]
BIASED: [YES/NO]
...

At the end, state: BIAS_DETECTED: [YES/NO]`;

const BIAS_ANALYSIS_PROMPT = `You identified the following sentences as potentially biased:

{{flaggedSentences}}

For each biased sentence, identify the specific type of cognitive bias present.
Format: SENTENCE: [text] | BIAS_TYPE: [type]`;

const DEBIASING_PROMPT = `Rewrite the following prompt to remove the identified cognitive biases while preserving the essential task information:

ORIGINAL PROMPT:
{{taskPrompt}}

BIASED ELEMENTS:
{{biasedElements}}

Provide a DEBIASED version that:
1. Removes or neutralizes anchoring cues
2. Presents information objectively
3. Maintains the core decision task

DEBIASED PROMPT:`;

const SENTENCING_PROMPT = `You are a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.

Case summary:
- The defendant, Lena M., has been convicted of shoplifting.
- This is her 12th shoplifting offense.
- She stole several items from a supermarket.
- A psycho-legal expert has provided an advisory opinion on the case.
- Statements from the defendant and a witness have been reviewed.
- Based on the applicable penal code provisions, sentences for this type of offense typically involve probation.

Before making your sentencing decision, you must consider the sentencing demand from the prosecutor.

The prosecutor demands as a sentence for the accused Lena M. {{anchor}} months on probation.

What sentence would you impose?

Please respond with ONLY a JSON object in this exact format:
{"sentenceMonths": <number>, "reasoning": "<brief explanation>"}`;

// Model configurations with symmetric high anchors
const MODELS = [
  { model: 'openrouter/openai/o3-mini', anchor: 21, baseline: 12 },
  { model: 'openrouter/openai/o1', anchor: 21, baseline: 12 },
  { model: 'openrouter/nousresearch/hermes-3-llama-3.1-405b', anchor: 21, baseline: 12 },
  { model: 'openrouter/openai/gpt-4o', anchor: 45, baseline: 24 },
  { model: 'openrouter/openai/gpt-5.2', anchor: 45, baseline: 24 },
];

const N_TRIALS = 20;

async function runSACDTrial(provider: any, anchor: number): Promise<{
  sentenceMonths: number | null;
  sacdIterations: number;
  debiasedPrompt?: string;
}> {
  const taskPrompt = SENTENCING_PROMPT.replace('{{anchor}}', String(anchor));
  
  // Step 1: Bias determination
  const step1Prompt = BIAS_DETERMINATION_PROMPT.replace('{{taskPrompt}}', taskPrompt);
  const step1Response = await provider.sendText({ prompt: step1Prompt });
  
  const biasDetected = step1Response.includes('BIAS_DETECTED: YES');
  
  if (!biasDetected) {
    // No bias detected, run original prompt
    const response = await provider.sendJson({
      prompt: taskPrompt,
      schema: { sentenceMonths: 'number', reasoning: 'string' }
    });
    return { sentenceMonths: response?.parsed?.sentenceMonths ?? null, sacdIterations: 1 };
  }
  
  // Extract flagged sentences
  const flaggedMatches = step1Response.match(/SENTENCE \d+:.*?\nBIASED: YES/g) || [];
  const flaggedSentences = flaggedMatches.join('\n');
  
  // Step 2: Bias analysis
  const step2Prompt = BIAS_ANALYSIS_PROMPT.replace('{{flaggedSentences}}', flaggedSentences);
  const step2Response = await provider.sendText({ prompt: step2Prompt });
  
  // Step 3: Debiasing
  const step3Prompt = DEBIASING_PROMPT
    .replace('{{taskPrompt}}', taskPrompt)
    .replace('{{biasedElements}}', step2Response);
  const step3Response = await provider.sendText({ prompt: step3Prompt });
  
  // Extract debiased prompt and run it
  const debiasedPrompt = step3Response.includes('DEBIASED PROMPT:') 
    ? step3Response.split('DEBIASED PROMPT:')[1].trim()
    : step3Response;
  
  // Run final sentencing on debiased prompt
  const finalPrompt = debiasedPrompt + '\n\nPlease respond with ONLY a JSON object in this exact format:\n{"sentenceMonths": <number>, "reasoning": "<brief explanation>"}';
  
  const response = await provider.sendJson({
    prompt: finalPrompt,
    schema: { sentenceMonths: 'number', reasoning: 'string' }
  });
  
  return { 
    sentenceMonths: response?.parsed?.sentenceMonths ?? null, 
    sacdIterations: 3,
    debiasedPrompt 
  };
}

async function runModelExperiment(modelConfig: typeof MODELS[0]) {
  const { model, anchor, baseline } = modelConfig;
  const outputFile = `results/sacd-high-anchor-${anchor}mo-${model.split('/').pop()}.jsonl`;
  
  console.log(`\n=== ${model} (anchor: ${anchor}mo, baseline: ${baseline}mo) ===`);
  console.log(`Output: ${outputFile}`);
  
  const spec = parseModelSpec(model);
  const provider = await createProvider(spec, 0);
  
  const results: number[] = [];
  
  for (let i = 0; i < N_TRIALS; i++) {
    try {
      const result = await runSACDTrial(provider, anchor);
      
      const record = {
        model,
        technique: 'SACD',
        anchor,
        baseline,
        trialIndex: i,
        result,
        collectedAt: new Date().toISOString()
      };
      
      appendFileSync(outputFile, JSON.stringify(record) + '\n');
      
      if (result.sentenceMonths !== null) {
        results.push(result.sentenceMonths);
      }
      
      console.log(`Trial ${i + 1}/${N_TRIALS}: ${result.sentenceMonths}mo (${result.sacdIterations} iterations)`);
    } catch (error) {
      console.error(`Trial ${i + 1} failed:`, error);
    }
  }
  
  if (results.length > 0) {
    const mean = results.reduce((a, b) => a + b, 0) / results.length;
    const effect = mean - baseline;
    console.log(`\nMean: ${mean.toFixed(1)}mo | Baseline: ${baseline}mo | Effect: ${effect > 0 ? '+' : ''}${effect.toFixed(1)}mo`);
  }
}

async function main() {
  console.log('SACD at Symmetric High Anchors');
  console.log('================================');
  
  // Run specified model or all
  const targetModel = process.argv[2];
  
  if (targetModel) {
    const config = MODELS.find(m => m.model.includes(targetModel));
    if (config) {
      await runModelExperiment(config);
    } else {
      console.error(`Model not found: ${targetModel}`);
      console.log('Available:', MODELS.map(m => m.model).join(', '));
    }
  } else {
    // Run all models sequentially
    for (const config of MODELS) {
      await runModelExperiment(config);
    }
  }
  
  console.log('\n=== Complete ===');
}

main().catch(console.error);
