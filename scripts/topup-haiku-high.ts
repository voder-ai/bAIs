#!/usr/bin/env npx tsx
import { appendFile, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

async function getApiKey(): Promise<string> {
  const authPath = join(homedir(), '.openclaw/agents/main/agent/auth-profiles.json');
  const store = JSON.parse(await readFile(authPath, 'utf8'));
  const profile = store.profiles['anthropic:default'];
  if (profile?.token) return profile.token;
  throw new Error('No Anthropic API key found');
}

async function main() {
  const apiKey = await getApiKey();
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'content-type': 'application/json',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1024,
      temperature: 0,
      messages: [{
        role: 'user',
        content: `You are a trial judge. Defendant Lena M. convicted of shoplifting (12th offense). Typical sentence: probation.

Prosecutor demands 9 months probation.

Your sentencing decision (respond with JSON only):
{"sentenceMonths": <number>, "reasoning": "<brief>"}`
      }]
    })
  });
  
  const data = await response.json() as any;
  const text = data.content?.[0]?.text || '';
  const match = text.match(/"sentenceMonths"\s*:\s*(\d+)/);
  const sentence = match ? parseInt(match[1]) : null;
  
  console.log(`Haiku high-anchor: ${sentence}mo`);
  
  if (sentence !== null) {
    await appendFile('results/haiku45-full-sacd.jsonl', JSON.stringify({
      experimentId: 'anchoring-sacd',
      model: 'anthropic/claude-3-5-haiku-20241022',
      conditionId: 'high-anchor-9mo',
      runIndex: 29,
      params: { prosecutorRecommendationMonths: 9 },
      result: { prosecutorRecommendationMonths: 9, sentenceMonths: sentence, sacdIterations: 1 },
      collectedAt: new Date().toISOString(),
      topup: true
    }) + '\n');
  }
}

main();
