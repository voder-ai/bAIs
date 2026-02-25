# Paper Statistics Report

Generated: 2026-02-24T20:10:14.574Z

## 1. Trial Counts by Condition

| Condition             | Trials    |
| --------------------- | --------- |
| Baseline              | 909       |
| Low-anchor            | 909       |
| SACD (single-pass)    | 0         |
| Full SACD (iterative) | 2397      |
| Outside View          | 2430      |
| Premortem             | 2188      |
| Devil's Advocate      | 2174      |
| Random Control        | 2242      |
| **Total**             | **13249** |

## 2. Baseline Means by Model

| Model             | Mean   | SD   | n   |
| ----------------- | ------ | ---- | --- |
| claude-haiku-4.5  | 29.1mo | 11.2 | 90  |
| claude-opus-4.6   | 18.0mo | 0.0  | 90  |
| claude-sonnet-4.6 | 24.1mo | 1.3  | 90  |
| deepseek-v3.2     | 29.6mo | 8.0  | 92  |
| glm-5             | 31.9mo | 5.7  | 93  |
| gpt-4.1           | 25.1mo | 3.4  | 90  |
| gpt-5.2           | 31.8mo | 5.7  | 91  |
| kimi-k2.5         | 30.6mo | 7.4  | 92  |
| o3                | 33.7mo | 5.6  | 90  |
| o4-mini           | 35.7mo | 4.7  | 91  |

## 3. Full SACD Effect by Model (Table 7)

| Model             | Baseline | Final  | Δ baseline→final | Assessment                  |
| ----------------- | -------- | ------ | ---------------- | --------------------------- |
| claude-haiku-4.5  | 29.1mo   | 13.8mo | -15.3mo          | ⚠️ Overcorrects (too low)   |
| claude-opus-4.6   | 18.0mo   | 23.0mo | +5.0mo           | ⚠️ Undercorrects (too high) |
| claude-sonnet-4.6 | 24.1mo   | 22.2mo | -2.0mo           | ✅ Near baseline            |
| deepseek-v3.2     | 29.6mo   | 29.9mo | +0.3mo           | ✅ Near baseline            |
| glm-5             | 31.9mo   | 39.0mo | +7.1mo           | ⚠️ Undercorrects (too high) |
| gpt-4.1           | 25.1mo   | 22.8mo | -2.3mo           | ⚠️ Moderate bias            |
| gpt-5.2           | 31.8mo   | 38.9mo | +7.1mo           | ⚠️ Undercorrects (too high) |
| kimi-k2.5         | 30.6mo   | 30.7mo | +0.1mo           | ✅ Near baseline            |
| o3                | 33.7mo   | 30.9mo | -2.8mo           | ⚠️ Moderate bias            |
| o4-mini           | 35.7mo   | 28.2mo | -7.5mo           | ⚠️ Overcorrects (too low)   |

## 4. Sibony Technique Comparison

| Technique        | Models Improved | Models Backfired | Avg Δ   |
| ---------------- | --------------- | ---------------- | ------- |
| Outside View     | 10/10           | 0                | -14.1mo |
| Premortem        | 6/10            | 3                | -1.8mo  |
| Devil's Advocate | 10/10           | 0                | -9.9mo  |
| Random Control   | 9/10            | 1                | -5.7mo  |

## 5. Random Control Effect by Model

| Model             | Random Control Mean | Baseline | Δ (Structural Effect) |
| ----------------- | ------------------- | -------- | --------------------- |
| claude-haiku-4.5  | 15.9mo              | 29.1mo   | -13.2mo               |
| claude-opus-4.6   | 16.2mo              | 18.0mo   | -1.8mo                |
| claude-sonnet-4.6 | 13.2mo              | 24.1mo   | -10.9mo               |
| deepseek-v3.2     | 24.3mo              | 29.6mo   | -5.3mo                |
| glm-5             | 27.8mo              | 31.9mo   | -4.1mo                |
| gpt-4.1           | 14.7mo              | 25.1mo   | -10.4mo               |
| gpt-5.2           | 28.8mo              | 31.8mo   | -2.9mo                |
| kimi-k2.5         | 33.5mo              | 30.6mo   | +2.9mo                |
| o3                | 31.0mo              | 33.7mo   | -2.7mo                |
| o4-mini           | 27.4mo              | 35.7mo   | -8.4mo                |

**Range:** -13.2mo to 2.9mo
**Median:** -4.1mo

