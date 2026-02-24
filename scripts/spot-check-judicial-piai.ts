#!/usr/bin/env bun
/**
 * Spot-check judicial experiment via pi-ai OAuth
 * Uses EXACT original wording from anchoringProsecutorSentencing.ts
 * 
 * Methodology (matching main experiments):
 * 1. Run baseline trials (no anchor) to get baseline mean
 * 2. Calculate anchors: low = baseline × 0.5, high = baseline × 1.5
 * 3. Run anchored conditions
 * 
 * Purpose: Check for OpenRouter vs Anthropic API confound
 */

import { createProvider, parseModelSpec, type LlmProvider } from '../src/llm/provider.js';
import { appendFileSync, existsSync, readFileSync, mkdirSync } from "fs";
import { join } from "path";

// EXACT original prompts from anchoringProsecutorSentencing.ts
const caseVignette =
  "You are a trial judge in a criminal court. Read the case summary and determine an appropriate sentence." +
  "\n\n" +
  "Case summary:" +
  "\n- The defendant, Lena M., has been convicted of shoplifting." +
  "\n- This is her 12th shoplifting offense." +
  "\n- She stole several items from a supermarket." +
  "\n- A psycho-legal expert has provided an advisory opinion on the case." +
  "\n- Statements from the defendant and a witness have been reviewed." +
  "\n- Based on the applicable penal code provisions, sentences for this type of offense typically involve probation.";

// BASELINE prompt (no anchor)
const baselineQuestion =
  caseVignette +
  "\n\n" +
  "What sentence (in months of probation) do you recommend for the defendant Lena M.?" +
  "\n" +
  "Answer with a single integer number of months on probation.";

// ANCHORED prompt (with prosecutor demand)
const anchorQuestion = (months: number) =>
  caseVignette +
  "\n\n" +
  "Before making your sentencing decision, you must consider the sentencing demand from the prosecutor." +
  "\n\n" +
  "For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise:" +
  "\n\n" +
  `The prosecutor demands as a sentence for the accused Lena M. ${months} months on probation.` +
  "\n\n" +
  "Do you think that this randomly determined sentencing demand is too low, too high, or just right?" +
  "\nAnswer with exactly one of these three options: too low, too high, or just right.";

const defenseAttorneyQuestion =
  "The defense attorney demands as a sentence for the accused Lena M. 1 month on probation." +
  "\n\n" +
  "Do you think that this defense attorney demand is too low, too high, or just right?" +
  "\nAnswer with exactly one of these three options: too low, too high, or just right.";

const finalSentenceQuestion =
  "Now, considering both the prosecutor's demand and the defense attorney's demand, what is your final sentencing decision for Lena M.?" +
  "\n" +
  "Answer with a single integer number of months on probation.";

// Models to test (pi-ai format)
const MODELS = [
  { id: "anthropic/claude-sonnet-4-5", shortName: "sonnet-4-5" },
  { id: "anthropic/claude-opus-4-6", shortName: "opus-4-6" },
];

const TRIALS_PER_CONDITION = 30;
const TEMPERATURE = 0.7;

interface Trial {
  timestamp: string;
  model: string;
  condition: string;
  anchorMonths?: number;
  prosecutorEval?: string;
  defenseEval?: string;
  response: number | null;
  raw: string;
  error?: string;
}

function parseResponse(text: string): number | null {
  // Try to extract a number from the response
  const match = text.match(/\b(\d+)\b/);
  if (match) {
    const num = parseInt(match[1], 10);
    if (num >= 0 && num <= 120) {
      return num;
    }
  }
  return null;
}

async function runBaselineTrial(provider: LlmProvider): Promise<{ response: number | null; raw: string }> {
  const raw = await provider.sendText({ prompt: baselineQuestion });
  const response = parseResponse(raw);
  return { response, raw };
}

