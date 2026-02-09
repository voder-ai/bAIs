#!/usr/bin/env npx tsx
/**
 * LLM-based paper quality review
 * Uses bAIs LLM infrastructure to get an independent assessment
 */

import { createProvider, parseModelSpec, type LlmProvider } from '../src/llm/provider.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const REVIEW_SYSTEM_PROMPT = `You are a critical academic reviewer with expertise in AI/ML research. Your job is to assess whether this paper is ready for public release as a preprint.

Be thorough and critical. Evaluate:
1. **Methodology** - Are experiments well-designed? Are there confounds or flaws?
2. **Statistics** - Are claims supported by data? Are confidence intervals reported correctly?
3. **Citations** - Do they appear accurate and verifiable?
4. **Internal consistency** - Do numbers match between text and tables?
5. **Writing quality** - Is it clear, concise, professional?
6. **Overclaims** - Does it claim more than evidence supports?

After your analysis, provide a clear verdict with one of these exact phrases:
- **READY TO PUBLISH** - Minor issues only, acceptable for preprint
- **NEEDS REVISION** - Significant issues that should be fixed first  
- **NOT READY** - Major problems requiring substantial rework

Be specific about any issues you find.`;

async function main() {
  // Read the paper
  const paperPath = join(__dirname, '../paper/main.tex');
  const referencesPath = join(__dirname, '../paper/references.bib');
  
  let paperContent: string;
  let referencesContent: string;
  
  try {
    paperContent = readFileSync(paperPath, 'utf-8');
    referencesContent = readFileSync(referencesPath, 'utf-8');
  } catch (e) {
    console.error('Error reading paper files:', e);
    process.exit(1);
  }

  const prompt = `Please review this paper for publication readiness.

=== main.tex ===
${paperContent}

=== references.bib ===
${referencesContent}

Provide your detailed review and verdict.`;

  // Use a high-quality model for review
  const modelsToTry = [
    'anthropic/claude-sonnet-4-5',
    'openai/gpt-4o',
    'google/gemini-2.0-flash',
  ];

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

  console.log('Sending paper for review...\n');
  console.log('---');

  try {
    const response = await provider.sendText({
      prompt,
      systemPrompt: REVIEW_SYSTEM_PROMPT,
    });
    
    console.log('\n=== LLM REVIEW ===\n');
    console.log(response);
    console.log('\n=== END REVIEW ===\n');
    console.log(`Model used: ${modelUsed}`);
    
    // Check for verdict
    if (response.includes('READY TO PUBLISH')) {
      console.log('\n✅ VERDICT: Ready to publish');
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

main();
