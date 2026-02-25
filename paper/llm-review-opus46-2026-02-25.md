# LLM Paper Review — Opus 4.6 via pi-ai OAuth
**Date:** 2026-02-25
**Model:** anthropic/claude-opus-4-6
**Verdict:** NEEDS REVISION

---

# Detailed Review: "Debiasing Anchoring Bias in LLM Judicial Sentencing: Why Metric Choice Determines Technique Recommendation"

## Summary

This paper argues that evaluating LLM debiasing techniques using only susceptibility (high-low anchor spread) is insufficient, and that a complementary "percentage of baseline" metric—measuring proximity to unanchored responses—yields divergent technique rankings. Across ~14K judicial sentencing trials on 10 models and ~2K multi-domain trials, the authors show Devil's Advocate ranks #1 by susceptibility but #4 by baseline proximity, while SACD shows the reverse. Multi-domain experiments reveal technique effectiveness is domain-dependent.

---

## 1. Methodology

### Strengths
- Well-motivated experimental design grounded in established anchoring literature (Jacowitz & Kahneman 1995, Englich et al. 2006)
- Thoughtful inclusion of Random Control as an ablation isolating multi-turn structure from debiasing content
- Proportional anchor design (baseline × 0.5/1.5) is well-justified for cross-model comparison
- Mixed effects modeling appropriately accounts for non-independence
- Comprehensive model coverage (10 models, 4 providers)
- Transparent stopping rule and adaptive trial allocation

### Concerns

**Major:**

1. **Single vignette for the primary study.** The authors acknowledge this but it deserves more weight. All 14,152 judicial trials use the identical "Lena M." case. This means we cannot distinguish "technique effectiveness for anchoring bias in judicial sentencing" from "technique effectiveness for this specific prompt." The multi-domain extension (Section 5) partially addresses this but uses only 2 models and ~2K trials—a dramatic reduction in power and model coverage compared to the primary study. The paper's strongest claims rest on a single vignette.

