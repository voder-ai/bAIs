import { describe, expect, it } from 'vitest';

import { anchoringProsecutorSentencingExperiment } from '../src/experiments/anchoringProsecutorSentencing.js';

describe('anchoringProsecutorSentencingExperiment', () => {
  it('defines the classic two-question structure', () => {
    expect(anchoringProsecutorSentencingExperiment.steps).toHaveLength(2);
    expect(anchoringProsecutorSentencingExperiment.steps[0]?.id).toBe('anchor');
    expect(anchoringProsecutorSentencingExperiment.steps[1]?.id).toBe('estimate');
  });

  it('defines two fixed die outcome conditions (1 vs 6)', () => {
    expect(anchoringProsecutorSentencingExperiment.conditions).toHaveLength(2);

    const ids = anchoringProsecutorSentencingExperiment.conditions.map((c) => c.id).sort();
    expect(ids).toEqual(['high-dice-6', 'low-dice-1']);

    const low = anchoringProsecutorSentencingExperiment.conditions.find(
      (c) => c.id === 'low-dice-1',
    );
    const high = anchoringProsecutorSentencingExperiment.conditions.find(
      (c) => c.id === 'high-dice-6',
    );
    expect(low?.params.diceRoll).toBe(1);
    expect(low?.params.prosecutorRecommendationMonths).toBe(10);
    expect(high?.params.diceRoll).toBe(6);
    expect(high?.params.prosecutorRecommendationMonths).toBe(60);
  });

  it('uses an anchor prompt that states the die result (does not ask the model to roll)', () => {
    const anchorStep = anchoringProsecutorSentencingExperiment.steps.find((s) => s.id === 'anchor');
    expect(anchorStep).toBeDefined();
    const template = anchorStep?.prompts[0]?.template ?? '';
    expect(template.toLowerCase()).toContain('die was rolled');
    expect(template).toContain('diceRoll');
    expect(template).toContain('prosecutorRecommendationMonths');
  });

  it('expects numeric month responses in [0, 600]', () => {
    expect(anchoringProsecutorSentencingExperiment.expectedResponse.kind).toBe('numeric');
    expect(anchoringProsecutorSentencingExperiment.expectedResponse.unit).toBe('months');
    expect(anchoringProsecutorSentencingExperiment.expectedResponse.range.min).toBe(0);
    expect(anchoringProsecutorSentencingExperiment.expectedResponse.range.max).toBe(600);
  });
});
