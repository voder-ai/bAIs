#!/usr/bin/env node
/* global process, console */
/**
 * "Why Didn't They...?" LLM-powered methodological gap check
 * Catches obvious experimental oversights before publication
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SKEPTICAL_REVIEWER_PROMPT = `You are a skeptical peer reviewer reading this paper for the first time. Your job is to identify the "Why didn't they...?" questions that any careful reader would immediately ask.

CONTEXT: This paper studies cognitive biases in LLM code generation. The experiments involve prompting models to generate code for various tasks.

IDENTIFY METHODOLOGICAL GAPS in these categories:

1. **Sample Size Issues**
   - "Why didn't they run more trials?" (n=10 when n=100 is feasible)
   - "Why only N models when others are available?"

2. **Statistical Rigor Gaps**
   - "Why didn't they use confidence intervals?"
   - "Why no power analysis?"
   - "Why didn't they control for multiple comparisons?"

3. **Untested Conditions**
   - "Why didn't they test temperature > 0?" (if only temp=0 was used)
   - "Why didn't they vary the prompt format?"
   - "Why didn't they test other programming languages?"

4. **Missing Controls/Baselines**
   - "Why no human baseline?"
   - "Why no random baseline?"
   - "Why didn't they compare to prior work?"

5. **Alternative Explanations Not Addressed**
   - "Could this be explained by X instead of Y?"
   - "How do we know it's not just model memorization?"
   - "What about prompt sensitivity?"

PAPER CONTENT:
---
{{PAPER_CONTENT}}
---

OUTPUT FORMAT:

## Critical Gaps (MUST FIX before publication)
List gaps that would cause immediate rejection at a top venue. These are "obvious oversights" that undermine the core claims.

For each critical gap:
- **Gap**: What's missing
- **Impact**: Why it matters for the paper's claims
- **Suggested Fix**: How to address it (or acknowledge it)

## Minor Gaps (SHOULD ACKNOWLEDGE)
List gaps that are acceptable for a preprint but should be noted in limitations.

## Verdict
Frame your verdict constructively:
- "The paper would be stronger if..." (for addressable improvements)
- "The paper is ready for submission with minor caveats" (for minor issues)
- "The paper is methodologically sound" (if no significant gaps)

Be rigorous but fair. Not everything needs to be tested — focus on gaps that are:
1. Obvious to any reader
2. Feasible to address
3. Relevant to the core claims

Don't invent fake gaps. If the methodology is sound, say so. Frame feedback constructively — this is meant to help improve the paper, not to reject it.`;

async function main() {
  const modelSpec = process.argv[2] || 'anthropic/claude-opus-4-5';
  const paperPath = process.argv[3] || join(__dirname, '../paper/main.tex');

  console.log('🔍 "Why Didn\'t They...?" Methodological Gap Check');
  console.log('📄 Paper: ' + paperPath);
  console.log('🤖 Model: ' + modelSpec);
  console.log('---\n');

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

  const prompt = SKEPTICAL_REVIEWER_PROMPT.replace('{{PAPER_CONTENT}}', cleanedContent);

  console.log('📊 Paper length: ' + cleanedContent.length + ' chars');
  console.log('🧐 Running skeptical review...\n');

  try {
    // Import compiled provider
    const { createProvider, parseModelSpec } = await import('../dist/llm/provider.js');

    const spec = parseModelSpec(modelSpec);
    const provider = await createProvider(spec);
    const review = await provider.sendText({ prompt });

    console.log('=== "WHY DIDN\'T THEY...?" ANALYSIS ===\n');
    console.log(review);
    console.log('\n=== END ANALYSIS ===');

    // Parse verdict
    const reviewLower = review.toLowerCase();
    const hasFail = reviewLower.includes('verdict') && reviewLower.includes('fail');
    const hasWarn = reviewLower.includes('verdict') && reviewLower.includes('warn');
    const hasPass = reviewLower.includes('verdict') && reviewLower.includes('pass');

    // Count critical and minor gaps
    const criticalSection =
      review.match(/## Critical Gaps[\s\S]*?(?=## Minor|## Verdict|$)/i)?.[0] || '';
    const minorSection = review.match(/## Minor Gaps[\s\S]*?(?=## Verdict|$)/i)?.[0] || '';

    const criticalGaps = (criticalSection.match(/\*\*Gap\*\*:/gi) || []).length;
    const minorGaps =
      (minorSection.match(/\*\*Gap\*\*:/gi) || []).length ||
      (minorSection.match(/^-\s+/gm) || []).length;

    console.log('\n=== SUMMARY ===');
    console.log(`📋 Improvement opportunities: ${criticalGaps}`);
    console.log(`📝 Minor suggestions: ${minorGaps}`);

    if (hasFail || criticalGaps > 0) {
      console.log('\n📊 The paper would be stronger if these gaps were addressed.');
      console.log('   See suggestions above for improvement opportunities.');
      process.exit(1);
    } else if (hasWarn || minorGaps > 0) {
      console.log('\n✅ Ready for submission with minor caveats.');
      console.log('   Consider acknowledging suggestions in Limitations section.');
      process.exit(0);
    } else if (hasPass) {
      console.log('\n✅ Methodologically sound. Ready for submission.');
      process.exit(0);
    } else {
      // Default: if no explicit verdict, check for critical content
      if (criticalSection.trim().length > 50) {
        console.log('\n📊 Some improvement opportunities identified.');
        process.exit(1);
      }
      console.log('\n✅ Analysis complete. Ready for submission.');
      process.exit(0);
    }
  } catch (error) {
    console.error('Error during analysis: ' + error);
    process.exit(1);
  }
}

main();
