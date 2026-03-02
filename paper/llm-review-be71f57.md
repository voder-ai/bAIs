# LLM Adversarial Review — be71f57

Date: 2026-02-28T20:25:27.850Z
Model: claude-sonnet-4.5

# Adversarial Review: "Debiasing Techniques Don't Transfer"

## Summary

This paper evaluates four debiasing techniques for anchoring bias in LLMs across 21,139 trials spanning six domains. The core claim is that (1) no technique generalizes across domains, (2) metric choice determines technique rankings (susceptibility vs. baseline proximity give opposite results), and (3) model-specific variance dominates technique effects. The authors introduce Mean Absolute Deviation (MAD) to reveal per-trial errors masked by aggregate metrics. While the cross-domain evaluation and metric comparison are valuable contributions, the paper suffers from serious methodological flaws, overclaimed statistical findings, and presentation issues that undermine confidence in the conclusions.

## Strengths

- **Important research question**: Cross-domain generalization of debiasing techniques is understudied and practically relevant
- **Large-scale evaluation**: 21,139 trials across 10 models is substantial
- **Metric comparison is valuable**: Demonstrating that susceptibility and baseline proximity give divergent rankings (Table 2) is a genuine contribution
- **MAD metric**: Revealing that SACD's 93.7% aggregate masks 18.1% per-trial deviation is insightful
- **Transparency**: Full data/code availability and detailed prompts (Appendix) are commendable
- **Honest limitations section**: Authors acknowledge confounds (Outside View, turn-count, proportional anchors)

## Weaknesses

### 1. **Statistical Overclaiming (Critical)**

**Problem**: The abstract claims "bootstrap 95% confidence intervals overlap for all pairwise comparisons—we cannot statistically distinguish technique effectiveness within any domain." Yet Table 2 shows SACD [92, 95] vs. Devil's Advocate [62, 65]—these CIs do **not** overlap. The authors later report effect sizes (d=1.06 for SACD vs. DA) and claim statistical significance.

**Evidence**:

- Abstract: "we cannot statistically distinguish technique effectiveness"
- Table 2: SACD 93.7% [92, 95] vs. DA 63.6% [62, 65] — non-overlapping CIs
- Section 4.3: "Cohen's d = 1.06" (large effect)
- Section 4.5: "The CIs do not overlap with Full SACD, confirming the ranking difference is statistically reliable"

**Impact**: The core claim of indistinguishability is contradicted by the paper's own data. This is not a minor inconsistency—it's the central empirical finding.

**Required fix**: Either (1) revise abstract to clarify that _some_ pairwise comparisons are distinguishable, or (2) explain why non-overlapping CIs don't constitute statistical distinction. The current framing is misleading.

---

### 2. **Circular Baseline Design (Major)**

**Problem**: Anchors are set proportionally to each model's baseline (±50%). This creates circularity: models with low baselines get weak anchors, models with high baselines get strong anchors. The authors acknowledge this (Limitation 2) but don't address the fundamental issue: **you cannot measure debiasing effectiveness when anchor strength varies systematically with the outcome you're measuring**.

**Example**: Opus baseline = 18mo → high anchor = 27mo. GPT-5.2 baseline = 32mo → high anchor = 48mo. A technique that moves Opus from 27→24 (3mo shift) looks better than one that moves GPT-5.2 from 48→40 (8mo shift), even though the latter shows stronger debiasing.

**Why "within-model comparison" doesn't solve it**: The paper aggregates across models (trial-weighted means). If low-baseline models are easier to debias (smaller absolute anchor), they'll dominate the aggregate statistics.

**Required fix**: Re-run with fixed absolute anchors (e.g., ±15 months for all models) or report only model-stratified results without aggregation.

---

### 3. **Multi-Domain Analysis is Underpowered (Major)**

**Problem**: Section 5 claims "technique rankings vary dramatically by domain" but uses only **4 models** (vs. 10 in main study). Table 4 shows point-estimate rankings but admits "bootstrap 95\% CIs overlap for all #1 vs #2 comparisons." The authors call this "exploratory" but still draw strong conclusions.

