// @ts-nocheck
import { createProvider, parseModelSpec } from '../src/llm/provider.js';

async function test() {
  console.log('Testing OpenRouter with new API key...');
  console.log('Timestamp:', new Date().toISOString());
  const spec = parseModelSpec('openrouter/meta-llama/llama-3.3-70b-instruct');
  console.log('Spec:', JSON.stringify(spec));
  const provider = await createProvider(spec, 0);
  console.log('Provider created, sending request...');
  const resp = await provider.sendText({ prompt: 'What is 2+2?' });
  console.log('Response:', resp);
}

test().catch(e => {
  console.error('Error:', e.message);
  console.error('Stack:', e.stack);
});
