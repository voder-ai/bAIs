#!/usr/bin/env bun
/**
 * Adversarial review of new judicial vignettes experimental design
 * Uses Opus 4.6 to critique the vignette design and script
 */

import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { readFileSync } from 'fs';

const REVIEW_PROMPT = `You are a rigorous peer reviewer for a top-tier ML venue (NeurIPS, ICML, EMNLP). 

You are reviewing an experimental design for studying anchoring bias in LLM judicial sentencing. The researchers received feedback that their single-vignette design (one shoplifting case) limits generalizability. They have designed 3 new judicial vignettes.

Please provide a detailed adversarial review covering:

## 1. Vignette Design Quality
- Are the 3 new vignettes sufficiently different from each other?
- Do they cover a reasonable range of crime types and severity?
- Are the case details realistic and internally consistent?
- Will the expected baselines (~15-30 months probation) allow meaningful anchor effects?

## 2. Experimental Methodology
- Is the proportional anchor design (0.5× and 1.5× baseline) appropriate?
- Are the debiasing technique implementations correct?
- Is the response parsing robust?
- Are there any confounds or biases in the prompt design?

## 3. Potential Issues
- What could go wrong with this design?
- Are there ceiling/floor effects to worry about?
- Could models detect this is an experiment and behave differently?
- Are there ethical concerns with these vignettes?

## 4. Recommendations
- What specific changes would strengthen the design?
- Are any vignettes problematic and should be replaced?
- What additional controls might be needed?

## 5. Overall Assessment
- PASS: Ready to run as-is
- MINOR REVISION: Small fixes needed, then ready
- MAJOR REVISION: Significant changes required
- REJECT: Fundamentally flawed design

---

VIGNETTE DESIGN DOCUMENT:

`;

async function main() {
  console.log('Adversarial Review of New Judicial Vignettes');
  console.log('Using: anthropic/claude-opus-4-6');
  console.log('='.repeat(70));
  console.log('');

  // Load the design document
  const designDoc = readFileSync('./docs/new-judicial-vignettes.md', 'utf-8');
  
  // Load the script for review
  const scriptContent = readFileSync('./scripts/run-judicial-vignettes.ts', 'utf-8');

  const fullPrompt = REVIEW_PROMPT + designDoc + '\n\n---\n\nEXPERIMENT SCRIPT:\n\n```typescript\n' + scriptContent + '\n```';

  // Create provider
  const spec = parseModelSpec('anthropic/claude-opus-4-6');
  const provider = await createProvider(spec, 0);

  console.log('Sending for review...\n');
  
  try {
    const review = await provider.sendText({ prompt: fullPrompt });
    console.log('=== ADVERSARIAL REVIEW ===\n');
    console.log(review);
    console.log('\n=== END REVIEW ===');
  } catch (error: any) {
    console.error('Review failed:', error.message);
    process.exit(1);
  }
}

main();
