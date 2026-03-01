# LLM Adversarial Review — 5f7d390

Date: 2026-02-28T23:25:01.644Z
Model: claude-sonnet-4.5

# Adversarial Review: "Debiasing Techniques Don't Transfer"

## Summary

This paper evaluates four debiasing techniques for anchoring bias in LLMs across 21,139 trials spanning six domains. The core claim is that (1) no technique generalizes across domains, (2) standard susceptibility metrics mislead by conflating consistency with correctness, and (3) the proposed Mean Absolute Deviation (MAD) metric reveals per-trial errors hidden by aggregates. The authors find dramatic technique ranking reversals depending on metric choice, with Devil's Advocate ranking #1 on susceptibility but #4 on baseline proximity. A deep-dive on 10 models confirms substantial model-specific variance. The paper recommends practitioners test debiasing interventions per-model AND per-task rather than relying on published rankings.

## Strengths

- **Important methodological contribution**: The susceptibility vs. baseline proximity divergence (Table 2) is genuinely valuable. Showing that Devil's Advocate reduces spread while moving responses *away* from unanchored judgment is a clear failure mode that prior work would miss.

- **Impressive scale**: 21,139 trials across 10 models and 6 domains represents substantial empirical effort. The multi-domain extension (Section 5) directly addresses generalization.

- **Transparent limitations**: Section 6.6 acknowledges 10 major limitations including proportional anchor circularity, turn-count confounds, and model coverage. The Opus sensitivity analysis is particularly commendable.

- **Reproducible**: Complete data/code availability with deterministic analysis pipeline. The JSONL trial logs with API request IDs enable full audit.

- **Statistical rigor**: Mixed-effects modeling (Section 4.6), bootstrap CIs, Bonferroni correction, and TOST equivalence testing show appropriate statistical sophistication.

## Weaknesses

### 1. **Circular Metric Design Undermines Core Claims** (MAJOR)

The paper's central metric—percentage of baseline—suffers from severe circularity that invalidates cross-model comparisons:

- **The problem**: Anchors are set proportionally to each model's baseline (±50%). Then effectiveness is measured as proximity to... that same baseline. This is circular by construction.

- **Why it matters**: A model with baseline=18mo gets anchors at 9mo/27mo. A model with baseline=36mo gets 18mo/54mo. These are *completely different anchoring pressures*. The first model faces a 9-month absolute spread; the second faces 36 months. Claiming they're "comparable" because both are "±50%" is statistically invalid.

- **The defense fails**: Section 3.2.4 states "This is not circular: baselines are measured independently in anchor-absent conditions." But independence of *measurement* doesn't solve circularity of *design*. You're still evaluating "does the technique return responses to the baseline" when the baseline *determined the anchor values*.

- **Consequence**: The aggregate statistics (93.7% for SACD, etc.) are uninterpretable. What does "93.7% of baseline" mean when baselines range from 18-36 months? For Opus (baseline=18mo), 93.7% = 16.9mo. For o4-mini (baseline=36mo), 93.7% = 33.7mo. These are 17-month different absolute outcomes being treated as "equivalent effectiveness."

**Required fix**: Rerun with *fixed absolute anchors* (e.g., 12mo/36mo for all models) and report both absolute deviation and percentage metrics. The current design can only support *within-model* comparisons, not the cross-model aggregates that dominate the paper.

---

### 2. **The "No Technique Generalizes" Claim Lacks Statistical Support** (MAJOR)

Section 5, Table 6 claims technique rankings vary by domain, but:

- **Missing significance tests**: "Rankings are point estimates; bootstrap 95\% CIs overlap for all #1 vs #2 comparisons" (Table 6 caption). If all pairwise CIs overlap, you *cannot claim* the rankings differ. Overlapping CIs mean the rank order could be noise.

- **Exploratory sample**: Only 4 models in Section 5 vs. 10 in main study. The caption admits "results should be considered exploratory" and "rank differences may not be statistically robust." This directly contradicts the abstract's claim: "technique rankings vary dramatically by domain."

- **Effect size missing**: No Cohen's d or other effect sizes reported for cross-domain comparisons. Table 6 shows MAD differences (e.g., Salary: SACD 12.6% vs Random 12.5%), but are these differences meaningful?

**Required fix**: Either (a) add formal statistical tests for rank differences across domains with multiple comparison correction, or (b) soften claims to "exploratory evidence suggests rankings may vary" and move to limitations.

---

### 3. **Turn-Count Confound Invalidates SACD Comparison** (MAJOR)

The paper acknowledges (Limitation 9, footnote 1) that SACD uses ~6 API calls vs. 3 for other techniques, and Random Control's strong performance "suggests turn count itself affects results." But then:

