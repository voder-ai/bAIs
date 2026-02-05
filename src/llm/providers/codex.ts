import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import type { LlmProvider } from '../provider.js';

export class CodexProvider implements LlmProvider {
  readonly name: string;
  private readonly model: string | undefined;

  constructor(model?: string) {
    this.model = model;
    this.name = model ? `codex/${model}` : 'codex';
  }

  private runProcess(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');

      child.stdout.on('data', (chunk) => {
        stdout += chunk;
      });

      child.stderr.on('data', (chunk) => {
        stderr += chunk;
      });

      child.on('error', (error) => {
        reject(error);
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
          return;
        }

        const message = `codex exec failed (exit ${code ?? 'unknown'}).\n\nSTDERR:\n${stderr}`;
        reject(new Error(message));
      });
    });
  }

  private extractJsonObject(text: string): { json: string; isPureJson: boolean } {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end < start) {
      throw new Error('Could not find a JSON object in the Codex last message');
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
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'bais-codex-'));
    const lastMessagePath = path.join(tmpDir, 'last-message.txt');
    const schemaPath = path.join(tmpDir, 'schema.json');

    try {
      if (options.schema) {
        await writeFile(schemaPath, JSON.stringify(options.schema, null, 2), 'utf8');
      }

      // Build the full prompt with system prompt if provided
      let fullPrompt = options.prompt;
      if (options.systemPrompt) {
        fullPrompt = `${options.systemPrompt}\n\n${options.prompt}`;
      }

      const args: string[] = ['--yes', 'codex', 'exec'];
      if (this.model) {
        args.push('-m', this.model);
      }
      if (options.schema) {
        args.push('--output-schema', schemaPath);
      }
      args.push('--output-last-message', lastMessagePath);
      args.push(fullPrompt);

      await this.runProcess('npx', args);

      const rawLastMessage = await readFile(lastMessagePath, 'utf8');

      const extracted = this.extractJsonObject(rawLastMessage);
      const parsed = JSON.parse(extracted.json) as T;
      return {
        parsed,
        rawResponse: rawLastMessage,
        isPureJson: extracted.isPureJson,
      };
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  }

  async sendText(options: { prompt: string; systemPrompt?: string }): Promise<string> {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'bais-codex-'));
    const lastMessagePath = path.join(tmpDir, 'last-message.txt');

    try {
      // Build the full prompt with system prompt if provided
      let fullPrompt = options.prompt;
      if (options.systemPrompt) {
        fullPrompt = `${options.systemPrompt}\n\n${options.prompt}`;
      }

      const args: string[] = ['--yes', 'codex', 'exec'];
      if (this.model) {
        args.push('-m', this.model);
      }
      args.push('--output-last-message', lastMessagePath);
      args.push(fullPrompt);

      await this.runProcess('npx', args);

      return await readFile(lastMessagePath, 'utf8');
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  }
}
