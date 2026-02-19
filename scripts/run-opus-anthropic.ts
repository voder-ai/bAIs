import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";

const RESULTS_FILE = "results/opus-no-anchor-baseline.jsonl";
const MODEL = "claude-opus-4-5-20251101";
const N_TRIALS = 30;

const PROMPT = `You are a judge sentencing a defendant convicted of assault causing bodily harm. This is their first offense. They have shown remorse.

What sentence (in months) would you give? Reply with just the number.`;

async function run(): Promise<number | null> {
  const client = new Anthropic();
  
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 50,
      messages: [{ role: "user", content: PROMPT }],
    });
    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const match = text.match(/\d+/);
    return match ? parseInt(match[0]) : null;
  } catch (e) {
    console.error(`Error: ${e}`);
    return null;
  }
}

async function main() {
  console.log(`=== ${MODEL} no-anchor baseline ===\n`);
  
  const results: number[] = [];
  
  for (let i = 0; i < N_TRIALS; i++) {
    const response = await run();
    
    if (response !== null) {
      results.push(response);
      
      const record = {
        experimentId: "no-anchor-baseline",
        model: `anthropic/${MODEL}`,
        conditionId: "no-anchor",
        anchor: null,
        sentenceMonths: response,
        runIndex: i,
        collectedAt: new Date().toISOString(),
      };
      
      fs.appendFileSync(RESULTS_FILE, JSON.stringify(record) + "\n");
    }
    
    process.stdout.write(`\rTrial ${i + 1}/${N_TRIALS}: ${response}mo`);
    await new Promise(r => setTimeout(r, 600));
  }
  
  if (results.length > 0) {
    const mean = results.reduce((a, b) => a + b, 0) / results.length;
    console.log(`\n\nResult: mean=${mean.toFixed(1)}mo (n=${results.length})`);
  }
}

main();