- **The problem**: SACD's apparent superiority (93.7% vs 78.3% for Random Control) could be entirely due to having 2× more turns, not its debiasing content.

- **Why it's fatal**: The paper's #1 ranked technique may just be "ask the model more times." This is a trivial finding dressed up as a debiasing intervention.

- **The defense fails**: Footnote 1 says "we cannot fully disentangle SACD's iterative content from its additional turns" but then proceeds to rank SACD #1 anyway. If you can't disentangle, you can't claim SACD's *content* works.

**Required fix**: Add a 6-turn Random Control condition to match SACD's turn count. If 6-turn Random Control matches SACD's 93.7%, the paper's main finding evaporates.

---

### 4. **Baseline as "Ground Truth" Is Unjustified** (MODERATE)

The paper claims baseline is not ground truth (Limitation 5: "We make no claim that baselines are normatively correct"), but then:

- **Contradiction**: The entire evaluation framework treats 100% of baseline as the *goal*. Table 3 color-codes DeepSeek's 100.8% as "near-perfect" (green). The metric is literally "deviation from baseline."

- **The problem**: Why should we believe unanchored responses are "correct"? Table 1 shows baselines range from 18-36 months—a 2× spread. These can't all be correct. Opus gives 18mo for a 12th offense shoplifter; o4-mini gives 36mo. One (or both) is wrong.

- **Implication**: If baselines are unreliable, then "debiasing" to baseline may just mean "returning to a different bias." The paper needs to justify why baseline convergence is desirable beyond "it's what the model would say without anchors."

**Suggested fix**: Either (a) validate baselines against external ground truth (e.g., actual sentencing data for 12th-offense shoplifting), or (b) reframe the metric as "consistency" rather than "correctness" and acknowledge this measures anchor-independence, not accuracy.

---

### 5. **MAD Metric Is Presented as Novel But Isn't** (MODERATE)

Section 1.2 introduces MAD as a contribution: "We introduce Mean Absolute Deviation (MAD) from unanchored baseline as a metric that reveals per-trial error hidden by aggregate measures."

- **The problem**: MAD is a standard statistical measure (mean absolute deviation from a reference point). The paper doesn't introduce it; it just *applies* it to this context.

- **What's actually novel**: Using MAD *alongside* aggregate percentage to detect bidirectional cancellation (Table 5: SACD 93.7% aggregate but 18.1% MAD). This is the real contribution, but it's buried.

**Suggested fix**: Reframe as "We demonstrate that MAD complements aggregate metrics by revealing..." rather than "We introduce MAD."

---

### 6. **Model Selection Bias** (MODERATE)

- **Opus zero-variance**: Table 1 shows Opus has SD=0.0 (always responds 18mo). The paper retains it because "excluding post-hoc would inflate apparent technique effectiveness" (caption). But:
  - Opus contributes 909 trials (Table 3). With zero variance, it *cannot* show anchoring effects—any "debiasing" is measuring noise.
  - The sensitivity analysis (Limitation 6) shows excluding Opus shifts means 2-3pp. This is non-trivial for a paper claiming 2.1pp differences matter (SACD vs Premortem).

- **Haiku refusal rate**: Footnote in Section 5 notes Haiku shows 85%+ refusals in judicial sentencing. The surviving 15% may be systematically different (e.g., cases where Haiku's safety filters didn't trigger). This is selection bias.

**Suggested fix**: Report results with/without Opus and Haiku as robustness checks in main text, not just limitations.

---

### 7. **Overstated Causal Claims** (MODERATE)

- **Section 4.2**: "Devil's Advocate *produces* consistent responses that remain far from baseline" (emphasis added). This is causal language, but the design is observational—you don't manipulate Devil's Advocate content independently of its structure.

- **Section 6.1**: "Iterative reflection may help models escape local optima" vs. "models may perform 'debiasing theater.'" These are post-hoc explanations without evidence. The paper doesn't test mechanisms.

**Suggested fix**: Use correlational language ("is associated with") and move mechanistic speculation to Discussion with clear "speculative" labels.

---

### 8. **Missing Practical Guidance** (MINOR)

The paper concludes "test per-model, per-domain" but doesn't provide:

- **Sample size recommendations**: How many trials needed to detect a 10pp difference in baseline proximity?
- **Decision thresholds**: When is a 5pp difference "meaningful enough" to prefer one technique?
- **Cost-benefit analysis**: SACD costs 6× more API calls than Premortem for 2.1pp improvement (non-significant). When is this worth it?

---

### 9. **Statistical Issues**

- **Power analysis post-hoc**: Section 3.2.4 reports power analysis *after* data collection. This is backwards—power analysis should inform sample size *before* collection. The reported effective n≈60-70 suggests the study is underpowered for small effects.

