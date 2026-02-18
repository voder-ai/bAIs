// @ts-nocheck
import { createProvider, parseModelSpec } from '../src/llm/provider.js';
import * as fs from 'fs';

async function main() {
  const prompt = fs.readFileSync('/tmp/plan-24mo-review.txt', 'utf-8');
  const spec = parseModelSpec('openrouter/anthropic/claude-sonnet-4');
  const provider = await createProvider(spec, 0);
  const response = await provider.sendText({ prompt });
  console.log(response);
}

main().catch(console.error);
