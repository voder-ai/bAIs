#!/usr/bin/env npx tsx
import { createProvider, parseModelSpec } from '../src/llm/provider.js';

async function test() {
  const spec = parseModelSpec('anthropic/claude-opus-4-5-20251101');
  console.log('Creating provider for:', spec);
  const provider = await createProvider(spec);
  console.log('Provider created, sending test...');
  const result = await provider.sendText({ prompt: 'Say hello in 5 words' });
  console.log('Result:', result);
}

test().catch(console.error);
