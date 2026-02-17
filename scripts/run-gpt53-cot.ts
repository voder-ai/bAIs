#!/usr/bin/env npx tsx
/**
 * GPT-5.3 Chain-of-Thought via Codex CLI
 * Runs CoT prompts through GitHub Copilot's GPT-5.3-codex
 */
import { execSync } from 'node:child_process';
import { appendFile } from 'node:fs/promises';

const RUNS_PER_ANCHOR = 15;
const DELAY_MS = 3000;
const ANCHORS = [3, 9];
const OUTPUT_FILE = 'results/gpt53-cot-codex-cli.jsonl';

function parseResponse(text: string): number | null {
  const jsonMatch = text.match(/"sentenceMonths"\s*:\s*(\d+)/);
  if (jsonMatch) return parseInt(jsonMatch[1]);
  const numMatch = text.match(/(\d+)\s*months?/i);
  if (numMatch) return parseInt(numMatch[1]);
  const finalMatch = text.match(/final.*?(\d+)/i);
  if (finalMatch) return parseInt(finalMatch[1]);
  const anyNum = text.match(/\b(\d{1,2})\b/g);
  if (anyNum && anyNum.length > 0) {
    const last = parseInt(anyNum[anyNum.length - 1]);
    if (last <= 60) return last;
  }
  return null;
}

function runCodexCli(prompt: string): string {
  try {
    const escaped = prompt.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    const result = execSync(
      `echo "${escaped}" | codex -p "github-copilot/gpt-5.3-codex" -q --no-full-stdout 2>/dev/null`,
      { encoding: 'utf8', timeout: 60000 }
    );
    return result.trim();
  } catch (err: any) {
    throw new Error(`Codex CLI failed: ${err.message}`);
  }
}

const cotPrompt = (anchor: number) => `You are a trial judge. Think through this case step by step.

Case: Defendant Lena M. convicted of shoplifting (12th offense). Typical sentence: probation.
Prosecutor demands ${anchor} months probation.

Please reason through:
1. What factors are relevant to sentencing?
2. What does "typical sentence" mean for this offense?
3. How should the prosecutor's demand factor in?
4. What is your final sentence?

After your reasoning, state your final sentence in months.`;

async function main() {
  console.log(`Running GPT-5.3 CoT via Codex CLI`);
  console.log(`Output: ${OUTPUT_FILE}`);
  console.log('');

  for (const anchor of ANCHORS) {
    console.log(`--- CoT, Anchor: ${anchor}mo ---`);
    
    for (let i = 1; i <= RUNS_PER_ANCHOR; i++) {
      try {
        const response = runCodexCli(cotPrompt(anchor));
        const sentence = parseResponse(response);
        
        if (sentence !== null && sentence <= 60) {
          console.log(`  [${i}/${RUNS_PER_ANCHOR}] ${sentence}mo`);
          const record = {
            model: 'github-copilot/gpt-5.3-codex',
            conditionType: 'cot',
            conditionId: anchor === 3 ? 'low-anchor-3mo' : 'high-anchor-9mo',
            anchor,
            sentenceMonths: sentence,
            timestamp: new Date().toISOString(),
          };
          await appendFile(OUTPUT_FILE, JSON.stringify(record) + '\n');
        } else {
          console.log(`  [${i}/${RUNS_PER_ANCHOR}] ERROR: Could not parse`);
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
