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
 * Load API key/token from environment or OpenClaw's auth store
 */
function loadApiKey(providerName: string): string | undefined {
  // First check environment variables (for CI)
  const envKeyMap: Record<string, string> = {
    'openai-codex': 'OPENAI_CODEX_API_KEY',
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    google: 'GOOGLE_API_KEY',
  };

  const envVar = envKeyMap[providerName];
  if (envVar && process.env[envVar]) {
    return process.env[envVar];
  }

  // Fall back to OpenClaw auth store
  const authPath = join(homedir(), '.openclaw/agents/main/agent/auth-profiles.json');

  try {
    const store = JSON.parse(readFileSync(authPath, 'utf8')) as AuthStore;

    // Try provider-specific profiles: default first, then any matching provider
    const profileKeys = [
      `${providerName}:default`,
      `${providerName}:github`,
      `${providerName}:main`,
    ];

    for (const profileKey of profileKeys) {
      const profile = store.profiles[profileKey];
      if (profile) {
        if (profile.type === 'oauth' && profile.access) return profile.access;
        if (profile.type === 'token' && profile.token) return profile.token;
        if (profile.type === 'api_key' && profile.key) return profile.key;
      }
    }

    // Also search for any profile matching this provider
    for (const [key, profile] of Object.entries(store.profiles)) {
      if (key.startsWith(`${providerName}:`)) {
        if (profile.type === 'oauth' && profile.access) return profile.access;
        if (profile.type === 'token' && profile.token) return profile.token;
        if (profile.type === 'api_key' && profile.key) return profile.key;
      }
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
  private lastRequestTime = 0;
  private readonly minDelayMs: number;
  private readonly temperature?: number;

  constructor(provider: string, modelId: string, temperature?: number) {
    this.providerName = normalizeProvider(provider);
    this.name = `${this.providerName}/${modelId}`;
    if (temperature !== undefined) {
      this.temperature = temperature;
    }

    // Set rate limit delay based on provider
    // OpenRouter free tier: 8 req/min = 7.5s between requests
    this.minDelayMs = this.providerName === 'openrouter' && modelId.includes(':free') ? 8000 : 0;

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

  private async respectRateLimit(): Promise<void> {
    if (this.minDelayMs > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.minDelayMs) {
        await new Promise((resolve) => setTimeout(resolve, this.minDelayMs - timeSinceLastRequest));
      }
      this.lastRequestTime = Date.now();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getCompleteOptions(): Record<string, unknown> {
    const options: Record<string, unknown> = { apiKey: this.apiKey };
    if (this.temperature !== undefined) {
      options.temperature = this.temperature;
    }
    return options;
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

    // Respect rate limits
    await this.respectRateLimit();

    // Retry with exponential backoff for rate limit errors
    let lastError: Error | undefined;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const response = await complete(this.model, context, this.getCompleteOptions());

        // Check for rate limit error in response
        if (response.stopReason === 'error' && response.errorMessage?.includes('429')) {
          const waitTime = Math.min(10000 * Math.pow(2, attempt), 120000); // Max 120s
          console.error(`Rate limited, waiting ${waitTime}ms before retry ${attempt + 1}/5`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }

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
      } catch (error) {
        lastError = error as Error;
        if (attempt < 4) {
          const waitTime = Math.min(1000 * Math.pow(2, attempt), 60000);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }

    throw lastError ?? new Error('Failed after 5 attempts');
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

    // Respect rate limits
    await this.respectRateLimit();

    // Retry with exponential backoff for rate limit errors
    let lastError: Error | undefined;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const response = await complete(this.model, context, this.getCompleteOptions());
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument

        // Check for rate limit error in response
        if (response.stopReason === 'error' && response.errorMessage?.includes('429')) {
          const waitTime = Math.min(10000 * Math.pow(2, attempt), 120000); // Max 120s
          console.error(`Rate limited, waiting ${waitTime}ms before retry ${attempt + 1}/5`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }

        const textContent = response.content.find((c) => c.type === 'text');
        if (!textContent || textContent.type !== 'text') {
          throw new Error('No text content in response');
        }

        return textContent.text;
      } catch (error) {
        lastError = error as Error;
        if (attempt < 4) {
          const waitTime = Math.min(1000 * Math.pow(2, attempt), 60000);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }

    throw lastError ?? new Error('Failed after 5 attempts');
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
