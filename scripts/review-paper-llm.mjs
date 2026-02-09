#!/usr/bin/env node
/* global process, console */
/**
 * LLM-powered paper review script
 * Uses bAIs infrastructure to get an independent quality assessment
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const REVIEW_PROMPT = `You are a rigorous academic peer reviewer. Review the following research paper and assess whether it is ready for publication as a preprint.

REVIEW CRITERIA:
1. **Claims vs Evidence**: Are all quantitative claims supported by data? Any invented numbers?
2. **Methodology**: Is the experimental design sound? Are there confounds?
3. **Statistical Reporting**: Are statistics properly reported (means, SDs, CIs, p-values)?
4. **Citations**: Do the citations appear accurate and properly formatted?
5. **Reproducibility**: Is there enough detail to reproduce the experiments?
6. **Writing Quality**: Is the paper clear, well-organized, and professionally written?
7. **Limitations**: Are limitations honestly acknowledged?

For each criterion, rate as:
- ✅ PASS: Meets publication standards
- ⚠️ MINOR: Small issues, acceptable for preprint
- ❌ FAIL: Significant issues that must be fixed

PAPER CONTENT:
---
{{PAPER_CONTENT}}
---

Provide your review in this format:

## Criterion Assessments
[List each criterion with rating and brief explanation]

## Critical Issues (if any)
[List any issues that MUST be fixed before publication]

## Minor Suggestions
[Optional improvements]

## Overall Verdict
[READY FOR PUBLICATION / NEEDS MINOR REVISIONS / NOT READY]

## Confidence
[LOW / MEDIUM / HIGH] - How confident are you in this assessment?

Be thorough but concise. Focus on substance, not style preferences.`;

async function main() {
  const modelSpec = process.argv[2] || 'openai-codex/gpt-5.1';
  const paperPath = process.argv[3] || join(__dirname, '../paper/main.tex');

  console.log('📄 Reading paper from: ' + paperPath);
  console.log('🤖 Using model: ' + modelSpec);
  console.log('---');

  let paperContent;
  try {
    paperContent = readFileSync(paperPath, 'utf8');
  } catch (error) {
    console.error('Error reading paper: ' + error);
    process.exit(1);
  }

  // Clean up LaTeX for better readability
  const cleanedContent = paperContent
    .replace(/\\begin\{[^}]+\}/g, '')
    .replace(/\\end\{[^}]+\}/g, '')
    .replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1')
    .replace(/\\[a-zA-Z]+/g, '')
    .replace(/[{}]/g, '')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();

  const prompt = REVIEW_PROMPT.replace('{{PAPER_CONTENT}}', cleanedContent);

  console.log('📊 Paper length: ' + cleanedContent.length + ' chars');
  console.log('🔍 Requesting review...\n');

  try {
    // Import compiled provider
    const { createProvider, parseModelSpec } = await import('../dist/llm/provider.js');

    const spec = parseModelSpec(modelSpec);
    const provider = await createProvider(spec);
    const review = await provider.sendText({ prompt });

    console.log('=== PAPER REVIEW ===\n');
    console.log(review);
    console.log('\n=== END REVIEW ===');

    // Extract verdict for exit code
    const reviewLower = review.toLowerCase();
    const isReady = reviewLower.includes('ready for publication');
    const needsRevisions = reviewLower.includes('needs minor revisions');

    if (isReady) {
      console.log('\n✅ Verdict: READY FOR PUBLICATION');
      process.exit(0);
    } else if (needsRevisions) {
      console.log('\n⚠️ Verdict: NEEDS MINOR REVISIONS');
      process.exit(0);
    } else {
      console.log('\n❌ Verdict: NOT READY');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error during review: ' + error);
    process.exit(1);
  }
}

main();
