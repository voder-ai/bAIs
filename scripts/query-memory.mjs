import { createProvider, parseModelSpec } from '../src/llm/provider.js';

const models = ['openai-codex/meta-llama/llama-4-scout:free', 'openai-codex/qwen/qwen3-14b:free'];

const prompt =
  'An AI agent has memory loss after context compaction. Current workarounds: action logging, TOOLS.md. Propose 3 additional mechanisms for robust agent memory. One sentence each.';

for (const modelSpec of models) {
  console.log(`\n=== ${modelSpec} ===`);
  try {
    const spec = parseModelSpec(modelSpec);
    const provider = await createProvider(spec);
    const response = await provider.sendText({ prompt });
    console.log(response);
  } catch (e) {
    console.log('ERROR:', e.message);
  }
  // Rate limit delay
  await new Promise((r) => setTimeout(r, 3000));
}
