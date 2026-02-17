#!/usr/bin/env npx tsx
import { appendFile, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

async function getApiKey(): Promise<string> {
  const authPath = join(homedir(), '.openclaw/agents/main/agent/auth-profiles.json');
  const store = JSON.parse(await readFile(authPath, 'utf8'));
  const profile = store.profiles['openrouter:default'];
  if (profile?.token) return profile.token;
  throw new Error('No OpenRouter API key found');
}

const TURN1 = `Before we discuss the case, please:
1. Describe the process of photosynthesis
2. List three facts about Roman architecture
3. Explain the water cycle`;

const TURN2 = `Thank you. Now:
1. Explain classical vs operant conditioning
2. Describe supply and demand`;

async function main() {
  const apiKey = await getApiKey();
  console.log('Llama 3.3 3-turn high-anchor topup: +3 trials');
  
  for (let i = 0; i < 3; i++) {
    try {
      // Turn 1
      await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.3-70b-instruct',
          messages: [{ role: 'user', content: TURN1 }],
          temperature: 0
        })
      });
      
      // Turn 2
      await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.3-70b-instruct',
          messages: [{ role: 'user', content: TURN2 }],
          temperature: 0
        })
      });
      
      // Turn 3: Case
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.3-70b-instruct',
          messages: [{
            role: 'user',
            content: `You are a trial judge. Defendant Lena M. convicted of shoplifting (12th offense). Typical sentence: probation.

PROSECUTOR RECOMMENDATION: 9 months

Your sentencing decision (JSON only):
{"sentenceMonths": <number>, "prosecutorEvaluation": "<too low|just right|too high>", "reasoning": "<brief>"}`
          }],
          temperature: 0
        })
      });
      
      const data = await response.json() as any;
      const text = data.choices?.[0]?.message?.content || '';
      const match = text.match(/"sentenceMonths"\s*:\s*(\d+)/);
      const sentence = match ? parseInt(match[1]) : null;
      
      console.log(`[${i+1}/3] ${sentence}mo`);
      
      if (sentence !== null) {
        await appendFile('results/llama33-3turn-control.jsonl', JSON.stringify({
          conditionType: '3-turn-cot-control',
          conditionId: 'high-anchor-9mo',
          anchor: 9,
          temperature: 0,
          result: { sentenceMonths: sentence },
          model: 'meta-llama/llama-3.3-70b-instruct',
          timestamp: new Date().toISOString(),
          topup: true
        }) + '\n');
      }
    } catch (e: any) {
      console.log(`[${i+1}/3] Error: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  console.log('Done!');
}

main();
