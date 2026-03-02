Using model: anthropic/claude-opus-4-6

Sending paper for review...

---

=== LLM REVIEW ===

# Detailed Review: Testing Implementations of Human Debiasing Prompts in LLMs

## Summary

This paper tests whether prompts implementing human cognitive debiasing techniques (Devil's Advocate, SACD, Premortem, Outside View, Random Control) reduce anchoring bias in LLMs. Across 22,773 trials with 10 models, the authors find that effectiveness is highly variable across models and domains, and that standard evaluation metrics (susceptibility) can diverge from baseline proximity metrics, potentially recommending the wrong prompt. The paper advocates reporting MAD alongside aggregate metrics.

---

## 1. Methodology

**Strengths:**
- Large trial count (22,773) across 10 models and 6 domains provides substantial empirical grounding.
- Proportional anchor design (±50% of each model's baseline) is well-motivated and correctly described as enabling within-model comparisons.
- The paper is unusually thorough in identifying and disclosing confounds: turn-count differences, Outside View's jurisdiction confound, Haiku's refusal rates, Opus's zero variance, GPT-5.2's protocol difference.
- The 6-turn Random Control ablation (Section 5.4) partially addresses the turn-count confound, though with limited sample size (n=238).
- Temperature interaction tested and reported.

**Concerns:**
- **Single prompt per technique is the fundamental limitation.** The paper tests one implementation of each debiasing technique and generalizes to the technique category. While the authors acknowledge this repeatedly ("results reflect specific prompt implementations"), the framing—especially in the title and abstract—sometimes slips into implying findings about the techniques themselves rather than specific prompts. The title says "Human Debiasing Prompts" but really this is "Five Specific Prompts." The abstract's "Do prompts implementing human debiasing techniques work on LLMs?" frames this as a broader question than one-prompt-per-technique can answer. This tension is acknowledged but could be handled more carefully in framing.
- **ICC = 0.17 with only 10 clusters** is a genuine statistical concern. The paper acknowledges this (citing Maas 2005), but then still reports F-tests and mixed-effects results that may be unreliable with so few clusters. The "treat as descriptive" caveat is appropriate but somewhat undermined by presenting these results prominently.
- **The proportional anchor design** means that different models receive different absolute anchors. This is well-motivated for within-model comparisons but limits the interpretability of cross-model aggregates—a point the paper acknowledges but could emphasize more, since the headline numbers (93.7%, 63.6%, etc.) are cross-model aggregates.

## 2. Statistics

**Strengths:**
- Bootstrap CIs reported throughout, with stratification by model.
- Bonferroni correction applied.
- Power analysis acknowledges the clustering issue and reports effective sample sizes.
- TOST equivalence test for SACD vs. Premortem is appropriate.
- MAD as a complementary metric is a genuine methodological contribution, though it's a standard measure being applied to a new context rather than a novel statistic.

**Concerns:**
- **Table 4 (metric comparison):** CIs are reported for % of baseline but not for susceptibility. This asymmetry is unexplained.
- **Mixed-effects model (Eq. 4):** The F-test reports $F(3, 8950)$. With 10 model clusters, the denominator degrees of freedom should be much smaller under proper mixed-effects inference (Kenward-Roger or Satterthwaite approximations would give df closer to 6-9). The paper flags this as "approximate" but still presents the statistic prominently.
- **Table 6 (anchor asymmetry):** The spread column values match Table 4's susceptibility values, which is internally consistent. Good.
- **Cohen's d = 1.06 for SACD vs. DA** is mentioned in the power analysis but never formally reported in the results—it appears only as justification for adequate power. This effect size should appear in the results section if it's going to be cited.

## 3. Citations

All pre-verified citations check out. Additional citations:
- Binz & Schulz 2023 (PNAS) — legitimate and correctly cited.
- Englich et al. 2006 — legitimate, correctly cited.
- Tversky & Kahneman 1974 — foundational, correct.
- Klein 2007 — this is actually "The Power of Intuition," and the premortem technique is more commonly attributed to Klein's other writings (e.g., "Performing a Project Premortem," HBR 2007). The book citation works but a more specific source would be stronger.
- Jacowitz & Kahneman 1995 — correct.
- Maas & Hox 2005 — correct and appropriate for the multilevel modeling caveat.
- `llm-bayesian-2025` (arXiv:2507.11768) and `llm-judge-overconfidence-2025` (arXiv:2508.06225) — These are July/August 2025 arXiv papers. Cannot verify from instructions but dates are plausible.
- `nowak2026abcd` (arXiv:2602.17445) — February 2026, plausible.
- `song2026reasoning` (arXiv:2602.06176) — February 2026, plausible.
- `huang2025anchoring` (arXiv:2505.15392) — May 2025, plausible.

**Minor citation issue:** `maynard2025` from the verified list is not actually cited in the paper. Not a problem—just noting it was pre-verified but unused.

## 4. Internal Consistency

**Checked and consistent:**
- Trial counts: 14,152 + 8,621 = 22,773 ✓
- Table 2 trial counts: 2,389 + 2,423 + 2,215 + 2,186 + 2,166 + 1,864 + 909 = 14,152 ✓
- Table 4 susceptibility spreads match Table 6 spread column ✓
- SACD % of baseline (93.7%) and MAD (18.1%) are consistent across Tables 4, 5, and text ✓
- DA at 63.6% consistently reported throughout ✓
- "No intervention" at 72.9% consistent ✓
- Opus zero variance mentioned in Table 3, text, and limitations ✓

**Potential inconsistency:**
- Table 5 lists 9 models for SACD (missing one). Checking: Haiku, o4-mini, o3, Sonnet, GPT-4.1, DeepSeek, Kimi, GPT-5.2, GLM-5, Opus = 10. Wait—Table 5 has exactly 10 rows. ✓
- The abstract says "93.7% of unanchored baseline" for SACD. Table 4 confirms. ✓
- Abstract: "63.6%" for DA. Table 4 confirms. ✓
- Abstract: "72.9%" for no technique. Table 4 confirms. ✓

**One issue:** The abstract says SACD ranges "from ~48% to ~128%" which matches Haiku (47.8%) and Opus (127.8%) in Table 5. However, the abstract doesn't note that these extremes come from the two most problematic models (85%+ refusal rate and zero variance respectively). The body text does note this, but the abstract is slightly misleading by not qualifying.

## 5. Writing Quality

**Strengths:**
- Exceptionally well-organized with clear signposting.
- Caveats and limitations are surfaced proactively, often in-line rather than buried.
- The boxed caveats (e.g., "Exploratory (5 models)") are effective.
- The distinction between susceptibility and % of baseline is clearly explained and motivated.
- Figures are well-designed and informative.

**Concerns:**
- **Length and repetition:** The paper repeats key numbers excessively. "63.6%" appears ~8 times, "93.7%" ~7 times, "72.9%" ~5 times, "~48% to ~128%" ~5 times. While some repetition aids readability, this borders on padding. A single-column 11pt format with this much content would be very long for a conference paper. Significant tightening is needed.
- **Section 4.3 (High-Anchor Responses)** is interesting but somewhat tangential. The "compression" finding is speculative and not directly connected to the debiasing evaluation.
- **The AI Assistance Disclosure** is appropriate and transparent.
- **Minor:** "pp" (percentage points) is used without definition until the temperature section. Define on first use.
- **Minor:** The paper shifts between "our DA implementation" and just "Devil's Advocate" — maintaining the qualified form consistently would be more precise.

## 6. Overclaims

**The paper is generally very careful about overclaiming—unusually so.** The persistent hedging ("our implementation," "these prompts," "specific prompt implementations") is appropriate given the single-prompt-per-technique design.

**Remaining overclaim concerns:**

1. **Title:** "Testing Implementations of Human Debiasing Prompts in LLMs" could be read as comprehensive. "Testing" + "Implementations" (plural) helps, but "Human Debiasing Prompts" is broad. The title is defensible but at the edge.

2. **Abstract's opening question:** "Do prompts implementing human debiasing techniques work on LLMs?" This frames the contribution as answering a general question, but the evidence is from single implementations. The answer "not reliably" is appropriately hedged.

3. **Conclusion:** "Our implementations of human debiasing prompts show mixed transfer to LLMs" — the qualifier "our implementations" is good, but "transfer to LLMs" implies something about the techniques generally rather than specific prompts.

4. **MAD as "contribution":** MAD (Mean Absolute Deviation) is a completely standard statistical measure. The paper's contribution is applying it in this evaluation context, not inventing it. The paper is mostly clear about this but occasionally implies novelty ("We advocate reporting MAD").

5. **The causal language around "why" prompts work/fail** (Section 6.1-6.2) is appropriately marked as speculative.

## 7. Missing Elements

- **No formal hypothesis pre-registration mentioned.** The stopping rule (n≥30, expanded for high-variance) suggests adaptive sampling. The paper acknowledges this in Limitation 9 but could be more explicit about whether any hypotheses were pre-specified.
- **No discussion of prompt sensitivity.** Given that the core finding is that single prompts don't transfer, the natural next question is how sensitive results are to prompt wording. The paper acknowledges this as a limitation but doesn't discuss it substantively.
- **No comparison to simple baselines** like "ignore the anchor" or "think step by step." Limitation 10 acknowledges this.

## 8. Structural Issues

- The paper would benefit from a clearer separation between the main study (Section 4) and multi-domain extension (Section 5). Currently, Section 5 uses different models, different metrics (MAD vs. % of baseline), and different analysis approaches, making cross-referencing difficult.
- Table 8 (multi-domain) is very long and could be more compact.

---

## Summary of Issues Requiring Text Fixes

### Significant:
1. **Tighten repetitive number citations** — key statistics repeated 5-8 times each.
2. **Abstract should qualify that the ~48%–128% range comes from the two most problematic models** (zero-variance Opus and 85%+ refusal-rate Haiku).
3. **Mixed-effects F-test denominator df** (8950) is likely inflated given 10 clusters; the "treat as descriptive" caveat should be stronger, or the df should be corrected.
4. **Define "pp" on first use.**
5. **Susceptibility CIs missing from Table 4** — should either be added or the omission explained.
6. **Cohen's d values** mentioned in power analysis should be reported in results.

### Minor:
7. Maintain consistent qualified language ("our DA implementation" vs. "Devil's Advocate") throughout.
8. Klein 2007 citation could be more specific to the premortem technique.
9. Section 4.3 (compression finding) could be shortened or moved to discussion.
10. The transition between Section 4 and Section 5 metrics (% of baseline → MAD) needs stronger justification for the switch.

---

## Verdict

This is a solid empirical paper with a genuine methodological contribution (demonstrating metric divergence in debiasing evaluation) and substantial experimental effort. The transparency about limitations is exemplary—rarely do papers this thoroughly catalogue their own confounds. The core finding (susceptibility and baseline proximity can give opposite rankings) is important and well-demonstrated.

However, the paper has significant text-level issues: excessive repetition inflating length, a few statistical presentation problems (missing CIs, inflated df), and occasional framing that slightly overstates what single-prompt-per-technique evidence can support. These are all fixable without new experiments.

The work is clearly above the threshold of a workshop paper but needs tightening to meet main track standards for a top venue. The contribution is real but narrow—one-prompt-per-technique limits generalizability, and the methodological recommendation (report MAD) is sound but incremental.

**NEEDS REVISION** — The core contributions and experimental work are strong, but the text requires: (1) significant tightening of repetitive content, (2) statistical presentation fixes (missing CIs, inflated df acknowledgment, effect size reporting), (3) minor framing adjustments to consistently match the evidence scope, and (4) better structural integration between the two studies. All fixable as text edits.

=== END REVIEW ===

Model used: anthropic/claude-opus-4-6

⚠️ VERDICT: Needs revision