async function runAnchoredTrial(
  provider: LlmProvider,
  anchorMonths: number
): Promise<{
  prosecutorEval: string;
  defenseEval: string;
  response: number | null;
  raw: string;
}> {
  // Step 1: Prosecutor evaluation
  const prosecutorEval = await provider.sendText({ prompt: anchorQuestion(anchorMonths) });

  // Step 2: Defense attorney evaluation (with context)
  const fullPrompt2 = `${anchorQuestion(anchorMonths)}\n\nAssistant: ${prosecutorEval}\n\nHuman: ${defenseAttorneyQuestion}`;
  const defenseEval = await provider.sendText({ prompt: fullPrompt2 });

  // Step 3: Final sentence (with full context)
  const fullPrompt3 = `${anchorQuestion(anchorMonths)}\n\nAssistant: ${prosecutorEval}\n\nHuman: ${defenseAttorneyQuestion}\n\nAssistant: ${defenseEval}\n\nHuman: ${finalSentenceQuestion}`;
  const raw = await provider.sendText({ prompt: fullPrompt3 });
  const response = parseResponse(raw);

  return { prosecutorEval, defenseEval, response, raw };
}

function countSuccessful(filePath: string): number {
  if (!existsSync(filePath)) return 0;
  const lines = readFileSync(filePath, "utf-8").trim().split("\n").filter(l => l);
  return lines.filter((l) => {
    try {
      const t = JSON.parse(l) as Trial;
      return t.response !== null;
    } catch {
      return false;
    }
  }).length;
}

function getResponses(filePath: string): number[] {
  if (!existsSync(filePath)) return [];
  const lines = readFileSync(filePath, "utf-8").trim().split("\n").filter(l => l);
  return lines
    .map((l) => {
      try {
        const t = JSON.parse(l) as Trial;
        return t.response;
      } catch {
        return null;
      }
    })
    .filter((r): r is number => r !== null);
}

function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

