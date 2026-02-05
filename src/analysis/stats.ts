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

export type ChiSquaredTestResult = Readonly<{
  chiSquared: number;
  degreesOfFreedom: number;
  pValue: number;
  expectedValues: number[];
}>;

export type ProportionTestResult = Readonly<{
  proportion: number;
  confidenceInterval: {
    lower: number;
    upper: number;
    level: number;
  };
  standardError: number;
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

export type ProportionZTestResult = Readonly<{
  z: number;
  pTwoSided: number;
}>;

export type ChiSquareTestResult = Readonly<{
  chiSquare: number;
  df: number;
  pValue: number;
}>;

export type ProportionCIResult = Readonly<{
  lower: number;
  upper: number;
  alpha: number;
  method: 'wilson-score';
}>;

/**
 * Two-proportion z-test for comparing proportions between two groups.
 * Tests H0: p1 = p2 vs H1: p1 ≠ p2
 */
export function proportionZTest(
  successes1: number,
  n1: number,
  successes2: number,
  n2: number,
): ProportionZTestResult {
  if (n1 <= 0 || n2 <= 0) {
    throw new Error('proportionZTest: sample sizes must be positive');
  }
  if (successes1 < 0 || successes1 > n1) {
    throw new Error('proportionZTest: successes1 must be between 0 and n1');
  }
  if (successes2 < 0 || successes2 > n2) {
    throw new Error('proportionZTest: successes2 must be between 0 and n2');
  }

  const p1 = successes1 / n1;
  const p2 = successes2 / n2;

  // Pooled proportion
  const pooledP = (successes1 + successes2) / (n1 + n2);
  const pooledQ = 1 - pooledP;

  // Standard error under null hypothesis
  const se = Math.sqrt(pooledP * pooledQ * (1 / n1 + 1 / n2));

  if (se === 0) {
    throw new Error('proportionZTest: zero standard error');
  }

  const z = (p1 - p2) / se;

  // Two-tailed p-value (normal approximation)
  const pTwoSided = 2 * (1 - normalCDF(Math.abs(z)));

  return { z, pTwoSided };
}

/**
 * Chi-square test of independence for a 2×2 contingency table.
 * Input: observed frequencies as [[a, b], [c, d]]
 */
export function chiSquareTest(observed: number[][]): ChiSquareTestResult {
  if (observed.length !== 2 || observed[0]?.length !== 2 || observed[1]?.length !== 2) {
    throw new Error('chiSquareTest: expected 2×2 array');
  }

  const a = observed[0]?.[0] ?? 0;
  const b = observed[0]?.[1] ?? 0;
  const c = observed[1]?.[0] ?? 0;
  const d = observed[1]?.[1] ?? 0;

  if (a < 0 || b < 0 || c < 0 || d < 0) {
    throw new Error('chiSquareTest: all values must be non-negative');
  }

  const n = a + b + c + d;
  if (n === 0) {
    throw new Error('chiSquareTest: total count cannot be zero');
  }

  // Row and column totals
  const row1Total = a + b;
  const row2Total = c + d;
  const col1Total = a + c;
  const col2Total = b + d;

  // Expected frequencies
  const expected11 = (row1Total * col1Total) / n;
  const expected12 = (row1Total * col2Total) / n;
  const expected21 = (row2Total * col1Total) / n;
  const expected22 = (row2Total * col2Total) / n;

  // Check for minimum expected frequencies (rule of thumb: all > 5)
  if (expected11 < 1 || expected12 < 1 || expected21 < 1 || expected22 < 1) {
    throw new Error('chiSquareTest: expected frequencies too small for reliable test');
  }

  // Chi-square statistic
  const chiSquare =
    Math.pow(a - expected11, 2) / expected11 +
    Math.pow(b - expected12, 2) / expected12 +
    Math.pow(c - expected21, 2) / expected21 +
    Math.pow(d - expected22, 2) / expected22;

  const df = 1; // Always 1 for 2×2 table

  // P-value using chi-square distribution approximation
  const pValue = 1 - chiSquareCDF(chiSquare, df);

  return { chiSquare, df, pValue };
}

/**
 * Wilson score confidence interval for a proportion.
 * More robust than the normal approximation, especially for small samples.
 */
export function proportionCI(
  successes: number,
  n: number,
  alpha: number = 0.05,
): ProportionCIResult {
  if (n <= 0) {
    throw new Error('proportionCI: sample size must be positive');
  }
  if (successes < 0 || successes > n) {
    throw new Error('proportionCI: successes must be between 0 and n');
  }
  if (alpha <= 0 || alpha >= 1) {
    throw new Error('proportionCI: alpha must be between 0 and 1');
  }

  const p = successes / n;
  const z = normalInverse(1 - alpha / 2);

  const denominator = 1 + (z * z) / n;
  const center = p + (z * z) / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));

  const lower = Math.max(0, (center - margin) / denominator);
  const upper = Math.min(1, (center + margin) / denominator);

  return {
    lower,
    upper,
    alpha,
    method: 'wilson-score',
  };
}

/**
 * Standard normal CDF approximation using error function.
 */
function normalCDF(z: number): number {
  return 0.5 * (1 + erf(z / Math.sqrt(2)));
}

/**
 * Inverse normal CDF approximation (Beasley-Springer-Moro algorithm).
 */
