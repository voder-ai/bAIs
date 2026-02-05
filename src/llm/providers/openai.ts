import OpenAI from 'openai';
import type { LlmProvider } from '../provider.js';

export class OpenAIProvider implements LlmProvider {
  readonly name: string;
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(model: string) {
    this.model = model;
    this.name = `openai/${model}`;

    const apiKey = process.env['OPENAI_API_KEY'];
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required for OpenAI provider');
    }

    this.client = new OpenAI({ apiKey });
  }

  async sendJson<T>(options: {
    prompt: string;
    schema?: unknown;
    systemPrompt?: string;
  }): Promise<{ parsed: T; rawResponse: string; isPureJson: boolean }> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    if (options.systemPrompt) {
      messages.push({
        role: 'system',
        content: options.systemPrompt,
      });
    }

    messages.push({
      role: 'user',
      content: options.prompt,
    });

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        response_format: { type: 'json_object' },
        temperature: 0,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('OpenAI returned empty response');
      }

      const parsed = JSON.parse(content) as T;

      return {
        parsed,
        rawResponse: content,
        isPureJson: true, // OpenAI JSON mode returns pure JSON
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`OpenAI API error: ${error.message}`);
      }
      throw new Error(`OpenAI API error: ${String(error)}`);
    }
  }

  async sendText(options: { prompt: string; systemPrompt?: string }): Promise<string> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    if (options.systemPrompt) {
      messages.push({
        role: 'system',
        content: options.systemPrompt,
      });
    }

    messages.push({
      role: 'user',
      content: options.prompt,
    });

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature: 0,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('OpenAI returned empty response');
      }

      return content;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`OpenAI API error: ${error.message}`);
      }
      throw new Error(`OpenAI API error: ${String(error)}`);
    }
  }
}
