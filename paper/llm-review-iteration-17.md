# LLM Review — Iteration 17

**Date:** 2026-03-01
**Commit:** 2ffd44c (neutral "metrics diverge" reframe)
**Verdict:** NEEDS REVISION

## Summary

The paper argues that standard anchoring-bias evaluation (susceptibility/spread) and baseline-proximity metrics produce divergent technique rankings for LLM debiasing. It evaluates five techniques across 21,139 trials (14,152 judicial + 6,987 cross-domain) on up to 10 models, introducing MAD as a complementary metric.

---

## Major Issues

### 1. Finding is narrower than presented

The divergence is clear for Devil's Advocate (consistency without accuracy). But for other techniques, both metrics roughly agree (SACD and Premortem are top-2 on both). The "divergence" story is really a "Devil's Advocate pathology" story plus the unsurprising observation that different metrics can rank differently.

**Fix:** Reframe around "DA pathology + domain dependence" not "general metric divergence"

### 2. Statistical reporting issues

- **Cohen's d inflated:** With ICC=0.17, effect sizes are inflated by ~√(design effect). SACD vs DA d=1.06 might be closer to d≈0.18 after adjustment.
- **F-test df unadjusted:** Mixed-effects F-test reports F(3, 8950) with 8950 residual df, but if effective sample is ~60-70, these F-statistics are dramatically inflated. Should report Satterthwaite or Kenward-Roger adjusted df.
- **Missing CIs in Table 7:** Cross-domain analysis reports rankings but no formal tests or CIs.

### 3. Overclaims

- "Contribution #1: Cross-domain evaluation" is overclaimed given it's 4 models and marked exploratory
- Abstract confident, body tentative
- Paper implies baseline proximity is _better_ than susceptibility while claiming neutrality

### 4. Model handling

- **Haiku 85%+ refusal rate:** Creates severe selection bias. Surviving ~15% likely non-representative.
- **Opus zero variance:** Always outputs exactly 18 months. Not meaningfully "responding" to vignette.
- **Recommendation:** Either exclude or more carefully caveat both

### 5. Still too long

~30% too long due to repetition. Core finding stated at least 6 times.

---

## Medium Issues

### Terminology inconsistency

"Spread," "susceptibility," "high-low gap," and "asymmetry" used interchangeably.

### Weak related work

Missing key related work (Echterhoff et al. 2024, etc.). Section is thin for top venue.

### Baseline justification

Entire paper hinges on baseline proximity as correct reference. Defense of why baseline proximity is meaningful optimization target is insufficient.

---

## Minor Issues

- Section numbering off (no explicit Section 4 header)
- No appendix for full results (references GitHub)
- Temperature-stratified results not shown

---

## Verdict

**NEEDS REVISION**

The core insight is valuable but overclaiming relative to evidence needs addressing. Key fixes:

1. Tighter framing: DA pathology + domain dependence, not general divergence
2. Proper mixed-effects reporting with adjusted df and effect sizes
3. Either exclude or more carefully handle Opus and Haiku
4. Significant prose tightening
