Using model: anthropic/claude-opus-4-6

Sending paper for review...

---

=== LLM REVIEW ===

# Detailed Review: "Debiasing Anchoring Bias in LLM Judicial Sentencing: How Metric Choice Can Determine Technique Recommendation"

## Summary
This paper argues that evaluating LLM debiasing techniques using only susceptibility (high-low anchor spread) is insufficient, and proposes baseline-relative metrics (% of baseline, MAD) as complements. Across ~21K trials on 10 models, the authors show that technique rankings invert depending on metric choice. The core contribution is methodological: advocating for unanchored baselines and MAD as primary evaluation metrics.

---

## 1. Methodology

### Strengths
- **Well-motivated experimental design.** Collecting unanchored baselines following Jacowitz & Kahneman (1995) is sensible and surprisingly underused in LLM bias evaluation.
- **Large trial count** (21K+) across diverse models and providers.
- **Temperature controls** tested and appropriately aggregated after confirming no interaction.
- **Proportional anchor design** (0.5× and 1.5× baseline) is reasonable for cross-model fairness, and the authors acknowledge limitations.
- **Mixed-effects modeling** properly accounts for model clustering; ICC reported and used to compute effective sample sizes.
- **Random Control condition** is a smart inclusion that isolates multi-turn effects from debiasing content.
- **Power analysis** is honest about effective sample sizes after design effect adjustment.

### Concerns

**Major:**

1. **Single vignette dominance.** The main study (14,152 trials, 10 models) uses a single judicial vignette (Lena M., 12th shoplifting offense). This is acknowledged but remains a serious limitation. The multi-domain extension partially addresses this but uses only 4 models and is explicitly labeled "exploratory." The paper's strongest claims rest on the single-vignette study, making it unclear how much is vignette-specific vs. generalizable.

2. **Proportional anchor circularity.** Anchors are set at 0.5× and 1.5× the model's own baseline. This means different models receive different absolute anchors. The % of baseline metric then measures deviation from the same baseline used to set anchors. While within-model comparisons are valid, this creates a confound: models with extreme baselines (Opus at 18mo, o4-mini at 36mo) receive very different anchor magnitudes in absolute terms. The authors acknowledge this but don't adequately explore how it affects their conclusions. A sensitivity analysis with fixed absolute anchors would substantially strengthen the paper.

3. **Opus 4.6 zero variance.** A model that always returns exactly 18 months regardless of condition or temperature is exhibiting highly unusual behavior. Including it inflates variance estimates and potentially distorts technique rankings. The authors claim "sensitivity analysis shows rankings are robust to exclusion" but never present this analysis in the paper—it's only mentioned in a table caption. This should be a proper supplementary analysis.

4. **"No technique" baseline ambiguity.** The anchored no-technique condition yields 72.9% of baseline. But baseline itself includes "12th offense" which the authors admit is not "truly unanchored." The entire metric framework rests on the quality of this baseline, yet its validity is only briefly noted in limitations.

**Minor:**

5. **Haiku 4.5 data quality.** The footnote mentions 85%+ judicial sentencing refusals for Haiku. How many valid trials remain? If very few, Haiku's extreme SACD result (47.8%) may be driven by a tiny, potentially unrepresentative sample.

6. **SACD implementation fidelity.** The paper implements SACD following Lyu (2025), but the actual prompts for the iterative debiasing steps are only sketched (Appendix A.4). Average iterations to convergence (2.5) and convergence criteria should be more precisely specified.

7. **Multi-domain model selection.** Only 4 of 10 models were used for the multi-domain study. The selection rationale ("Anthropic + GPT-5.2") isn't well justified. Including at least one reasoning model (o3) would have been valuable.

---

## 2. Statistics

### Strengths
- Bonferroni correction applied appropriately.
- Bootstrap CIs with stratification by model.
- TOST equivalence test for SACD vs. Premortem—good practice.
- Honest reporting of effective sample sizes after ICC adjustment.
- Clear acknowledgment that trial-level Cohen's d may be inflated.

### Concerns

1. **Mixed-effects F-test denominator df.** The authors note they use residual df rather than Satterthwaite approximation, yielding $F(3, 8950)$. With only 10 models, Satterthwaite df would be much smaller, and significance should be verified under proper df. The authors note this but don't recompute—this is relevant because the technique × anchor interaction is a key claim.

