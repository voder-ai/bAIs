import Anthropic from '@anthropic-ai/sdk';
import type { LlmProvider } from '../provider.js';

export class AnthropicProvider implements LlmProvider {
  readonly name: string;
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(model: string) {
    this.model = model;
    this.name = `anthropic/${model}`;

    const apiKey = process.env['ANTHROPIC_API_KEY'];
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required for Anthropic provider');
    }

    this.client = new Anthropic({ apiKey });
  }

  private extractJsonFromResponse(content: string): {
    json: string;
    isPureJson: boolean;
  } {
    // Try to find JSON object boundaries
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');

    if (start === -1 || end === -1 || end < start) {
      // If no JSON object found, assume the whole response is JSON
      try {
        JSON.parse(content);
        return { json: content, isPureJson: true };
      } catch {
        throw new Error('Could not find valid JSON in Anthropic response');
      }
    }

    const beforeJson = content.slice(0, start).trim();
    const afterJson = content.slice(end + 1).trim();
    const jsonPart = content.slice(start, end + 1);

    return {
      json: jsonPart,
      isPureJson: beforeJson === '' && afterJson === '',
    };
  }

  async sendJson<T>(options: {
    prompt: string;
    schema?: unknown;
    systemPrompt?: string;
  }): Promise<{ parsed: T; rawResponse: string; isPureJson: boolean }> {
    let systemPrompt = options.systemPrompt || '';

    // Add JSON schema instructions to system prompt
    if (options.schema) {
      const schemaInstructions = `

You must respond with valid JSON that matches this schema:
${JSON.stringify(options.schema, null, 2)}

Return only the JSON object, no additional text or formatting.`;
      systemPrompt += schemaInstructions;
    } else {
      systemPrompt += '\n\nReturn only valid JSON, no additional text or formatting.';
    }

    try {
      const messageParams: Anthropic.MessageCreateParams = {
        model: this.model,
        max_tokens: 4096,
        temperature: 0,
        messages: [
          {
            role: 'user',
            content: options.prompt,
          },
        ],
      };

      if (systemPrompt) {
        (messageParams as Anthropic.MessageCreateParams & { system?: string }).system =
          systemPrompt;
      }

      const response = await this.client.messages.create(messageParams);

      const textBlock = response.content.find((block) => block.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('Anthropic returned no text content');
      }

      const content = textBlock.text;
      const { json, isPureJson } = this.extractJsonFromResponse(content);
      const parsed = JSON.parse(json) as T;

      return {
        parsed,
        rawResponse: content,
        isPureJson,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Anthropic API error: ${error.message}`);
      }
      throw new Error(`Anthropic API error: ${String(error)}`);
    }
  }

  async sendText(options: { prompt: string; systemPrompt?: string }): Promise<string> {
    try {
      const messageParams: Anthropic.MessageCreateParams = {
        model: this.model,
        max_tokens: 4096,
        temperature: 0,
        messages: [
          {
            role: 'user',
            content: options.prompt,
          },
        ],
      };

      if (options.systemPrompt) {
        (messageParams as Anthropic.MessageCreateParams & { system?: string }).system =
          options.systemPrompt;
      }

      const response = await this.client.messages.create(messageParams);

      const textBlock = response.content.find((block) => block.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('Anthropic returned no text content');
      }

      return textBlock.text;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Anthropic API error: ${error.message}`);
      }
      throw new Error(`Anthropic API error: ${String(error)}`);
    }
  }
}
