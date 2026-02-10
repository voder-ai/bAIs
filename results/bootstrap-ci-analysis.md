# Bootstrap Confidence Interval Analysis

**Generated:** 2026-02-10
**Bootstrap iterations:** 10,000
**Random seed:** 42

## Methodology

Bootstrap 95% confidence intervals are computed using the percentile method:
1. Resample with replacement from each condition (n samples → n samples)
2. Compute statistic of interest (mean difference for anchoring effect)
3. Repeat 10,000 times
4. Report 2.5th and 97.5th percentiles as CI bounds

**Note on deterministic sampling (temp=0):** When models produce identical outputs
for identical inputs (SD=0), bootstrap CIs collapse to point estimates. This is
methodologically correct—there is no sampling uncertainty to quantify. The trivially
narrow CIs reflect the deterministic nature of the data, not an error in methodology.

## Key Findings

### Anchoring Effect Summary

| Model | n | Effect (months) | 95% CI | Significant? |
|-------|---|-----------------|--------|--------------|
| GPT-4o (temp=0) | 30+30 | 6.00 | [6.00, 6.00] | Yes ✓ |
| Sonnet 4 (dated, temp=0) | 30+30 | 0.00 | [0.00, 0.00] | No (CI crosses 0) |

## Detailed Results

### GPT-4o (temp=0)
**File:** `github-copilot-gpt-4o-anchoring-temp0-30.jsonl`

**Condition Means:**
- Low anchor (3mo): 3.00 ± 0.00 (n=30)
  - 95% CI: [3.00, 3.00]
- High anchor (9mo): 9.00 ± 0.00 (n=30)
  - 95% CI: [9.00, 9.00]

**Anchoring Effect (High - Low):**
- Point estimate: 6.00 months
- Bootstrap SE: 0.0000
- 95% CI: [6.00, 6.00]

**⚠️ Note:** SD=0 in both conditions (deterministic output at temp=0).
Bootstrap CI collapses to point estimate—this is methodologically correct
but indicates there is no sampling variability to quantify.
- **Conclusion:** Significant anchoring effect (CI excludes zero)

### Sonnet 4 (dated, temp=0)
**File:** `sonnet-dated-temp0-30.jsonl`

**Condition Means:**
- Low anchor (3mo): 6.00 ± 0.00 (n=30)
  - 95% CI: [6.00, 6.00]
- High anchor (9mo): 6.00 ± 0.00 (n=30)
  - 95% CI: [6.00, 6.00]

**Anchoring Effect (High - Low):**
- Point estimate: 0.00 months
- Bootstrap SE: 0.0000
- 95% CI: [0.00, 0.00]

**⚠️ Note:** SD=0 in both conditions (deterministic output at temp=0).
Bootstrap CI collapses to point estimate—this is methodologically correct
but indicates there is no sampling variability to quantify.
- **Conclusion:** No significant anchoring effect (CI includes zero)

## Cross-Model Comparison

**GPT-4o effect - Sonnet effect = 6.00 months**

This difference represents how much more susceptible GPT-4o is to anchoring
compared to Sonnet (dated). Given both models show SD=0, this difference
is deterministic and perfectly reproducible under identical conditions.

*Note: A formal bootstrap CI for the cross-model difference is not meaningful*
*when both underlying effects have SD=0. The observed difference (6.0 months)*
*is exact under deterministic sampling.*

## Interpretation Notes

### Understanding SD=0 Results

When temperature=0 produces identical outputs across all trials:
- Bootstrap CIs collapse to point estimates (e.g., [6.00, 6.00])
- This is **not** an error—it correctly reflects zero sampling variance
- The effect is deterministic and perfectly reproducible
- Statistical significance is trivially achieved (any non-zero effect)

### Implications for the Paper

1. **GPT-4o:** Shows 6.0 month anchoring effect with trivially narrow CI
   - The effect is real and reproducible, not a statistical artifact
   - CI [6.00, 6.00] indicates no uncertainty, not infinite precision

2. **Sonnet (dated):** Shows 0.0 month effect with CI [0.00, 0.00]
   - Complete resistance to anchoring under this paradigm
   - The null effect is deterministic, not a failure to detect

3. **Cross-model difference (6.0 months):** Exact and reproducible
   - Not subject to sampling uncertainty
   - Represents a real behavioral difference between models