## 6. Temperature Effects on Backfire Models

| Model           | t=0    | t=0.7  | t=1.0  | Best |
| --------------- | ------ | ------ | ------ | ---- |
| claude-opus-4.6 | 23.6mo | 23.4mo | 22.1mo | t1.0 |
| gpt-5.2         | 39.8mo | 38.4mo | 38.5mo | t0.7 |
| glm-5           | 39.4mo | 39.1mo | 38.5mo | t1.0 |

## Summary

- **Total trials:** 13249
- **Models tested:** 10
- **Conditions:** 8
- **SACD backfire models:** claude-opus-4.6, glm-5, gpt-5.2
- **Universal winners:** Outside View (11/11 improved)

---

# Vignette Analysis

## 7. Vignette Trial Counts

| Vignette  | Trials   |
| --------- | -------- |
| loan      | 620      |
| medical   | 658      |
| salary    | 663      |
| **Total** | **1941** |

## 8. Anchoring Effect by Vignette

| Vignette | No-anchor | Low-anchor | High-anchor | Effect (H-L) |
| -------- | --------- | ---------- | ----------- | ------------ |
| loan     | 164.2     | 74.3       | 150.0       | +75.7        |
| medical  | 73.5      | 78.4       | 78.5        | +0.1         |
| salary   | 115.8     | 105.7      | 137.2       | +31.5        |

## 9. Debiasing Technique Effect by Vignette

### Loan

| Technique       | Low-anchor | High-anchor | Δ from baseline (Low) | Δ from baseline (High) |
| --------------- | ---------- | ----------- | --------------------- | ---------------------- |
| baseline        | 74.3       | 150.0       | +0.0                  | +0.0                   |
| devils-advocate | 76.1       | 193.2       | +1.8                  | +43.2                  |
| premortem       | 72.8       | 176.4       | -1.5                  | +26.4                  |
| random-control  | 81.7       | 159.9       | +7.3                  | +9.9                   |
| sacd            | 78.5       | 109.1       | +4.1                  | -40.9                  |

### Medical

| Technique       | Low-anchor | High-anchor | Δ from baseline (Low) | Δ from baseline (High) |
| --------------- | ---------- | ----------- | --------------------- | ---------------------- |
| baseline        | 78.4       | 78.5        | +0.0                  | +0.0                   |
| devils-advocate | 74.3       | 76.7        | -4.1                  | -1.8                   |
| premortem       | 74.7       | 81.4        | -3.7                  | +2.9                   |
| random-control  | 78.2       | 78.3        | -0.2                  | -0.2                   |
| sacd            | 86.6       | 66.0        | +8.2                  | -12.5                  |

### Salary

| Technique       | Low-anchor | High-anchor | Δ from baseline (Low) | Δ from baseline (High) |
| --------------- | ---------- | ----------- | --------------------- | ---------------------- |
| baseline        | 105.7      | 137.2       | +0.0                  | +0.0                   |
| devils-advocate | 114.2      | 131.9       | +8.5                  | -5.3                   |
| premortem       | 121.3      | 147.7       | +15.7                 | +10.5                  |
| random-control  | 114.2      | 138.1       | +8.5                  | +0.9                   |
| sacd            | 133.7      | 132.1       | +28.0                 | -5.1                   |

## 10. Model Comparison Within Vignettes

### Loan

| Model             | No-anchor | Low-anchor | High-anchor | Anchoring Effect |
| ----------------- | --------- | ---------- | ----------- | ---------------- |
| claude-opus-4-6   | 181.9     | 85.0       | 150.0       | +65.0            |
| claude-sonnet-4-5 | 146.5     | 63.7       | 150.0       | +86.3            |

### Medical

| Model             | No-anchor | Low-anchor | High-anchor | Anchoring Effect |
| ----------------- | --------- | ---------- | ----------- | ---------------- |
| claude-opus-4-6   | 72.0      | 72.0       | 72.0        | +0.0             |
| claude-sonnet-4-5 | 75.0      | 84.8       | 85.0        | +0.2             |

### Salary

| Model             | No-anchor | Low-anchor | High-anchor | Anchoring Effect |
| ----------------- | --------- | ---------- | ----------- | ---------------- |
| claude-opus-4-6   | 134.7     | 101.3      | 158.4       | +57.1            |
| claude-sonnet-4-5 | 98.2      | 110.1      | 116.0       | +5.9             |

## 11. Debiasing Effectiveness Comparison

