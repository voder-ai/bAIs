import { complete, getModel } from '@mariozechner/pi-ai';

async function main() {
  try {
    // Try the dated ID that pi-ai knows about
    const model = await getModel('anthropic', 'claude-opus-4-5-20251101');
    console.log('Model resolved:', model);
    const result = await complete({ model, prompt: 'Say hello in one word' });
    console.log('Result:', result.text);
  } catch (e) {
    console.error('Error:', e);
  }
}

main();
