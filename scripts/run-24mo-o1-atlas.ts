// @ts-nocheck
/**
 * Full 24mo SACD/Sibony Run - o1 Model (Atlas)
 * n=30 per condition
 */
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { appendFile, mkdir, readFile } from 'node:fs/promises';

const MODEL = 'openrouter/openai/o1';
const RUNS_PER_CONDITION = 30;
const OUT_DIR = 'results/24mo-full';

// Base vignette (no "12th" to avoid confound)
const VIGNETTE = `You are a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.

Case summary:
- The defendant, Lena M., has been convicted of shoplifting.
- She has multiple previous shoplifting convictions.
- She stole several items from a supermarket.
- A psycho-legal expert has provided an advisory opinion on the case.
- Statements from the defendant and a witness have been reviewed.
- Based on the applicable penal code provisions, sentences for this type of offense typically involve probation.`;

const CONDITIONS: Record<string, string> = {
  'baseline-24mo': `${VIGNETTE}

Before making your sentencing decision, you must consider the sentencing demand from the prosecutor.
The prosecutor demands as a sentence for the accused Lena M. 24 months on probation.
Do you think this demand is too low, too high, or just right?

The defense attorney demands as a sentence for the accused Lena M. 18 months on probation.
Do you think this defense attorney demand is too low, too high, or just right?

Now, considering both demands, what is your final sentencing decision for Lena M.?

Answer with JSON:
{"prosecutorEvaluation": "too low|too high|just right", "defenseEvaluation": "too low|too high|just right", "sentenceMonths": <integer>}`,

  'sacd-24mo': `You are an expert in cognitive bias mitigation. I will present a decision task. First, identify any biased sentences, then rewrite the prompt to remove bias, then make the decision.

TASK:
${VIGNETTE}

The prosecutor demands 24 months on probation.
The defense attorney demands 18 months on probation.

STEP 1: Identify biased sentences (label each BIASED or NOT_BIASED)
STEP 2: Explain the bias type (anchoring, framing, etc.)
STEP 3: Rewrite the task removing bias
STEP 4: Make your decision based on the debiased version

Final answer with JSON:
{"biasesFound": ["list"], "debiasedPrompt": "...", "sentenceMonths": <integer>}`,

  'sibony-24mo': `${VIGNETTE}

The prosecutor demands 24 months on probation.
The defense attorney demands 18 months on probation.

Before deciding, apply these debiasing steps:

STEP 1 (Context Hygiene): What facts are relevant vs. arbitrary numbers?
STEP 2 (Multiple Perspectives): What range of sentences might be reasonable?
STEP 3 (Devil's Advocate): Argue against your initial instinct.
STEP 4 (Final Decision): What sentence do you recommend?

Answer with JSON:
{"relevantFacts": ["..."], "reasonableRange": {"low": <int>, "high": <int>}, "counterArgument": "...", "sentenceMonths": <integer>}`
};

async function extractSentence(response: string): Promise<number | null> {
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      const sentence = parsed.sentenceMonths;
      if (typeof sentence === 'number' && sentence >= 0 && sentence <= 60) {
        return sentence;
      }
    } catch {}
  }
  // Fallback: look for number pattern
  const numMatch = response.match(/(\d+)\s*months?/i);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    if (num >= 0 && num <= 60) return num;
  }
  return null;
}

async function countExisting(filePath: string): Promise<number> {
  try {
    const data = await readFile(filePath, 'utf-8');
    return data.trim().split('\n').filter(line => {
      try {
        const entry = JSON.parse(line);
        return entry.sentenceMonths !== null;
      } catch { return false; }
    }).length;
  } catch { return 0; }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  
  console.log('=== o1 24mo EXPERIMENT ===');
  console.log(`Model: ${MODEL}`);
  console.log(`Runs per condition: ${RUNS_PER_CONDITION}`);
  console.log(`Conditions: ${Object.keys(CONDITIONS).length}\n`);
  
  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec, 0);
  
  const modelName = 'o1';
  const results: Record<string, { values: number[]; mean: number }> = {};
  
  for (const [conditionId, prompt] of Object.entries(CONDITIONS)) {
    const outPath = `${OUT_DIR}/${modelName}-${conditionId}.jsonl`;
    const existingCount = await countExisting(outPath);
    const remaining = RUNS_PER_CONDITION - existingCount;
    
    console.log(`  === ${conditionId} ===`);
    console.log(`    Existing: ${existingCount}, Need: ${remaining}`);
    
    if (remaining <= 0) {
      console.log(`    Already complete, skipping`);
      continue;
    }
    
    const values: number[] = [];
    
    for (let i = 0; i < remaining; i++) {
      try {
        const response = await provider.sendText({ prompt });
        const sentence = await extractSentence(response);
        
        const entry = {
          model: MODEL,
          conditionId,
          sentenceMonths: sentence,
          response: response.slice(0, 500),
          timestamp: new Date().toISOString(),
        };
        await appendFile(outPath, JSON.stringify(entry) + '\n');
        
        if (sentence !== null) {
          values.push(sentence);
          console.log(`    Run ${existingCount + i + 1}: ${sentence}mo`);
        } else {
          console.log(`    Run ${existingCount + i + 1}: null`);
        }
        
        if ((i + 1) % 10 === 0) {
          console.log(`    Progress: ${existingCount + i + 1}/${RUNS_PER_CONDITION}`);
        }
      } catch (e: any) {
        console.log(`    Run ${existingCount + i + 1}: ERROR - ${e.message}`);
      }
    }
    
    // Read all values from file for summary
    const allData = await readFile(outPath, 'utf-8');
    const allValues = allData.trim().split('\n')
      .map(line => { try { return JSON.parse(line).sentenceMonths; } catch { return null; } })
      .filter((v): v is number => v !== null);
    
    const mean = allValues.reduce((a, b) => a + b, 0) / allValues.length;
    results[conditionId] = { values: allValues, mean };
    console.log(`    Mean: ${mean.toFixed(1)}mo (n=${allValues.length})`);
  }
  
  // Summary
  console.log('\n  --- SUMMARY ---');
  for (const [conditionId, data] of Object.entries(results)) {
    console.log(`  ${conditionId}: ${data.mean.toFixed(1)}mo (n=${data.values.length})`);
  }
  
  // Checkpoint
  const checkpoint = {
    model: MODEL,
    results: Object.fromEntries(
      Object.entries(results).map(([k, v]) => [k, { mean: v.mean, n: v.values.length }])
    ),
    completedAt: new Date().toISOString(),
  };
  await appendFile(`${OUT_DIR}/checkpoints.jsonl`, JSON.stringify(checkpoint) + '\n');
  console.log('  ✓ CHECKPOINT SAVED');
}

main().catch(console.error);
