# bAIs Calibration Analysis

Primary metric: |response - baseline| (lower = better calibration)

Generated: 2026-02-23T10:49:06.228Z

## 1. Anchored Response Distances from Baseline

How far anchored responses deviate from unbiased baseline:

- claude-opus-4-6: low=6.0mo, high=6.0mo, avg=6.0mo
- claude-sonnet-4-6: low=18.1mo, high=12.1mo, avg=15.1mo
- claude-haiku-4-5: low=19.6mo, high=16.3mo, avg=17.9mo
- gpt-5-2: low=8.9mo, high=15.2mo, avg=12.1mo
- gpt-4-1: low=9.5mo, high=13.1mo, avg=11.3mo
- o3: low=8.3mo, high=5.0mo, avg=6.7mo
- o4-mini: low=11.9mo, high=3.9mo, avg=7.9mo
- deepseek-v3-2: low=18.2mo, high=8.3mo, avg=13.2mo
- glm-5: low=8.4mo, high=12.1mo, avg=10.3mo
- kimi-k2-5: low=7.1mo, high=10.7mo, avg=8.9mo

## 2. Technique Calibration (Primary Results)

Improvement = reduction in |response - baseline|

- **full-sacd** (distance): 10.9mo → 6.7mo (+39% better)
- **random-control** (distance): 10.9mo → 7.7mo (+30% better)
- **premortem** (doubt): 10.9mo → 8.6mo (+22% better)
- **devils-advocate** (confrontation): 10.9mo → 10.7mo (+2% better)
- **outside-view** (replacement): 10.9mo → 14.1mo (-29% worse)

## 3. Taxonomy Summary

**Distance techniques:** +35% avg calibration improvement
  - full-sacd: +39%
  - random-control: +30%

**Doubt techniques:** +22% avg calibration improvement
  - premortem: +22%

**Replacement techniques:** -29% avg calibration improvement
  - outside-view: -29%

**Confrontation techniques:** +2% avg calibration improvement
  - devils-advocate: +2%

## 4. Model-Specific Calibration

### full-sacd

- ✓ claude-opus-4-6: +12%
- ✓ claude-sonnet-4-6: +85%
- ✓ claude-haiku-4-5: +16%
- ✓ gpt-5-2: +24%
- ✓ gpt-4-1: +58%
- ✓ o3: +54%
- ✓ o4-mini: +21%
- ✓ deepseek-v3-2: +58%
- ✓ glm-5: +28%
- ✓ kimi-k2-5: +10%

Models improved: 10/10

### random-control

- ✓ claude-opus-4-6: +37%
- ✓ claude-sonnet-4-6: +28%
- ✓ claude-haiku-4-5: +27%
- ✓ gpt-5-2: +34%
- ✓ gpt-4-1: +8%
- ✗ o3: -12%
- ✗ o4-mini: -5%
- ✓ deepseek-v3-2: +60%
- ✓ glm-5: +59%
- ✓ kimi-k2-5: +42%

Models improved: 8/10

### premortem

- ✓ claude-opus-4-6: +36%
- ✓ claude-sonnet-4-6: +53%
- ✓ claude-haiku-4-5: +33%
- ✓ gpt-5-2: +47%
- ✓ gpt-4-1: +8%
- ✗ o3: -116%
- ✓ o4-mini: +8%
- ✓ deepseek-v3-2: +66%
- ✗ glm-5: -34%
- ✓ kimi-k2-5: +32%

Models improved: 8/10

### outside-view

- ✓ claude-opus-4-6: +10%
- ✓ claude-sonnet-4-6: +77%
- ✓ claude-haiku-4-5: +40%
- ✗ gpt-5-2: -64%
- ✗ gpt-4-1: -3%
- ✗ o3: -252%
- ✗ o4-mini: -92%
- ✗ deepseek-v3-2: -4%
- ✗ glm-5: -117%
- ✗ kimi-k2-5: -78%

Models improved: 3/10

### devils-advocate

- ✓ claude-opus-4-6: +54%
- ✓ claude-sonnet-4-6: +9%
- ✓ claude-haiku-4-5: +19%
- ✓ gpt-5-2: +35%
- ✗ gpt-4-1: -21%
- ✗ o3: -30%
- ✗ o4-mini: -45%
- ✓ deepseek-v3-2: +47%
- ✗ glm-5: -18%
- ✗ kimi-k2-5: -71%

Models improved: 5/10

## 5. Trial Counts

- outside-view: 2,430
- full-sacd: 2,397
- random-control: 2,242
- premortem: 2,188
- devils-advocate: 2,174
- high-anchor: 955

**Total trials: 14,324**
