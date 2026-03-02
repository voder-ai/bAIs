Using model: anthropic/claude-opus-4-6

Sending paper for review...

---

=== LLM REVIEW ===

# Detailed Review: Testing Implementations of Human Debiasing Prompts in LLMs

## Summary

This paper tests prompt implementations of four human cognitive debiasing techniques (plus a random control) for mitigating anchoring bias in LLMs. Across 22,773 trials (14,152 main judicial study + 8,621 multi-domain extension) and 10 models, the authors find that standard susceptibility metrics can diverge from baseline proximity metrics, that their Devil's Advocate prompt actually worsens bias, and that no prompt reliably transfers across models and domains. They advocate reporting MAD alongside aggregate metrics.

---

## 1. Methodology

**Strengths:**
- The experimental design is thoughtful: proportional anchors calibrated per-model, temperature controls, mixed-effects modeling with appropriate caveats about cluster count.
- The paper is unusually honest about confounds. The turn-count confound (SACD ~6 turns vs. 3 for others) is flagged repeatedly. The Outside View jurisdiction confound is acknowledged and the technique excluded from rankings. The 6-turn ablation, while small (n=238), is a genuine attempt to address the turn-count issue.
- The proportional anchor design is well-motivated and clearly explained as enabling within-model but not cross-model comparisons.
- Free-form numeric responses rather than MCQs is a good design choice.

**Concerns:**
- **Single prompt per technique is the elephant in the room.** The paper tests one implementation per debiasing approach and generalizes findings to the technique name (e.g., "Devil's Advocate makes bias worse"). The paper does acknowledge this ("results reflect single implementations," "alternative phrasings might perform differently"), but the degree of hedging is inconsistent. The title says "Human Debiasing Prompts" (plural, generic-sounding), while the abstract says "one prompt implementation per technique." The framing oscillates between "we tested prompts" and "this technique doesn't work." This needs tightening.
- **The baseline itself contains a potential anchor** ("12th offense"), which is acknowledged in Limitations item 4 but deserves more prominence. The entire metric framework rests on the baseline being the "anchor-free" reference, yet it contains numeric information that could function as an anchor.
- **Haiku's 85%+ refusal rate** means the surviving trials are a highly selected, potentially non-representative sample. The paper acknowledges this but still includes Haiku in aggregate calculations and figures. The sensitivity analysis showing rankings are preserved is helpful but doesn't fully address the selection bias concern.

## 2. Statistics

**Strengths:**
- Appropriate use of Welch's t-test with Bonferroni correction.
- Bootstrap CIs with stratified resampling by model.
- Honest acknowledgment that 10 clusters is insufficient for reliable random-effects estimation, with appropriate "treat as descriptive" caveats.
- Power analysis acknowledging the design effect from clustering (ICC=0.17).
- TOST equivalence testing for SACD vs. Premortem comparison.

**Concerns:**
- **F-test denominator df (Section 3.2.4):** The paper reports $F(6, 8944) = 1.42$ for the temperature×technique interaction and immediately acknowledges the df are "likely inflated" due to model clustering. Good self-correction, but the reported F-test is essentially meaningless if the effective denominator df should be dramatically smaller. Consider either not reporting it or reporting a corrected version.
- **Mixed-effects CIs omitted:** The paper states "CIs omitted given cluster caveats" for the mixed-effects fixed effects. This is honest but means the core mixed-effects results lack uncertainty quantification. The fixed-effect point estimates (SACD +11.9pp, DA -18.2pp) are presented without any sense of precision.
- **Bootstrap CI interpretation:** The CIs in Table 5 (e.g., SACD [92, 95]) appear quite narrow. The paper notes that "cluster bootstrap may yield wider CIs with only 10 clusters" — this is an important caveat that could meaningfully change the overlap/non-overlap of intervals. The current CIs may be overconfident.
- **MAD formula:** The formula in Equation 3 divides individual trial responses by the model's baseline. For Opus (baseline = 18.0, SD = 0.0), this means every single deviation is measured against an invariant point. This seems fine mathematically but worth noting that Opus's MAD is entirely driven by technique-induced variance, not baseline uncertainty.

## 3. Citations

All pre-verified citations check out. Additional citations (Wegener & Petty 2001, Maas & Hox 2005, Kahneman & Lovallo 1993, Jacowitz & Kahneman 1995) are well-established works that I can confirm are real and correctly attributed. The Maynard 2025 citation from the verified list does not appear in the paper, which is fine (it was just verified as available, not required).

One concern: `song2026reasoning` is cited as "arXiv:2602.06176" with a note "TMLR 2026 Survey Certification." This is a February 2026 preprint, which is plausible given the paper's timeline. `llm-bayesian-2025` (arXiv:2507.11768) and `llm-judge-overconfidence-2025` (arXiv:2508.06225) have 2025 dates with July/August arXiv IDs — these are plausible. `nowak2026abcd` (arXiv:2602.17445) is February 2026 — plausible.

