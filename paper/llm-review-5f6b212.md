# LLM Adversarial Review — 5f6b212

Date: 2026-03-01T00:20:35.432Z
Model: claude-sonnet-4.5

# Adversarial Review: Debiasing Technique Rankings Are Metric- and Domain-Dependent

## Summary

This paper evaluates four debiasing techniques for anchoring bias in LLMs across 21,139 trials spanning six domains. The core claim is that technique rankings are metric- and domain-dependent, with no universally superior approach. The authors introduce Mean Absolute Deviation (MAD) as a complement to standard susceptibility metrics and demonstrate that Devil's Advocate reduces susceptibility while moving responses away from baseline (the "consistency without correctness" problem). The main study uses 10 models on judicial sentencing; an exploratory extension tests 4 models across 6 domains. While the paper addresses an important problem, significant methodological concerns undermine the strength of the conclusions.

## Strengths

- **Important methodological contribution**: The distinction between susceptibility (consistency) and baseline proximity (correctness) is valuable and well-articulated. The Devil's Advocate failure mode (low susceptibility, poor baseline alignment) is a genuine insight.

- **Comprehensive empirical scope**: 21,139 trials across 10 models and multiple domains represents substantial experimental effort. The inclusion of model-specific analyses (Table 3) is commendable.

- **Transparent reporting**: The paper acknowledges limitations extensively, includes confidence intervals, reports effect sizes, and provides data/code availability. The AI assistance disclosure is appropriate.

- **MAD metric**: The introduction of Mean Absolute Deviation to reveal bidirectional errors hidden by aggregate means (SACD: 93.7% aggregate vs 18.1% MAD) is a useful contribution.

- **Mixed effects analysis**: Section 4.6 appropriately accounts for model clustering and reports ICC, though the analysis could be strengthened (see weaknesses).

## Weaknesses

### 1. **Circular Baseline Design Undermines Core Claims** (Critical)

The proportional anchor design (anchors = baseline × 0.5/1.5) creates fundamental circularity:

- **Problem**: Anchors are calibrated to the very baseline used to evaluate debiasing success. A technique that moves responses toward 100% of baseline is *by construction* moving them toward the midpoint between the anchors.

- **Consequence**: The "% of baseline" metric may simply measure regression to the mean between anchor values rather than genuine debiasing. The authors acknowledge this (Limitation 2, 6) but don't adequately address it.

- **Evidence of circularity**: Table 6 shows SACD achieves 75.7% (low) and 112.0% (high) with average 93.7%—almost exactly the midpoint. This is suspicious.

- **Required fix**: Validate with fixed absolute anchors (e.g., always 12 and 36 months regardless of baseline) to demonstrate the effect isn't an artifact of the proportional design. The authors mention this as "future work" but it's essential for the current claims.

### 2. **Statistical Power and Multiple Comparisons** (Major)

- **Effective sample size**: The authors correctly note ICC=0.17 reduces effective n to ~60-70 per technique (p.11), yet they perform 6 pairwise comparisons with Bonferroni correction. At n_eff=65, they're powered to detect d≥0.50 but observe effects as small as d=0.08 (SACD vs Premortem).

- **Underpowered key comparison**: The SACD-Premortem comparison (p=0.054 uncorrected, clearly NS after Bonferroni) is central to the paper's claim that "no technique consistently outperforms," yet it's explicitly underpowered. The TOST equivalence test uses a ±5pp bound that seems arbitrary—why not ±3pp or ±10pp?

- **Multi-domain analysis**: Section 5 uses only 4 models and provides NO confidence intervals or significance tests for technique rankings (Table 4). The claim that "rankings vary by domain" rests on point estimates that may not be statistically distinguishable. The boxed warning (p.14) acknowledges this but doesn't prevent the abstract from stating findings as fact.

### 3. **Confound: Turn Count vs. Technique Content** (Major)

