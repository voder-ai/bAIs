# LLM Review — Iteration 16

**Date:** 2026-03-01
**Commit:** 1a5b7a7 (Susceptibility Misleads pivot)
**Verdict:** NEEDS REVISION

## Summary

The paper argues that standard susceptibility metrics (high-low anchor spread) for evaluating LLM debiasing techniques can be misleading, because a technique may reduce spread while moving responses away from the model's unanchored baseline. It proposes complementary metrics (% of baseline, MAD) and demonstrates metric divergence across 21,139 trials with 10 models and 5 techniques across 6 domains.

---

## Major Issues (must address)

### 1. The "baseline as ground truth" problem is insufficiently resolved

The paper repeatedly states baselines are not ground truth, yet the entire ranking system and all practical recommendations depend on baseline proximity being the better metric. The paper's core claim is that susceptibility "misleads" while % of baseline gives the "right" answer—but this is an assumption, not a proven fact. If a model's unanchored baseline is itself biased (e.g., by the "12th offense" implicit anchor the authors acknowledge in Limitation 4), then a technique that moves responses *away* from baseline could be improving judgment.

**Fix needed:** Stronger philosophical defense of why baseline proximity should be preferred, OR reframe as "these metrics disagree, and practitioners must choose" rather than "susceptibility misleads."

### 2. Title overclaims

"Susceptibility Misleads" implies susceptibility is generally wrong. The paper shows susceptibility and baseline proximity *can* diverge—not that susceptibility is wrong. The paper's own argument is that both metrics are informative and practitioners should choose based on their goals.

**Fix needed:** Soften title, e.g., "When Susceptibility Metrics Diverge from Baseline Accuracy: ..."

### 3. Single-vignette primary study with unstable cross-domain results

14,152 of 21,139 trials use a single judicial sentencing vignette. The multi-domain extension (6,987 trials, 4 models) is explicitly marked exploratory and shows that rankings are unstable across domains. This substantially weakens the paper's ability to make general claims.

### 4. Internal tension between aggregate % of baseline and MAD rankings

SACD at 112% for high anchors and 75.7% for low anchors averages to ~93.7%, but this average hides that the technique is *not actually debiasing*—it's just producing errors in both directions that happen to cancel. If you use MAD consistently, SACD never ranks #1 in multi-domain. This tension is acknowledged but not fully resolved.

### 5. Limited conceptual novelty

The insight that "measuring spread ≠ measuring accuracy" is conceptually straightforward. The empirical contribution (21K trials) is substantial, but the conceptual contribution is thin for a main track paper at a top venue without a theoretical framework.

---

## Moderate Issues

### 6. Repetitive writing

The core finding (susceptibility vs. baseline proximity diverge) is stated at least 6-7 times (abstract, introduction, Section 1.1, Section 4.2, Section 4.8, Section 5, Conclusion). Needs significant condensation.

### 7. Random Control's strong performance underexplored

RC (doing nothing with structure) ranks #1 in Fraud and #2 in Medical. If doing nothing is sometimes best, this raises questions about whether any technique reliably helps—which is actually a strong finding that should be more prominently discussed.

### 8. Temperature ANOVA may not account for clustering

The F-test degrees of freedom suggest standard ANOVA rather than mixed effects. Was this also done with mixed effects?

---

## Minor Issues

### 9. Missing ‡ symbol in Table 5

Caption references a "‡" symbol for SACD's turn count, but no "‡" appears in the table body.

### 10. Abstract should qualify domain-specificity

Abstract claims "SACD shows the reverse: #3 under susceptibility but #1 under baseline proximity (93.7%)" — this is accurate for the judicial domain but SACD ranks #2-#5 in the multi-domain analysis.

---

## Actionable Fixes for Iteration 17

1. **Reframe title and thesis** — "Metrics Diverge" not "Susceptibility Misleads"
2. **Pick a lane philosophically** — either defend baseline proximity as better metric, or present as "practitioners must choose based on goals"
3. **Qualify all claims as domain-specific** — esp. in abstract and conclusion
4. **Move 6-turn ablation to Results** — currently in Discussion
5. **Condense repetition** — one clear statement of core finding, reference it elsewhere
6. **Elevate RC finding** — doing nothing sometimes wins; this is significant
7. **Fix Table 5 symbol** — add ‡ or remove reference