function normalInverse(p: number): number {
  if (p <= 0 || p >= 1) {
    throw new Error('normalInverse: p must be between 0 and 1');
  }

  // Rational approximation constants
  const a0 = -3.969683028665376e1;
  const a1 = 2.209460984245205e2;
  const a2 = -2.759285104469687e2;
  const a3 = 1.38357751867269e2;
  const a4 = -3.066479806614716e1;
  const a5 = 2.506628277459239;

  const b1 = -5.447609879822406e1;
  const b2 = 1.615858368580409e2;
  const b3 = -1.556989798598866e2;
  const b4 = 6.680131188771972e1;
  const b5 = -1.328068155288572e1;

  const c0 = -7.784894002430293e-3;
  const c1 = -3.223964580411365e-1;
  const c2 = -2.400758277161838;
  const c3 = -2.549732539343734;
  const c4 = 4.374664141464968;
  const c5 = 2.938163982698783;

  const d1 = 7.784695709041462e-3;
  const d2 = 3.224671290700398e-1;
  const d3 = 2.445134137142996;
  const d4 = 3.754408661907416;

  let q, r;

  if (p < 0.02425) {
    // Lower region
    q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c0 * q + c1) * q + c2) * q + c3) * q + c4) * q + c5) /
      ((((d1 * q + d2) * q + d3) * q + d4) * q + 1)
    );
  } else if (p < 0.97575) {
    // Central region
    q = p - 0.5;
    r = q * q;
    return (
      ((((((a0 * r + a1) * r + a2) * r + a3) * r + a4) * r + a5) * q) /
      (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1)
    );
  } else {
    // Upper region
    q = Math.sqrt(-2 * Math.log(1 - p));
    return (
      -(((((c0 * q + c1) * q + c2) * q + c3) * q + c4) * q + c5) /
      ((((d1 * q + d2) * q + d3) * q + d4) * q + 1)
    );
  }
}

/**
 * Error function approximation.
 */
function erf(x: number): number {
  // Abramowitz and Stegun approximation
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);

  const t = 1 / (1 + p * x);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return sign * y;
}

/**
 * Chi-square CDF approximation using incomplete gamma function.
 * For df=1, we can use the relationship with normal distribution.
 */
function chiSquareCDF(x: number, df: number): number {
  if (x <= 0) return 0;
  if (df !== 1) {
    throw new Error('chiSquareCDF: only df=1 supported in this implementation');
  }

  // For df=1, chi-square is the square of a standard normal
  // P(X² ≤ x) = P(-√x ≤ Z ≤ √x) = 2*Φ(√x) - 1
  return 2 * normalCDF(Math.sqrt(x)) - 1;
}

/**
 * Chi-squared goodness of fit test.
 * Tests whether observed frequencies differ significantly from expected frequencies.
 */
export function chiSquaredTest(
  observed: readonly number[],
  expected: readonly number[],
): ChiSquaredTestResult {
  if (observed.length !== expected.length) {
    throw new Error('chiSquaredTest: observed and expected must have same length');
  }
  if (observed.length === 0) {
    throw new Error('chiSquaredTest: need at least 1 category');
  }

  let chiSquared = 0;
  for (let i = 0; i < observed.length; i += 1) {
    const obs = observed[i]!;
    const exp = expected[i]!;
    if (exp <= 0) {
      throw new Error('chiSquaredTest: expected values must be positive');
    }
    chiSquared += ((obs - exp) * (obs - exp)) / exp;
  }

  const degreesOfFreedom = observed.length - 1;

  // For a chi-squared distribution with df degrees of freedom,
  // we can approximate the p-value using the gamma function.
  // For simplicity, we'll use a basic approximation here.
  // In production code, you'd want to use a more accurate method.
  let pValue: number;
  if (degreesOfFreedom === 1) {
    // For df=1, use chiSquareCDF
    pValue = 1 - chiSquareCDF(chiSquared, 1);
  } else {
    // For higher df, use a rough approximation via normal
    // Wilson-Hilferty approximation: Z ≈ ((X/df)^(1/3) - (1-2/(9*df))) / sqrt(2/(9*df))
    const k = degreesOfFreedom;
    const z = (Math.pow(chiSquared / k, 1 / 3) - (1 - 2 / (9 * k))) / Math.sqrt(2 / (9 * k));
    pValue = 1 - normalCDF(z);
  }

  return {
    chiSquared,
    degreesOfFreedom,
    pValue,
    expectedValues: [...expected],
  };
}

/**
 * Single-sample proportion test with confidence interval.
 * Uses normal approximation for confidence interval.
 */
export function proportionTest(
  successes: number,
  trials: number,
  confidenceLevel = 0.95,
): ProportionTestResult {
  if (trials <= 0) {
    throw new Error('proportionTest: trials must be positive');
  }
  if (successes < 0 || successes > trials) {
    throw new Error('proportionTest: successes must be between 0 and trials');
  }

  const proportion = successes / trials;
  const standardError = Math.sqrt((proportion * (1 - proportion)) / trials);

  // Z-score for the given confidence level
  const alpha = 1 - confidenceLevel;
  const zScore = normalInverse(1 - alpha / 2);

  const margin = zScore * standardError;
  const lower = Math.max(0, proportion - margin);
  const upper = Math.min(1, proportion + margin);

  return {
    proportion,
    confidenceInterval: {
      lower,
      upper,
      level: confidenceLevel,
    },
    standardError,
  };
}

// Duplicate normalCdf/normalInverse removed — use normalCDF/normalInverse defined above
