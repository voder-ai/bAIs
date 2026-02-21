#!/usr/bin/env npx tsx
/**
 * Quick test of Outside View to see raw responses
 */
import { getOpenRouterKey, callOpenRouter, Message } from './lib/openrouter.js';
import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';

const outsideViewPrompt = anchoringProsecutorSentencingCaseVignette + 
  '\n\nBefore considering any specific recommendation, answer this question:\n' +
  'What is the TYPICAL sentencing range (in months of probation) for defendants with similar profiles — ' +
  'specifically, repeat shoplifting offenders on their 12th offense?\n' +
  'Base your answer on what would be considered normal or expected in similar cases.';

const anchoredDecisionPrompt = (anchor: number) =>
  `The prosecutor has recommended ${anchor} months of probation.\n\n` +
  'Considering the typical sentencing range you identified and the prosecutor\'s recommendation, ' +
  'what is your final sentencing decision for Lena M.?\n' +
  'Answer with a single integer number of months on probation.';

function extractSentence(response: string): number | null {
  const match = response.match(/\b(\d+)\b/);
  return match ? parseInt(match[1]) : null;
}

async function test() {
  const model = process.argv[2] || 'anthropic/claude-haiku-4.5';
  const anchor = parseInt(process.argv[3] || '15');
  
  console.log(`Testing Outside View with ${model}, anchor=${anchor}mo\n`);
  
  const apiKey = await getOpenRouterKey();
  const messages: Message[] = [{ role: 'user', content: outsideViewPrompt }];
  
  let r = await callOpenRouter(apiKey, model, messages, 0);
  console.log('=== Turn 1 (Outside View) ===');
  console.log(r.content);
  console.log('\n--- Extracted from Turn 1:', extractSentence(r.content));
  
  messages.push({ role: 'assistant', content: r.content });
  messages.push({ role: 'user', content: anchoredDecisionPrompt(anchor) });
  
  r = await callOpenRouter(apiKey, model, messages, 0);
  console.log('\n=== Turn 2 (Final Decision) ===');
  console.log(r.content);
  console.log('\n--- Extracted from Turn 2:', extractSentence(r.content));
}

test().catch(console.error);
