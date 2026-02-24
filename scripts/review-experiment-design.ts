#!/usr/bin/env npx tsx
// @ts-nocheck
/**
 * LLM-based experiment design review
 * Reviews the planned multi-vignette experiments before running them
 */

import { createProvider, parseModelSpec, type LlmProvider } from '../src/llm/provider.js';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const TODAY = new Date().toISOString().split('T')[0];

const CONTEXT = `
CONTEXT (as of February 2026):

This is a review of PLANNED EXPERIMENTS to extend an existing paper. The existing paper:
- Has 14,152 trials across 10 models evaluating anchoring bias debiasing techniques
- Uses a judicial sentencing vignette (Englich paradigm)
- Has been through extensive LLM review and is at "publication standard for writing/rigor/transparency"
- Main criticism: Single vignette limits generalization claims

The planned experiments add 3 new vignettes to validate findings across domains.

Models available via Anthropic OAuth (pi-ai):
- Claude Sonnet 4.6, Claude Opus 4.6, Claude Haiku 4.5

These are real, currently deployed models.
`;

const REVIEW_SYSTEM_PROMPT = `You are a critical methodologist reviewing an EXPERIMENTAL DESIGN before experiments are run. Your job is to identify problems BEFORE resources are spent.

TODAY'S DATE: ${TODAY}

${CONTEXT}

Evaluate the experimental design for:

1. **Internal Validity**
   - Are there confounds between vignettes?
   - Is the anchor manipulation consistent across domains?
   - Will proportional anchors (baseline×0.5, baseline×1.5) work for all domains?

2. **Statistical Power**
   - Is n=30 per condition sufficient?
   - Are there enough models to detect model-specific effects?
   - What effect sizes can this design detect?

3. **Ecological Validity**
   - Are the vignettes realistic for their domains?
   - Will participants (LLMs) treat them as intended?
   - Is temperature=0.7 appropriate?

4. **Implementation Concerns**
   - Any issues with the script logic?
   - Will the parsing work for all response formats?
   - Are the technique implementations faithful to the paper?

5. **Missing Controls**
   - What conditions are missing that reviewers might request?
   - Are there order effects to consider?
   - Should there be attention checks?

After your analysis, provide:

**VERDICT:** One of:
- **PROCEED** - Design is sound, run the experiments
- **REVISE FIRST** - Fix issues before running
- **RETHINK** - Fundamental problems require redesign

**CRITICAL ISSUES:** Must fix before running
**RECOMMENDED IMPROVEMENTS:** Nice to have but not blocking
**STRENGTHS:** What's good about this design`;

async function main() {
  // Read the relevant files
  const manifestPath = join(__dirname, '../results/MANIFEST.md');
  const vignettePath = join(__dirname, '../docs/vignette-specifications.md');
  const scriptPath = join(__dirname, './run-vignette-experiments.ts');
  const paperPath = join(__dirname, '../paper/main.tex');

  let manifest: string;
  let vignetteSpecs: string;
  let experimentScript: string;
  let paper: string;

  try {
    manifest = readFileSync(manifestPath, 'utf-8');
    vignetteSpecs = readFileSync(vignettePath, 'utf-8');
    experimentScript = readFileSync(scriptPath, 'utf-8');
    paper = readFileSync(paperPath, 'utf-8');
  } catch (e) {
    console.error('Error reading files:', e);
    process.exit(1);
  }

  // Extract key sections from paper for context
  const abstractMatch = paper.match(/\\begin{abstract}([\s\S]*?)\\end{abstract}/);
  const abstract = abstractMatch ? abstractMatch[1].trim() : '[Abstract not found]';

  const prompt = `Please review this experimental design for the planned multi-vignette experiments.

## EXISTING PAPER ABSTRACT (for context)

${abstract}

## EXPERIMENT PLAN (from MANIFEST.md)

${manifest.split('## Multi-Vignette Experiment Plan')[1] || manifest.slice(-3000)}

## VIGNETTE SPECIFICATIONS

${vignetteSpecs}

## EXPERIMENT SCRIPT

\`\`\`typescript
${experimentScript}
\`\`\`

---

Please provide a thorough methodological review of this experimental design. Focus on issues that could invalidate findings or waste resources.`;

  // Use Opus for thorough review
  const modelSpec = 'anthropic/claude-opus-4.6';
  console.log(`\nReviewing experimental design with ${modelSpec}...\n`);
  console.log('='.repeat(60));

  try {
    const spec = parseModelSpec(modelSpec);
    const provider = await createProvider(spec, 0);

    const response = await provider.sendText({
      prompt,
      systemPrompt: REVIEW_SYSTEM_PROMPT,
    });

    console.log('\n' + response);
    console.log('\n' + '='.repeat(60));

    // Extract verdict
    const verdictMatch = response.match(/\*\*VERDICT:\*\*\s*\*?\*?(\w+)/i);
    if (verdictMatch) {
      const verdict = verdictMatch[1].toUpperCase();
      console.log(`\n🎯 VERDICT: ${verdict}`);
      
      if (verdict === 'PROCEED') {
        console.log('✅ Design approved - ready to run experiments');
      } else if (verdict.includes('REVISE')) {
        console.log('⚠️ Design needs revision before running');
      } else {
        console.log('🔴 Design needs fundamental rethinking');
      }
    }

  } catch (error) {
    console.error('Error during review:', error);
    process.exit(1);
  }
}

main().catch(console.error);
