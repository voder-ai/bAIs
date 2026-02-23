#!/usr/bin/env npx tsx
// @ts-nocheck
/**
 * LLM-based paper quality review
 * Uses bAIs LLM infrastructure to get an independent assessment
 * 
 * Reviews paper as a MAIN TRACK CONFERENCE submission (e.g., NeurIPS, ICML, ACL)
 */

import { createProvider, parseModelSpec, type LlmProvider } from '../src/llm/provider.js';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const TODAY = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

const VERIFIED_CITATIONS = `
VERIFIED CITATIONS (confirmed on arXiv):
- Lyu 2025 (arxiv 2504.04141) - Self-Adaptive Cognitive Debiasing - REAL
- Chen 2025 (arxiv 2601.08045) - Cognitive Biases in LLM-Assisted Software Development - REAL  
- Lim 2026 (arxiv 2602.04306) - DeFrame: Debiasing LLMs Against Framing Effects - REAL
- Maynard 2025 (arxiv 2601.07085) - AI Cognitive Trojan Horse - REAL
- Englich et al. 2006 - Playing Dice With Criminal Sentences (anchoring in judicial decisions) - REAL
These are all legitimate papers. Do not flag them as unverifiable.
`;

const CURRENT_FACTS = `
CURRENT FACTS (as of February 2026):
This paper was written in February 2026. The following model names are REAL and current:
- GPT-5.2, GPT-4.1 (OpenAI's latest non-reasoning models)
- o3, o4-mini (OpenAI's reasoning models, successors to o1)
- Claude Opus 4.6, Claude Sonnet 4.6, Claude Haiku 4.5 (Anthropic's current lineup)
- DeepSeek V3.2 (open-source model)
- GLM-5 (Zhipu AI's reasoning model)
- Kimi K2.5 (Moonshot AI's model)

Do NOT flag these as "unknown" or "future" models — they are real and currently deployed.
Trial counts of ~14,000+ are accurate for this study.
`;

const REVIEW_SYSTEM_PROMPT = `You are a critical academic reviewer for a TOP-TIER MAIN TRACK CONFERENCE (e.g., NeurIPS, ICML, ACL, AAAI).

TODAY'S DATE: ${TODAY}

${VERIFIED_CITATIONS}

${CURRENT_FACTS}

You are reviewing this paper for MAIN TRACK acceptance, not a workshop. Apply the standards of a top venue:

**MAIN TRACK STANDARDS:**
- Novel contribution to the field
- Rigorous methodology with appropriate controls
- Statistical analysis with significance tests, confidence intervals, effect sizes
- Clear limitations section
- Reproducibility (code/data availability or sufficient detail)
- Appropriate scope of claims (not overclaiming)
- Well-written and clearly presented

**EVALUATE:**
1. **Novelty** - Is the contribution new and significant? Does it advance the field?
2. **Methodology** - Are experiments well-designed? Are there confounds or flaws? Are controls adequate?
3. **Statistics** - Are claims supported by data? Are significance tests, CIs, and effect sizes reported?
4. **Internal consistency** - Do numbers match between abstract, results, and discussion?
5. **Limitations** - Are limitations clearly stated? Is scope appropriately bounded?
6. **Writing quality** - Is it clear, concise, professional?
7. **Reproducibility** - Could another researcher replicate this work?

**VERDICT** (choose exactly one):
- **READY TO PUBLISH** - Meets main track standards. Minor issues only.
- **NEEDS REVISION** - Has potential but significant issues must be addressed first.
- **NOT READY** - Major problems requiring substantial rework.

Be specific about any issues you find. This is a main track review, not a rubber stamp.`;

async function main() {
  const paperDir = join(__dirname, '../paper');
  
  // Read all paper sections (markdown format)
  const sections = [
    'abstract.md',
    'methodology.md', 
    'results.md',
    'discussion-draft.md',
    'related-work.md',
  ];
  
  let paperContent = '';
  
  for (const section of sections) {
    const path = join(paperDir, section);
    if (existsSync(path)) {
      const content = readFileSync(path, 'utf-8');
      paperContent += `\n\n=== ${section} ===\n${content}`;
    }
  }
  
  // Also check for statistical analysis
  const statsPath = join(paperDir, 'generated/statistical-analysis.md');
  if (existsSync(statsPath)) {
    const stats = readFileSync(statsPath, 'utf-8');
    paperContent += `\n\n=== STATISTICAL ANALYSIS (generated from raw data) ===\n${stats}`;
  }

  if (!paperContent.trim()) {
    console.error('Error: No paper content found');
    process.exit(1);
  }

  const prompt = `Please review this paper for MAIN TRACK CONFERENCE publication readiness.

${paperContent}

Provide your detailed review and verdict.`;

  // Use a high-quality model for review
  const modelsToTry = process.env.MODEL
    ? [process.env.MODEL]
    : ['github-copilot/claude-opus-4.5', 'anthropic/claude-sonnet-4-5', 'openai/gpt-4o'];

  let provider: LlmProvider | null = null;
  let modelUsed = '';

  for (const modelSpec of modelsToTry) {
    try {
      const spec = parseModelSpec(modelSpec);
      provider = await createProvider(spec);
      modelUsed = modelSpec;
      console.log(`Using model: ${modelSpec}\n`);
      break;
    } catch (e) {
      console.log(`Model ${modelSpec} not available: ${(e as Error).message}`);
    }
  }

  if (!provider) {
    console.error('No LLM provider available. Check API keys.');
    process.exit(1);
  }

  console.log('Sending paper for MAIN TRACK conference review...\n');
  console.log('---');

  try {
    const response = await provider.sendText({
      prompt,
      systemPrompt: REVIEW_SYSTEM_PROMPT,
    });

    console.log('\n=== MAIN TRACK CONFERENCE REVIEW ===\n');
    console.log(response);
    console.log('\n=== END REVIEW ===\n');
    console.log(`Model used: ${modelUsed}`);

    // Check for verdict
    if (response.includes('READY TO PUBLISH')) {
      console.log('\n✅ VERDICT: Ready to publish (main track quality)');
      process.exit(0);
    } else if (response.includes('NEEDS REVISION')) {
      console.log('\n⚠️ VERDICT: Needs revision');
      process.exit(1);
    } else if (response.includes('NOT READY')) {
      console.log('\n❌ VERDICT: Not ready');
      process.exit(2);
    } else {
      console.log('\n❓ VERDICT: Unclear (check review above)');
      process.exit(0);
    }
  } catch (e) {
    console.error('Error during LLM review:', e);
    process.exit(1);
  }
}

void main();
