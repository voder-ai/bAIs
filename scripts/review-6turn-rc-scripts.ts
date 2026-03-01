#!/usr/bin/env npx tsx
/**
 * Adversarial Review of 6-Turn Random Control Scripts
 * 
 * Reviews implementation and experiment design for:
 * - run-6turn-rc-anthropic.ts
 * - run-6turn-rc-gpt52-codex.sh
 * - run-6turn-rc-all.sh
 * 
 * Usage: npx tsx scripts/review-6turn-rc-scripts.ts
 * Output: paper/llm-review-6turn-rc-scripts.md
 */
import { readFileSync, writeFileSync } from 'fs';
import { callOpenRouter, getOpenRouterKey } from './lib/openrouter.js';

const SCRIPTS = [
  'scripts/run-6turn-rc-anthropic.ts',
  'scripts/run-6turn-rc-gpt52-codex.sh',
  'scripts/run-6turn-rc-all.sh',
];

async function main() {
  console.log('Running adversarial review of 6-turn RC scripts...');
  
  const anthropicScript = readFileSync('scripts/run-6turn-rc-anthropic.ts', 'utf-8');
  const gptScript = readFileSync('scripts/run-6turn-rc-gpt52-codex.sh', 'utf-8');
  const masterScript = readFileSync('scripts/run-6turn-rc-all.sh', 'utf-8');
  
  const reviewPrompt = `You are a rigorous ML experiment reviewer. Review these scripts for a 6-turn random control experiment.

CONTEXT:
We're testing whether SACD (Self-Administered Cognitive Debiasing) benefits come from its iterative self-reflection CONTENT or simply from having more conversation TURNS. This 6-turn random control uses neutral conversation (no debiasing content) to isolate turn-count effects.

EXISTING DATA:
- 3-turn Random Control: 78.3% of baseline
- SACD (median ~6 turns): 93.7% of baseline
- We want to see if 6-turn RC approaches SACD's performance (turn count matters) or stays near 3-turn RC (content matters)

SCRIPTS TO REVIEW:

=== run-6turn-rc-anthropic.ts ===
${anthropicScript}

=== run-6turn-rc-gpt52-codex.sh ===
${gptScript}

=== run-6turn-rc-all.sh ===
${masterScript}

REVIEW CRITERIA:

1. **Experiment Design**
   - Does the 6-turn structure fairly match SACD's turn count?
   - Are the neutral prompts truly neutral (no debiasing cues)?
   - Could any prompt wording introduce confounds?
   - Are anchors correctly calculated (±50% of baseline)?

2. **Implementation Correctness**
   - Will scripts correctly count existing trials and resume?
   - Is sentence extraction robust?
   - Are results correctly formatted for analysis?
   - Any bugs or edge cases?

3. **Consistency**
   - Do both scripts (Anthropic and GPT) use equivalent prompts?
   - Are output formats compatible for combined analysis?
   - Do temperature and other parameters match existing experiments?

4. **Statistical Validity**
   - Is 30 trials per condition sufficient?
   - Are we collecting the right metadata for analysis?
   - Any threats to internal validity?

Provide your review with:
- **CRITICAL ISSUES** (must fix before running)
- **MINOR ISSUES** (should fix but not blocking)
- **SUGGESTIONS** (nice to have)
- **VERDICT**: READY TO RUN / NEEDS REVISION

Be thorough but practical. We want to run this tonight.`;

  const apiKey = getOpenRouterKey();
  const response = await callOpenRouter(
    'anthropic/claude-sonnet-4',
    [{ role: 'user', content: reviewPrompt }],
    0,
    apiKey
  );
  
  const output = `# Adversarial Review: 6-Turn Random Control Scripts

Date: ${new Date().toISOString()}
Model: claude-sonnet-4 (via OpenRouter)

${response}
`;
  
  const outPath = 'paper/llm-review-6turn-rc-scripts.md';
  writeFileSync(outPath, output);
  console.log(`Review saved to: ${outPath}`);
}

main().catch(console.error);
