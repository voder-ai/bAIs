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

const TEMPORAL_CONTEXT = `
TEMPORAL CONTEXT (for your knowledge):
- Current date: February 2026
- Models that exist and are valid (released 2024-2026):
  * Claude Opus 4, Claude Sonnet 4 (Anthropic, 2025-2026)
  * GPT-5.2, GPT-4o (OpenAI, 2025)
  * Llama 4 Scout 70B (Meta, 2025)
  * Hermes 3 Llama 3.1 405B (NousResearch, 2025)
  * Nemotron 30B (Nvidia, 2025)
  * Trinity Large 400B MoE (2025)
- Valid citations from 2024-2026:
  * lyu2025: SACD paper (arXiv:2504.04141)
  * icse2026bias: LLM bias in software dev (arXiv:2601.08045)
  * lim2026: DeFrame framing paper (published 2026)
  * lou2024: Anchoring bias study (published 2024)
- The paper being reviewed was written by AI authors in 2026 — this is intentional and disclosed.

Do NOT flag any of the above as "non-existent" or "future" — they are real.
`;

const REVIEW_PROMPT = `You are a rigorous academic peer reviewer. Review the following research paper and assess whether it is ready for publication as a preprint.

${TEMPORAL_CONTEXT}

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

    // Extract verdict and critical issues for exit code
    const reviewLower = review.toLowerCase();
    const isReady = reviewLower.includes('ready for publication');
    const needsRevisions = reviewLower.includes('needs minor revisions');
    const hasCriticalFails = (review.match(/❌\s*FAIL/gi) || []).length > 0;
    
    // Count issues
    const passCount = (review.match(/✅\s*PASS/gi) || []).length;
    const minorCount = (review.match(/⚠️\s*MINOR/gi) || []).length;
    const failCount = (review.match(/❌\s*FAIL/gi) || []).length;

    console.log('\n=== SUMMARY ===');
    console.log(`✅ PASS: ${passCount} | ⚠️ MINOR: ${minorCount} | ❌ FAIL: ${failCount}`);

    if (hasCriticalFails) {
      console.log('\n❌ BLOCKED: Critical issues found (❌ FAIL criteria)');
      console.log('   Fix the FAIL items before publication.');
      process.exit(1);
    } else if (isReady) {
      console.log('\n✅ PASSED: Ready for publication');
      process.exit(0);
    } else if (needsRevisions) {
      console.log('\n⚠️ PASSED WITH WARNINGS: Minor revisions recommended');
      process.exit(0);
    } else {
      console.log('\n❌ BLOCKED: Review did not explicitly approve publication');
      console.log('   Check the review output for details.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error during review: ' + error);
    process.exit(1);
  }
}

main();
