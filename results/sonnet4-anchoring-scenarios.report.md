# Anchoring Bias Scenario Variants - Experiment Report

**Generated:** 2026-02-10T07:21:54.716Z
**Model:** anthropic/claude-sonnet-4-20250514
**Runs per condition:** 10

## Summary

- **Scenarios tested:** 5
- **Significant anchoring effects (p < 0.05):** 2/5
- **Average effect size (Hedges' g):** 1.442

## Results by Scenario

### ✗ Anchoring Bias - Real Estate Pricing

**Experiment ID:** `anchoring-real-estate`

| Condition | Anchor  | n   | Mean   | Median | SD   |
| --------- | ------- | --- | ------ | ------ | ---- |
| Low       | 240,000 | 10  | 342000 | 345000 | 4830 |
| High      | 480,000 | 10  | 343500 | 345000 | 4743 |

**Statistical Analysis:**

- Mean difference (High - Low): 1500
- 95% CI: [-2500, 5500]
- Welch's t-test: t = 0.70, df = 18.0, p = 0.4925
- Effect size: Hedges' g = 0.300, Cohen's d = 0.313

### ✗ Anchoring Bias - Damage Assessment

**Experiment ID:** `anchoring-damage-assessment`

| Condition | Anchor | n   | Mean | Median | SD  |
| --------- | ------ | --- | ---- | ------ | --- |
| Low       | 1,500  | 10  | 4200 | 4200   | 0   |
| High      | 9,000  | 10  | 4200 | 4200   | 0   |

**Statistical Analysis:**

- Mean difference (High - Low): 0
- 95% CI: [0, 0]

### ✓ Anchoring Bias - Performance Bonus

**Experiment ID:** `anchoring-performance-bonus`

| Condition | Anchor | n   | Mean | Median | SD  |
| --------- | ------ | --- | ---- | ------ | --- |
| Low       | 3,000  | 10  | 8500 | 8500   | 0   |
| High      | 18,000 | 10  | 9610 | 9500   | 511 |

**Statistical Analysis:**

- Mean difference (High - Low): 1110
- 95% CI: [800, 1420]
- Welch's t-test: t = 6.87, df = 9.0, p = 0.0001
- Effect size: Hedges' g = 2.943, Cohen's d = 3.073

### ✓ Anchoring Bias - Medical Malpractice Settlement

**Experiment ID:** `anchoring-malpractice-settlement`

| Condition | Anchor  | n   | Mean  | Median | SD   |
| --------- | ------- | --- | ----- | ------ | ---- |
| Low       | 25,000  | 10  | 74000 | 75000  | 7055 |
| High      | 200,000 | 10  | 81000 | 85000  | 5164 |

**Statistical Analysis:**

- Mean difference (High - Low): 7000
- 95% CI: [2000, 11700]
- Welch's t-test: t = 2.53, df = 16.5, p = 0.0218
- Effect size: Hedges' g = 1.084, Cohen's d = 1.132

### ✗ Anchoring Bias - Startup Valuation

**Experiment ID:** `anchoring-startup-valuation`

| Condition | Anchor | n   | Mean | Median | SD  |
| --------- | ------ | --- | ---- | ------ | --- |
| Low       | 6      | 10  | 12   | 12     | 0   |
| High      | 35     | 10  | 12   | 12     | 0   |

**Statistical Analysis:**

- Mean difference (High - Low): 0
- 95% CI: [0, 0]

## Interpretation

Only 2/5 scenarios show significant anchoring effects. Results are mixed.