## 4. Internal Consistency

**Issues found:**

- **Table 3 vs. Table 5:** Table 3 (metric comparison) and Table 5 (baseline percentage) report the same numbers for % of baseline and should be internally consistent. Checking: SACD 93.7% ✓, Premortem 91.6% ✓, RC 78.3% ✓, DA 63.6% ✓. Consistent.
- **Table 4 spread vs. Table 3 spread:** Table 4 (anchor asymmetry) shows SACD spread = 112.0 - 75.7 = 36.3pp. Table 3 shows SACD spread = 36.3pp. ✓ DA: 75.5 - 51.8 = 23.7pp, Table 3 = 23.7pp ✓. RC: 93.5 - 63.4 = 30.1pp, Table 3 = 30.1pp ✓. Premortem: 114.2 - 69.0 = 45.2pp, Table 3 = 45.2pp ✓. All consistent.
- **Trial count:** Abstract says "22,773 anchoring bias trials (14,152 main study + 8,621 multi-domain extension)." Table 1 sums to: 2389 + 2423 + 2215 + 2186 + 2166 + 1864 + 909 = 14,152 ✓. Multi-domain Table 7 sums to: 1735 + 1591 + 1482 + 1328 + 1351 + 1134 = 8,621 ✓. Total = 22,773 ✓.
- **Mixed-effects trial count:** "Analysis includes 8,956 trials across 10 models and 4 techniques." From Table 1: SACD + RC + Premortem + DA = 2389 + 2215 + 2186 + 2166 = 8,956 ✓.
- **Sensitivity claims:** "Excluding Opus shifts means <3pp" and "excluding Haiku shifts means <2pp" — stated in both Methodology and Table 5 caption. Consistent.
- **SACD excluding Haiku:** Stated as 91.2% in both Section 3.2 confounds and Section 4.4. ✓

**Minor inconsistency:**
- The abstract says "our SACD prompt achieves 93.7% of unanchored baseline, though confounded by its 6-turn structure vs. 3 turns for others" — the body says techniques use 3 turns but Random Control also uses 3 turns. This is consistent but the phrasing "3 turns for others" could be clearer since the base anchored condition is single-turn (or 1-turn with follow-up?). The experimental structure could be more explicitly laid out.

## 5. Writing Quality

**Strengths:**
- Exceptionally well-written for a technical paper. Clear, direct prose. Good use of bold for key findings.
- The boxed caveats (e.g., "Exploratory (5 models)") are effective signaling devices.
- Limitations section is thorough — 10 items, most substantive and honest.
- The paper's self-awareness is a genuine strength. It flags its own weaknesses more honestly than most submissions I review.

**Weaknesses:**
- **Length and repetition.** The same findings are stated multiple times: the abstract, introduction, results, and conclusion all repeat that DA performs at 63.6%, SACD at 93.7%, etc. Some consolidation would improve readability.
- **The authorship statement is unusual** and will be controversial. While I appreciate the transparency, listing AI agents as co-first authors will be a policy issue for most venues regardless of the intellectual argument. This is not a text quality issue but a submission strategy concern.
- **Section numbering:** The paper uses implicit section numbering that isn't always clear. "Section 5" is referenced for multi-domain but the actual section header is just "Multi-Domain Generalization" — the numbering depends on the LaTeX counter. Should be verified in compiled form.

## 6. Overclaims

**The paper is generally well-calibrated, but several issues remain:**

1. **Title framing:** "Testing Implementations of Human Debiasing Prompts" is fair, but it could be read as testing "the prompts" rather than "one prompt per technique." A more precise title would be "Testing Single-Prompt Implementations of..."

2. **Abstract claim "not reliably":** The abstract states debiasing prompts don't work "reliably" — this is supported for the specific implementations tested but could be over-read as a general indictment of the technique classes. The qualifier "For these prompts:" helps but could be stronger.

3. **Causal language about DA:** "our Devil's Advocate prompt produces responses at only 63.6% of baseline—*further from baseline than doing nothing*" — this is stated as a factual finding, which is fine. But the speculation about "iatrogenic effect" (priming models to attend to anchors) in Section 6.2 is appropriately flagged as speculative.

4. **"Debiasing theater" (Section 6.1):** The claim that some models may "appear corrected without genuine recalibration" is flagged as speculative. Good.

5. **Multi-domain generalization claims are appropriately hedged** with the boxed "Exploratory" label and noting all CIs overlap.

6. **The MAD recommendation is well-supported** by the data showing SACD's aggregate (93.7%) masking per-trial variance (MAD 18.1%).

## 7. Specific Text Issues to Fix

