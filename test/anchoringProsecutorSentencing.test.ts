import { describe, expect, it } from 'vitest';

import { anchoringProsecutorSentencingExperiment } from '../src/experiments/anchoringProsecutorSentencing.js';

describe('anchoringProsecutorSentencingExperiment', () => {
  it('defines the classic two-question structure', () => {
    expect(anchoringProsecutorSentencingExperiment.steps).toHaveLength(2);
    expect(anchoringProsecutorSentencingExperiment.steps[0]?.id).toBe('anchor');
    expect(anchoringProsecutorSentencingExperiment.steps[1]?.id).toBe('estimate');
  });

  it('defines a single die-roll anchor condition', () => {
    expect(anchoringProsecutorSentencingExperiment.conditions).toHaveLength(1);
    expect(anchoringProsecutorSentencingExperiment.conditions[0]?.id).toBe('dice');
  });

  it('uses an anchor prompt that instructs a die roll', () => {
    const anchorStep = anchoringProsecutorSentencingExperiment.steps.find((s) => s.id === 'anchor');
    expect(anchorStep).toBeDefined();
    const template = anchorStep?.prompts[0]?.template ?? '';
    expect(template.toLowerCase()).toContain('roll');
    expect(template).toContain('six-sided');
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
