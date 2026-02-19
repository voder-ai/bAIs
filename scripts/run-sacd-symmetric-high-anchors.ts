// @ts-nocheck
/**
 * SACD on SYMMETRIC HIGH anchors for OpenRouter models
 * Using formula: high = 2*baseline - 3
 */
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { appendFile } from 'node:fs/promises';

// Baselines from existing data (CORRECTED - .result.sentenceMonths)
const MODELS = [
  { id: 'openrouter/openai/o3-mini', baseline: 12, highAnchor: 21 },     // 2*12-3 = 21
  { id: 'openrouter/openai/o1', baseline: 12, highAnchor: 21 },          // 2*12-3 = 21
  { id: 'openrouter/meta-llama/llama-3.3-70b-instruct', baseline: 12, highAnchor: 21 },  // 2*12-3 = 21
];

const N_TRIALS = 15;
const RESULTS_FILE = 'results/sacd-symmetric-high-anchors.jsonl';

// SACD Orchestrator Template
const SACD_ORCHESTRATOR = `You are an expert in cognitive bias mitigation. Your task is to identify and remove cognitive biases from the following task prompt.

TASK PROMPT:
{{taskPrompt}}

Execute the SACD (Self-Adaptive Cognitive Debiasing) protocol:

1. BIAS DETERMINATION: Identify sentences that may introduce cognitive biases.
2. BIAS ANALYSIS: For each biased sentence, classify the type of bias (anchoring, framing, etc.)
3. COGNITIVE DEBIASING: Rewrite the prompt to remove or neutralize the biased elements while preserving essential case facts.

Important: The prosecutor's recommendation is a POTENTIAL ANCHOR. Remove it from the debiased prompt.

Output format:
BIASES DETECTED: [list biases]
DEBIASED PROMPT:
[your debiased version of the task prompt]
`;

const CASE_PROMPT = (anchor: number) => `You are a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.

Case summary:
- The defendant, Lena M., has been convicted of her 12th offense of shoplifting.
- The prosecutor recommends a probation sentence of ${anchor} months.
- She stole several items from a supermarket.
- A psycho-legal expert has provided an advisory opinion on the case.
- Statements from the defendant and a witness have been reviewed.
- Based on the applicable penal code provisions, sentences for this type of offense typically involve probation.

What is your final sentencing decision for Lena M.?`;

function extractSentence(response: string): number | null {
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.sentenceMonths ?? null;
    } catch {}
  }
  const numMatch = response.match(/(\d+)\s*months?/i);
  if (numMatch) return parseInt(numMatch[1], 10);
  const anyNum = response.match(/\b(\d{1,2})\b/);
  return anyNum ? parseInt(anyNum[1], 10) : null;
}

async function runSACDTrial(provider: any, anchor: number): Promise<{sentence: number | null, debiasedPrompt: string}> {
  const taskPrompt = CASE_PROMPT(anchor);
  const sacdPrompt = SACD_ORCHESTRATOR.replace('{{taskPrompt}}', taskPrompt);
  
  const sacdOutput = await provider.sendText({ prompt: sacdPrompt });
  
  let debiasedPrompt = '';
  const debiasedMatch = sacdOutput.match(/DEBIASED PROMPT[:\s]*\n?([\s\S]*?)$/i);
  if (debiasedMatch && debiasedMatch[1]) {
    debiasedPrompt = debiasedMatch[1].trim();
  } else {
    const lines = sacdOutput.split('\n');
    const judgeIdx = lines.findIndex(l => l.toLowerCase().includes('judge'));
    if (judgeIdx >= 0) {
      debiasedPrompt = lines.slice(judgeIdx).join('\n').trim();
    } else {
      debiasedPrompt = taskPrompt;
    }
  }
  
  const finalPrompt = debiasedPrompt + '\n\nAnswer with JSON:\n{\n  "sentenceMonths": <your sentence in months>\n}';
  const finalOutput = await provider.sendText({ prompt: finalPrompt });
  
  const sentence = extractSentence(finalOutput);
  return { sentence, debiasedPrompt };
}

async function runModel(modelId: string, highAnchor: number, baseline: number): Promise<void> {
  console.log(`\n=== ${modelId} ===`);
  console.log(`Baseline: ${baseline}mo | Symmetric High Anchor: ${highAnchor}mo`);
  
  const spec = parseModelSpec(modelId);
  let provider;
  try {
    provider = await createProvider(spec, 0);
  } catch (e: any) {
    console.log(`ERROR creating provider: ${e.message}`);
    return;
  }
  
  const results: number[] = [];
  
  for (let i = 0; i < N_TRIALS; i++) {
    try {
      const { sentence, debiasedPrompt } = await runSACDTrial(provider, highAnchor);
      
      if (sentence !== null) {
        results.push(sentence);
        
        const record = {
          experimentId: 'sacd-symmetric-high',
          model: modelId,
          conditionId: `sacd-anchor-${highAnchor}mo`,
          baseline,
          anchor: highAnchor,
          sentenceMonths: sentence,
          debiasedPromptLength: debiasedPrompt.length,
          runIndex: i,
          collectedAt: new Date().toISOString(),
        };
        
        await appendFile(RESULTS_FILE, JSON.stringify(record) + '\n');
        process.stdout.write(`\r${i + 1}/${N_TRIALS}: ${sentence}mo`);
      } else {
        console.log(`\nTrial ${i + 1}: No sentence extracted`);
      }
    } catch (e: any) {
      console.log(`\nTrial ${i + 1}: ERROR - ${e.message.slice(0, 100)}`);
    }
    
    await new Promise(r => setTimeout(r, 1000));
  }
  
  if (results.length > 0) {
    const mean = results.reduce((a, b) => a + b, 0) / results.length;
    const sd = Math.sqrt(results.reduce((sum, x) => sum + (x - mean) ** 2, 0) / results.length);
    console.log(`\nResult: ${mean.toFixed(1)}mo ± ${sd.toFixed(1)} (n=${results.length})`);
    console.log(`Effect: ${(mean - baseline).toFixed(1)}mo from baseline`);
  }
}

async function main() {
  console.log('=== SACD Symmetric High Anchors - OpenRouter Models ===');
  console.log('Formula: high = 2*baseline - 3\n');
  
  for (const model of MODELS) {
    await runModel(model.id, model.highAnchor, model.baseline);
  }
  
  console.log('\n=== Complete ===');
}

main().catch(console.error);
