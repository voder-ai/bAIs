# Paper Statistics Report
Generated: 2026-02-23T07:55:54.422Z

## 1. Trial Counts by Condition

| Condition | Trials |
|-----------|--------|
| Baseline | 909 |
| Low-anchor | 909 |
| SACD (single-pass) | 0 |
| Full SACD (iterative) | 2397 |
| Outside View | 2430 |
| Premortem | 2188 |
| Devil's Advocate | 2174 |
| Random Control | 2242 |
| **Total** | **13249** |

## 2. Baseline Means by Model

| Model | Mean | SD | n |
|-------|------|----|----|
| claude-haiku-4.5 | 29.1mo | 11.2 | 90 |
| claude-opus-4.6 | 18.0mo | 0.0 | 90 |
| claude-sonnet-4.6 | 24.1mo | 1.3 | 90 |
| deepseek-v3.2 | 29.6mo | 8.0 | 92 |
| glm-5 | 31.9mo | 5.7 | 93 |
| gpt-4.1 | 25.1mo | 3.4 | 90 |
| gpt-5.2 | 31.8mo | 5.7 | 91 |
| kimi-k2.5 | 30.6mo | 7.4 | 92 |
| o3 | 33.7mo | 5.6 | 90 |
| o4-mini | 35.7mo | 4.7 | 91 |

## 3. Full SACD Effect by Model (Table 7)

| Model | Baseline | Final | Δ baseline→final | Assessment |
|-------|----------|-------|------------------|------------|
| claude-haiku-4.5 | 29.1mo | 13.8mo | -15.3mo | ⚠️ Overcorrects (too low) |
| claude-opus-4.6 | 18.0mo | 23.0mo | +5.0mo | ⚠️ Undercorrects (too high) |
| claude-sonnet-4.6 | 24.1mo | 22.2mo | -2.0mo | ✅ Near baseline |
| deepseek-v3.2 | 29.6mo | 29.9mo | +0.3mo | ✅ Near baseline |
| glm-5 | 31.9mo | 39.0mo | +7.1mo | ⚠️ Undercorrects (too high) |
| gpt-4.1 | 25.1mo | 22.8mo | -2.3mo | ⚠️ Moderate bias |
| gpt-5.2 | 31.8mo | 38.9mo | +7.1mo | ⚠️ Undercorrects (too high) |
| kimi-k2.5 | 30.6mo | 30.7mo | +0.1mo | ✅ Near baseline |
| o3 | 33.7mo | 30.9mo | -2.8mo | ⚠️ Moderate bias |
| o4-mini | 35.7mo | 28.2mo | -7.5mo | ⚠️ Overcorrects (too low) |

## 4. Sibony Technique Comparison

| Technique | Models Improved | Models Backfired | Avg Δ |
|-----------|-----------------|------------------|-------|
| Outside View | 10/10 | 0 | -14.1mo |
| Premortem | 6/10 | 3 | -1.8mo |
| Devil's Advocate | 10/10 | 0 | -9.9mo |
| Random Control | 9/10 | 1 | -5.7mo |

## 5. Random Control Effect by Model

| Model | Random Control Mean | Baseline | Δ (Structural Effect) |
|-------|---------------------|----------|-----------------------|
| claude-haiku-4.5 | 15.9mo | 29.1mo | -13.2mo |
| claude-opus-4.6 | 16.2mo | 18.0mo | -1.8mo |
| claude-sonnet-4.6 | 13.2mo | 24.1mo | -10.9mo |
| deepseek-v3.2 | 24.3mo | 29.6mo | -5.3mo |
| glm-5 | 27.8mo | 31.9mo | -4.1mo |
| gpt-4.1 | 14.7mo | 25.1mo | -10.4mo |
| gpt-5.2 | 28.8mo | 31.8mo | -2.9mo |
| kimi-k2.5 | 33.5mo | 30.6mo | +2.9mo |
| o3 | 31.0mo | 33.7mo | -2.7mo |
| o4-mini | 27.4mo | 35.7mo | -8.4mo |

**Range:** -13.2mo to 2.9mo
**Median:** -4.1mo

## 6. Temperature Effects on Backfire Models

| Model | t=0 | t=0.7 | t=1.0 | Best |
|-------|-----|-------|-------|------|
| claude-opus-4.6 | 23.6mo | 23.4mo | 22.1mo | t1.0 |
| gpt-5.2 | 39.8mo | 38.4mo | 38.5mo | t0.7 |
| glm-5 | 39.4mo | 39.1mo | 38.5mo | t1.0 |

## Summary

- **Total trials:** 13249
- **Models tested:** 10
- **Conditions:** 8
- **SACD backfire models:** claude-opus-4.6, glm-5, gpt-5.2
- **Universal winners:** Outside View (11/11 improved)
