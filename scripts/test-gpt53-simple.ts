#!/usr/bin/env npx tsx

/**
 * Simple test to verify GPT 5.3 access
 */

import { createProvider, parseModelSpec } from '../src/llm/provider.js';

const MODEL = 'github-copilot/gpt-5.2';

async function main() {
  console.log(`🧪 Testing GPT 5.3 access: ${MODEL}\n`);

  try {
    const spec = parseModelSpec(MODEL);
    const provider = await createProvider(spec, 0);

    console.log('📝 Sending test prompt...');
    const response = await provider.sendText({
      prompt: 'What is 2 + 2?',
      systemPrompt: 'You are a helpful assistant. Answer briefly.',
    });

    console.log(`✅ Response received: "${response}"`);
    console.log('\n✅ GPT 5.3 access confirmed working');
    return true;
  } catch (error) {
    console.error('❌ Failed:', error);
    console.log('\n❌ GPT 5.3 access failed');
    return false;
  }
}

main().then((success) => {
  process.exit(success ? 0 : 1);
});
