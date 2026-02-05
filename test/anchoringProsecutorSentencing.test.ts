import { describe, expect, it } from 'vitest';

import { anchoringProsecutorSentencingExperiment } from '../src/experiments/anchoringProsecutorSentencing.js';

describe('anchoringProsecutorSentencingExperiment', () => {
  it('defines the three-step structure matching Study 2', () => {
    expect(anchoringProsecutorSentencingExperiment.steps).toHaveLength(3);
    expect(anchoringProsecutorSentencingExperiment.steps[0]?.id).toBe('prosecutor-evaluation');
    expect(anchoringProsecutorSentencingExperiment.steps[1]?.id).toBe('defense-evaluation');
    expect(anchoringProsecutorSentencingExperiment.steps[2]?.id).toBe('final-sentence');
  });

  it('defines two randomly determined anchor conditions (3 vs 9 months)', () => {
    expect(anchoringProsecutorSentencingExperiment.conditions).toHaveLength(2);

    const ids = anchoringProsecutorSentencingExperiment.conditions.map((c) => c.id).sort();
    expect(ids).toEqual(['high-anchor-9mo', 'low-anchor-3mo']);

    const low = anchoringProsecutorSentencingExperiment.conditions.find(
      (c) => c.id === 'low-anchor-3mo',
    );
    const high = anchoringProsecutorSentencingExperiment.conditions.find(
      (c) => c.id === 'high-anchor-9mo',
    );
    expect(low?.params.prosecutorRecommendationMonths).toBe(3);
    expect(high?.params.prosecutorRecommendationMonths).toBe(9);
  });

  it('uses an anchor prompt that states the prosecutor demand was randomly determined', () => {
    const prosecutorStep = anchoringProsecutorSentencingExperiment.steps.find(
      (s) => s.id === 'prosecutor-evaluation',
    );
    expect(prosecutorStep).toBeDefined();
    const template = prosecutorStep?.prompts[0]?.template ?? '';
    expect(template.toLowerCase()).toContain('randomly determined');
    expect(template).toContain('prosecutor');
    expect(template).toContain('prosecutorRecommendationMonths');
    expect(template.toLowerCase()).toContain('lena m');
  });

  it('expects numeric month responses in [0, 12]', () => {
    const expected = anchoringProsecutorSentencingExperiment.expectedResponse;
    expect(expected.kind).toBe('numeric');

    if (expected.kind !== 'numeric') {
      throw new Error('expectedResponse.kind must be numeric');
    }

    expect(expected.unit).toBe('months');
    expect(expected.range.min).toBe(0);
    expect(expected.range.max).toBe(12);
  });
});
