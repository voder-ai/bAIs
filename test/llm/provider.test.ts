import { describe, expect, it } from 'vitest';
import { parseModelSpec, createProvider } from '../../src/llm/provider.js';

// Check if we have the API key (from env var or auth-profiles.json)
const hasCodexKey = Boolean(process.env.OPENAI_CODEX_API_KEY);

// Also check auth-profiles.json for the key
let hasAuthProfileKey = false;
try {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const os = await import('node:os');
  const authPath = path.join(os.homedir(), '.openclaw/agents/main/agent/auth-profiles.json');
  if (fs.existsSync(authPath)) {
    const auth = JSON.parse(fs.readFileSync(authPath, 'utf-8')) as Record<string, unknown>;
    hasAuthProfileKey = Boolean(auth['openai-codex']);
  }
} catch {
  // Ignore errors reading auth file
}

const skipCodexTest = !hasCodexKey && !hasAuthProfileKey;

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
  // Skip API-dependent tests in CI if no API key secret is configured
  it.skipIf(skipCodexTest)(
    'creates PiAiProvider for codex provider (normalized to openai-codex)',
    async () => {
      // With pi-ai, 'codex' is normalized to 'openai-codex'
      const provider = await createProvider({ provider: 'codex', model: 'gpt-5.1' });
      expect(provider.name).toBe('openai-codex/gpt-5.1');
    },
  );

  it('throws error when no API key found for provider', async () => {
    await expect(createProvider({ provider: 'unsupported', model: 'model' })).rejects.toThrow(
      'No API key found for provider: unsupported',
    );
  });

  // Note: Provider creation now uses pi-ai which loads API keys from
  // OpenClaw's auth store (~/.openclaw/agents/main/agent/auth-profiles.json).
  // Tests that require API calls should be integration tests.
});
