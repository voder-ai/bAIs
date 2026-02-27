Using model: anthropic/claude-opus-4-6

Sending paper for review...

---

=== LLM REVIEW ===

# Detailed Review: "Debiasing Anchoring Bias in LLM Judicial Sentencing: How Metric Choice Can Determine Technique Recommendation"

## Summary

This paper argues that evaluating LLM debiasing techniques using only susceptibility (high-low anchor spread) is insufficient, and proposes complementing it with a "percentage of baseline" metric that measures proximity to the model's unanchored judgment. Across ~14,000 judicial sentencing trials on 10 models and ~2,000 multi-domain trials on 2 models, the authors demonstrate that these two metrics produce divergent technique rankings. The core finding—that Devil's Advocate looks best under susceptibility but worst under baseline proximity, while SACD shows the reverse—is genuinely interesting and practically important.

---

## 1. Methodology

### Strengths

- **Well-motivated metric comparison.** The central argument is sound: susceptibility alone can favor techniques that produce consistent but wrong responses. The Jacowitz & Kahneman (1995) grounding is appropriate.
- **Solid experimental scale.** 14,152 judicial trials across 10 models is substantial. The inclusion of a Random Control condition as an ablation for multi-turn structure is excellent experimental design.
- **Mixed-effects modeling.** Properly accounts for model clustering (ICC = 0.17). Random slopes analysis strengthens claims about model-specific variation.
- **Extensive transparency.** Adaptive stopping rule disclosed, sensitivity analyses provided, Outside View confound acknowledged and excluded from rankings, archived wrong-anchor data mentioned.

### Concerns

**Major:**

1. **Proportional anchor circularity is underexplored.** The authors acknowledge this but understate its implications. Anchors are set as baseline × 0.5 and baseline × 1.5, then responses are measured as % of that same baseline. This means the anchor "strength" in proportional terms is identical across models by construction, but the _absolute_ anchor distances differ (e.g., ±9 months for Opus vs. ±18 months for o4-mini). The % of baseline metric then normalizes by the same baseline used to set anchors. While the authors argue this enables fair within-model comparison, it means cross-model aggregation (which drives the headline numbers like 93.7%) is mixing fundamentally different experimental conditions. The paper would benefit from showing that key findings hold under fixed absolute anchors for at least a subset of models.

2. **Single vignette is a serious limitation for a top venue.** All 14,152 judicial trials use the identical "Lena M." case. The paper acknowledges this but the concern is more fundamental than acknowledged: the entire metric divergence finding could be an artifact of this specific case's properties (e.g., the 12th-offense framing may interact differently with different techniques). The multi-domain extension partially addresses this but uses only 2 models.

3. **The "percentage of baseline" metric assumes baseline is the target.** The paper states "baseline is not 'correct' in any absolute sense" but then uses deviation from baseline as the primary quality metric. If a model's unanchored judgment is itself poorly calibrated (e.g., Opus consistently saying 18 months), then "restoring to baseline" may not be desirable. The paper could strengthen this by discussing when baseline proximity is and isn't the right objective.

**Minor:**

4. **Temperature aggregation.** While the ANOVA shows no significant interaction, aggregating across temperatures introduces heterogeneity. The temperature-matched baseline approach is correct, but the paper should clarify whether the mixed-effects model includes temperature as a covariate.

5. **Adaptive stopping rule.** High-variance conditions received up to 3× more trials (90 vs. 30). The authors note this but the differential allocation could affect bootstrap CIs—cells with more data get tighter CIs, potentially making some comparisons appear more significant. This is partially mitigated by the Welch's t-test approach but warrants more explicit treatment.

---

## 2. Statistics

### Strengths

- Bootstrap CIs with model-stratified resampling are appropriate.
- Bonferroni correction applied correctly (6 pairwise comparisons, α = 0.0083).
- TOST equivalence test for SACD vs. Premortem is a sophisticated and appropriate choice.
- Power analysis provided with honest assessment of underpowered comparisons.
- ICC and random effects properly reported.

### Concerns

6. **Cohen's d caveat is insufficient.** The paper notes that d values "may be inflated by ignoring model clustering" but still presents them prominently (including the d = 1.06 headline). With ICC = 0.17 and only 10 clusters, the effective sample size is substantially smaller than 2,000+. The design effect is approximately 1 + (n_cluster - 1) × ICC ≈ 1 + (200-1) × 0.17 ≈ 34.8, meaning effective n per technique is ~60-70, not ~2,200. The paper should either compute cluster-adjusted effect sizes or more prominently caveat the raw d values.

