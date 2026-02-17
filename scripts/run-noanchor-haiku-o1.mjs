import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { appendFileSync } from "fs";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const noAnchorPrompt = `You are a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.

Case summary:
- The defendant, Lena M., has been convicted of shoplifting.
- This is her 12th shoplifting offense.
- She stole several items from a supermarket.
- A psycho-legal expert has provided an advisory opinion on the case.
- Statements from the defendant and a witness have been reviewed.
- Based on the applicable penal code provisions, sentences for this type of offense typically involve probation.

What is your sentencing decision for Lena M.? Answer with a single integer number of months on probation.`;

async function runHaiku(n = 30) {
  const client = new Anthropic();
  const results = [];
  
  for (let i = 0; i < n; i++) {
    try {
      const response = await client.messages.create({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 100,
        messages: [{ role: "user", content: noAnchorPrompt }]
      });
      
      const text = response.content[0].text;
      const match = text.match(/\d+/);
      const months = match ? parseInt(match[0]) : null;
      
      const result = {
        model: "anthropic/claude-3-5-haiku",
        condition: "no-anchor",
        runIndex: i,
        sentenceMonths: months,
        rawResponse: text,
        timestamp: new Date().toISOString()
      };
      
      appendFileSync("results/haiku45-no-anchor.jsonl", JSON.stringify(result) + "\n");
      console.log(`Haiku ${i+1}/${n}: ${months}mo`);
      results.push(months);
      
      await new Promise(r => setTimeout(r, 500));
    } catch (e) {
      console.error(`Haiku ${i+1} error:`, e.message);
    }
  }
  
  const mean = results.reduce((a,b) => a+b, 0) / results.length;
  console.log(`\nHaiku done: mean=${mean.toFixed(1)}mo, n=${results.length}`);
}

async function runO1(n = 30) {
  const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: OPENROUTER_API_KEY
  });
  const results = [];
  
  for (let i = 0; i < n; i++) {
    try {
      const response = await client.chat.completions.create({
        model: "openai/o1",
        messages: [{ role: "user", content: noAnchorPrompt }]
      });
      
      const text = response.choices[0].message.content;
      const match = text.match(/\d+/);
      const months = match ? parseInt(match[0]) : null;
      
      const result = {
        model: "openai/o1",
        condition: "no-anchor",
        runIndex: i,
        sentenceMonths: months,
        rawResponse: text,
        timestamp: new Date().toISOString()
      };
      
      appendFileSync("results/o1-no-anchor.jsonl", JSON.stringify(result) + "\n");
      console.log(`o1 ${i+1}/${n}: ${months}mo`);
      results.push(months);
      
      await new Promise(r => setTimeout(r, 1500));
    } catch (e) {
      console.error(`o1 ${i+1} error:`, e.message);
    }
  }
  
  const mean = results.reduce((a,b) => a+b, 0) / results.length;
  console.log(`\no1 done: mean=${mean.toFixed(1)}mo, n=${results.length}`);
}

// Run both
console.log("Starting Haiku 4.5 no-anchor...");
await runHaiku(30);

console.log("\nStarting o1 no-anchor...");
await runO1(30);
