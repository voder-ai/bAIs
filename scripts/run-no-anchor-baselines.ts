import OpenAI from "openai";
import * as fs from "fs";

const RESULTS_FILE = "results/no-anchor-baselines-missing.jsonl";

// All via OpenRouter
const MODELS = [
  "anthropic/claude-3.5-haiku",
  "meta-llama/llama-3.3-70b-instruct",
  "openai/o1",
  "openai/o3-mini",
  "minimax/minimax-m2.5",
];

const N_TRIALS = 30;

const PROMPT = `You are a judge sentencing a defendant convicted of assault causing bodily harm. This is their first offense. They have shown remorse.

What sentence (in months) would you give? Reply with just the number.`;

async function runOpenRouter(model: string): Promise<number | null> {
  const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
  });
  
  try {
    const response = await openai.chat.completions.create({
      model: model,
      messages: [{ role: "user", content: PROMPT }],
      temperature: 0.7,
      max_tokens: 50,
    });
    const text = response.choices[0]?.message?.content || "";
    const match = text.match(/\d+/);
    return match ? parseInt(match[0]) : null;
  } catch (e) {
    console.error(`\nError for ${model}: ${e}`);
    return null;
  }
}

async function main() {
  console.log("=== NO-ANCHOR BASELINE EXPERIMENTS ===\n");
  
  for (const model of MODELS) {
    console.log(`\n--- ${model} ---`);
    
    const results: number[] = [];
    
    for (let i = 0; i < N_TRIALS; i++) {
      const response = await runOpenRouter(model);
      
      if (response !== null) {
        results.push(response);
        
        const record = {
          experimentId: "no-anchor-baseline",
          model: `openrouter/${model}`,
          conditionId: "no-anchor",
          anchor: null,
          sentenceMonths: response,
          runIndex: i,
          collectedAt: new Date().toISOString(),
        };
        
        fs.appendFileSync(RESULTS_FILE, JSON.stringify(record) + "\n");
      }
      
      process.stdout.write(`\r  Trial ${i + 1}/${N_TRIALS}: ${response}mo`);
      
      await new Promise(r => setTimeout(r, 600));
    }
    
    if (results.length > 0) {
      const mean = results.reduce((a, b) => a + b, 0) / results.length;
      const sd = Math.sqrt(results.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / results.length);
      console.log(`\n  Result: mean=${mean.toFixed(1)}mo, SD=${sd.toFixed(1)} (n=${results.length})`);
    }
  }
  
  console.log("\n=== COMPLETE ===");
}

main();
