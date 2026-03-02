Using model: anthropic/claude-opus-4-6

Sending paper for review...

---

=== LLM REVIEW ===

## Detailed Review

### Summary

This paper tests whether prompt implementations of human debiasing techniques (Devil's Advocate, SACD, Premortem, Outside View, Random Control) reduce anchoring bias in LLMs, using a judicial sentencing paradigm across 22,773 trials. The key finding is that susceptibility (standard metric) and % of baseline (proposed metric) give divergent rankings, and that no single prompt reliably transfers across models or domains. The paper advocates reporting MAD alongside aggregate metrics.

---

### 1. Methodology

**Strengths:**

- Well-motivated experimental design adapting Englich et al. (2006)
- Proportional anchors (±50% of baseline) are a reasonable design choice, well-justified
- 10 models across 5 providers gives decent breadth
- Temperature conditions tested and interaction shown to be negligible
- Sensitivity analyses for edge cases (Opus, Haiku) are thorough
- The 6-turn ablation is a valuable addition for addressing the turn-count confound
- Outside View exclusion due to confound is appropriately handled

**Concerns:**

- **Single prompt per technique** is the elephant in the room. The paper acknowledges this repeatedly, but the title and framing still read as evaluating "techniques" rather than "specific prompt implementations." The abstract says "one prompt implementation per technique" but the title says "Human Debiasing Prompts" which could be read more broadly. The paper does well acknowledging this in the body but could be more careful in the title.
- **ICC = 0.17 with 10 clusters:** The paper correctly flags that denominator df are approximate and random-effects estimates may be unreliable. This is a real limitation but is adequately acknowledged.
- **Haiku's 85%+ refusal rate** creates severe selection bias for that model. The paper acknowledges this but still includes Haiku in aggregates and in Table 5 (SACD by model). The 47.8% figure for Haiku is based on survivors of an 85%+ filtering process — this probably deserves stronger flagging than a parenthetical caveat.
- **GPT-5.2 protocol difference** (single-prompt simulation vs. true multi-turn) is acknowledged but somewhat buried. This affects the 6-turn ablation results meaningfully.

**Minor methodological issues:**

- The stopping rule (min n=30, added trials for high-variance conditions) is a form of optional stopping. The paper mentions this in Limitations but doesn't discuss whether it could bias results. Bootstrap CIs partially mitigate this.
- The "12th offense" in the base vignette as a potential implicit anchor is noted — good.

### 2. Statistics

**Strengths:**

- Bootstrap CIs throughout
- Bonferroni correction applied
- Power analysis with design effect calculation
- TOST for SACD-Premortem equivalence
- Effect sizes reported
- The F-test caveat about model clustering inflating df is excellent self-awareness

**Concerns:**

- **Table 3 (metric comparison):** CIs are shown for % of baseline but not for susceptibility spread. This is asymmetric reporting — the susceptibility values should also have CIs to support claims about ranking divergence.
- **Mixed effects model (Eq. 4):** With only 10 model clusters, this model is somewhat unreliable as acknowledged. The fixed effects are reported as point estimates without CIs or SEs — these should be included for a main-track publication.
- **MAD definition (Eq. 3):** The formula divides by the model's baseline $b_m$, making MAD a relative measure. But the text doesn't discuss what happens when baselines are very different across models — aggregating relative MAD across models with baselines from 18 to 36 months could weight models unequally. This isn't discussed.
- **Trial count discrepancy:** Table 1 sums to 14,152 (2389+2423+2215+2186+2166+1864+909 = 14,152) ✓. The text says 14,152 + 8,621 = 22,773 ✓. Internal consistency checks out.

### 3. Citations

- Pre-verified citations (Lyu 2025, Chen 2025, Lim 2026, Maynard 2025) — though Maynard 2025 is listed as verified but doesn't appear in the references.bib or paper text. Not an issue.
- All model names confirmed as current.
- `llm-bayesian-2025` (arXiv:2507.11768) and `llm-judge-overconfidence-2025` (arXiv:2508.06225) — these have dates in July and August 2025, plausible.
- `song2026reasoning` (arXiv:2602.06176) — February 2026, plausible.
- `nowak2026abcd` (arXiv:2602.17445) — February 2026, plausible.
- Klein 2007 is cited as a book, but the premortem technique is more commonly attributed to Klein's earlier work. Minor.
- Kahneman 1993 is cited for "Outside View" / reference class forecasting — this paper is actually about timid choices/bold forecasts. The Outside View concept is more directly from Kahneman & Tversky (1979) or Kahneman & Lovallo (1993) broadly, but the specific "reference class forecasting" framing came later. This is a minor attribution issue.

### 4. Internal Consistency

**Checked and consistent:**

- Table 3 and Table 4 spread values match (DA: 23.7pp, RC: 30.1pp, SACD: 36.3pp, PM: 45.2pp) ✓
- Table 6 anchor asymmetry: SACD spread = 112.0 - 75.7 = 36.3pp, matches Table 3 ✓
- Figure 1 values match Table 3 % of baseline values ✓
- Table 5 SACD model-specific: range 47.8%–127.8% matches "~48% to ~128%" claims ✓
- Main study n = 14,152 ✓

**Potential inconsistency:**

- Abstract says "93.7% of unanchored baseline, though confounded by its 6-turn structure vs. 3 turns for others" — consistent with tables ✓
- Abstract says DA "at only 63.6% of baseline—_further from baseline than doing nothing_ (72.9%)" — 63.6% < 72.9% ✓

### 5. Writing Quality

**Strengths:**

- Exceptionally transparent about limitations — among the most honest self-assessments I've seen
- Clear signposting of confounds throughout
- The boxed caveats are effective for highlighting key limitations
- Abstract is information-dense but clear
- Practical recommendations are concrete and actionable

**Weaknesses:**

- **The paper is somewhat repetitive.** The key findings (DA worse than no intervention, SACD high variance, metric divergence) are restated many times — abstract, intro, results, discussion, conclusion. Some consolidation would improve readability.
- **Section structure:** The paper jumps between main study and multi-domain extension in ways that can be confusing. The multi-domain section uses different models and a different primary metric (MAD vs. % of baseline), which is justified but adds cognitive load.
- **"Percentage points" vs. "percent":** Generally handled well with "pp" notation, though some passages could be clearer.
- **Figure 4 (MAD heatmap):** Referenced but is an external PDF (`figures/mad-heatmap.pdf`). Cannot verify content.
- **Minor:** "Trial-weighted means" in statistical analysis — the weighting scheme should be briefly explained (is it just per-trial, or something more complex?).

### 6. Overclaims

**Generally well-calibrated.** The paper is notable for its restraint. However:

- **Title concern:** "Testing Implementations of Human Debiasing Prompts" is slightly broader than "Testing One Implementation Each of Five Human Debiasing Techniques." The abstract clarifies, but titles matter.
- **"Evidence from 22,773 trials"** — while technically correct, the two studies use different models, domains, and primary metrics. Combining the numbers in the title implies a more unified dataset than exists.
- The claim "standard evaluation metrics can recommend the wrong prompt" is strong but supported — DA ranks #1 on susceptibility, #4 on % of baseline.
- The practical recommendation to "add conversation turns" based on Random Control's performance (+5pp) is reasonable but should note this is within a specific experimental context.
- **"Debiasing theater"** for Opus's overshoot — appropriately flagged as speculative.

### 7. Missing Elements for Main Track

- **No formal Related Work comparison table** showing how this paper differs from concurrent work (Lyu 2025, Lim 2026, etc.)
- **No discussion of prompt sensitivity** beyond acknowledging it exists. Given that the paper tests exactly one prompt per technique, even a brief pilot showing variation across prompt phrasings would strengthen the contribution substantially — but I note the constraint that no additional experiments can be requested.
- **The MAD recommendation**, while sensible, is not novel — MAD is a standard statistical measure. The contribution is more about demonstrating its value in this specific context.
- **Missing comparison to simple baselines** (e.g., "ignore the anchor" instruction) — acknowledged in Limitations #10.

---

### Summary of Required Text Fixes

1. **Title:** Should more clearly indicate "specific prompt implementations" rather than suggesting comprehensive testing of techniques. Suggest: "Testing Single Implementations of Human Debiasing Prompts in LLMs: Evidence from 22,773 Anchoring Bias Trials"
2. **Table 3:** Add CIs for susceptibility spread values to match the rigor applied to % of baseline.
3. **Mixed effects (Section 4.6):** Report SEs or CIs for fixed effect estimates (+11.9pp, +9.8pp, etc.).
4. **Haiku in aggregates:** More prominently flag that Haiku's 85%+ refusal rate means its contribution to aggregates is based on a highly selected sample. Consider reporting aggregates with and without Haiku in the main results table (not just in Limitations).
5. **MAD aggregation across models:** Add a brief note about whether relative MAD appropriately aggregates across models with very different baselines.
6. **Reduce repetition:** The core findings are stated ~5 times. Consolidate in Results/Discussion.
7. **Kahneman 1993 citation:** Verify this is the intended reference for "Outside View" / reference class forecasting specifically.

---

### Verdict

This is a well-executed empirical study with unusually strong self-awareness about its limitations. The core finding — that susceptibility and baseline proximity give divergent rankings — is genuinely useful for the field. The transparency about confounds (turn count, Outside View jurisdiction, model edge cases) is exemplary. The scale (22,773 trials, 10 models) is substantial.

However, several text-level issues need addressing before publication: missing CIs on susceptibility values, missing SEs on mixed-effects estimates, the title's slight overclaim relative to the single-prompt-per-technique design, and the Haiku selection bias issue deserving more prominent treatment. The repetitive structure could be tightened. These are all fixable without new experiments.

The contribution is meaningful but somewhat narrow: it demonstrates that one set of prompt implementations doesn't reliably transfer, and that metric choice matters. The generalizability claim is limited by the single-prompt design, which the paper acknowledges extensively but which nonetheless bounds the contribution's scope.

**NEEDS REVISION** — Significant text issues (missing statistical reporting elements, title framing, structural repetition) that should be fixed, but the underlying work is solid and the findings are valuable. A focused revision addressing the seven points above would make this publication-ready.

=== END REVIEW ===

Model used: anthropic/claude-opus-4-6

⚠️ VERDICT: Needs revision