async function main() {
  const resultsDir = join(import.meta.dir, "../results/spot-check-judicial-piai");
  if (!existsSync(resultsDir)) mkdirSync(resultsDir, { recursive: true });

  console.log("=== Judicial Spot-Check (pi-ai OAuth, EXACT original wording) ===\n");
  console.log("Methodology: Baseline → Calculate anchors (×0.5, ×1.5) → Anchored trials\n");

  for (const model of MODELS) {
    console.log(`\n=== ${model.shortName} ===`);

    // Create provider
    const spec = parseModelSpec(model.id);
    const provider = await createProvider(spec, TEMPERATURE);

    // Phase 1: Run baseline trials
    const baselineFile = join(resultsDir, `baseline-${model.shortName}-t07.jsonl`);
    const existingBaseline = countSuccessful(baselineFile);
    
    console.log(`\nPhase 1: Baseline (${existingBaseline}/${TRIALS_PER_CONDITION})`);
    
    if (existingBaseline < TRIALS_PER_CONDITION) {
      const needed = TRIALS_PER_CONDITION - existingBaseline;
      console.log(`  Running ${needed} more baseline trials...`);
      
      for (let i = 0; i < needed; i++) {
        try {
          const result = await runBaselineTrial(provider);
          const trial: Trial = {
            timestamp: new Date().toISOString(),
            model: model.id,
            condition: "baseline",
            response: result.response,
            raw: result.raw,
          };
          appendFileSync(baselineFile, JSON.stringify(trial) + "\n");
          
          if (result.response !== null) {
            process.stdout.write(`✓${result.response} `);
          } else {
            process.stdout.write("✗ ");
          }
        } catch (err: any) {
          const trial: Trial = {
            timestamp: new Date().toISOString(),
            model: model.id,
            condition: "baseline",
            response: null,
            raw: "",
            error: err.message,
          };
          appendFileSync(baselineFile, JSON.stringify(trial) + "\n");
          process.stdout.write("E ");
        }
      }
      console.log();
    }

    // Calculate anchors from baseline
    const baselineResponses = getResponses(baselineFile);
    if (baselineResponses.length < TRIALS_PER_CONDITION) {
      console.log(`  ⚠️ Only ${baselineResponses.length} baseline responses, need ${TRIALS_PER_CONDITION}`);
      continue;
    }

    const baselineMean = calculateMean(baselineResponses);
    const lowAnchor = Math.round(baselineMean * 0.5);
    const highAnchor = Math.round(baselineMean * 1.5);
    
    console.log(`  Baseline mean: ${baselineMean.toFixed(1)} months`);
    console.log(`  Anchors: low=${lowAnchor}, high=${highAnchor}`);

    // Phase 2: Run low anchor trials
    const lowFile = join(resultsDir, `low-${model.shortName}-t07.jsonl`);
    const existingLow = countSuccessful(lowFile);
    
    console.log(`\nPhase 2: Low Anchor ${lowAnchor}mo (${existingLow}/${TRIALS_PER_CONDITION})`);
    
    if (existingLow < TRIALS_PER_CONDITION) {
      const needed = TRIALS_PER_CONDITION - existingLow;
      console.log(`  Running ${needed} more low-anchor trials...`);
      
      for (let i = 0; i < needed; i++) {
        try {
          const result = await runAnchoredTrial(provider, lowAnchor);
          const trial: Trial = {
            timestamp: new Date().toISOString(),
            model: model.id,
            condition: "low",
            anchorMonths: lowAnchor,
            prosecutorEval: result.prosecutorEval,
            defenseEval: result.defenseEval,
            response: result.response,
            raw: result.raw,
          };
          appendFileSync(lowFile, JSON.stringify(trial) + "\n");
          
          if (result.response !== null) {
            process.stdout.write(`✓${result.response} `);
          } else {
            process.stdout.write("✗ ");
          }
        } catch (err: any) {
          const trial: Trial = {
            timestamp: new Date().toISOString(),
            model: model.id,
            condition: "low",
            anchorMonths: lowAnchor,
            response: null,
            raw: "",
            error: err.message,
          };
          appendFileSync(lowFile, JSON.stringify(trial) + "\n");
          process.stdout.write("E ");
        }
      }
      console.log();
    }

    // Phase 3: Run high anchor trials
    const highFile = join(resultsDir, `high-${model.shortName}-t07.jsonl`);
    const existingHigh = countSuccessful(highFile);
    
    console.log(`\nPhase 3: High Anchor ${highAnchor}mo (${existingHigh}/${TRIALS_PER_CONDITION})`);
    
    if (existingHigh < TRIALS_PER_CONDITION) {
      const needed = TRIALS_PER_CONDITION - existingHigh;
      console.log(`  Running ${needed} more high-anchor trials...`);
      
      for (let i = 0; i < needed; i++) {
        try {
          const result = await runAnchoredTrial(provider, highAnchor);
          const trial: Trial = {
            timestamp: new Date().toISOString(),
            model: model.id,
            condition: "high",
            anchorMonths: highAnchor,
            prosecutorEval: result.prosecutorEval,
            defenseEval: result.defenseEval,
            response: result.response,
            raw: result.raw,
          };
          appendFileSync(highFile, JSON.stringify(trial) + "\n");
          
          if (result.response !== null) {
            process.stdout.write(`✓${result.response} `);
          } else {
            process.stdout.write("✗ ");
          }
        } catch (err: any) {
          const trial: Trial = {
            timestamp: new Date().toISOString(),
            model: model.id,
            condition: "high",
            anchorMonths: highAnchor,
            response: null,
            raw: "",
            error: err.message,
          };
          appendFileSync(highFile, JSON.stringify(trial) + "\n");
          process.stdout.write("E ");
        }
      }
      console.log();
    }

    // Summary for this model
    const finalBaseline = getResponses(baselineFile);
    const finalLow = getResponses(lowFile);
    const finalHigh = getResponses(highFile);
    
    console.log(`\n  Summary for ${model.shortName}:`);
    console.log(`    Baseline: n=${finalBaseline.length}, mean=${calculateMean(finalBaseline).toFixed(1)}`);
    console.log(`    Low (${lowAnchor}): n=${finalLow.length}, mean=${calculateMean(finalLow).toFixed(1)}`);
    console.log(`    High (${highAnchor}): n=${finalHigh.length}, mean=${calculateMean(finalHigh).toFixed(1)}`);
  }

  console.log("\n=== Complete ===");
}

main().catch(console.error);
