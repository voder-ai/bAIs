#!/usr/bin/env bun
/**
 * Spot-check judicial experiment via pi-ai (Anthropic direct)
 * Uses EXACT original wording from anchoringProsecutorSentencing.ts
 * Purpose: Check for OpenRouter vs pi-ai confound
 */

import Anthropic from "@anthropic-ai/sdk";
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

// Conditions
const CONDITIONS = [
  { id: "low", anchorMonths: 3 },
  { id: "high", anchorMonths: 9 },
];

const TRIALS_PER_CONDITION = 30;
const TEMPERATURE = 0.7;

const client = new Anthropic();

interface Trial {
  timestamp: string;
  model: string;
  condition: string;
  anchorMonths: number;
  prosecutorEval: string;
  defenseEval: string;
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

async function runTrial(
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
  const prosecutorEval =
    resp1.content[0].type === "text" ? resp1.content[0].text : "";
  messages.push({ role: "assistant", content: prosecutorEval });

  // Step 2: Defense attorney evaluation
  messages.push({ role: "user", content: defenseAttorneyQuestion });
  const resp2 = await client.messages.create({
    model,
    max_tokens: 256,
    temperature: TEMPERATURE,
    messages,
  });
  const defenseEval =
    resp2.content[0].type === "text" ? resp2.content[0].text : "";
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

function countExisting(filePath: string): number {
  if (!existsSync(filePath)) return 0;
  const lines = readFileSync(filePath, "utf-8").trim().split("\n");
  return lines.filter((l) => {
    try {
      const t = JSON.parse(l) as Trial;
      return t.response !== null;
    } catch {
      return false;
    }
  }).length;
}

async function main() {
  const resultsDir = join(import.meta.dir, "../results/spot-check-judicial");
  if (!existsSync(resultsDir)) mkdirSync(resultsDir, { recursive: true });

  console.log("=== Judicial Spot-Check (pi-ai, EXACT original wording) ===\n");

  for (const model of MODELS) {
    for (const condition of CONDITIONS) {
      const fileName = `${condition.id}-${model.shortName}-t07.jsonl`;
      const filePath = join(resultsDir, fileName);
      const existing = countExisting(filePath);

      console.log(
        `\n${model.shortName} / ${condition.id} (${condition.anchorMonths}mo): ${existing}/${TRIALS_PER_CONDITION}`
      );

      if (existing >= TRIALS_PER_CONDITION) {
        console.log("  ✅ Complete");
        continue;
      }

      const needed = TRIALS_PER_CONDITION - existing;
      console.log(`  Running ${needed} more trials...`);

      for (let i = 0; i < needed; i++) {
        try {
          const result = await runTrial(model.id, condition.anchorMonths);
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
          process.stdout.write(`E `);
        }
      }
      console.log();
    }
  }

  console.log("\n=== Complete ===");
}

main().catch(console.error);
