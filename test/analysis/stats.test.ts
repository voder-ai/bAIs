import { describe, expect, test } from 'vitest';

import {
  computeDescriptiveStats,
  computeFiveNumberSummary,
  bootstrapMeanDifferenceCI,
  effectSizeTwoSample,
  welchTTestTwoSided,
} from '../../src/analysis/stats.js';

describe('stats', () => {
  test('computeDescriptiveStats computes mean/median/std error', () => {
    const stats = computeDescriptiveStats([1, 2, 3, 4]);
    expect(stats.n).toBe(4);
    expect(stats.mean).toBe(2.5);
    expect(stats.median).toBe(2.5);
    expect(stats.sampleStdDev).toBeGreaterThan(0);
    expect(stats.standardError).toBeGreaterThan(0);
  });

  test('welchTTestTwoSided returns finite t/df/p', () => {
    const high = [10, 11, 9, 12, 10];
    const low = [1, 2, 0, 3, 1];
    const res = welchTTestTwoSided(high, low);
    expect(Number.isFinite(res.t)).toBe(true);
    expect(Number.isFinite(res.df)).toBe(true);
    expect(res.df).toBeGreaterThan(1);
    expect(res.pTwoSided).toBeGreaterThanOrEqual(0);
    expect(res.pTwoSided).toBeLessThanOrEqual(1);
  });

  test('effectSizeTwoSample returns finite d/g', () => {
    const high = [10, 11, 9, 12, 10];
    const low = [1, 2, 0, 3, 1];
    const res = effectSizeTwoSample(high, low);
    expect(Number.isFinite(res.cohensD)).toBe(true);
    expect(Number.isFinite(res.hedgesG)).toBe(true);
  });

  test('computeFiveNumberSummary returns sensible quartiles', () => {
    const summary = computeFiveNumberSummary([1, 2, 3, 4, 5]);
    expect(summary.min).toBe(1);
    expect(summary.max).toBe(5);
    expect(summary.q1).toBeGreaterThanOrEqual(summary.min);
    expect(summary.median).toBeGreaterThanOrEqual(summary.q1);
    expect(summary.q3).toBeGreaterThanOrEqual(summary.median);
    expect(summary.max).toBeGreaterThanOrEqual(summary.q3);
  });

  test('bootstrapMeanDifferenceCI is deterministic with a fixed seed', () => {
    const high = [10, 11, 9, 12, 10];
    const low = [1, 2, 0, 3, 1];

    const a = bootstrapMeanDifferenceCI({ high, low, seed: 42, iterations: 500 });
    const b = bootstrapMeanDifferenceCI({ high, low, seed: 42, iterations: 500 });

    expect(a).toEqual(b);
    expect(a.lower).toBeLessThanOrEqual(a.upper);
    expect(a.method).toBe('bootstrap-percentile');
  });
});
