// @ts-nocheck
import { createProvider, parseModelSpec } from '../src/llm/provider.js';

async function test() {
  console.log('Testing OpenRouter with new API key...');
  const spec = parseModelSpec('openrouter/meta-llama/llama-3.3-70b-instruct');
  const provider = await createProvider(spec, 0);
  const resp = await provider.sendText({ prompt: 'Say hello in one word' });
  console.log('Success! Response:', resp.slice(0, 100));
}

test().catch(e => console.error('Error:', e.message));