**Paper metrics (from main.tex):**

- **% of Baseline** = R_technique / R_baseline × 100% (100% = perfect)

- **Deviation** = |% of Baseline - 100%| (0% = perfect)

- **Spread Δ%** = change in H-L gap vs no-technique (negative = reduced susceptibility)

### Loan

**Expected unanchored baseline:** 149.4
**Baseline spread (H-L):** 75.7

| Technique       | Low Mean | High Mean | Spread | Spread Δ% | Low % of BL | High % of BL | Avg % of BL | Deviation |
| --------------- | -------- | --------- | ------ | --------- | ----------- | ------------ | ----------- | --------- |
| baseline        | 74.3     | 150.0     | 75.7   | +0%       | 45.1%       | 92.4%        | 68.8%       | 31.2%     |
| devils-advocate | 76.1     | 193.2     | 117.0  | +55%      | 46.3%       | 118.3%       | 82.3%       | 17.7%     |
| premortem       | 72.8     | 176.4     | 103.6  | +37%      | 44.2%       | 107.8%       | 76.0%       | 24.0%     |
| random-control  | 81.7     | 159.9     | 78.2   | +3%       | 46.3%       | 94.8%        | 70.6%       | 29.4%     |
| sacd            | 78.5     | 109.1     | 30.6   | -60%      | 48.3%       | 67.1%        | 57.7%       | 42.3%     |

**Rankings:**

- By Spread Δ%: Lower (more negative) = better susceptibility reduction
- By Deviation: Lower = closer to unanchored baseline (100%)
- **Key insight from paper:** These rankings can diverge!

### Medical

**Expected unanchored baseline:** 63.6
**Baseline spread (H-L):** 0.1

| Technique       | Low Mean | High Mean | Spread | Spread Δ% | Low % of BL | High % of BL | Avg % of BL | Deviation |
| --------------- | -------- | --------- | ------ | --------- | ----------- | ------------ | ----------- | --------- |
| baseline        | 78.4     | 78.5      | 0.1    | +0%       | 112.4%      | 112.6%       | 112.5%      | 12.5%     |
| devils-advocate | 74.3     | 76.7      | 2.4    | +1971%    | 106.3%      | 109.8%       | 108.1%      | 8.1%      |
| premortem       | 74.7     | 81.4      | 6.7    | +5600%    | 106.9%      | 116.7%       | 111.8%      | 11.8%     |
| random-control  | 78.2     | 78.3      | 0.1    | -13%      | 112.1%      | 112.3%       | 112.2%      | 12.2%     |
| sacd            | 86.6     | 66.0      | -20.6  | -17757%   | 123.9%      | 94.5%        | 109.2%      | 9.2%      |

**Rankings:**

- By Spread Δ%: Lower (more negative) = better susceptibility reduction
- By Deviation: Lower = closer to unanchored baseline (100%)
- **Key insight from paper:** These rankings can diverge!

### Salary

**Expected unanchored baseline:** 108.5
**Baseline spread (H-L):** 31.5

| Technique       | Low Mean | High Mean | Spread | Spread Δ% | Low % of BL | High % of BL | Avg % of BL | Deviation |
| --------------- | -------- | --------- | ------ | --------- | ----------- | ------------ | ----------- | --------- |
| baseline        | 105.7    | 137.2     | 31.5   | +0%       | 93.2%       | 117.4%       | 105.3%      | 5.3%      |
| devils-advocate | 114.2    | 131.9     | 17.8   | -44%      | 99.3%       | 114.6%       | 106.9%      | 6.9%      |
| premortem       | 121.3    | 147.7     | 26.4   | -16%      | 106.5%      | 128.9%       | 117.7%      | 17.7%     |
| random-control  | 114.2    | 138.1     | 23.9   | -24%      | 100.1%      | 120.1%       | 110.1%      | 10.1%     |
| sacd            | 133.7    | 132.1     | -1.6   | -105%     | 115.7%      | 117.4%       | 116.5%      | 16.5%     |

**Rankings:**

- By Spread Δ%: Lower (more negative) = better susceptibility reduction
- By Deviation: Lower = closer to unanchored baseline (100%)
- **Key insight from paper:** These rankings can diverge!

## Vignette Summary

- **Total vignette trials:** 1941
- **Vignettes:** loan, medical, salary
- **Models tested:** 2
- **Techniques:** baseline, devils-advocate, premortem, random-control, sacd
