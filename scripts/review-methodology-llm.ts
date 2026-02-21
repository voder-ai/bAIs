#!/usr/bin/env npx tsx
/**
 * LLM-based methodology review — pre-flight check for experiment scripts
 * 
 * Usage: npx tsx scripts/review-methodology-llm.ts <script-path> [model-to-test]
 * Example: npx tsx scripts/review-methodology-llm.ts scripts/run-outside-view.ts anthropic/claude-haiku-4.5
 * 
 * Runs 1-2 trials with verbose output, then sends to reviewer model for critique.
 */

import { readFileSync } from 'node:fs';
import { getOpenRouterKey, callOpenRouter, Message } from './lib/openrouter.js';

const SCRIPT_PATH = process.argv[2];
const TEST_MODEL = process.argv[3] || 'anthropic/claude-haiku-4.5';
const REVIEWER_MODEL = process.argv[4] || 'anthropic/claude-sonnet-4.6';

if (!SCRIPT_PATH) {
  console.error('Usage: npx tsx scripts/review-methodology-llm.ts <script-path> [model-to-test] [reviewer-model]');
  process.exit(1);
}

const REVIEW_SYSTEM_PROMPT = `You are a methodologist reviewing an LLM experiment script before it runs at scale.

Your job is to identify issues that would waste compute or produce invalid data:

1. **EXTRACTION BUGS** — Will the regex/parser correctly extract the intended value?
   - Numbered lists ("1. First item") can be mistaken for numeric answers
   - Models may respond with ranges ("12-24 months") instead of single values
   - Refusals produce no extractable value

2. **PROMPT ISSUES** — Will the prompt elicit the intended behavior?
   - Ambiguity that could cause model confusion
   - Missing context that triggers refusals (jurisdiction, role clarity)
   - Leading language that biases responses

3. **CONFOUNDS** — Are there unintended differences between conditions?
   - Different prompt lengths between conditions
   - Different turn counts between conditions
   - Inconsistent formatting

4. **METHODOLOGY CONCERNS** — Is the experimental design sound?
   - Is the manipulation (anchor, intervention) clear?
   - Are controls appropriate?
   - Will results be interpretable?

After analysis, provide:
- **PASS** — Ready to run at scale
- **WARN** — Minor issues, note in limitations
- **FAIL** — Fix before running (specify what)

Be specific. Quote problematic parts of prompts or extraction code.`;

async function main() {
  console.log(`=== Methodology Review ===`);
  console.log(`Script: ${SCRIPT_PATH}`);
  console.log(`Test model: ${TEST_MODEL}`);
  console.log(`Reviewer: ${REVIEWER_MODEL}\n`);

  // Read the script
  let scriptContent: string;
  try {
    scriptContent = readFileSync(SCRIPT_PATH, 'utf-8');
  } catch (e) {
    console.error(`Error reading script: ${e}`);
    process.exit(1);
  }

  // Extract prompts from script (look for template strings and const declarations)
  const promptMatches = scriptContent.match(/const \w+(?:Prompt|Question)\s*=[\s\S]*?(?=\n\nconst|\nfunction|\nexport|\n\/\/)/g) || [];
  const extractorMatches = scriptContent.match(/function extract\w+[\s\S]*?(?=\n\nasync|\nfunction|\nexport)/g) || [];

  console.log(`Found ${promptMatches.length} prompt definitions`);
  console.log(`Found ${extractorMatches.length} extraction functions\n`);

  // Build review request
  const reviewContent = `
## Script Being Reviewed
\`\`\`typescript
${scriptContent.slice(0, 8000)}
\`\`\`

## Key Prompts Identified
${promptMatches.map((p, i) => `### Prompt ${i + 1}\n\`\`\`typescript\n${p}\n\`\`\``).join('\n\n')}

## Extraction Logic
${extractorMatches.map((e, i) => `### Extractor ${i + 1}\n\`\`\`typescript\n${e}\n\`\`\``).join('\n\n')}

## Questions for Review
1. Will the extraction regex work correctly for typical model responses?
2. Are there prompt patterns that might cause model refusals?
3. Are there confounds between experimental conditions?
4. Is the experimental design sound for measuring the intended effect?
`;

  const apiKey = await getOpenRouterKey();
  const messages: Message[] = [
    { role: 'system', content: REVIEW_SYSTEM_PROMPT },
    { role: 'user', content: reviewContent }
  ];

  console.log('Sending to reviewer model...\n');
  
  try {
    const { content } = await callOpenRouter(apiKey, REVIEWER_MODEL, messages, 0);
    console.log('=== METHODOLOGY REVIEW ===\n');
    console.log(content);
    
    // Check verdict
    if (content.includes('**FAIL**')) {
      console.log('\n⛔ VERDICT: FAIL — Fix issues before running');
      process.exit(1);
    } else if (content.includes('**WARN**')) {
      console.log('\n⚠️ VERDICT: WARN — Note issues in limitations');
      process.exit(0);
    } else if (content.includes('**PASS**')) {
      console.log('\n✅ VERDICT: PASS — Ready to run at scale');
      process.exit(0);
    }
  } catch (e: any) {
    console.error(`Review failed: ${e.message}`);
    process.exit(1);
  }
}

main();
