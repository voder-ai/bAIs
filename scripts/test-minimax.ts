// @ts-nocheck
import { createProvider, parseModelSpec } from '../src/llm/provider.js';

async function test() {
  console.log('Testing MiniMax M2.5 via OpenRouter...');
  const spec = parseModelSpec('openrouter/minimax/minimax-m2.5');
  const provider = await createProvider(spec, 0);
  const result = await provider.sendText({ prompt: 'Say "hello" and nothing else.' });
  console.log('MiniMax M2.5 response:', result);
}

test().catch((e) => console.error('Error:', e.message));
