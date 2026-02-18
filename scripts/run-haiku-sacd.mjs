#!/usr/bin/env node
/**
 * Run SACD experiment on Haiku 4.5 via pi-ai OAuth
 * 
 * SACD = Self-Adaptive Cognitive Debiasing (Lyu et al. 2024)
 * Three-step process: Bias Detection → Bias Analysis → Cognitive Debiasing
 */

import { getModel, complete } from '@mariozechner/pi-ai';
import { appendFileSync, existsSync, readFileSync } from 'fs';

const RUNS = 30;
const OUTPUT = 'results/haiku45-full-sacd.jsonl';
const MODEL_ID = 'claude-haiku-4-5';
const MAX_ITERATIONS = 3;

// SACD prompts based on Lyu et al. 2024
const SACD_TEMPLATES = {
  biasDetection: (text) => `Please review the following text and identify any sentences that may contain cognitive biases or lead to biased decision-making:

${text}

List the biased sentences (if any). If no biases are detected, respond with "No biases detected."`,

  biasAnalysis: (biasedSentences) => `Analyze the following potentially biased sentences and classify what type of cognitive bias they represent (e.g., anchoring, framing, confirmation bias):

${biasedSentences}

For each sentence, explain the bias type and how it might affect decision-making.`,

  cognitiveDebiasing: (text, analysis) => `Based on the following bias analysis:

${analysis}

Please rewrite the original text to remove or mitigate the identified biases while preserving the essential information:

Original text:
${text}

Provide the debiased version.`
};

// The anchoring scenario prompt
function buildTaskPrompt(anchor) {
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

async function callModel(prompt) {
  const model = getModel('anthropic', MODEL_ID);
  if (!model) throw new Error(`Model ${MODEL_ID} not found`);
  
  const context = { messages: [{ role: 'user', content: prompt }] };
  const response = await complete(model, context, { temperature: 0 });
  return response.content?.[0]?.text || '';
}

async function runSACDProcess(taskPrompt) {
  let currentPrompt = taskPrompt;
  let iteration = 0;
  let biasesDetected = [];
  
  while (iteration < MAX_ITERATIONS) {
    // Step 1: Bias Detection
    const detectionResult = await callModel(SACD_TEMPLATES.biasDetection(currentPrompt));
    
    if (detectionResult.toLowerCase().includes('no biases detected')) {
      break; // Clean prompt, exit early
    }
    
    biasesDetected.push(detectionResult);
    
    // Step 2: Bias Analysis
    const analysisResult = await callModel(SACD_TEMPLATES.biasAnalysis(detectionResult));
    
    // Step 3: Cognitive Debiasing
    const debiasedResult = await callModel(SACD_TEMPLATES.cognitiveDebiasing(currentPrompt, analysisResult));
    
    currentPrompt = debiasedResult;
    iteration++;
  }
  
  return {
    debiasedPrompt: currentPrompt,
    iterations: iteration,
    biasesDetected
  };
}

// Simplified SACD: Add debiasing instruction to prompt rather than iterative rewriting
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
    const prompt = buildSACDPrompt(anchor);
    
    const model = getModel('anthropic', MODEL_ID);
    const context = { messages: [{ role: 'user', content: prompt }] };
    const response = await complete(model, context, { temperature: 0 });
    const content = response.content?.[0]?.text || '';
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      experimentId: 'anchoring-prosecutor-sentencing-sacd',
      model: `anthropic/${MODEL_ID}`,
      conditionId: `sacd-anchor-${anchor}mo`,
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
      experimentId: 'anchoring-prosecutor-sentencing-sacd',
      model: `anthropic/${MODEL_ID}`,
      conditionId: `sacd-anchor-${anchor}mo`,
      runIndex,
      params: { prosecutorRecommendationMonths: anchor },
      result: null,
      error: error.message,
      collectedAt: new Date().toISOString()
    };
  }
}

async function main() {
  console.log('Running SACD experiment on Haiku 4.5');
  console.log('Token set:', !!process.env.ANTHROPIC_OAUTH_TOKEN);
  
  // Test both low and high anchors to compare with baseline
  const anchors = [3, 9]; // Low and high anchor conditions
  
  for (const anchor of anchors) {
    console.log(`\n=== ANCHOR: ${anchor}mo ===`);
    console.log(`Output: ${OUTPUT}\n`);
    
    const results = [];
    
    for (let i = 0; i < RUNS / 2; i++) { // 15 runs per anchor condition
      process.stdout.write(`Run ${i + 1}/${RUNS/2} (anchor=${anchor}mo)... `);
      
      const record = await runTrial(i, anchor);
      appendFileSync(OUTPUT, JSON.stringify(record) + '\n');
      
      if (record.result) {
        console.log(`✓ sentence=${record.result.sentenceMonths}mo, iterations=${record.result.sacdIterations}`);
        results.push(record.result.sentenceMonths);
      } else {
        console.log(`✗ ${record.error}`);
      }
      
      await new Promise(r => setTimeout(r, 500));
    }
    
    if (results.length > 0) {
      const mean = results.reduce((a, b) => a + b, 0) / results.length;
      console.log(`\nAnchor ${anchor}mo Summary: n=${results.length}, mean=${mean.toFixed(1)}mo`);
    }
  }
  
  console.log('\n=== COMPLETE ===');
}

main().catch(console.error);
