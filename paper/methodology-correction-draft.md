# Methodology Correction: Direction vs Calibration

## The Problem

Our original analysis measured "improvement" as whether a technique moved estimates *away from the high anchor*. This is the standard approach in anchoring research: if a model shifts from 36mo (anchored) to 18mo (after technique), we report this as "improvement."

**However, this metric conflates two different questions:**

1. **Directional response**: Did the technique move the estimate in a consistent direction?
2. **Calibration to ground truth**: Did the technique bring the estimate closer to the unbiased baseline?

## Why This Matters

Consider Outside View on Haiku:
- Unbiased baseline: 29.1mo
- High-anchor response: ~36mo (before technique)
- Outside View response: 18.3mo

**Old metric (directional):**
- Moved from 36mo → 18.3mo = -17.7mo = "improvement" ✅

**Correct metric (calibration):**
- Distance before: |36 - 29.1| = 6.9mo
- Distance after: |18.3 - 29.1| = 10.8mo
- Change: +3.9mo further from baseline = **WORSENED** ❌

## Revised Analysis

| Technique | "Improved" (direction) | Calibrated (distance) | Worsened |
|-----------|------------------------|----------------------|----------|
| Outside View | 11/11 | 3/11 | 8/11 |
| Premortem | 8/11 | 4/11 | 6/11 |
| Devil's Advocate | 11/11 | 2/11 | 8/11 |
| Random Control | 10/11 | 4/11 | 4/11 |

## The Implicit Prior Problem

All techniques pull responses toward ~12-18mo, regardless of the actual baseline. This creates an **implicit prior**:
- Techniques embed their own "reasonable answer" (~15mo)
- They apply this prior regardless of ground truth
- When baseline > 20mo, the technique makes things WORSE

**This explains why Random Control "improves" 10/10 models** — the extra turns provide opportunity for the model's implicit prior to assert itself, regardless of conversation content.

## Paper Implications

### What We Originally Claimed
> "Outside View is universally safe" (11/11 improved, 0 backfired)

### What We Should Claim
> "All techniques exhibit implicit priors (~12-18mo) that dominate ground truth. No technique reliably calibrates to baseline. The 'improvement' observed in prior studies reflects directional consistency, not calibration improvement."

### This Is A Stronger Finding

This critique applies to the entire debiasing literature. Studies typically report effect sizes relative to anchored conditions, not relative to unbiased baselines. Our methodological correction:

1. **Explains non-replication**: Techniques "work" on some baselines but not others
2. **Reveals implicit priors**: All multi-turn interventions have hidden assumptions
3. **Warns practitioners**: "Improvement" in research may mean "different kind of wrong" in deployment

## Revised Abstract Language

FROM:
> "Among content-based techniques, Outside View (reference class reasoning) is the only intervention showing robust effects across all 10 models"

TO:
> "We identify a methodological flaw in standard debiasing evaluation: techniques are credited for directional movement rather than calibration to ground truth. When corrected, Outside View improves calibration for only 3/10 models; 8/11 show *increased* distance from baseline. All techniques embed implicit priors (~12-18mo) that override ground truth. This suggests debiasing studies may systematically overstate effectiveness."

## Revised Practical Recommendations

FROM:
> "Start with Outside View (universally safe)"

TO:
> "No technique is universally safe. All techniques impose implicit priors. Before deployment: (1) establish your task's ground truth baseline, (2) verify the technique's implicit prior doesn't conflict with it, (3) measure calibration, not just directional movement."
