#!/usr/bin/env bun
/**
 * Spot-check judicial experiment via Anthropic direct API
 * Uses EXACT original wording from anchoringProsecutorSentencing.ts
 * 
 * Methodology (matching main experiments):
 * 1. Run baseline trials (no anchor) to get baseline mean
 * 2. Calculate anchors: low = baseline × 0.5, high = baseline × 1.5
 * 3. Run anchored conditions
 * 
 * Purpose: Check for OpenRouter vs Anthropic API confound
 */

import Anthropic from "@anthropic-ai/sdk";
import { appendFileSync, existsSync, readFileSync, mkdirSync, writeFileSync } from "fs";
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

// Models to test
const MODELS = [
  { id: "claude-sonnet-4-5-20250514", shortName: "sonnet-4-5" },
  { id: "claude-opus-4-20250514", shortName: "opus-4" },
];

const TRIALS_PER_CONDITION = 30;
const TEMPERATURE = 0.7;

const client = new Anthropic();

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

async function runBaselineTrial(model: string): Promise<{ response: number | null; raw: string }> {
  const resp = await client.messages.create({
    model,
    max_tokens: 256,
    temperature: TEMPERATURE,
    messages: [{ role: "user", content: baselineQuestion }],
  });
  const raw = resp.content[0].type === "text" ? resp.content[0].text : "";
  const response = parseResponse(raw);
  return { response, raw };
}

async function runAnchoredTrial(
  model: string,
  anchorMonths: number
): Promise<{
  prosecutorEval: string;
  defenseEval: string;
  response: number | null;
  raw: string;
}> {
  const messages: { role: "user" | "assistant"; content: string }[] = [];

  // Step 1: Prosecutor evaluation
  messages.push({ role: "user", content: anchorQuestion(anchorMonths) });
  const resp1 = await client.messages.create({
    model,
    max_tokens: 256,
    temperature: TEMPERATURE,
    messages,
  });
  const prosecutorEval = resp1.content[0].type === "text" ? resp1.content[0].text : "";
  messages.push({ role: "assistant", content: prosecutorEval });

  // Step 2: Defense attorney evaluation
  messages.push({ role: "user", content: defenseAttorneyQuestion });
  const resp2 = await client.messages.create({
    model,
    max_tokens: 256,
    temperature: TEMPERATURE,
    messages,
  });
  const defenseEval = resp2.content[0].type === "text" ? resp2.content[0].text : "";
  messages.push({ role: "assistant", content: defenseEval });

  // Step 3: Final sentence
  messages.push({ role: "user", content: finalSentenceQuestion });
  const resp3 = await client.messages.create({
    model,
    max_tokens: 256,
    temperature: TEMPERATURE,
    messages,
  });
  const raw = resp3.content[0].type === "text" ? resp3.content[0].text : "";
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
  const resultsDir = join(import.meta.dir, "../results/spot-check-judicial");
  if (!existsSync(resultsDir)) mkdirSync(resultsDir, { recursive: true });

  console.log("=== Judicial Spot-Check (Anthropic API, EXACT original wording) ===\n");
  console.log("Methodology: Baseline → Calculate anchors (×0.5, ×1.5) → Anchored trials\n");

  for (const model of MODELS) {
    console.log(`\n=== ${model.shortName} ===`);

    // Phase 1: Run baseline trials
    const baselineFile = join(resultsDir, `baseline-${model.shortName}-t07.jsonl`);
    const existingBaseline = countSuccessful(baselineFile);
    
    console.log(`\nPhase 1: Baseline (${existingBaseline}/${TRIALS_PER_CONDITION})`);
    
    if (existingBaseline < TRIALS_PER_CONDITION) {
      const needed = TRIALS_PER_CONDITION - existingBaseline;
      console.log(`  Running ${needed} more baseline trials...`);
      
      for (let i = 0; i < needed; i++) {
        try {
          const result = await runBaselineTrial(model.id);
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
    
    console.log(`\n  Baseline mean: ${baselineMean.toFixed(1)}mo`);
    console.log(`  Low anchor: ${lowAnchor}mo (×0.5)`);
    console.log(`  High anchor: ${highAnchor}mo (×1.5)`);

    // Save anchor values
    const anchorsFile = join(resultsDir, `anchors-${model.shortName}.json`);
    writeFileSync(anchorsFile, JSON.stringify({
      model: model.id,
      baselineMean,
      lowAnchor,
      highAnchor,
      timestamp: new Date().toISOString(),
    }, null, 2));

    // Phase 2: Run anchored trials
    const conditions = [
      { id: "low", anchorMonths: lowAnchor },
      { id: "high", anchorMonths: highAnchor },
    ];

    for (const condition of conditions) {
      const fileName = `${condition.id}-${model.shortName}-t07.jsonl`;
      const filePath = join(resultsDir, fileName);
      const existing = countSuccessful(filePath);

      console.log(`\nPhase 2: ${condition.id} anchor (${condition.anchorMonths}mo): ${existing}/${TRIALS_PER_CONDITION}`);

      if (existing >= TRIALS_PER_CONDITION) {
        console.log("  ✅ Complete");
        continue;
      }

      const needed = TRIALS_PER_CONDITION - existing;
      console.log(`  Running ${needed} more trials...`);

      for (let i = 0; i < needed; i++) {
        try {
          const result = await runAnchoredTrial(model.id, condition.anchorMonths);
          const trial: Trial = {
            timestamp: new Date().toISOString(),
            model: model.id,
            condition: condition.id,
            anchorMonths: condition.anchorMonths,
            ...result,
          };
          appendFileSync(filePath, JSON.stringify(trial) + "\n");

          if (result.response !== null) {
            process.stdout.write(`✓${result.response} `);
          } else {
            process.stdout.write("✗ ");
          }
        } catch (err: any) {
          const trial: Trial = {
            timestamp: new Date().toISOString(),
            model: model.id,
            condition: condition.id,
            anchorMonths: condition.anchorMonths,
            prosecutorEval: "",
            defenseEval: "",
            response: null,
            raw: "",
            error: err.message,
          };
          appendFileSync(filePath, JSON.stringify(trial) + "\n");
          process.stdout.write("E ");
        }
      }
      console.log();
    }
  }

  console.log("\n=== Complete ===");
}

main().catch(console.error);
