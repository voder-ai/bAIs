import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

export type CodexExecOptions = Readonly<{
  prompt: string;
  schema?: unknown;
  model?: string;
}>;

export type CodexExecResult<T> = Readonly<{
  parsed: T;
  rawLastMessage: string;
  rawJson: string;
  isPureJson: boolean;
}>;

function runProcess(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
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

function extractJsonObject(text: string): { json: string; isPureJson: boolean } {
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

export async function codexExecJson<T>(options: CodexExecOptions): Promise<CodexExecResult<T>> {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'bais-codex-'));
  const lastMessagePath = path.join(tmpDir, 'last-message.txt');
  const schemaPath = path.join(tmpDir, 'schema.json');

  try {
    if (options.schema) {
      await writeFile(schemaPath, JSON.stringify(options.schema, null, 2), 'utf8');
    }

    const args: string[] = ['--yes', 'codex', 'exec'];
    if (options.model) {
      args.push('-m', options.model);
    }
    if (options.schema) {
      args.push('--output-schema', schemaPath);
    }
    args.push('--output-last-message', lastMessagePath);
    args.push(options.prompt);

    await runProcess('npx', args);

    const rawLastMessage = await readFile(lastMessagePath, 'utf8');

    const extracted = extractJsonObject(rawLastMessage);
    const parsed = JSON.parse(extracted.json) as T;
    return {
      parsed,
      rawLastMessage,
      rawJson: extracted.json,
      isPureJson: extracted.isPureJson,
    };
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

export async function codexExecText(options: CodexExecOptions): Promise<string> {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'bais-codex-'));
  const lastMessagePath = path.join(tmpDir, 'last-message.txt');

  try {
    const args: string[] = ['--yes', 'codex', 'exec'];
    if (options.model) {
      args.push('-m', options.model);
    }
    args.push('--output-last-message', lastMessagePath);
    args.push(options.prompt);

    await runProcess('npx', args);

    return await readFile(lastMessagePath, 'utf8');
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}