2. **Bootstrap CI interpretation.** CIs are reported as [92, 95] for SACD and [90, 93] for Premortem—these overlap, consistent with the non-significant p-value. But the paper still ranks SACD #1 and Premortem #2 based on point estimates. The paper should be more explicit that these two are statistically indistinguishable.

3. **Multi-domain rankings lack uncertainty quantification.** Table 5 reports point-estimate rankings across domains without CIs or significance tests. Many differences appear tiny (e.g., salary: random-control 12.5% vs. SACD 12.6%—a 0.1pp difference). Without uncertainty estimates, these rankings are unreliable. The claim "SACD ranks #1 on zero domains" is only valid for point estimates and could easily flip with noise.

4. **Trial-weighted vs. model-averaged means.** The rationale for trial-weighted is reasonable but creates a subtle issue: if some models have more trials in certain conditions, the weighting isn't purely about "random trial" probability but about data collection choices. The 93.7% vs. 97.7% gap for SACD is large enough to matter.

---

## 3. Citations

- Verified citations (Lyu 2025, Chen 2025, Lim 2026, Maynard 2025) check out per instructions. Note: Maynard 2025 is listed as verified but doesn't appear in the paper or bibliography—no issue, just noting.
- `llm-bayesian-2025` (arxiv 2507.11768) and `llm-judge-overconfidence-2025` (arxiv 2508.11768) are cited but not in the verified list. The arxiv IDs suggest July–August 2025, which is plausible. However, these are used for "speculative" theoretical grounding, so low risk.
- `song2026reasoning` (arxiv 2602.06176) is cited but not in the verified list. February 2026 arxiv—plausible but unverified.
- `huang2025anchoring` (arxiv 2505.15392) — May 2025, plausible but unverified.
- All classic citations (Tversky 1974, Englich 2006, Jacowitz 1995) are standard and correct.

No major citation concerns.

---

## 4. Internal Consistency

### Issues Found

1. **Trial count discrepancy.** Abstract says "14,152 judicial sentencing trials" and "6,987 multi-domain." Total = 21,139. Section 1 says "21,139 trials across 10 models (main study) and 4 models (multi-domain)." Section 3.2.5 says "14,152 judicial + 6,987 multi-domain = 21,139 analyzed." Table 1 individual condition totals: 2,389 + 2,423 + 2,215 + 2,186 + 2,166 + 1,864 + 909 = 14,152. ✓ Consistent.

2. **Spread values.** Table 2 shows SACD spread = 36.3pp. Table 4 shows SACD high (112.0%) - low (75.7%) = 36.3pp. ✓ Consistent.

3. **Devil's Advocate spread.** Table 2: 23.7pp. Table 4: 75.5% - 51.8% = 23.7pp. ✓ Consistent.

4. **SACD aggregate % of baseline.** Table 2: 93.7%. Table 3: 93.7%. Table 4: (75.7 + 112.0)/2 = 93.85% ≈ 93.7% (weighted average would differ slightly). Reasonably consistent.

5. **MAD values.** Table 6: SACD MAD = 18.1%, Premortem MAD = 22.6%. These should be computable from per-trial data but aren't fully derivable from reported aggregates alone. The paper says "average per-trial deviation" which is correct for MAD.

6. **Mixed effects section.** "Analysis includes 8,958 trials across 10 models and 4 techniques." 4 techniques × ~2,200 per technique = ~8,800. Roughly matches (outside view excluded from 14,152 total minus baselines minus outside view trials). Reasonable.

7. **Figure 1 vs. Table 2.** Both show the same values (63.6%, 78.3%, 91.6%, 93.7%). ✓ Consistent.

No significant internal inconsistencies detected.

---

## 5. Writing Quality

### Strengths
- Clear, well-structured, and readable.
- The core argument (metric choice determines recommendation) is communicated effectively and early.
- Tables and figures are well-designed and informative.
- Limitations section is unusually thorough and honest.
- Practical recommendations are concrete and actionable.

### Weaknesses
- **Redundancy.** The core finding is stated at least 6-7 times (abstract, intro, Section 1.2, Table 2 caption, Section 4.8, Section 5.2, conclusion). While some repetition aids comprehension, this is excessive.
- **Abstract is too long** (~280 words). Many venues limit to 200-250. More importantly, it reads like a mini-results section rather than a concise summary.
- **Section numbering inconsistency.** The multi-domain section is numbered 5 in text but there's no explicit Section 4 header for Results—it says "Results" but the numbering may be off in compilation.
- **"Ours" language for % of baseline.** This metric isn't novel—it's a direct application of Jacowitz & Kahneman's approach. The paper sometimes implies more novelty than warranted (e.g., "Percentage of Baseline (ours)" in Section 1.1).
- **AI disclosure.** While appreciated for transparency, the disclosure that an AI system "drafted manuscript text" may raise concerns about scientific rigor at some venues, though this is increasingly accepted.

