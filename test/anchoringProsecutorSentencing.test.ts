import { describe, expect, it } from 'vitest';

import { anchoringProsecutorSentencingExperiment } from '../src/experiments/anchoringProsecutorSentencing.js';

describe('anchoringProsecutorSentencingExperiment', () => {
  it('defines the classic two-question structure', () => {
    expect(anchoringProsecutorSentencingExperiment.steps).toHaveLength(2);
    expect(anchoringProsecutorSentencingExperiment.steps[0]?.id).toBe('anchor');
    expect(anchoringProsecutorSentencingExperiment.steps[1]?.id).toBe('estimate');
  });

  it('defines low and high anchor conditions (12 and 60 months)', () => {
    const anchors = anchoringProsecutorSentencingExperiment.conditions.map(
      (condition) => condition.params.prosecutorRecommendationMonths,
    );
    expect(anchors).toContain(12);
    expect(anchors).toContain(60);
  });

  it('uses an anchor prompt with a variable placeholder', () => {
    const anchorStep = anchoringProsecutorSentencingExperiment.steps.find((s) => s.id === 'anchor');
    expect(anchorStep).toBeDefined();
    expect(anchorStep?.prompts[0]?.template).toContain('{{prosecutorRecommendationMonths}}');
  });

  it('expects numeric month responses in [0, 600]', () => {
    expect(anchoringProsecutorSentencingExperiment.expectedResponse.kind).toBe('numeric');
    expect(anchoringProsecutorSentencingExperiment.expectedResponse.unit).toBe('months');
    expect(anchoringProsecutorSentencingExperiment.expectedResponse.range.min).toBe(0);
    expect(anchoringProsecutorSentencingExperiment.expectedResponse.range.max).toBe(600);
  });
});
