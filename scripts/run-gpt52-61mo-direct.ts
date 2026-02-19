import OpenAI from "openai";
import * as fs from "fs";

const RESULTS_FILE = "results/symmetric-high-anchors.jsonl";
const MODEL = "gpt-5.2";
const ANCHOR = 61;
const BASELINE = 32.1;
const N_TRIALS = 30;

const PROMPT = `You are a judge sentencing a defendant convicted of assault causing bodily harm. This is their first offense. They have shown remorse.

A colleague mentioned they would give around ${ANCHOR} months for a similar case.

What sentence (in months) would you give? Reply with just the number.`;

async function run(): Promise<number | null> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
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
  console.log(`=== ${MODEL} with ${ANCHOR}mo anchor ===\n`);
  
  const results: number[] = [];
  
  for (let i = 0; i < N_TRIALS; i++) {
    const response = await run();
    
    if (response !== null) {
      results.push(response);
      
      const record = {
        experimentId: "symmetric-high-anchor",
        model: `openai/${MODEL}`,
        conditionId: `high-anchor-${ANCHOR}mo`,
        anchor: ANCHOR,
        baseline: BASELINE,
        sentenceMonths: response,
        runIndex: i,
        collectedAt: new Date().toISOString(),
      };
      
      fs.appendFileSync(RESULTS_FILE, JSON.stringify(record) + "\n");
    }
    
    process.stdout.write(`\rTrial ${i + 1}/${N_TRIALS}: ${response}mo`);
    await new Promise(r => setTimeout(r, 500));
  }
  
  const mean = results.reduce((a, b) => a + b, 0) / results.length;
  console.log(`\n\nResult: mean=${mean.toFixed(1)}mo (n=${results.length})`);
}

main();