7. **Trial counts don't perfectly add up.** Table 2 shows technique trials summing to 11,379 + 1,864 anchored + 909 baseline = 14,152. But the text says "14,152 judicial" and "16,198 total (14,152 + 2,046)." This checks out. However, the per-model-technique-temperature claim of "30-90 trials" × 10 models × 5 techniques × 3 temperatures = 4,500-13,500 technique trials; the actual 11,379 falls in range. Fine, but the uneven allocation makes it hard to verify completeness.

8. **Multi-domain statistical power.** ~120 trials per technique-domain cell (2,046 / 4 domains / ~4 techniques) is thin. The paper appropriately flags this as "preliminary" and "underpowered," but the findings are given substantial real estate (an entire section + abstract mention). The confidence intervals for multi-domain results are not reported in Table 5, which is a notable omission.

---

## 3. Citations

- Pre-verified citations (Lyu 2025, Chen 2025, Lim 2026, Maynard 2025) check out. Note: Maynard 2025 is listed as verified but does not appear to be cited in the paper.
- Jacowitz & Kahneman 1995, Tversky & Kahneman 1974, Englich et al. 2006 are canonical and correctly cited.
- `llm-bayesian-2025` (arXiv 2507.11768) and `llm-judge-overconfidence-2025` (arXiv 2508.06225) have arXiv IDs dated July and August 2025 respectively—plausible for February 2026 paper. These are used only in the "Speculative" discussion section, which is appropriate.
- `song2026reasoning` (arXiv 2602.06176) and `huang2025anchoring` (arXiv 2505.15392) — dates are plausible.
- Klein 2007 is cited for Premortem but the book referenced is "The Power of Intuition" — Premortem is more commonly associated with Klein's other writings (e.g., "Performing a Project Premortem," HBR 2007). Minor but slightly imprecise.

---

## 4. Internal Consistency

### Issues Found

9. **Devil's Advocate values.** Temperature table shows DA at 64.6%, 66.0%, 66.2% (model-averaged), but the aggregate is reported as 63.6% (trial-weighted). The paper explains this discrepancy ("63.6\% trial-weighted vs.\ $\sim$65.6\% model-averaged"), which is reasonable but the ~2pp gap suggests trial weighting substantially favors models where DA performs worst.

10. **Table 4 spread column.** The caption states "Spread = High − Low (mathematically equivalent to Table 1 spread column)." Checking: SACD High (112.0) − Low (75.7) = 36.3 pp ✓; DA High (75.5) − Low (51.8) = 23.7 pp ✓; Premortem: 114.2 − 69.0 = 45.2 pp ✓; Random: 93.5 − 63.4 = 30.1 pp ✓. All match Table 1. **Consistent.**

11. **SACD aggregate check.** Average of 75.7% and 112.0% = 93.85% ≈ 93.7% (with slight weighting differences). **Consistent.**

12. **Mixed effects fixed effects.** Grand mean 81.8% + SACD effect +11.9 = 93.7% ✓; +9.8 = 91.6% ✓; −3.5 = 78.3% ✓; −18.2 = 63.6% ✓. **Consistent.**

13. **Recovery rate.** (93.7 − 72.9) / (100 − 72.9) = 20.8 / 27.1 = 76.75% ≈ 77% ✓. **Consistent.**

14. **ICC calculation.** 294.9 / (294.9 + 1411.1) = 294.9 / 1706.0 = 0.1728 ≈ 0.17 ✓. **Consistent.**

Overall internal consistency is strong—I found no numerical contradictions.

---

## 5. Writing Quality

### Strengths

- Exceptionally clear structure. The "two metrics, opposite conclusions" framing is immediately compelling.
- Honest and transparent about limitations (adaptive stopping, single vignette, proportional anchors, Outside View confound, multi-domain being underpowered).
- Good use of practitioner-oriented guidance.
- Tables and figures are well-designed and informative.

### Concerns

15. **Length and redundancy.** The paper is quite long. The metric divergence finding (Table 1) is essentially presented three times: in the abstract, Section 1.2, and Section 3.3. The methodology section is extensive to the point of being a methods paper in itself. For a conference submission, tightening by 20-25% would improve readability.

