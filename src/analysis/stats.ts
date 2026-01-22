import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

type SimpleStatisticsModule = {
  mean: (values: number[]) => number;
  median: (values: number[]) => number;
  sampleStandardDeviation: (values: number[]) => number;
  sampleVariance: (values: number[]) => number;
};

type JStatModule = {
  jStat: {
    studentt: {
      cdf: (x: number, df: number) => number;
    };
  };
};

const simpleStatistics = require('simple-statistics') as SimpleStatisticsModule;
const { jStat } = require('jstat') as JStatModule;

export type DescriptiveStats = Readonly<{
  n: number;
  mean: number;
  median: number;
  sampleStdDev: number;
  standardError: number;
}>;

export type WelchTTestResult = Readonly<{
  t: number;
  df: number;
  pTwoSided: number;
}>;

export type EffectSizeResult = Readonly<{
  cohensD: number;
  hedgesG: number;
}>;

export type FiveNumberSummary = Readonly<{
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
}>;

export type BootstrapCI = Readonly<{
  lower: number;
  upper: number;
  alpha: number;
  method: 'bootstrap-percentile';
  iterations: number;
  seed: number;
}>;

export type OlsRegression = Readonly<{
  slope: number;
  intercept: number;
  r: number;
}>;

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function quantileSorted(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) {
    throw new Error('quantileSorted: empty values');
  }
  if (p < 0 || p > 1) {
    throw new Error('quantileSorted: p must be in [0, 1]');
  }
  if (sorted.length === 1) {
    return sorted[0] ?? 0;
  }

  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  const lowerValue = sorted[lower];
  const upperValue = sorted[upper];
  if (lowerValue === undefined || upperValue === undefined) {
    throw new Error('quantileSorted: internal index error');
  }

  return lowerValue * (1 - weight) + upperValue * weight;
}

export function computeFiveNumberSummary(values: readonly number[]): FiveNumberSummary {
  if (values.length === 0) {
    throw new Error('computeFiveNumberSummary: empty values');
  }

  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  if (min === undefined || max === undefined) {
    throw new Error('computeFiveNumberSummary: internal empty state');
  }

  return {
    min,
    q1: quantileSorted(sorted, 0.25),
    median: quantileSorted(sorted, 0.5),
    q3: quantileSorted(sorted, 0.75),
    max,
  };
}

export function bootstrapMeanDifferenceCI(args: {
  high: readonly number[];
  low: readonly number[];
  alpha?: number;
  iterations?: number;
  seed?: number;
}): BootstrapCI {
  const alpha = args.alpha ?? 0.05;
  const iterations = args.iterations ?? 2000;
  const seed = args.seed ?? 123456789;

  if (alpha <= 0 || alpha >= 1) {
    throw new Error('bootstrapMeanDifferenceCI: alpha must be in (0, 1)');
  }
  if (iterations < 100) {
    throw new Error('bootstrapMeanDifferenceCI: iterations must be >= 100');
  }
  if (args.high.length === 0 || args.low.length === 0) {
    throw new Error('bootstrapMeanDifferenceCI: need at least 1 sample per group');
  }

  const rand = mulberry32(seed);
  const diffs: number[] = [];

  const sampleMean = (values: readonly number[]): number => {
    let sum = 0;
    for (let i = 0; i < values.length; i += 1) {
      const idx = Math.floor(rand() * values.length);
      const v = values[idx];
      if (v === undefined) {
        throw new Error('bootstrapMeanDifferenceCI: internal sampling error');
      }
      sum += v;
    }
    return sum / values.length;
  };

  for (let i = 0; i < iterations; i += 1) {
    const meanHigh = sampleMean(args.high);
    const meanLow = sampleMean(args.low);
    diffs.push(meanHigh - meanLow);
  }

  diffs.sort((a, b) => a - b);
  const lower = quantileSorted(diffs, alpha / 2);
  const upper = quantileSorted(diffs, 1 - alpha / 2);

  return {
    lower,
    upper,
    alpha,
    method: 'bootstrap-percentile',
    iterations,
    seed,
  };
}

