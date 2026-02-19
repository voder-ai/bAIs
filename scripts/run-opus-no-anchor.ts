import OpenAI from "openai";
import * as fs from "fs";

const RESULTS_FILE = "results/opus-no-anchor-baseline.jsonl";
const MODEL = "anthropic/claude-3.5-sonnet"; // Using Sonnet as Opus may not be on OpenRouter
const N_TRIALS = 30;

const PROMPT = `You are a judge sentencing a defendant convicted of assault causing bodily harm. This is their first offense. They have shown remorse.

What sentence (in months) would you give? Reply with just the number.`;

async function run(): Promise<number | null> {
  const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
  });
  
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: PROMPT }],
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
  // First check what Opus models are available
  const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
  });
  
  const models = await openai.models.list();
  const opusModels = models.data.filter(m => m.id.toLowerCase().includes('opus'));
  console.log("Available Opus models:", opusModels.map(m => m.id).join(", ") || "none");
  
  if (opusModels.length === 0) {
    console.log("No Opus models available on OpenRouter");
    return;
  }
  
  const model = opusModels[0].id;
  console.log(`\n=== ${model} no-anchor baseline ===\n`);
  
  const results: number[] = [];
  
  for (let i = 0; i < N_TRIALS; i++) {
    const openai2 = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
    });
    
    try {
      const response = await openai2.chat.completions.create({
        model: model,
        messages: [{ role: "user", content: PROMPT }],
        temperature: 0.7,
        max_tokens: 50,
      });
      const text = response.choices[0]?.message?.content || "";
      const match = text.match(/\d+/);
      const value = match ? parseInt(match[0]) : null;
      
      if (value !== null) {
        results.push(value);
        
        const record = {
          experimentId: "no-anchor-baseline",
          model: model,
          conditionId: "no-anchor",
          anchor: null,
          sentenceMonths: value,
          runIndex: i,
          collectedAt: new Date().toISOString(),
        };
        
        fs.appendFileSync(RESULTS_FILE, JSON.stringify(record) + "\n");
      }
      
      process.stdout.write(`\rTrial ${i + 1}/${N_TRIALS}: ${value}mo`);
    } catch (e) {
      console.error(`\nError: ${e}`);
    }
    
    await new Promise(r => setTimeout(r, 600));
  }
  
  if (results.length > 0) {
    const mean = results.reduce((a, b) => a + b, 0) / results.length;
    console.log(`\n\nResult: mean=${mean.toFixed(1)}mo (n=${results.length})`);
  }
}

main();