2. **Proportional anchor circularity.** The authors acknowledge this in limitations but understate its implications. Anchors are set as baseline × 0.5 and baseline × 1.5. The "% of baseline" metric then measures responses relative to this same baseline. This creates a structural dependency: models with higher baselines receive higher absolute anchors, and the metric normalizes by the same baseline used to set those anchors. While within-model comparisons remain valid, cross-model aggregation (which drives the headline numbers like SACD's 93.7%) conflates anchor strength with model characteristics. The trial-weighted aggregation further compounds this: models with more trials (potentially those with more variable responses that triggered the adaptive stopping rule) disproportionately influence aggregate statistics.

3. **Multi-domain extension is underpowered for its claims.** Only 2 models (Opus 4.6 and Sonnet 4.5—wait, is this Sonnet 4.5 or 4.6? The main study uses Sonnet 4.6) with ~120 trials per technique-domain cell. The paper makes strong claims ("SACD ranks #1 on judicial but #5 on loan") that may not generalize beyond these two Anthropic models. This is a narrow foundation for the domain-dependence claim. Also, Sonnet 4.5 appears in the multi-domain section but was not in the primary model list—this needs clarification.

4. **The "% of baseline" metric has a directional averaging problem the authors partially acknowledge but don't fully address.** SACD achieves 93.7% as an average of 75.7% (low anchor) and 112.0% (high anchor). This means on any given trial, SACD is ~18-24 percentage points from baseline, not 6.3%. The mean absolute per-trial error of 18.1% (Table 7) is arguably the more honest metric. The paper presents the aggregate as the primary result while noting the per-trial error as secondary. This framing choice matters—it makes SACD look substantially better than it is on individual trials.

**Minor:**

5. **Temperature aggregation.** The paper states "Results are aggregated across temperatures unless otherwise noted" but then says "aggregate results elsewhere use t=1.0 baselines." This inconsistency should be clarified. Which temperature's baselines are used for the primary results?

6. **Opus 4.6 zero variance.** A model that always outputs exactly 18 months regardless of temperature is unusual enough to warrant deeper investigation. This could indicate the model is pattern-matching to a specific legal reference rather than reasoning about the case. Its inclusion inflates variance in model-level analyses.

7. **Outside View exclusion from rankings but inclusion in trial counts.** The 2,423 Outside View trials are counted in the 14,152 total but excluded from technique rankings due to confound. The presentation should be clearer about this.

---

## 2. Statistics

### Strengths
- Bootstrap CIs appropriately stratified by model
- Bonferroni correction for multiple comparisons
- TOST equivalence testing for SACD vs. Premortem
- Mixed effects modeling with ICC reporting
- Effect sizes (Cohen's d) consistently reported
- Power analysis provided

### Concerns

1. **The TOST equivalence bound of ±5 percentage points is somewhat arbitrary.** The justification ("smallest difference that would plausibly affect deployment decisions") is subjective. With different bounds, SACD and Premortem might not test as equivalent.

2. **Cohen's d calculations.** The paper reports d = 1.06 for SACD vs. Devil's Advocate, but doesn't specify whether this is computed on trial-level or model-level data. Given the nested structure (trials within models), trial-level d may be inflated by ignoring clustering.

3. **The ANOVA for temperature × technique interactions** reports "F < 1.5, p > 0.1 for all technique comparisons" without specifying degrees of freedom or exact values. For a paper emphasizing statistical rigor, this is insufficiently detailed.

4. **Table 1 "Spread (pp)" column.** The caption says spread is in "percentage-of-baseline space" with a note to "multiply by 0.29 for approximate months." This conversion factor is not derived or explained clearly. If average baseline is ~29 months, then 1 percentage point ≈ 0.29 months, but this varies substantially across models (18-36 months).

---

## 3. Citations

Pre-verified citations check out. Additional citations (Binz 2023, Englich 2006, Tversky & Kahneman 1974, etc.) are canonical references. 

**One concern:** The references `llm-bayesian-2025` (arXiv:2507.11768) and `llm-judge-overconfidence-2025` (arXiv:2508.06225) have arXiv IDs suggesting July/August 2025 publication. These are plausible but not in my pre-verified list. The Huang 2025 anchoring paper (arXiv:2505.15392) is also unverified but plausible. I flag these as minor—they support discussion points rather than core methodology.

The Maynard 2025 reference listed in verified citations doesn't appear in the paper—not an issue, just noting.

---

## 4. Internal Consistency

### Issues Found

1. **Multi-domain model discrepancy.** Section 5 states trials used "Claude Opus 4.6 and Claude Sonnet 4.5." The primary study uses Sonnet 4.6 (not 4.5). Is this a typo, or was a different model used? If Sonnet 4.5 was used, this should be in the model table and justified.

2. **Devil's Advocate temperature table vs. aggregate.** The temperature table shows 64.6%, 66.0%, 66.2% (average ~65.6%), but the aggregate is reported as 63.6%. The paper acknowledges this discrepancy ("aggregate results use t=1.0 baselines and are trial-weighted") but doesn't fully reconcile. If aggregate uses t=1.0, and Devil's Advocate at t=1.0 is 66.2%, why is the aggregate 63.6%? The explanation about trial-weighting vs. model-averaging only partially resolves this.

3. **Trial count reconciliation.** Table 3 sums to: 2389 + 2423 + 2215 + 2186 + 2166 + 1864 + 909 = 14,152. ✓ This checks out.

4. **Table 1 vs. Table 5 spread values.** Table 1 shows spread values (e.g., SACD 36.3pp); Table 5 shows the same spreads computed as High − Low (e.g., SACD: 112.0 − 75.7 = 36.3). ✓ Consistent.

5. **"No Technique" baseline.** Table 1 shows 72.9% for no-technique condition. This represents anchored responses without debiasing—the fact that even without intervention, anchored responses are at 72.9% of baseline establishes the anchoring effect. This is clearly presented.

6. **Figure 1 vs. Table 4 values.** Figure 1 shows 63.6, 78.3, 91.6, 93.7. Table 4 shows the same. ✓

---

## 5. Writing Quality

### Strengths
- Exceptionally clear writing for a methods-heavy paper
- The core finding (metric divergence) is stated upfront and reinforced throughout
- Tables and figures are well-designed and informative
- Limitations section is unusually thorough and honest
- Practical recommendations are grounded in evidence

### Concerns
- The paper is repetitive. The core metric divergence table appears (or is referenced) at least 4 times. The same numbers (93.7%, 63.6%) are repeated extensively. This could be tightened.
- The abstract is slightly too long and could be more concise.
- Section structure could be streamlined—the "two metrics" exposition appears in both Introduction and Methodology, creating redundancy.
- The Theoretical Grounding subsection (5.2 in Discussion) feels speculative relative to the otherwise empirical paper. Phrases like "may explain" and "potentially" appropriately hedge, but the connection between positional encoding theory and SACD failure is hand-wavy.

---

## 6. Overclaims

1. **"Why Metric Choice Determines Technique Recommendation" (title).** Slightly overclaimed—the paper shows metric choice *can* determine recommendation, demonstrated on one primary vignette. "Can determine" would be more precise.

2. **Multi-domain claims.** The abstract states "Technique effectiveness is domain-dependent" as a general finding, but this is based on 2 models and ~2K trials. This deserves stronger qualification.

3. **"No technique is universally best."** While likely true, the evidence base for this claim (4 domains, 2 models for 3 of them) is limited.

4. **The paper appropriately avoids overclaiming** in several areas: it notes baselines aren't "correct," emphasizes per-model testing, and acknowledges the single-vignette limitation. This is commendable.

---

## 7. Missing Elements

1. **No comparison to fixed absolute anchors.** The proportional design is reasonable but testing with fixed anchors would have strengthened external validity.

2. **No human comparison.** While not strictly necessary, comparing LLM anchoring magnitude to human effect sizes (Englich et al. 2006) would contextualize the findings.

3. **No formal pre-registration.** For a study emphasizing methodological rigor, pre-registration would strengthen credibility.

4. **Response extraction failures.** The paper mentions regex extraction but doesn't report how many trials failed to extract a numeric response, or how these were handled.

5. **Cost analysis.** SACD requires ~6× more API calls. A cost-effectiveness analysis would aid practitioners.

---

## Overall Assessment

This paper makes a genuinely useful methodological contribution: demonstrating that susceptibility and baseline-proximity metrics give divergent technique rankings for LLM debiasing. The core experimental design is sound, statistical analysis is thorough, and the writing is clear. The finding that metric choice determines recommendation is important for the field.

However, several significant issues limit confidence:

1. The primary study relies on a single vignette, making it unclear whether findings reflect general anchoring dynamics or prompt-specific artifacts.
2. The multi-domain extension that would address this concern is dramatically underpowered (2 models, ~120 trials/cell) relative to the claims it supports.
3. The "% of baseline" metric's averaging of bidirectional deviations somewhat undermines the case for SACD—the per-trial error of 18.1% tells a different story than the aggregate 6.3%.
4. The model discrepancy (Sonnet 4.5 vs 4.6) in the multi-domain section needs resolution.

The methodological insight is sound and publishable, but the empirical evidence needs strengthening—particularly the multi-domain results, which currently don't meet the standard of evidence the paper sets for itself.

---

## Verdict

**NEEDS REVISION**

Key revisions required:
1. **Expand multi-domain evaluation** to include more models (at minimum, the full set from the primary study) and more trials per cell. Alternatively, substantially downweight domain-dependence claims.
2. **Resolve the Sonnet 4.5 vs. 4.6 discrepancy** in the multi-domain section.
3. **Foreground per-trial error** (18.1% for SACD) alongside aggregate deviation (6.3%). The current framing overemphasizes the favorable aggregate.
4. **Add a second judicial vignette** (even a smaller-scale replication) to demonstrate the metric divergence isn't vignette-specific.
5. **Report response extraction failure rates.**
6. **Tighten the paper** by reducing redundancy—the same core finding is presented 4+ times.
7. **Provide complete ANOVA details** for temperature × technique interactions.

The core contribution is valuable and the paper is close to publishable, but the gap between the strength of claims and the evidence base—particularly for domain generalization—needs to be addressed.
