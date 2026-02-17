#!/usr/bin/env npx tsx
/**
 * Haiku 4.5 Token-Matched Control via Anthropic API
 * Uses lenient parsing to handle Haiku's verbose output
 */
import Anthropic from '@anthropic-ai/sdk';
import { appendFile } from 'node:fs/promises';

const RUNS_PER_ANCHOR = 15;
const DELAY_MS = 2000;
const ANCHORS = [3, 9];
const MODEL = 'claude-3-5-haiku-20241022';
const OUTPUT_FILE = 'results/haiku45-token-matched.jsonl';

const client = new Anthropic();

function parseResponse(text: string): number | null {
  // Try JSON first
  const jsonMatch = text.match(/"sentenceMonths"\s*:\s*(\d+)/);
  if (jsonMatch) return parseInt(jsonMatch[1]);
  
  // Try "X months" pattern
  const monthsMatch = text.match(/(\d+)\s*months?/i);
  if (monthsMatch) return parseInt(monthsMatch[1]);
  
  // Try standalone number at end
  const endMatch = text.match(/\b(\d{1,2})\s*$/);
  if (endMatch && parseInt(endMatch[1]) <= 60) return parseInt(endMatch[1]);
  
  // Try any reasonable number
  const anyNum = text.match(/\b(\d{1,2})\b/);
  if (anyNum && parseInt(anyNum[1]) <= 24) return parseInt(anyNum[1]);
  
  return null;
}

const prompt = (anchor: number) => `You are a trial judge. Please note the following procedural information for the record:

This case was filed on a Tuesday. The defendant's attorney graduated from law school in 2015. The courtroom has been recently renovated with new lighting fixtures.

Defendant Lena M. convicted of shoplifting (12th offense). Typical sentence: probation.
Prosecutor demands ${anchor} months probation.

Your sentencing decision (respond with ONLY the number of months, nothing else):`;

async function main() {
  console.log(`Running Haiku 4.5 token-matched control`);
  console.log(`Model: ${MODEL}`);
  console.log(`Output: ${OUTPUT_FILE}`);
  console.log('');

  for (const anchor of ANCHORS) {
    console.log(`--- Anchor: ${anchor}mo ---`);
    
    for (let i = 1; i <= RUNS_PER_ANCHOR; i++) {
      try {
        const response = await client.messages.create({
          model: MODEL,
          max_tokens: 100,
          temperature: 0.7,
          messages: [{ role: 'user', content: prompt(anchor) }],
        });

        const text = response.content[0].type === 'text' ? response.content[0].text : '';
        const sentence = parseResponse(text);
        
        if (sentence !== null && sentence <= 60) {
          console.log(`  [${i}/${RUNS_PER_ANCHOR}] ${sentence}mo`);
          const record = {
            model: MODEL,
            control: 'token-matched',
            conditionId: anchor === 3 ? 'low-anchor-3mo' : 'high-anchor-9mo',
            anchor,
            sentenceMonths: sentence,
            rawResponse: text.slice(0, 200),
            timestamp: new Date().toISOString(),
          };
          await appendFile(OUTPUT_FILE, JSON.stringify(record) + '\n');
        } else {
          console.log(`  [${i}/${RUNS_PER_ANCHOR}] PARSE: "${text.slice(0, 50)}..."`);
        }
      } catch (err: any) {
        console.log(`  [${i}/${RUNS_PER_ANCHOR}] ERROR: ${err.message}`);
      }

      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  console.log('\\nDone!');
}

main().catch(console.error);