1. **Abstract, line 1:** "Do prompts implementing human debiasing techniques work on LLMs?" — This is too broad for what's tested. Suggest: "Do single prompt implementations of human debiasing techniques reduce anchoring bias in LLMs?"

2. **Table 3 caption:** "Ranking note: For susceptibility, lower spread = better (#1); for % of baseline, higher = better (#1)." — This ranking convention should also note that 100% is the target for % of baseline, not "higher is always better" (since >100% would be overshoot). Indeed, SACD's high-anchor responses average 112%, which is *not* better than 100%.

3. **Section 4.3 (High-Anchor Responses):** This section is interesting but somewhat tangential. It describes the compression phenomenon but doesn't directly connect to the prompt evaluation. Consider integrating more tightly or moving to supplementary.

4. **Table 6 caption:** "6-Turn Random Control: Revision Rates by Model" — The "Gap to SACD" column header is confusing. Positive gap means 6-Turn RC underperforms, negative means it exceeds — this is the opposite of intuitive reading. Clarify or reverse the sign convention.

5. **Equation 2:** "% of Baseline = R_prompt / R_baseline × 100%" — This works when responses are positive, but in principle, if a model gave negative responses (unlikely here but possible in other domains), this would break. Worth noting the metric assumes positive-valued responses.

6. **Section 3.2.6 (Statistical Analysis):** "Welch's t-test with Bonferroni correction (6 pairwise comparisons among 4 techniques, α = 0.0083)" — 4 techniques yield C(4,2) = 6 pairwise comparisons. Bonferroni: 0.05/6 = 0.0083. ✓ But where are the actual t-test results reported? I don't see a table of pairwise p-values. The effect sizes are reported in Section 4.2 but the hypothesis tests themselves seem to be missing.

7. **The "12th offense" baseline anchor** (Limitation 4) deserves more than a single bullet point. If the baseline itself is anchored, then the entire % of baseline metric is measuring deviation from an anchored (not truly unanchored) reference point. This doesn't invalidate the within-experiment comparisons but limits the interpretation of "100% = anchor-free."

8. **Missing from Limitations:** No discussion of prompt ordering effects. All techniques are applied in Turn 2 (or Turns 2-6 for SACD). Was the initial response always elicited in Turn 1? If so, the technique is essentially asking the model to revise a committed response, which is a different cognitive operation than debiasing *before* response generation.

## 8. Missing Methodological Details

- **Response extraction:** "Regex for integer months; 99.9% success" — What happened to the 0.1% failures? Were they excluded? This is ~23 trials out of 22,773 — negligible, but should be stated explicitly.
- **API parameters beyond temperature:** Were any other parameters set (top_p, max_tokens, system prompts)?
- **Trial independence:** Were trials run independently (separate API calls) or batched? This matters for potential context contamination.

---

## Overall Assessment

This is a solid empirical contribution with an important methodological insight (susceptibility vs. baseline proximity can diverge, and MAD reveals hidden variance). The experimental scale is impressive (22,773 trials), the statistical approach is appropriate with honest caveats, and the writing quality is high.

**However, several issues prevent me from recommending immediate publication:**

1. **The single-prompt-per-technique limitation needs stronger framing throughout.** The paper oscillates between "we tested these prompts" and implications about the techniques themselves. The title, abstract, and conclusion should be more consistently scoped to "specific implementations."

2. **Missing pairwise test results** — the paper describes the statistical framework but doesn't report the actual hypothesis tests.

3. **The bootstrap CIs may be overconfident** given only 10 clusters, and the paper acknowledges this but doesn't provide corrected estimates.

4. **Section 4.3 (compression phenomenon)** feels underdeveloped relative to its prominence — either expand with analysis or reduce.

5. **The authorship format** will be a practical barrier at most venues regardless of the intellectual merits of the argument.

---

## Verdict: **NEEDS REVISION**

The core findings are sound and the paper makes a genuine contribution (metric divergence insight, MAD recommendation, large-scale empirical evidence of model-specific prompt sensitivity). However, the following text-level issues should be addressed before publication:

1. **Tighten scope language** throughout — title, abstract, section headers — to consistently reflect "single prompt implementations" rather than "techniques."
2. **Report the actual pairwise hypothesis tests** that are described in the methods but absent from results.
3. **Address the bootstrap CI width concern** more directly — either run cluster bootstrap and report wider CIs, or add a more prominent caveat that current CIs are likely too narrow.
4. **Add the missing methodological details** (failed extraction handling, API parameters, trial independence).
5. **Resolve the ranking convention** in Table 3 caption (% of baseline: higher is NOT always better if >100% represents overshoot).
6. **Reconsider the authorship format** for venue compliance, regardless of philosophical position.

These are achievable text and framing fixes that would bring the paper to publication standard. The experimental work itself is complete and sufficient.

=== END REVIEW ===

Model used: anthropic/claude-opus-4-6

⚠️ VERDICT: Needs revision