- **SACD uses ~6 API calls** vs 3 turns for other techniques (acknowledged in footnote 2, p.3, and Limitation 10). Random Control—which provides neutral content—achieves 78.3% vs 72.9% for no-technique baseline (+5pp) and outperforms Devil's Advocate by +15pp.

- **Implication**: SACD's apparent superiority (93.7%) may partly reflect turn count rather than its specific debiasing content. The authors acknowledge this but don't quantify it. A 6-turn Random Control condition is essential to isolate SACD's content contribution.

- **Current evidence**: Random Control ranks #1 in 3/6 domains (Table 4), suggesting turn count is a major factor. This undermines the interpretation of SACD as a superior debiasing technique.

### 4. **Baseline as "Ground Truth" Problem** (Major)

- **Conceptual issue**: The paper treats baseline as the "correct" response (Eq. 2: "Is the debiased response close to what the model would say without any anchor?"). But:
  - Baselines vary wildly (18-36 months, Table 1)
  - Opus has SD=0.0 (deterministic)
  - The vignette includes "12th offense"—this IS an anchor

- **Normative claim**: The authors state "we make no claim that baselines are normatively correct" (p.6) but then optimize techniques to match baseline. If baselines are wrong, why is 100% of baseline the goal?

- **Alternative interpretation**: Perhaps SACD's "overshoot" (112% from high anchors) is actually *correcting* an overly lenient baseline. Without ground truth, we can't distinguish debiasing from introducing new bias.

### 5. **Model Selection and Generalizability** (Moderate)

- **Opus anomaly**: Opus 4.6 has zero variance (SD=0.0) and produces exactly 18 months in all baseline trials. The authors retain it because "excluding post-hoc would inflate technique effectiveness" (p.8), but this is backwards—including a deterministic model *deflates* variance estimates and may mask technique effects.

- **Sensitivity analysis**: The authors report that excluding Opus shifts means 2-3pp but preserves rankings (Limitation 7). However, they don't report whether confidence intervals change or whether previously NS comparisons become significant.

- **Model coverage**: 10 models is reasonable, but the multi-domain extension uses only 4 (3 Anthropic + GPT-5.2). This is acknowledged as "exploratory" but the abstract doesn't qualify the domain-dependence claim accordingly.

### 6. **Outside View Confound** (Moderate)

- **Jurisdiction anchor**: Outside View required specifying "German federal courts" to avoid safety refusals (Section 4.7.1, Appendix A.3). This introduces a secondary anchor toward German norms (~12-18 months).

- **Consequence**: Outside View achieves only 51.2% of baseline (Table 2)—the worst performance. But is this because the technique fails or because the German jurisdiction anchor conflicts with the model's baseline?

- **Missing analysis**: The authors exclude Outside View from rankings but don't test whether the jurisdiction specification explains the poor performance (e.g., by comparing to a jurisdiction-free variant).

### 7. **Presentation and Clarity Issues** (Minor to Moderate)

- **Metric proliferation**: The paper introduces susceptibility, % of baseline, MAD, aggregate vs per-trial, trial-weighted vs model-averaged... This is thorough but overwhelming. A clearer hierarchy of metrics would help.

- **Figure 1 redundancy**: Figure 1 (p.9) shows the same data as Table 2. One could be removed.

- **Abstract overclaims**: "Our core finding: no technique consistently outperforms" is stated as fact, but Section 5 acknowledges CIs overlap for all comparisons. The abstract should reflect this uncertainty.

- **SACD implementation details**: The paper cites Lyu et al. (2025) for SACD but doesn't provide enough detail to reproduce. How many iterations? What's the stopping criterion? (Appendix A.4 clarifies: avg 2.5 iterations, max 5, but this should be in main text.)

### 8. **Missing Analyses** (Moderate)

- **Domain × Model interaction**: Table 4 shows domain-dependent rankings, but are these consistent across models? If SACD ranks #1 in salary for GPT-5.2 but #4 for Opus, the domain-dependence claim is confounded with model-dependence.

