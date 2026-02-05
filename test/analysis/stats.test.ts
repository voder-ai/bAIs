import { describe, expect, test } from 'vitest';

import {
  computeDescriptiveStats,
  computeFiveNumberSummary,
  bootstrapMeanDifferenceCI,
  pearsonCorrelation,
  olsRegression,
  effectSizeTwoSample,
  welchTTestTwoSided,
  proportionZTest,
  chiSquareTest,
  proportionCI,
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

  test('pearsonCorrelation returns expected sign and bounds', () => {
    const x = [1, 2, 3, 4, 5];
    const y = [2, 4, 6, 8, 10];
    const r = pearsonCorrelation(x, y);
    expect(r).toBeGreaterThan(0.99);
    expect(r).toBeLessThanOrEqual(1);
  });

  test('olsRegression returns positive slope and high r for linear data', () => {
    const x = [1, 2, 3, 4, 5];
    const y = [3, 5, 7, 9, 11];
    const res = olsRegression(x, y);
    expect(res.slope).toBeGreaterThan(0);
    expect(res.r).toBeGreaterThan(0.99);
  });

  test('proportionZTest compares two proportions', () => {
    // Group 1: 7/10 = 70% success, Group 2: 3/10 = 30% success
    const result = proportionZTest(7, 10, 3, 10);
    expect(Number.isFinite(result.z)).toBe(true);
    expect(result.pTwoSided).toBeGreaterThanOrEqual(0);
    expect(result.pTwoSided).toBeLessThanOrEqual(1);
    expect(result.z).toBeGreaterThan(0); // First group has higher proportion
  });

  test('chiSquareTest works on 2x2 contingency table', () => {
    // Test independence in a 2x2 table
    // Strong association: [20, 5] and [5, 20]
    const observed = [
      [20, 5],
      [5, 20],
    ];
    const result = chiSquareTest(observed);
    expect(Number.isFinite(result.chiSquare)).toBe(true);
    expect(result.df).toBe(1);
    expect(result.pValue).toBeGreaterThanOrEqual(0);
    expect(result.pValue).toBeLessThanOrEqual(1);
    expect(result.chiSquare).toBeGreaterThan(0);
  });

  test('proportionCI returns Wilson score interval', () => {
    // 7 successes out of 10 trials
    const ci = proportionCI(7, 10);
    expect(ci.method).toBe('wilson-score');
    expect(ci.alpha).toBe(0.05);
    expect(ci.lower).toBeGreaterThanOrEqual(0);
    expect(ci.upper).toBeLessThanOrEqual(1);
    expect(ci.lower).toBeLessThan(ci.upper);
    expect(ci.lower).toBeLessThan(0.7); // Should be below point estimate
    expect(ci.upper).toBeGreaterThan(0.7); // Should be above point estimate
  });

  test('proportionCI handles edge cases', () => {
    // 0 successes
    const ci0 = proportionCI(0, 10);
    expect(ci0.lower).toBe(0);
    expect(ci0.upper).toBeGreaterThan(0);

    // All successes
    const ci10 = proportionCI(10, 10);
    expect(ci10.lower).toBeLessThan(1);
    expect(ci10.upper).toBe(1);
  });

  test('proportionZTest handles equal proportions', () => {
    // Both groups have 50% success rate
    const result = proportionZTest(5, 10, 5, 10);
    expect(Math.abs(result.z)).toBeLessThan(0.1); // Should be near zero
    expect(result.pTwoSided).toBeGreaterThan(0.5); // Should be high p-value
  });
});