16. **Authorship presentation.** "Voder AI" as first author with footnote "Voder AI is an autonomous AI agent built on Claude" is unusual and may raise reviewer concerns at some venues about accountability and intellectual contribution standards. The AI disclosure section helps but the authorship framing is unconventional.

17. **Speculative section.** Section 6.2 ("Theoretical Grounding (Speculative)") is labeled honestly but adds limited value. The connections to positional encoding and self-judgment overconfidence are hand-wavy and not tested. This could be cut or compressed to a paragraph.

---

## 6. Overclaims

18. **Abstract claims about multi-domain findings.** The abstract states "technique effectiveness appears domain-dependent" and provides specific rankings—this framing is appropriate (uses "appears" and "preliminary"). However, the abstract also states "SACD ranks #1 on judicial and medical but #5 (worst) on loan" without noting this is from only 2 models. The parenthetical about "broader model coverage" helps but could be stronger.

19. **"How Metric Choice Can Determine Technique Recommendation" (title).** This is well-supported by the data. Not an overclaim.

20. **"77% recovery rate" for SACD.** This framing is somewhat generous given that (a) it's an aggregate masking bidirectional deviation, (b) per-trial MAE is 18.1%, and (c) it ranges from 48% to 128% across models. The paper does flag these caveats, but the recovery rate framing will be what readers remember.

21. **Contribution 1 framing.** The paper claims the % of baseline metric as a contribution, but then correctly notes it's "standard in human anchoring research." The actual contribution is demonstrating that it produces divergent rankings for LLMs, which is genuinely novel and clearly stated.

---

## 7. Missing Elements

22. **No discussion of cost-effectiveness.** SACD requires ~6× more API calls than single-turn techniques. Given SACD and Premortem are statistically equivalent on baseline proximity (p = 0.054), Premortem dominates on cost-effectiveness. This is briefly mentioned in the appendix but deserves main-text treatment.

23. **No comparison to human anchoring effect sizes.** Given the Englich et al. (2006) framing, comparing LLM anchoring susceptibility to human susceptibility (d = 0.6-1.2) would contextualize the findings.

24. **No analysis of what makes SACD fail on specific models.** The paper documents that Haiku severely undershoots (47.8%) and Opus overshoots (127.8%) but offers only speculation about why. Even a simple analysis of SACD's intermediate reasoning steps for these models would strengthen the paper.

---

## Summary Assessment

**Core contribution is genuine and well-supported:** The metric divergence finding is important, clearly demonstrated, and practically useful. The experimental scale is impressive. Internal consistency is excellent. Limitations are honestly disclosed.

**Key weaknesses for a top venue:**

1. Single vignette limits generalizability claims
2. Proportional anchor design creates interpretive complications for cross-model aggregation
3. Multi-domain extension is too underpowered for the prominence given to it
4. Effect sizes may be substantially inflated due to clustering (design effect ~35×)
5. Paper is overlong with some redundancy

**The paper occupies an interesting middle ground:** The core finding (metric divergence) is a clean, replicable, and important methodological point. But the experimental design has enough limitations (single vignette, proportional anchors, clustering effects) that a top venue might want these addressed. The multi-domain extension, while commendably honest about its limitations, either needs to be expanded or demoted to a brief mention.

---

## Verdict: **NEEDS REVISION**

The central finding—that susceptibility and baseline-proximity metrics produce divergent technique rankings—is genuinely valuable for the LLM debiasing community. The experimental scale and statistical rigor are largely appropriate. However, three issues need addressing before main-track publication:

1. **Add at least 2-3 additional judicial vignettes** to demonstrate the finding isn't case-specific. This is the single biggest limitation.
2. **Either expand the multi-domain analysis** (more models, report CIs) **or substantially reduce its prominence** (move to appendix, remove from abstract). Currently it occupies disproportionate real estate relative to its statistical power.
3. **Report cluster-adjusted effect sizes** or at minimum compute the design effect and discuss how it affects the reported Cohen's d values. With ICC = 0.17, the effective sample sizes are ~60-70 per technique, not ~2,200—this changes the practical interpretation considerably.

Secondary revisions: tighten length by ~20%, compress or cut the speculative theory section, add cost-effectiveness comparison to main text, and consider the authorship presentation for the target venue.

=== END REVIEW ===

Model used: anthropic/claude-opus-4-6

⚠️ VERDICT: Needs revision