---

## 6. Overclaims

1. **"We recommend MAD as the primary metric."** This is a reasonable recommendation but is stated too strongly given it's validated on essentially one primary domain (judicial sentencing) with a single vignette, plus an exploratory multi-domain extension. The paper would be stronger framing this as "MAD should be reported alongside susceptibility" rather than claiming primacy.

2. **"Metric choice determines technique recommendation"** — well-supported for the specific techniques and domains tested. The word "determines" is slightly strong; "can determine" (used in the title) is more accurate.

3. **Multi-domain "no technique dominates" claim.** Without confidence intervals on the domain-specific rankings, many of which show tiny differences (salary: 12.5% vs 12.6%), this claim is overstated. It may well be that with proper uncertainty quantification, several domains show no significant differences between techniques.

4. **"SACD ranks #1 on zero domains."** This point-estimate claim is particularly fragile given the small differences in several domains and the use of only 4 models.

5. **Random Control interpretation.** "Multi-turn structure alone helps more than Devil's Advocate content" is interesting but could have alternative explanations (e.g., the specific neutral content, recency effects, or that DA's argumentative framing systematically pushes responses in one direction).

---

## 7. Missing Elements

1. **No analysis of response distributions.** The paper mentions "positive skew" and discusses distributional properties briefly (Section 6.3) but provides no histograms or distributional plots. For a paper advocating MAD over aggregate means, showing actual distributions would be highly valuable.

2. **No formal comparison to Anchoring Index.** The paper mentions the classic AI metric but dismisses it briefly. A direct comparison showing AI vs. % of baseline vs. MAD would strengthen the methodological contribution.

3. **No discussion of prompt sensitivity.** How robust are results to small prompt variations? The exact wording "For experimental purposes, the following prosecutor's sentencing demand was randomly determined" could itself interact with debiasing techniques.

4. **No inter-trial correlation analysis.** Are sequential trials from the same model independent? API calls within a session might exhibit position effects.

---

## Overall Assessment

This paper makes a valid and practically useful methodological point: susceptibility alone is insufficient for evaluating LLM debiasing, and baseline-relative metrics (especially MAD) should be reported. The experimental scale is impressive, the statistical analysis is mostly careful, and the writing is clear.

However, several issues prevent a clean accept:

1. **The primary study relies on a single vignette**, with the multi-domain extension being underpowered (4 models) and explicitly exploratory.
2. **Multi-domain rankings lack uncertainty quantification**, making key claims ("SACD ranks #1 on zero domains") unreliable.
3. **The proportional anchor design creates a confound** that is acknowledged but not adequately addressed.
4. **Opus 4.6's zero-variance behavior** needs proper sensitivity analysis, not just a caption mention.
5. **The methodological contribution (use baselines + MAD) is sound but somewhat incremental**—it's essentially applying established psychometric practice to a new domain.

The paper is above average in rigor and transparency but falls short of what I'd expect for a top-tier main track venue, primarily due to the single-vignette limitation of the main study and the lack of statistical rigor in the multi-domain extension.

---

## Verdict: **NEEDS REVISION**

### Required Changes:
1. Add confidence intervals and significance tests to multi-domain rankings (Table 5). Qualify claims accordingly.
2. Present the Opus exclusion sensitivity analysis properly, not just in a caption.
3. Add response distribution visualizations (histograms) for at least the key conditions.
4. Tone down the "primary metric" framing for MAD to "complementary metric" or provide stronger validation across multiple domains with full model coverage.
5. Either expand the multi-domain study to include more models or substantially caveat the domain-specific rankings.

### Recommended Changes:
- Tighten the abstract to ≤250 words.
- Reduce redundancy in stating the core finding.
- Add a formal Anchoring Index comparison.
- Discuss prompt sensitivity.
- Clarify Haiku 4.5 valid trial counts after safety refusals.

=== END REVIEW ===

Model used: anthropic/claude-opus-4-6

⚠️ VERDICT: Needs revision
