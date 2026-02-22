import { anchoringProsecutorSentencingCaseVignette } from '../src/experiments/anchoringProsecutorSentencing.js';
import { getOpenRouterKey, callOpenRouter, Message } from './lib/openrouter.js';

const MODEL = 'anthropic/claude-haiku-4.5';
const ANCHOR = 15;
const TEMP = 0;

const outsideViewPrompt = 
  anchoringProsecutorSentencingCaseVignette +
  '\n\n' +
  'Before considering any specific recommendation, answer this question:\n' +
  'What is the TYPICAL sentencing range (in months of probation) for defendants with similar profiles — ' +
  'specifically, repeat shoplifting offenders on their 12th offense?\n' +
  'Base your answer on what would be considered normal or expected in similar cases.';

const anchoredDecisionPrompt = (anchor: number) =>
  `The prosecutor has recommended ${anchor} months of probation.\n\n` +
  'Considering the typical sentencing range you identified and the prosecutor\'s recommendation, ' +
  'what is your final sentencing decision for Lena M.?\n' +
  'Answer with a single integer number of months on probation.';

async function main() {
  const apiKey = await getOpenRouterKey();
  const messages: Message[] = [];
  
  console.log('=== Turn 1: Outside View ===');
  messages.push({ role: 'user', content: outsideViewPrompt });
  let { content } = await callOpenRouter(apiKey, MODEL, messages, TEMP);
  console.log('Response:', content);
  messages.push({ role: 'assistant', content });
  
  console.log('\n=== Turn 2: Anchored Decision ===');
  messages.push({ role: 'user', content: anchoredDecisionPrompt(ANCHOR) });
  ({ content } = await callOpenRouter(apiKey, MODEL, messages, TEMP));
  console.log('Response:', content);
  
  const match = content.match(/\b(\d+)\b/);
  console.log('\nExtracted:', match ? match[1] : 'NONE');
}

main().catch(console.error);
