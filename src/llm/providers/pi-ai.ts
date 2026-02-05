/**
 * Unified LLM provider using @mariozechner/pi-ai
 * Supports all pi-ai providers (anthropic, openai, openai-codex, google, etc.)
 * with automatic OAuth handling.
 */
import { getModel, complete, getProviders, getModels } from '@mariozechner/pi-ai';
import type { Model, Api, Context } from '@mariozechner/pi-ai';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { LlmProvider } from '../provider.js';

// Auth profile store structure
interface AuthProfile {
  type: 'oauth' | 'token' | 'api_key';
  provider: string;
  access?: string;
  token?: string;
  key?: string;
}

interface AuthStore {
  profiles: Record<string, AuthProfile>;
}

/**
 * Load API key/token from OpenClaw's auth store
 */
function loadApiKey(providerName: string): string | undefined {
  const authPath = join(homedir(), '.openclaw/agents/main/agent/auth-profiles.json');

  try {
    const store = JSON.parse(readFileSync(authPath, 'utf8')) as AuthStore;

    // Try provider-specific profile first
    const profileKey = `${providerName}:default`;
    const profile = store.profiles[profileKey];

    if (profile) {
      if (profile.type === 'oauth' && profile.access) return profile.access;
      if (profile.type === 'token' && profile.token) return profile.token;
      if (profile.type === 'api_key' && profile.key) return profile.key;
    }

    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Map common provider names to pi-ai provider names
 */
function normalizeProvider(provider: string): string {
  const mapping: Record<string, string> = {
    openai: 'openai',
    gpt: 'openai',
    anthropic: 'anthropic',
    claude: 'anthropic',
    google: 'google',
    gemini: 'google',
    codex: 'openai-codex',
    'openai-codex': 'openai-codex',
  };
  return mapping[provider.toLowerCase()] ?? provider;
}

export class PiAiProvider implements LlmProvider {
  readonly name: string;
  private readonly model: Model<Api>;
  private readonly apiKey: string;
  private readonly providerName: string;

  constructor(provider: string, modelId: string) {
    this.providerName = normalizeProvider(provider);
    this.name = `${this.providerName}/${modelId}`;

    // Load API key from OpenClaw auth store
    const key = loadApiKey(this.providerName);
    if (!key) {
      throw new Error(
        `No API key found for provider: ${this.providerName}. Check ~/.openclaw/agents/main/agent/auth-profiles.json`,
      );
    }
    this.apiKey = key;

    // Get model from pi-ai
    try {
      // @ts-expect-error - dynamic provider/model lookup
      this.model = getModel(this.providerName, modelId);
    } catch {
      // List available models for this provider
      const available = listModels(this.providerName);
      throw new Error(
        `Model "${modelId}" not found for provider "${this.providerName}". Available: ${available.join(', ')}`,
      );
    }
  }

  private extractJsonObject(text: string): { json: string; isPureJson: boolean } {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end < start) {
      throw new Error(`Could not find a JSON object in the response: ${text.substring(0, 200)}...`);
    }

    const prefix = text.slice(0, start);
    const suffix = text.slice(end + 1);

    return {
      json: text.slice(start, end + 1),
      isPureJson: prefix.trim() === '' && suffix.trim() === '',
    };
  }

  async sendJson<T>(options: {
    prompt: string;
    schema?: unknown;
    systemPrompt?: string;
  }): Promise<{ parsed: T; rawResponse: string; isPureJson: boolean }> {
    // Build prompt with JSON instruction
    let fullPrompt = options.prompt;
    if (options.schema) {
      fullPrompt += `\n\nRespond with a JSON object matching this schema:\n${JSON.stringify(options.schema, null, 2)}`;
    }
    fullPrompt += '\n\nRespond ONLY with valid JSON, no markdown code blocks or explanations.';

    // Codex requires a system prompt, provide default if not specified
    const systemPrompt =
      options.systemPrompt ??
      (this.providerName === 'openai-codex'
        ? 'You are a helpful assistant. Answer concisely in valid JSON.'
        : undefined);

    const context: Context = {
      ...(systemPrompt ? { systemPrompt } : {}),
      messages: [{ role: 'user', content: fullPrompt, timestamp: Date.now() }],
    };

    const response = await complete(this.model, context, { apiKey: this.apiKey });

    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in response');
    }

    const rawResponse = textContent.text;
    const extracted = this.extractJsonObject(rawResponse);
    const parsed = JSON.parse(extracted.json) as T;

    return {
      parsed,
      rawResponse,
      isPureJson: extracted.isPureJson,
    };
  }

  async sendText(options: { prompt: string; systemPrompt?: string }): Promise<string> {
    // Codex requires a system prompt, provide default if not specified
    const systemPrompt =
      options.systemPrompt ??
      (this.providerName === 'openai-codex'
        ? 'You are a helpful assistant. Answer concisely.'
        : undefined);

    const context: Context = {
      ...(systemPrompt ? { systemPrompt } : {}),
      messages: [{ role: 'user', content: options.prompt, timestamp: Date.now() }],
    };

    const response = await complete(this.model, context, { apiKey: this.apiKey });

    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in response');
    }

    return textContent.text;
  }
}

/**
 * List available providers
 */
export function listProviders(): string[] {
  return getProviders();
}

/**
 * List available models for a provider
 */
export function listModels(provider: string): string[] {
  const normalized = normalizeProvider(provider);
  try {
    // @ts-expect-error - dynamic provider lookup
    const models = getModels(normalized);
    return models.map((m: Model<Api>) => m.id);
  } catch {
    return [];
  }
}
