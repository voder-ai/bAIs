/**
 * OpenRouter API utilities for bAIs experiments
 */
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

export async function getOpenRouterKey(): Promise<string> {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY;
  const authPath = join(homedir(), '.openclaw/agents/main/agent/auth-profiles.json');
  try {
    const store = JSON.parse(await readFile(authPath, 'utf8'));
    if (store.profiles['openrouter:default']?.token) return store.profiles['openrouter:default'].token;
  } catch {}
  throw new Error('No OpenRouter API key found');
}

export interface Message { role: 'user' | 'assistant' | 'system'; content: string; }

export interface OpenRouterResponse {
  id: string;
  model: string;
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export async function callOpenRouter(
  apiKey: string, 
  model: string, 
  messages: Message[], 
  temperature = 0.7,
  providerOrder?: string[]
): Promise<{ content: string; actualModel: string }> {
  const body: Record<string, unknown> = { model, messages, temperature };
  if (providerOrder?.length) {
    body.provider = { order: providerOrder };
  }
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 
      Authorization: `Bearer ${apiKey}`, 
      'Content-Type': 'application/json', 
      'HTTP-Referer': 'https://github.com/voder-ai/bAIs' 
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${text.slice(0, 200)}`);
  }
  const data: OpenRouterResponse = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || '',
    actualModel: data.model || model,
  };
}

/**
 * Hash prompts for drift detection
 * Returns first 8 chars of SHA256
 */
export function hashPrompts(...prompts: string[]): string {
  const combined = prompts.join('|||');
  return createHash('sha256').update(combined).digest('hex').slice(0, 8);
}

export const MODELS = {
  'opus-4.6': 'anthropic/claude-opus-4.6',
  'sonnet-4.6': 'anthropic/claude-sonnet-4.6',
  'haiku-4.5': 'anthropic/claude-haiku-4.5',
  'gpt-5.2': 'openai/gpt-5.2',
  'gpt-4.1': 'openai/gpt-4.1',
  'o3': 'openai/o3',
  'o4-mini': 'openai/o4-mini',
  'minimax-m2.5': 'minimax/minimax-m2.5',
  'kimi-k2.5': 'moonshotai/kimi-k2.5',
  'glm-5': 'z-ai/glm-5',
  'deepseek-v3.2': 'deepseek/deepseek-v3.2',
} as const;
