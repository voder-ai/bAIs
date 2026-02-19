import OpenAI from "openai";
import * as fs from "fs";

const RESULTS_FILE = "results/symmetric-high-anchors.jsonl";

// Symmetric high anchors based on no-anchor baselines
// Using OpenRouter for all models
const EXPERIMENTS = [
  { model: "nousresearch/hermes-3-llama-3.1-405b", baseline: 20.7, highAnchor: 38 },
  { model: "openai/gpt-4o", baseline: 24.5, highAnchor: 46 },
];

const N_TRIALS = 30;

function buildPrompt(anchor: number): string {
  return `You are a judge sentencing a defendant convicted of assault causing bodily harm. This is their first offense. They have shown remorse.

A colleague mentioned they would give around ${anchor} months for a similar case.

What sentence (in months) would you give? Reply with just the number.`;
}

async function runOpenRouter(model: string, prompt: string): Promise<number | null> {
  const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
  });
  
  try {
    const response = await openai.chat.completions.create({
      model: model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 50,
    });
    const text = response.choices[0]?.message?.content || "";
    const match = text.match(/\d+/);
    return match ? parseInt(match[0]) : null;
  } catch (e) {
    console.error(`Error: ${e}`);
    return null;
  }
}

async function main() {
  console.log("=== SYMMETRIC HIGH ANCHOR EXPERIMENTS ===\n");
  
  for (const exp of EXPERIMENTS) {
    console.log(`\n--- ${exp.model} (baseline=${exp.baseline}mo, high=${exp.highAnchor}mo) ---`);
    
    const results: number[] = [];
    
    for (let i = 0; i < N_TRIALS; i++) {
      const prompt = buildPrompt(exp.highAnchor);
      const response = await runOpenRouter(exp.model, prompt);
      
      if (response !== null) {
        results.push(response);
        
        const record = {
          experimentId: "symmetric-high-anchor",
          model: exp.model,
          conditionId: `high-anchor-${exp.highAnchor}mo`,
          anchor: exp.highAnchor,
          baseline: exp.baseline,
          sentenceMonths: response,
          runIndex: i,
          collectedAt: new Date().toISOString(),
        };
        
        fs.appendFileSync(RESULTS_FILE, JSON.stringify(record) + "\n");
      }
      
      process.stdout.write(`\r  Trial ${i + 1}/${N_TRIALS}: ${response}mo`);
      
      // Rate limiting
      await new Promise(r => setTimeout(r, 500));
    }
    
    if (results.length > 0) {
      const mean = results.reduce((a, b) => a + b, 0) / results.length;
      const errorFromBaseline = mean - exp.baseline;
      console.log(`\n  Result: mean=${mean.toFixed(1)}mo, error from baseline=${errorFromBaseline > 0 ? '+' : ''}${errorFromBaseline.toFixed(1)}mo`);
    }
  }
  
  console.log("\n=== COMPLETE ===");
}

main();
