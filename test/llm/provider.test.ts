import { describe, expect, it } from 'vitest';
import { parseModelSpec, createProvider } from '../../src/llm/provider.js';

describe('parseModelSpec', () => {
  it('parses valid provider/model format', () => {
    expect(parseModelSpec('openai/gpt-4o')).toEqual({
      provider: 'openai',
      model: 'gpt-4o',
    });

    expect(parseModelSpec('anthropic/claude-sonnet-4-20250514')).toEqual({
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
    });

    expect(parseModelSpec('google/gemini-2.0-flash')).toEqual({
      provider: 'google',
      model: 'gemini-2.0-flash',
    });

    expect(parseModelSpec('codex/default')).toEqual({
      provider: 'codex',
      model: 'default',
    });
  });

  it('trims whitespace from provider and model names', () => {
    expect(parseModelSpec('  openai  /  gpt-4o  ')).toEqual({
      provider: 'openai',
      model: 'gpt-4o',
    });
  });

  it('throws error for invalid format', () => {
    expect(() => parseModelSpec('openai')).toThrow(
      'Invalid model spec: "openai". Expected format: provider/model',
    );
    expect(() => parseModelSpec('openai/gpt-4o/extra')).toThrow(
      'Invalid model spec: "openai/gpt-4o/extra". Expected format: provider/model',
    );
    expect(() => parseModelSpec('')).toThrow(
      'Invalid model spec: "". Expected format: provider/model',
    );
  });

  it('throws error for empty provider or model', () => {
    expect(() => parseModelSpec('/gpt-4o')).toThrow(
      'Invalid model spec: "/gpt-4o". Provider name cannot be empty',
    );
    expect(() => parseModelSpec('openai/')).toThrow(
      'Invalid model spec: "openai/". Model name cannot be empty',
    );
    expect(() => parseModelSpec('  /  ')).toThrow(
      'Invalid model spec: "  /  ". Provider name cannot be empty',
    );
  });
});

describe('createProvider', () => {
  it('creates CodexProvider for codex provider', async () => {
    const provider = await createProvider({ provider: 'codex', model: 'gpt-4' });
    expect(provider.name).toBe('codex/gpt-4');
  });

  it('throws error for unsupported provider', async () => {
    await expect(createProvider({ provider: 'unsupported', model: 'model' })).rejects.toThrow(
      'Unsupported provider: "unsupported". Supported providers: openai, anthropic, google, codex',
    );
  });

  // Note: We don't test the actual creation of OpenAI/Anthropic/Google providers here
  // because they require API keys and would make real API calls.
  // Those would be tested in integration tests or with mocked API keys.
});
