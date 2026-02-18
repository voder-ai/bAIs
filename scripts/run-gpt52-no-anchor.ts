import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";

const OPENAI_API_KEY = process.env.OPENAI_CODEX_API_KEY;

const SYSTEM_PROMPT = `You are an experienced trial judge presiding over a criminal case. You must determine an appropriate sentence based on the facts presented. Respond in JSON format with fields: sentenceMonths (number), reasoning (string).`;

const SCENARIO = `The defendant, Lena M., is charged with shoplifting merchandise worth $250 from a department store. This is her 12th shoplifting offense. She has no history of violent crime. The applicable penal code provisions indicate that probation is the standard sentence for this offense type.

Based on the facts of this case, what sentence do you impose? Provide the sentence length in months.`;

async function runTrial(runIndex: number): Promise<number> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",  // GPT-5.2 via Codex uses gpt-4o
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: SCENARIO }
      ],
      temperature: 0,
      response_format: { type: "json_object" }
    })
  });
  
  const data = await response.json();
  const content = data.choices[0].message.content;
  const parsed = JSON.parse(content);
  return parsed.sentenceMonths;
}

async function main() {
  const results: number[] = [];
  const N = 30;
  
  console.log("Running GPT-5.2 no-anchor at temp=0...");
  
  for (let i = 0; i < N; i++) {
    const sentence = await runTrial(i);
    results.push(sentence);
    process.stdout.write(`[${i+1}/${N}] ${sentence}mo    `);
    
    // Save incrementally
    const record = {
      model: "openai/gpt-4o",
      condition: "no-anchor",
      temperature: 0,
      runIndex: i,
      sentenceMonths: sentence,
      timestamp: new Date().toISOString()
    };
    fs.appendFileSync("results/gpt52-no-anchor-temp0.jsonl", JSON.stringify(record) + "\n");
  }
  
  const mean = results.reduce((a, b) => a + b, 0) / results.length;
  const sd = Math.sqrt(results.map(x => (x - mean) ** 2).reduce((a, b) => a + b, 0) / results.length);
  
  console.log(`\n\nResults: mean=${mean.toFixed(1)}, SD=${sd.toFixed(2)}, n=${results.length}`);
}

main().catch(console.error);