- **Anchor strength validation**: Section 4.7.2 mentions that ±40% anchors showed no effect for medical, requiring ±50%. But this suggests the ±50% choice is post-hoc. Was this tested systematically across domains?

- **Cost-benefit analysis**: SACD uses 6× more API calls than Premortem but achieves only 2.1pp better performance (NS). The practical recommendation should emphasize this tradeoff more strongly.

## Questions for Authors

1. **Circularity**: Can you provide results with fixed absolute anchors (e.g., always 12 and 36 months) to demonstrate that % of baseline isn't simply measuring regression to the mean between anchor values?

2. **Turn count control**: What is SACD's performance with a 6-turn Random Control baseline? This is essential to isolate content from turn count effects.

3. **Baseline validity**: If baselines vary 18-36 months and include the "12th offense" anchor, why treat them as the debiasing target? Have you considered using external ground truth (e.g., actual sentencing data)?

4. **Multi-domain power**: Table 4 shows point estimate rankings but no CIs or significance tests. Can you provide bootstrap CIs for the #1 vs #2 comparisons in each domain?

5. **Opus sensitivity**: Does excluding Opus change any confidence intervals from overlapping to non-overlapping (or vice versa)? The 2-3pp mean shift seems small, but CIs matter more.

6. **Domain × Model interaction**: Are the domain-dependent rankings in Table 4 consistent across models, or do different models show different "best" techniques within the same domain?

7. **SACD stopping criterion**: How sensitive are results to the maximum iteration count (currently 5)? Does SACD performance improve with more iterations or does it plateau?

8. **Equivalence bound justification**: Why ±5pp for the TOST equivalence test? This seems arbitrary—can you provide a principled justification (e.g., based on practical significance thresholds)?

## Minor Issues

- **Table 1 caption**: "We retain Opus rather than excluding it because..." This justification belongs in main text, not a table caption.

- **Footnote 2 (p.3)**: The SACD turn-count caveat is critical and should be in main text, not a footnote.

- **Section 4.3 title**: "Metric Divergence: Susceptibility vs. Baseline Proximity" is clear, but the section also introduces the compression pattern—consider splitting or retitling.

- **Figure 3 caption**: "Dashed line = 100% (perfect)" is misleading if baselines aren't ground truth. Rephrase as "100% = unanchored baseline."

- **References**: Several citations are to 2025-2026 papers that don't exist yet (Lyu et al. 2025, Chen et al. 2025, etc.). Presumably these are placeholder names for real papers, but it's confusing.

- **Appendix organization**: The prompts (Appendix A) are essential for reproducibility and should be referenced more prominently in the main text.

## Verdict

**MAJOR REVISION**

This paper tackles an important problem and makes valuable methodological contributions (MAD metric, baseline-aware evaluation, model-specific variance). However, the circular baseline design, turn-count confound, and underpowered multi-domain analysis undermine the core claims. The authors are transparent about limitations, but several issues require empirical resolution rather than acknowledgment:

1. **Required for acceptance**:
   - Validate with fixed absolute anchors to address circularity
   - Add 6-turn Random Control to isolate SACD content effects
   - Provide CIs and significance tests for multi-domain rankings (Table 4)
   - Clarify whether baseline is a debiasing target or just a reference point

2. **Strongly recommended**:
   - Sensitivity analysis excluding Opus with full CI reporting
   - Domain × Model interaction analysis
   - Justify TOST equivalence bound

The paper is well-executed within its current design, but the design itself has fundamental issues that prevent confident interpretation of the results. With revisions addressing the circular baseline and turn-count confound, this could be a strong contribution to the debiasing literature.

## Confidence

**4/5** (High confidence)

I am confident in this assessment. The methodological issues (circular baseline, turn-count confound) are clear from the paper's own descriptions. The statistical concerns (power, multiple comparisons) are straightforward to verify. My confidence is not 5/5 only because I may be missing domain-specific context about why proportional anchors are standard practice in anchoring research—but the authors themselves acknowledge this as a limitation requiring validation.