- **Multiple testing**: Bonferroni correction for 6 pairwise comparisons (α=0.0083) is mentioned, but Table 2 doesn't report corrected p-values. Which comparisons survive correction?

- **ICC interpretation**: "17% of variance attributable to model differences" (Section 4.6) with only 10 models. ICC estimates are unstable with <20 clusters. The paper should report uncertainty around this estimate.

---

### 10. **Presentation Issues**

- **Redundant figures**: Figure 1 (technique responses as % of baseline) duplicates Table 2 information. One could be cut.

- **Table 6 readability**: Six domains × five techniques = 30 rows. Consider splitting into separate tables or using a heatmap (Figure 2 is better).

- **Inconsistent terminology**: "Percentage of baseline" vs. "baseline proximity" vs. "% of baseline" used interchangeably.

---

## Questions for Authors

1. **Circularity**: How do you justify aggregating "% of baseline" across models when baselines determine anchor values? Can you rerun with fixed absolute anchors?

2. **Turn count**: What happens if you add a 6-turn Random Control to match SACD's turn count? Does SACD's advantage disappear?

3. **Domain generalization**: Table 6 shows overlapping CIs for all #1 vs #2 comparisons. How can you claim "rankings vary dramatically" without statistical significance?

4. **Baseline validity**: Why should we believe unanchored responses are "correct" when they range from 18-36 months (Table 1)? Have you validated against actual sentencing data?

5. **Opus inclusion**: With zero baseline variance, Opus cannot show anchoring. Why not exclude it from primary analysis and report as robustness check?

6. **SACD mechanisms**: You propose three mechanisms (Section 6.1) but test none. Can you design experiments to distinguish them?

7. **Practical thresholds**: What magnitude of baseline proximity difference would you consider "meaningful" for deployment decisions?

8. **Fraud domain**: Why does the fraud vignette show such severe anchoring (29-75% of baseline) compared to other domains? Is this replicable?

---

## Minor Issues

- **Abstract**: "bootstrap 95% confidence intervals overlap for all pairwise #1 vs #2 comparisons" is buried. This undermines the "no technique generalizes" claim and should be prominent.

- **Table 1 caption**: "Opus 4.6 shows zero variance (SD=0.0)... We retain Opus rather than excluding it because..." This justification belongs in main text, not a caption.

- **Section 3.2.4**: "All comparisons use Welch's t-test" but then "bootstrap 95% CIs." Which is the primary inference method? Be consistent.

- **Equation 3**: MAD formula uses $|R_i - R_{baseline}|$ but text says "deviation from 100%." The formula should match the text description.

- **Figure 2**: Color scheme (red/orange/blue/green) is not colorblind-friendly. Use patterns or different hues.

- **References**: \citet{llm-bayesian-2025} and \citet{llm-judge-overconfidence-2025} appear to be placeholder citations (Section 6.2). Are these published?

- **Appendix**: Prompt templates are valuable but verbose. Consider moving to supplementary materials and keeping only key excerpts in main appendix.

---

## Verdict

**MAJOR REVISION**

This paper tackles an important problem (debiasing technique evaluation) and makes a valuable methodological contribution (susceptibility vs. baseline proximity divergence). However, three fatal flaws require major revision:

1. **Circular metric design**: Proportional anchors calibrated to baseline, then evaluated against that same baseline, invalidate cross-model aggregates. The paper's headline numbers (93.7% for SACD, etc.) are uninterpretable.

2. **Turn-count confound**: SACD's apparent superiority may be entirely due to having 2× more conversation turns than competitors. Without a turn-matched control, the #1 ranking is unsubstantiated.

3. **Unsupported generalization claim**: The abstract claims "technique rankings vary dramatically by domain," but Section 5 shows overlapping CIs for all pairwise comparisons and uses only 4 models (vs. 10 in main study). This is exploratory at best.

**Required for acceptance**:
- Rerun with fixed absolute anchors OR restrict claims to within-model comparisons
- Add 6-turn Random Control to match SACD's turn count
- Either provide statistical tests for cross-domain rank differences OR soften claims to "exploratory"

**Recommended**:
- Validate baselines against external ground truth (actual sentencing data)
- Report results with/without Opus and Haiku as robustness checks
- Add practical guidance (sample sizes, decision thresholds, cost-benefit)

The core insight—that metric choice determines technique rankings—is important and likely robust. But the current execution has methodological issues that prevent confident interpretation of the results.

---

## Confidence

**4/5** (High confidence)

I am confident in this assessment. The circular metric design is a clear methodological flaw that any reviewer with statistical training would catch. The turn-count confound is explicitly acknowledged by the authors but not addressed. The missing significance tests for cross-domain comparisons are evident from the table captions. I have moderate uncertainty about whether the authors can salvage the cross-model aggregates with post-hoc adjustments, but the within-model findings appear robust.