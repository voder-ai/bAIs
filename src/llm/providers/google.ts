import { GoogleGenerativeAI } from '@google/generative-ai';
import type { LlmProvider } from '../provider.js';

export class GoogleProvider implements LlmProvider {
  readonly name: string;
  private readonly client: GoogleGenerativeAI;
  private readonly model: string;

  constructor(model: string) {
    this.model = model;
    this.name = `google/${model}`;

    const apiKey = process.env['GOOGLE_API_KEY'] || process.env['GEMINI_API_KEY'];
    if (!apiKey) {
      throw new Error(
        'GOOGLE_API_KEY or GEMINI_API_KEY environment variable is required for Google provider',
      );
    }

    this.client = new GoogleGenerativeAI(apiKey);
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
        throw new Error('Could not find valid JSON in Google response');
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
    const generativeModel = this.client.getGenerativeModel({
      model: this.model,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0,
      },
    });

    let fullPrompt = options.prompt;

    if (options.systemPrompt) {
      fullPrompt = `${options.systemPrompt}\n\n${options.prompt}`;
    }

    if (options.schema) {
      fullPrompt += `\n\nJSON schema (respond with valid JSON matching this schema):\n${JSON.stringify(options.schema, null, 2)}`;
    }

    try {
      const response = await generativeModel.generateContent(fullPrompt);
      const content = response.response.text();

      if (!content) {
        throw new Error('Google returned empty response');
      }

      const { json, isPureJson } = this.extractJsonFromResponse(content);
      const parsed = JSON.parse(json) as T;

      return {
        parsed,
        rawResponse: content,
        isPureJson,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Google API error: ${error.message}`);
      }
      throw new Error(`Google API error: ${String(error)}`);
    }
  }

  async sendText(options: { prompt: string; systemPrompt?: string }): Promise<string> {
    const generativeModel = this.client.getGenerativeModel({
      model: this.model,
      generationConfig: {
        temperature: 0,
      },
    });

    let fullPrompt = options.prompt;

    if (options.systemPrompt) {
      fullPrompt = `${options.systemPrompt}\n\n${options.prompt}`;
    }

    try {
      const response = await generativeModel.generateContent(fullPrompt);
      const content = response.response.text();

      if (!content) {
        throw new Error('Google returned empty response');
      }

      return content;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Google API error: ${error.message}`);
      }
      throw new Error(`Google API error: ${String(error)}`);
    }
  }
}
