#!/usr/bin/env npx tsx
import { createProvider, parseModelSpec } from '../src/llm/provider.js';

const question = `You are reviewing the bAIs paper on LLM debiasing evaluation. The paper currently has only one vignette (judicial sentencing).

The authors ask: If we ran 3-5 additional vignettes but ONLY tested on Claude Sonnet 4.6 (not all 10 models), would that be sufficient to address the single-vignette limitation?

Consider:
1. Would single-model multi-vignette demonstrate the METRIC generalizes?
2. Would it still allow technique comparison claims?
3. What would be lost vs. full 10-model replication?

Give a clear YES/NO recommendation with reasoning.`;

const spec = parseModelSpec(process.env.MODEL || 'anthropic/claude-opus-4-6');
const provider = await createProvider(spec, 0);
const response = await provider.sendText({ prompt: question });
console.log(response);
