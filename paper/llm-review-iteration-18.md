# LLM Review — Iteration 18 (Honest Paper)

**Date:** 2026-03-01
**Commit:** 1ab1c39 (honest paper framing)
**Verdict:** NEEDS REVISION

## Summary

The "honest paper" framing is working better. Reviewer acknowledges the practical importance, substantial scale, and unusual transparency. However, fundamental issues remain.

---

## Strengths Noted

1. Important practical question (do human debiasing techniques transfer to LLMs?)
2. Substantial scale (21,139 trials, 10 models, 6 domains)
3. Unusually transparent about confounds
4. Mixed-effects modeling with ICC estimation
5. MAD metric contribution
6. Well-calibrated practical recommendations

---

## Major Issues

### 1. Single-Vignette Primary Study

14,152 of 21,139 trials use one judicial scenario. Multi-domain extension is exploratory (4 models). Title claim ("Don't Reliably Transfer") is overstated relative to evidence.

**Fix:** Either more modest scope ("in judicial sentencing") or expand multi-domain.

### 2. Proportional Anchor Design

Different models face different absolute anchors. Opus (baseline 18mo) gets 9/27mo anchors; o4-mini (baseline 35.7mo) gets 18/54mo anchors. This confounds cross-model aggregation.

**Fix:** More explicit discussion of this limitation.

### 3. % of Baseline Metric Limitations

- Assumes baseline is normatively correct (acknowledged but not fully addressed)
- Ratio behaves oddly for extreme baselines (5mo shift = 28% for Opus vs 14% for o4-mini)

**Fix:** Acknowledge more clearly.

### 4. Opus Zero Variance

A model that always returns exactly 18.0 months (SD=0.0) is degenerate. Including it inflates apparent technique "failure" rates.

**Fix:** More prominent caveat or exclusion.

### 5. Statistical Issues

- Bonferroni for 6 comparisons, but many more comparisons reported
- TOST ±5pp bound arbitrary
- Domain-specific rankings underpowered

**Fix:** Better family-wise error control or more caveats.

### 6. 6-Turn Ablation Underpowered

n=60 per model insufficient for the interpretive claims. GPT-5.2 protocol confound included despite caveats.

**Fix:** Either power up or remove model-specific claims.

---

## Moderate Issues

### 7. Missing Baselines

No Chain-of-Thought or "ignore the anchor" instruction tested.

**Fix:** Run these experiments (or acknowledge as future work).

### 8. "RC Outperforms DA" Under-Analyzed

Iatrogenic priming hypothesis is speculative. No analysis of DA response content.

**Fix:** Add content analysis or caveat more.

### 9. Writing Repetitive

Core finding stated 5+ times. Paper reads like technical report, not conference paper.

**Fix:** Tighten prose.

### 10. Limited Theoretical Contribution

We learn _that_ techniques don't transfer but not _why_.

**Fix:** Accept as empirical paper, or add mechanistic analysis.

---

## Minor Issues

- Table 3 ‡ marker missing
- Figure 1 cross-referencing
- Citation keys informal
- Trial count distinction (14,152 vs 21,139) could be clearer in abstract

---

## Decision Point

**Option A:** Fix text issues, accept limitations, submit as workshop/short paper
**Option B:** Run missing baselines (CoT, ignore-anchor), power up ablation, main track
**Option C:** Scope claims more modestly (judicial domain specifically)

The honest framing is an improvement. The issue is now scope vs evidence.
