import { createProvider, parseModelSpec } from './src/llm/provider.js';

async function test() {
  const variants = [
    'openai-codex/gpt-5.2',
    'gpt-5.2',
    'openai-codex/gpt-5.2-codex',
  ];
  
  for (const m of variants) {
    console.log(`\nTrying: ${m}`);
    try {
      const spec = parseModelSpec(m);
      console.log(`  provider=${spec.provider}, model=${spec.model}`);
      const provider = await createProvider(spec, 0.7);
      const result = await provider.sendText({ prompt: "What is 2+2? Reply with just the number." });
      console.log(`  ✅ Result: "${result}"`);
    } catch (e: any) {
      console.log(`  ❌ ${e.message?.slice(0, 100)}`);
    }
  }
}
test();
