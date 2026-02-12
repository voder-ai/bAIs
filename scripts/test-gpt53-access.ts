#!/usr/bin/env npx tsx

/**
 * Quick test to verify GPT 5.3 access and get baseline anchoring data
 */

import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import { anchoringProsecutorSentencingExperiment } from '../src/experiments/anchoringProsecutorSentencing.js';

const MODEL = 'github-copilot/gpt-5.3-codex';
const N_RUNS = 3; // Quick test

async function main() {
  console.log(`🧪 Testing GPT 5.3 access: ${MODEL}`);
  console.log(`📊 Running ${N_RUNS} trials per anchor (${N_RUNS * 2} total)\n`);

  const spec = parseModelSpec(MODEL);
  const provider = await createProvider(spec, 0); // temp=0 for determinism

  let successCount = 0;
  let errorCount = 0;

  // Test low anchor (3mo)
  console.log('🔹 Low anchor (3mo):');
  for (let i = 0; i < N_RUNS; i++) {
    try {
      const result = await anchoringProsecutorSentencingExperiment.run(provider, {
        prosecutorRecommendationMonths: 3,
      });
      console.log(`  ✅ Trial ${i + 1}: ${result.sentenceMonths} months`);
      successCount++;
    } catch (error) {
      console.error(`  ❌ Trial ${i + 1} failed:`, error);
      errorCount++;
    }
  }

  // Test high anchor (9mo)
  console.log('\n🔹 High anchor (9mo):');
  for (let i = 0; i < N_RUNS; i++) {
    try {
      const result = await anchoringProsecutorSentencingExperiment.run(provider, {
        prosecutorRecommendationMonths: 9,
      });
      console.log(`  ✅ Trial ${i + 1}: ${result.sentenceMonths} months`);
      successCount++;
    } catch (error) {
      console.error(`  ❌ Trial ${i + 1} failed:`, error);
      errorCount++;
    }
  }

  console.log(`\n📊 Results: ${successCount} successes, ${errorCount} failures`);
  
  if (successCount > 0) {
    console.log('\n✅ GPT 5.3 access confirmed working');
  } else {
    console.log('\n❌ GPT 5.3 access failed');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
