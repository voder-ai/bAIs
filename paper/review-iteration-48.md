Using model: anthropic/claude-opus-4-6

Sending paper for review...

---

=== LLM REVIEW ===

# Detailed Review: Testing Implementations of Human Debiasing Prompts in LLMs

## Summary

This paper tests whether prompts implementing human cognitive debiasing techniques (Devil's Advocate, SACD, Premortem, Outside View, Random Control) reduce anchoring bias in LLMs. Across 22,773 trials (10 models, multiple domains), the authors find that effectiveness is highly variable across models and domains, that standard susceptibility metrics can misleadingly rank prompts, and that reporting MAD alongside aggregate metrics reveals hidden variance. The core finding—that their Devil's Advocate prompt looks best under susceptibility but worst under baseline proximity—is genuinely interesting.

---

## 1. Methodology

**Strengths:**

- Large trial count (22,773) with reasonable per-cell minimums (n≥30)
- Proportional anchor design is well-motivated and properly justified
- Mixed-effects modeling with appropriate caveats about cluster count
- Sensitivity analyses for edge cases (Opus, Haiku) are thorough
- The Outside View exclusion due to confound shows good judgment
- Temperature analysis across three settings
- 6-turn ablation to partially address turn-count confound

**Concerns:**

- **Single prompt per technique is the elephant in the room.** The paper tests one implementation per debiasing approach and draws conclusions about the _technique category_. The paper does acknowledge this (title says "implementations," abstract says "for these prompts," caveats appear throughout), but the framing still sometimes slips into technique-level language (e.g., "Why SACD Works (and Fails)"). The question is whether acknowledgment is sufficient.
- **The turn-count confound is only partially addressed.** The 6-turn ablation (n=238, 4 models) is underpowered and uses a different protocol for GPT-5.2 (single-prompt simulation). The paper acknowledges this but still leads with SACD as "#1"—which may substantially reflect turn count rather than SACD content.
- **ICC=0.17 with 10 clusters** is a serious limitation for mixed-effects inference. The paper acknowledges this well (citing Maas 2005, noting inflated df), but perhaps should more prominently flag that fixed-effect estimates are unreliable with so few clusters.
- **Haiku's 85%+ refusal rate** means surviving trials are heavily selected. The paper notes this but still includes Haiku in aggregates. The sensitivity analysis excluding Haiku is helpful.

**Assessment:** The methodology is fundamentally sound for an empirical investigation. The confounds are real but well-documented. The single-prompt-per-technique design is the biggest limitation but is adequately (not perfectly) acknowledged.

---

## 2. Statistics

**Strengths:**

- Bootstrap CIs throughout
- Bonferroni correction for multiple comparisons
- Power analysis with effective n accounting for clustering
- TOST equivalence testing for SACD vs. Premortem
- Cohen's d reported with appropriate caveats about inflation from clustering

**Concerns:**

- **F-test for temperature×technique interaction** (Section 3.2.4): The paper correctly notes this doesn't account for model clustering and df are inflated. Good self-correction.
- **The multi-domain results** (Table 8) show heavily overlapping CIs. The paper appropriately frames these as "exploratory" and boxes the caveat. However, the Key Findings section still makes directional claims ("SACD's ranking varies from #2 to #5") that could be misleading when all rankings are noise.
- **MAD formula (Equation 3):** The formula divides by b_m (model baseline), which is correct for proportional interpretation. But aggregating MAD across models with different baselines—while the paper claims this is valid because deviations are proportional—still mixes different scales of decision. A 18% MAD on an 18-month baseline (Opus) is 3.2 months; on a 36-month baseline (o4-mini) it's 6.5 months. The paper could be clearer about this.
- **Table 4 spread column vs. Table 6 spread column:** Table 4 shows DA spread at 23.7pp and "No Technique" at 26.1pp. Table 6 shows these same numbers in the Spread column. This is consistent. ✓
- **Table 4 % of baseline for DA (63.6%) and Table 5 (63.6%):** Consistent. ✓
- **Table 6 anchor asymmetry:** Low anchor SACD = 75.7%, High anchor SACD = 112.0%. Average = (75.7 + 112.0)/2 = 93.85%, which is close to the reported 93.7% (slight discrepancy likely due to unequal trial counts per anchor direction). Acceptable. ✓

**Assessment:** Statistics are generally rigorous with appropriate caveats. No major errors detected.

---

## 3. Citations

**Pre-verified citations:** Lyu 2025, Chen 2025, Lim 2026, Maynard 2025 (Maynard not cited in paper) — all confirmed real.

**Other citations checked:**

- Tversky & Kahneman 1974 — Classic, correct ✓
- Englich et al. 2006 — Real paper, correctly described ✓
- Jacowitz & Kahneman 1995 — Real, correct journal/volume ✓
- Binz & Schulz 2023 — Real PNAS paper ✓
- Jones & Steinhardt 2022 — Real NeurIPS paper ✓
- Klein 2007 — Real book ✓
- Maas & Hox 2005 — Real methodology paper ✓
- Kahneman & Lovallo 1993 — Real Management Science paper ✓
- Sibony 2019 — Real book ✓
- Song 2026 (arxiv 2602.06176) — Cannot independently verify but consistent with paper's timeframe
- Huang 2025 (arxiv 2505.15392) — Cannot independently verify but plausible
- llm-bayesian-2025 (arxiv 2507.11768) — Cannot independently verify but plausible
- llm-judge-overconfidence-2025 (arxiv 2508.06225) — Cannot independently verify but plausible
- Nowak 2026 (arxiv 2602.17445) — Cannot independently verify but plausible

**Issue:** The abstract mentions "22,773 anchoring bias trials" and the trial counts in Table 2 sum to: 2389 + 2423 + 2215 + 2186 + 2166 + 1864 + 909 = 14,152. The multi-domain adds 8,621. Total = 22,773. ✓

**Assessment:** Citations appear accurate and well-used. No red flags.

---

## 4. Internal Consistency

**Checking key numbers:**

- Abstract: "93.7% of unanchored baseline" → Table 5: 93.7% ✓
- Abstract: "63.6%" for DA → Table 4: 63.6% ✓
- Abstract: "72.9%" no intervention → Table 4: 72.9% ✓
- Abstract: "~48% to ~128%" SACD range → Table 5: 47.8% (Haiku) to 127.8% (Opus) ✓
- Abstract: "14,152 main study + 8,621 multi-domain" = 22,773 ✓
- Abstract: "18.1% MAD" → Table 5: 18.1% ✓
- Section 1: "~48% to ~128%" → Table 5 confirms ✓
- Table 2 trial sum: 2389+2423+2215+2186+2166+1864+909 = 14,152 ✓
- Table 8 domain trial sum: 1735+1591+1482+1328+1351+1134 = 8,621 ✓
- Mixed effects: ICC=0.17 mentioned in Section 4.6 and Section 4.2 ✓

**Minor discrepancy:** The abstract says "SACD prompt achieves 93.7% of unanchored baseline, though confounded by its 6-turn structure vs. 3 turns for others" — this is properly caveated. But later in Contributions: "SACD: ~48%--128%" — the tilde is appropriate given these are approximate (47.8% rounded to ~48%).

**Table 5 ordering issue:** The table orders models by % of baseline but the ordering is not monotonic: DeepSeek (100.8%), Kimi (100.9%), o3 (92.0%)... This appears intentionally grouped by deviation magnitude rather than strict ordering. Slightly confusing but defensible.

**Assessment:** Numbers are internally consistent. No contradictions found.

---

## 5. Writing Quality

**Strengths:**

- Exceptionally transparent about limitations and confounds
- Effective use of boxed caveats for critical qualifications
- The abstract is information-dense but clear
- Bold practical recommendations
- Good use of "our [technique] prompt" vs. "[technique]" to distinguish implementation from technique

**Concerns:**

- **Paper length/density:** This paper is extremely dense. The main text covers baseline analysis, metric divergence, anchor asymmetry, mixed effects, multi-domain generalization, turn-count ablation, and extensive limitations—all without supplementary material sections for the detailed results. A reviewer might find this overwhelming.
- **Section organization:** The multi-domain section (Section 5) feels somewhat disconnected from the main results (Section 4). The switch from % of baseline to MAD as the primary metric between sections, while justified in text, makes cross-section comparison difficult.
- **"Debiasing theater" (Section 6.1):** Labeled as speculative, which is good, but the term itself is provocative and could be seen as anthropomorphizing.
- **Authorship statement:** The AI authorship framing, while interesting, will be controversial at most venues and may distract reviewers. This is a venue-specific concern rather than a quality issue.
- **The Contributions list** (Section 1.2) is awkwardly numbered with the caveat sitting above the numbered items.

**Assessment:** Writing is clear, honest, and professional. Some organizational issues but nothing that impedes understanding.

---

## 6. Overclaims

**Potential overclaims:**

1. **Title: "Human Debiasing Prompts"** — The paper tests single implementations of each technique. The title could be read as testing the techniques themselves rather than specific prompts. However, the title does say "implementations" and the paper repeatedly caveats this. **Borderline acceptable.**

2. **"our Devil's Advocate prompt produces responses... further from baseline than doing nothing"** — This is well-supported by the data (63.6% vs. 72.9%, non-overlapping CIs). **Properly claimed.**

3. **"No prompt consistently outperforms across all models"** — Supported by Table 5 (SACD) and Table 8 (multi-domain). **Properly claimed.**

4. **"We advocate reporting MAD alongside aggregate metrics"** — This is presented as a methodological recommendation, not an empirical finding. The demonstration that aggregates mask bidirectional error (SACD: 93.7% aggregate, 18.1% MAD) is convincing. **Properly scoped.**

5. **The Conclusion says "Our implementations of human debiasing prompts show mixed transfer to LLMs."** — This appropriately says "our implementations" rather than making a general claim about the techniques. **Well-scoped.**

6. **Section 6.2: "explicit bias prompts may prime models to attend to anchors"** — Labeled as "speculative hypothesis" and "untested." **Properly hedged.**

**Assessment:** The paper is remarkably well-hedged. Claims are almost always scoped to the specific implementations tested. The few places where language slips toward technique-level claims (e.g., section headers "Why SACD Works") are minor.

---

## 7. Specific Issues Requiring Text Fixes

### Minor Issues:

1. **Table 5 (SACD by model):** Missing Haiku from the figure color coding explanation. The caption says "Red = severe undershoot (Haiku at 47.8%)" but Haiku is actually the first bar. Fine, but the figure's color scheme applies different colors to different `\addplot` commands, meaning the color coding is by plot series rather than by deviation category for some bars—o4-mini (orange, undershoot >10%) and GPT-5.2/GLM-5/Opus (orange, overshoot >10%) share the same color despite being in opposite directions. This undermines the figure's visual clarity.

2. **Equation 2 (% of baseline):** The formula uses R_prompt / R_baseline × 100%, but R_prompt is undefined—is it the mean response under the prompt condition? The per-trial response? This should be specified. Equation 3 (MAD) properly defines per-trial computation.

3. **Section 3.2.6 (Statistical Analysis):** "Percentile bootstrap (10,000 resamples, stratified by model)" — Does this mean resampling is stratified to maintain model proportions within each bootstrap sample? Should be explicit.

4. **Table 4 caption:** "Results reflect specific prompt implementations (Appendix)" — Should specify Appendix A.

5. **The paper references "Table 5" in the abstract** (indirectly via "see Table 5") but the abstract shouldn't contain table references. Actually, re-reading, the abstract says "(driven by Haiku's severe undershoot and Opus's overshoot; see Table 5)" — this is unusual for an abstract but not unprecedented.

6. **Section 4.3 (High-Anchor Responses):** Cites Tversky & Kahneman 1974 for contrast effects from implausible anchors, but the original T&K paper focused on assimilation effects. Contrast effects from implausible anchors were documented more in later work (e.g., Strack & Mussweiler 1997, Wegener et al. 2001). This citation is slightly imprecise.

7. **Missing reference:** The paper mentions "Sibony's framework" and "Sibony's techniques" but the specific techniques tested don't all come from Sibony 2019. The prompt design section (2.3) clarifies provenance, but the connection to Sibony could be made clearer or the Authorship Statement's mention of "Sibony's framework" should be reconciled.

8. **"Maynard 2025"** is listed in verified citations but doesn't appear in the paper or bibliography. This is irrelevant to the paper itself but noted.

9. **The paper lacks page numbers**, which is standard for submissions but should be added for camera-ready.

10. **Mixed-effects model specification (Equation 4):** The model includes technique, anchor, and their interaction as fixed effects, plus a random intercept for model. Given the paper's finding about model-specific SACD effectiveness, a random slope for technique would be more appropriate—and indeed the paper discusses random slopes in the following paragraph ("SACD shows highest slope variance"). The equation should match the actual model fitted.

---

## 8. Significance and Novelty Assessment

**Novelty:** The core contribution—showing that susceptibility and baseline proximity give divergent rankings, and that MAD reveals hidden variance—is a useful methodological point. The empirical finding about Devil's Advocate is striking. However:

- The insight that aggregate metrics mask bidirectional error is not new (this is why MAD/MAE exists).
- Testing single prompt implementations limits the generalizability of empirical findings.
- The paper is more of a "negative result + methodological recommendation" than a new method or framework.

**Significance:** Moderate-to-high for practitioners; lower for advancing theoretical understanding. The paper's greatest value is as a cautionary tale about evaluation metrics and as a template for rigorous debiasing evaluation.

**Venue fit:** This paper fits well at a workshop or applications track but may struggle at a top main track venue due to limited novelty. The empirical contribution is substantial (22,773 trials) but the intellectual contribution is narrower: "be careful with metrics" and "single prompts don't transfer."

---

## Overall Assessment

**Strengths:**

- Exceptional transparency about limitations and confounds
- Large-scale empirical study with careful methodology
- Genuinely useful practical findings (DA failure, metric divergence)
- Internal consistency is excellent
- Statistics are appropriate with proper caveats

**Weaknesses:**

- Single prompt per technique limits generalizability
- Turn-count confound partially but not fully resolved
- Multi-domain results are exploratory with overlapping CIs
- Core methodological insight (use MAD) is useful but incremental
- Paper density may overwhelm readers

**Key question:** Is the paper's contribution—showing metric divergence and prompt non-transferability through careful empirical work—sufficient for a main track venue? It's a borderline case. The empirical rigor is high, the findings are useful, and the writing is honest. But the intellectual contribution is primarily cautionary rather than constructive.

---

## Text Fixes Needed:

1. **Equation 2:** Define R_prompt explicitly (mean vs. per-trial)
2. **Figure 3 color coding:** Fix so over/undershoot don't share the same color
3. **Equation 4:** Include random slopes to match the analysis actually performed
4. **Section 4.3 citation:** Replace or supplement T&K 1974 with more specific contrast-effect citations
5. **Abstract:** Remove or move table reference (Table 5) — unconventional for abstracts
6. **Table 4 caption:** Specify "Appendix A" rather than just "Appendix"
7. **Section 3.2.6:** Clarify bootstrap stratification procedure

---

## Verdict

**NEEDS REVISION**

The paper is close to publishable. The empirical work is rigorous, the transparency is exemplary, and the core findings are genuinely useful. However, several text-level issues need attention: the mixed-effects equation doesn't match the described analysis (random slopes discussed but not specified), the % of baseline formula needs clarification, Figure 3's color coding undermines its message, and a few citations need tightening. These are all fixable text issues. The bigger question—whether the intellectual contribution is sufficient for a top main track—is borderline, but the paper's combination of scale, rigor, and practical impact argues in its favor. With the text fixes above, this paper would be ready for a strong venue.

=== END REVIEW ===

Model used: anthropic/claude-opus-4-6

⚠️ VERDICT: Needs revision
