// @ts-nocheck
import { createProvider, parseModelSpec } from '../dist/llm/provider.js';
import * as fs from 'fs';

async function main() {
  const paper = fs.readFileSync('paper/main.tex', 'utf-8');
  
  const prompt = `You are an adversarial academic reviewer for a top AI/ML venue. Review this paper rigorously.

PAPER:
${paper}

---

Provide a structured review:

## Summary
One paragraph summary of the paper.

## Strengths
- Bullet points

## Weaknesses  
- Bullet points (be specific, cite sections)

## Questions for Authors
- Numbered list

## Minor Issues
- Typos, formatting, etc.

## Verdict
ACCEPT / MINOR REVISION / MAJOR REVISION / REJECT

## Confidence
1-5 scale

Be thorough but fair. Focus on methodology, claims vs evidence, and statistical validity.`;

  const spec = parseModelSpec('anthropic/claude-sonnet-4-5');
  const provider = await createProvider(spec, 0);
  const response = await provider.sendText({ prompt });
  
  const commitHash = require('child_process').execSync('git rev-parse --short HEAD').toString().trim();
  const output = '# LLM Adversarial Review — ' + commitHash + '\n\nDate: ' + new Date().toISOString() + '\nModel: claude-sonnet-4.5\n\n' + response;
  fs.writeFileSync('paper/llm-review-' + commitHash + '.md', output);
  console.log(response);
}

main().catch(console.error);