export function pearsonCorrelation(x: readonly number[], y: readonly number[]): number {
  if (x.length !== y.length) {
    throw new Error('pearsonCorrelation: x and y must have same length');
  }
  if (x.length < 2) {
    throw new Error('pearsonCorrelation: need at least 2 paired samples');
  }

  const meanX = simpleStatistics.mean(x as number[]);
  const meanY = simpleStatistics.mean(y as number[]);

  let sxx = 0;
  let syy = 0;
  let sxy = 0;

  for (let i = 0; i < x.length; i += 1) {
    const xi = x[i];
    const yi = y[i];
    if (xi === undefined || yi === undefined) {
      throw new Error('pearsonCorrelation: internal index error');
    }
    const dx = xi - meanX;
    const dy = yi - meanY;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }

  if (sxx === 0 || syy === 0) {
    throw new Error('pearsonCorrelation: zero variance');
  }

  return sxy / Math.sqrt(sxx * syy);
}

export function olsRegression(x: readonly number[], y: readonly number[]): OlsRegression {
  if (x.length !== y.length) {
    throw new Error('olsRegression: x and y must have same length');
  }
  if (x.length < 2) {
    throw new Error('olsRegression: need at least 2 paired samples');
  }

  const meanX = simpleStatistics.mean(x as number[]);
  const meanY = simpleStatistics.mean(y as number[]);

  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < x.length; i += 1) {
    const xi = x[i];
    const yi = y[i];
    if (xi === undefined || yi === undefined) {
      throw new Error('olsRegression: internal index error');
    }
    const dx = xi - meanX;
    sxx += dx * dx;
    sxy += dx * (yi - meanY);
  }

  if (sxx === 0) {
    throw new Error('olsRegression: zero variance in x');
  }

  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;
  const r = pearsonCorrelation(x, y);

  return { slope, intercept, r };
}

export function computeDescriptiveStats(values: readonly number[]): DescriptiveStats {
  const n = values.length;
  if (n === 0) {
    throw new Error('computeDescriptiveStats: empty values');
  }

  const m = simpleStatistics.mean(values as number[]);
  const med = simpleStatistics.median(values as number[]);

  const sd = n >= 2 ? simpleStatistics.sampleStandardDeviation(values as number[]) : 0;
  const se = n >= 2 ? sd / Math.sqrt(n) : 0;

  return {
    n,
    mean: m,
    median: med,
    sampleStdDev: sd,
    standardError: se,
  };
}

export function welchTTestTwoSided(a: readonly number[], b: readonly number[]): WelchTTestResult {
  if (a.length < 2 || b.length < 2) {
    throw new Error('welchTTestTwoSided: need at least 2 samples per group');
  }

  const meanA = simpleStatistics.mean(a as number[]);
  const meanB = simpleStatistics.mean(b as number[]);

  const varA = simpleStatistics.sampleVariance(a as number[]);
  const varB = simpleStatistics.sampleVariance(b as number[]);

  const nA = a.length;
  const nB = b.length;

  const se2 = varA / nA + varB / nB;
  if (se2 === 0) {
    throw new Error('welchTTestTwoSided: zero standard error');
  }

  const t = (meanA - meanB) / Math.sqrt(se2);

  const numerator = se2 * se2;
  const denom = (varA * varA) / (nA * nA * (nA - 1)) + (varB * varB) / (nB * nB * (nB - 1));
  const df = numerator / denom;

  const cdf = jStat.studentt.cdf(Math.abs(t), df);
  const pTwoSided = 2 * (1 - cdf);

  return { t, df, pTwoSided };
}

export function effectSizeTwoSample(a: readonly number[], b: readonly number[]): EffectSizeResult {
  if (a.length < 2 || b.length < 2) {
    throw new Error('effectSizeTwoSample: need at least 2 samples per group');
  }

  const meanA = simpleStatistics.mean(a as number[]);
  const meanB = simpleStatistics.mean(b as number[]);
  const varA = simpleStatistics.sampleVariance(a as number[]);
  const varB = simpleStatistics.sampleVariance(b as number[]);

  const nA = a.length;
  const nB = b.length;

  const pooledVar = ((nA - 1) * varA + (nB - 1) * varB) / (nA + nB - 2);
  if (pooledVar === 0) {
    throw new Error('effectSizeTwoSample: zero pooled variance');
  }

  const pooledSd = Math.sqrt(pooledVar);
  const cohensD = (meanA - meanB) / pooledSd;

  const totalN = nA + nB;
  const correction = 1 - 3 / (4 * totalN - 9);
  const hedgesG = cohensD * correction;

  return { cohensD, hedgesG };
}