**Evidence**:

- Section 5: "Rankings vary dramatically" (strong claim)
- Table 4 caption: "Rankings are point estimates; bootstrap 95% CIs overlap for all #1 vs #2 comparisons" (contradicts strong claim)
- Limitation 8: "results are exploratory... rank differences may not be statistically robust"

**Impact**: The paper's title claims "techniques don't transfer" but the multi-domain evidence is too weak to support this. With only 4 models and overlapping CIs, you cannot distinguish domain effects from noise.

**Required fix**: Either (1) expand to 10 models per domain, (2) downgrade claims to "suggestive evidence," or (3) remove multi-domain section and focus on single-domain depth.

---

### 4. **Turn-Count Confound Invalidates SACD Comparison (Major)**

**Problem**: SACD uses ~6 API calls vs. 3 turns for other techniques. Random Control (neutral content, 3 turns) achieves 78.3% baseline proximity—only 15pp worse than SACD (93.7%). The authors acknowledge this (Limitation 10) but still rank SACD #1 without controlling for turn count.

**Why this matters**: If turn count explains 15pp of SACD's 21pp advantage over no-technique (72.9%), then SACD's specific content contributes only ~6pp—comparable to measurement noise.

**Required fix**: Add a 6-turn Random Control condition to isolate SACD's content effect from turn-count effect. Without this, you cannot claim SACD's iterative reasoning is effective.

---

### 5. **Baseline Interpretation is Problematic (Moderate)**

**Problem**: The paper treats baseline (no anchor) as the "correct" response, but baseline includes "12th offense"—a strong implicit anchor. The authors acknowledge this (Limitation 5) but don't address the implication: **100% of baseline doesn't mean "unbiased," it means "consistent with a different anchor."**

**Evidence**:

- Limitation 5: "Baseline includes '12th offense'—'without explicit anchor,' not truly unanchored"
- Table 1: Baselines range 18–36 months—if this were truly unanchored, why such variance?

**Impact**: The entire "% of baseline" metric assumes baseline is normatively correct. If baseline is itself anchored, then techniques that achieve 100% baseline proximity may simply be reinforcing a different bias.

**Suggested fix**: Acknowledge that baseline proximity measures _consistency_, not _correctness_. Reframe claims accordingly.

---

### 6. **Mixed Effects Analysis is Incomplete (Moderate)**

**Problem**: Section 4.6 reports ICC=0.17 (17% variance from model differences) but doesn't report the key result: **technique fixed effects after accounting for model clustering**. The paper reports trial-level Cohen's d but admits these are "inflated" due to clustering.

**What's missing**:

- Technique fixed effects from the mixed model (not just trial-weighted means)
- Confidence intervals on fixed effects
- Likelihood ratio test for technique effect after accounting for model variance

**Why this matters**: With ICC=0.17 and ~200 trials/model, effective n ≈ 60–70 per technique (design effect ≈ 35). The reported d=1.06 (SACD vs. DA) may shrink substantially after proper adjustment.

**Required fix**: Report mixed-effects estimates with proper SEs, not just trial-level descriptives.

---

### 7. **Presentation Issues (Moderate)**

- **Redundant figures**: Figure 1 and the removed figure both show % of baseline—one should be cut
- **Table 4 is overwhelming**: 6 domains × 5 techniques × 3 columns = 90 cells. Consider heatmap or forest plot
- **Inconsistent terminology**: "Spread" (Table 2) vs. "Asymmetry" (Table 5)—use one term
- **Missing power analysis**: Authors mention n≥30 (CLT) but don't report achieved power for key comparisons

---

### 8. **Overclaimed Generalization (Moderate)**

**Problem**: The title claims techniques "don't transfer" but evidence is mixed:

- Main study (judicial): 10 models, robust findings
- Multi-domain: 4 models, overlapping CIs, "exploratory"

**Impact**: The title overstates the evidence. A more accurate title: "Debiasing Techniques Show Domain-Dependent Effectiveness: Evidence from Judicial Sentencing"

---

## Questions for Authors

