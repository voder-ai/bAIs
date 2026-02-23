# bAIs Statistical Analysis

All statistics computed deterministically from raw JSONL trial data.

Generated: 2026-02-23T11:08:33.754Z

## 1. Anchored Baseline Distance (No Technique)

- n = 1509
- Mean = 12.35mo
- SD = 6.12mo
- 95% CI = [12.04, 12.67]mo

## 2. Technique Effects (with 95% CI)

### full-sacd

- n = 2391
- Mean distance = 9.44mo (95% CI: [9.13, 9.76])
- Improvement vs anchored = 23.6% (95% CI: [20.0%, 27.2%])
- Welch's t = 13.03, df = 3713.0, p < 0.001 ***
- Cohen's d = 0.41 (small)

### premortem

- n = 2186
- Mean distance = 11.11mo (95% CI: [10.77, 11.45])
- Improvement vs anchored = 10.1% (95% CI: [6.3%, 13.8%])
- Welch's t = 5.33, df = 3660.9, p < 0.001 ***
- Cohen's d = 0.17 (negligible)

### random-control

- n = 2215
- Mean distance = 11.28mo (95% CI: [10.97, 11.59])
- Improvement vs anchored = 8.7% (95% CI: [5.1%, 12.3%])
- Welch's t = 4.81, df = 3600.3, p < 0.001 ***
- Cohen's d = 0.15 (negligible)

### devils-advocate

- n = 2166
- Mean distance = 12.14mo (95% CI: [11.84, 12.44])
- Improvement vs anchored = 1.7% (95% CI: [-1.8%, 5.2%])
- Welch's t = 0.98, df = 3499.4, p = 0.3266 ns
- Cohen's d = 0.03 (negligible)

### outside-view

- n = 2423
- Mean distance = 15.08mo (95% CI: [14.77, 15.38])
- Improvement vs anchored = -22.0% (95% CI: [-25.6%, -18.5%])
- Welch's t = -12.34, df = 3685.4, p < 0.001 ***
- Cohen's d = -0.38 (small)

## 3. Pairwise Technique Comparisons

| Comparison | Δ Mean | t | p | Sig |
|------------|--------|---|---|-----|
| full-sacd vs premortem | -1.67mo | -7.11 | <.001 | *** |
| full-sacd vs random-control | -1.84mo | -8.18 | <.001 | *** |
| full-sacd vs devils-advocate | -2.70mo | -12.31 | <.001 | *** |
| full-sacd vs outside-view | -5.64mo | -25.43 | <.001 | *** |
| premortem vs random-control | -0.17mo | -0.73 | 0.468 | ns |
| premortem vs devils-advocate | -1.03mo | -4.49 | <.001 | *** |
| premortem vs outside-view | -3.97mo | -17.13 | <.001 | *** |
| random-control vs devils-advocate | -0.86mo | -3.93 | <.001 | *** |
| random-control vs outside-view | -3.80mo | -17.13 | <.001 | *** |
| devils-advocate vs outside-view | -2.94mo | -13.58 | <.001 | *** |

## 4. Model-Specific Results (Full SACD)

- **claude-opus-4-6**: -68% improvement (p < 0.001) *
- **claude-sonnet-4-6**: 46% improvement (p < 0.001) *
- **claude-haiku-4-5**: -2% improvement (p = 0.619) ns
- **gpt-5-2**: 20% improvement (p = 0.002) *
- **gpt-4-1**: 48% improvement (p < 0.001) *
- **o3**: 51% improvement (p < 0.001) *
- **o4-mini**: 12% improvement (p = 0.021) *
- **deepseek-v3-2**: 30% improvement (p < 0.001) *
- **glm-5**: -4% improvement (p = 0.554) ns
- **kimi-k2-5**: -3% improvement (p = 0.691) ns

## 5. Summary Table (for paper)

| Technique | Mean Dist | 95% CI | Improvement | p-value | Effect Size |
|-----------|-----------|--------|-------------|---------|-------------|
| Anchored (no technique) | 12.4mo | [12.0, 12.7] | — | — | — |
| full-sacd | 9.4mo | [9.1, 9.8] | +24% | <.001 | d=0.41 |
| premortem | 11.1mo | [10.8, 11.5] | +10% | <.001 | d=0.17 |
| random-control | 11.3mo | [11.0, 11.6] | +9% | <.001 | d=0.15 |
| devils-advocate | 12.1mo | [11.8, 12.4] | +2% | 0.327 | d=0.03 |
| outside-view | 15.1mo | [14.8, 15.4] | -22% | <.001 | d=-0.38 |
