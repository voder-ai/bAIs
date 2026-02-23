import { runExperiment } from './lib/experiment-runner.js';
import { delay } from './lib/utils.js';

const GAPS = [
  // glm-5 gaps
  { model: 'z-ai/glm-5', technique: 'outside-view', anchor: '16mo', temp: 0.7, trials: 2 },
  { model: 'z-ai/glm-5', technique: 'outside-view', anchor: '48mo', temp: 0.7, trials: 2 },
  { model: 'z-ai/glm-5', technique: 'full-sacd', anchor: '16mo', temp: 0, trials: 4 },
  { model: 'z-ai/glm-5', technique: 'full-sacd', anchor: '48mo', temp: 0, trials: 4 },
  { model: 'z-ai/glm-5', technique: 'full-sacd', anchor: '16mo', temp: 0.7, trials: 10 },
  { model: 'z-ai/glm-5', technique: 'full-sacd', anchor: '48mo', temp: 0.7, trials: 10 },
  { model: 'z-ai/glm-5', technique: 'full-sacd', anchor: '16mo', temp: 1, trials: 10 },
  { model: 'z-ai/glm-5', technique: 'full-sacd', anchor: '48mo', temp: 1, trials: 10 },
  // kimi gaps
  { model: 'moonshot/kimi-k2.5', technique: 'full-sacd', anchor: '15mo', temp: 0.7, trials: 8 },
  { model: 'moonshot/kimi-k2.5', technique: 'full-sacd', anchor: '46mo', temp: 0.7, trials: 8 },
  { model: 'moonshot/kimi-k2.5', technique: 'full-sacd', anchor: '15mo', temp: 1, trials: 8 },
  { model: 'moonshot/kimi-k2.5', technique: 'full-sacd', anchor: '46mo', temp: 1, trials: 8 },
];

async function main() {
  console.log(`Filling ${GAPS.length} gap conditions...`);
  let done = 0;
  
  for (const gap of GAPS) {
    console.log(`\n[${++done}/${GAPS.length}] ${gap.technique} ${gap.anchor} ${gap.model.split('/')[1]} t${gap.temp === 0.7 ? '07' : gap.temp}`);
    
    for (let i = 0; i < gap.trials; i++) {
      try {
        await runExperiment({
          model: gap.model,
          technique: gap.technique as any,
          anchor: gap.anchor,
          temperature: gap.temp,
        });
        process.stdout.write('.');
      } catch (e: any) {
        console.error(`\n  Error: ${e.message}`);
        await delay(5000);
      }
      await delay(500);
    }
    console.log(` ✓ ${gap.trials} done`);
  }
  
  console.log('\n\nAll gaps filled!');
}

main().catch(console.error);