1. **Statistical claims**: How do you reconcile "we cannot statistically distinguish technique effectiveness" (abstract) with "CIs do not overlap... confirming the ranking difference is statistically reliable" (Section 4.5)?

2. **Circular anchors**: Why not use fixed absolute anchors (e.g., ±15 months) to avoid confounding anchor strength with baseline? What happens to rankings if you re-analyze with fixed anchors?

3. **Turn-count control**: Can you add a 6-turn Random Control condition to isolate SACD's content effect? Without this, how do you justify attributing SACD's performance to its iterative reasoning rather than turn count?

4. **Multi-domain power**: With only 4 models and overlapping CIs for all #1 vs #2 comparisons, what is the statistical basis for claiming "technique rankings vary dramatically by domain"?

5. **Baseline validity**: If baseline includes "12th offense" (an implicit anchor), why is 100% baseline proximity the target? Shouldn't you measure deviation from a truly unanchored condition (e.g., no case details)?

6. **Mixed effects**: Can you report technique fixed effects from the mixed model (with SEs and CIs) rather than trial-weighted means? What are the Satterthwaite-corrected p-values?

7. **Opus exclusion**: You report that excluding Opus (zero variance) changes means by 2–3pp but preserves rankings. Can you show the full sensitivity analysis (all tables with/without Opus)?

8. **SACD cost**: You note SACD uses ~6 API calls vs. 3 for Premortem. Given Premortem achieves 91.6% (vs. SACD's 93.7%) at half the cost, why recommend SACD?

9. **Fraud domain**: Table 4 shows all techniques perform poorly in fraud (29–75% baseline). You attribute this to "sympathetic defendant" but provide no evidence. Can you test this hypothesis (e.g., vary defendant sympathy)?

10. **Reproducibility**: You provide OpenRouter model IDs, but these are time-stamped (February 2026). How can readers reproduce with model updates? Do you archive model snapshots?

---

## Minor Issues

- **Abstract**: "21,139 trials" appears twice (line 3 and line 8)
- **Table 1**: "SD=0.0" for Opus—explain in caption, not just footnote
- **Section 3.2.4**: "Temperature effects <3pp"—provide exact values
- **Figure 2**: Y-axis starts at 55%—this exaggerates differences. Start at 0% or justify
- **Appendix A.4**: "Average iterations to convergence: 2.5 (median 3)"—median should be integer
- **References**: \citet{lyu2025} and \citet{chen2025cognitive} are cited but not in bibliography
- **Typo**: "bAIs" repository name is unexplained (bias + AI?)

---

## Verdict

**MAJOR REVISION**

This paper addresses an important question and provides valuable insights (metric divergence, MAD, model-specific variance). However, it suffers from critical flaws that must be addressed:

1. **Statistical overclaiming**: The abstract's claim of indistinguishability contradicts the data
2. **Circular baseline design**: Proportional anchors confound anchor strength with outcome
3. **Underpowered multi-domain analysis**: 4 models with overlapping CIs cannot support strong claims
4. **Turn-count confound**: SACD's advantage may be turn count, not content

**Required for acceptance**:

- Fix statistical claims (abstract vs. results consistency)
- Re-run with fixed absolute anchors OR restrict claims to within-model comparisons
- Add 6-turn Random Control OR remove SACD from rankings
- Downgrade multi-domain claims to "exploratory" throughout (not just limitations)

**Optional improvements**:

- Report mixed-effects estimates with proper SEs
- Add power analysis for key comparisons
- Streamline presentation (reduce redundant figures/tables)

The core contribution (metric divergence reveals Devil's Advocate failure mode) is solid and worth publishing. But the generalization claims need much stronger evidence.

---

## Confidence

**4/5** (High confidence)

I am confident in this assessment. The statistical issues are clear-cut (non-overlapping CIs contradict indistinguishability claims), the circular baseline design is a fundamental methodological flaw, and the multi-domain analysis is transparently underpowered (authors admit overlapping CIs). I have moderate confidence in the turn-count confound critique (Random Control's strong performance is suggestive but not definitive). I would increase confidence to 5/5 if I could verify the raw data, but the authors provide full code/data, so this is verifiable post-publication.
