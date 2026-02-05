export interface LlmProvider {
  readonly name: string;
  sendJson<T>(options: {
    prompt: string;
    schema?: unknown;
    systemPrompt?: string;
  }): Promise<{ parsed: T; rawResponse: string; isPureJson: boolean }>;
  sendText(options: { prompt: string; systemPrompt?: string }): Promise<string>;
}

export type ModelSpec = {
  provider: string;
  model: string;
};

export function parseModelSpec(spec: string): ModelSpec {
  const parts = spec.split('/');
  if (parts.length !== 2) {
    throw new Error(`Invalid model spec: "${spec}". Expected format: provider/model`);
  }

  const provider = parts[0]!.trim();
  const model = parts[1]!.trim();

  if (!provider) {
    throw new Error(`Invalid model spec: "${spec}". Provider name cannot be empty`);
  }

  if (!model) {
    throw new Error(`Invalid model spec: "${spec}". Model name cannot be empty`);
  }

  return { provider, model };
}

export async function createProvider(spec: ModelSpec): Promise<LlmProvider> {
  // Use pi-ai for all providers (unified API with OAuth support)
  const { PiAiProvider } = await import('./providers/pi-ai.js');
  return new PiAiProvider(spec.provider, spec.model);
}

/**
 * Legacy provider factory - use createProvider instead
 * @deprecated
 */
export async function createLegacyProvider(spec: ModelSpec): Promise<LlmProvider> {
  switch (spec.provider.toLowerCase()) {
    case 'openai': {
      const { OpenAIProvider } = await import('./providers/openai.js');
      return new OpenAIProvider(spec.model);
    }
    case 'anthropic': {
      const { AnthropicProvider } = await import('./providers/anthropic.js');
      return new AnthropicProvider(spec.model);
    }
    case 'google':
    case 'gemini': {
      const { GoogleProvider } = await import('./providers/google.js');
      return new GoogleProvider(spec.model);
    }
    case 'codex': {
      const { CodexProvider } = await import('./providers/codex.js');
      return new CodexProvider(spec.model);
    }
    default:
      throw new Error(
        `Unsupported provider: "${spec.provider}". Supported providers: openai, anthropic, google, codex`,
      );
  }
}
