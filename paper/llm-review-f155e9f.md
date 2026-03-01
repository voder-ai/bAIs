# LLM Adversarial Review — f155e9f

Date: 2026-03-01T00:35:26.396Z
Model: claude-sonnet-4.5

# Adversarial Review: Debiasing Technique Rankings Are Metric- and Domain-Dependent

## Summary

This paper evaluates four debiasing techniques for anchoring bias in LLMs across 21,139 trials spanning six domains. The core claim is that technique rankings are metric- and domain-dependent, with no universally superior approach. The authors introduce Mean Absolute Deviation (MAD) as a complement to standard susceptibility metrics and demonstrate that Devil's Advocate reduces susceptibility while moving responses away from baseline (a "consistency without correctness" failure mode). The paper includes a deep validation on 10 models for judicial sentencing and an exploratory cross-domain analysis on 4 models. While the methodological contributions are valuable, the paper suffers from significant statistical issues, confounds, and overclaimed generalizability.

## Strengths

- **Important methodological contribution**: The distinction between susceptibility (consistency) and baseline proximity (correctness) is genuinely valuable and addresses a real flaw in prior work. The Devil's Advocate failure mode (low susceptibility at 63.6% of baseline) is a compelling empirical demonstration.

- **Comprehensive data collection**: 21,139 trials across multiple models and domains represents substantial empirical effort. The inclusion of 10 models from 4 providers strengthens external validity.

- **Transparent reporting of limitations**: The authors acknowledge the turn-count confound (SACD uses ~6 calls vs 3), proportional anchor circularity concerns, and exploratory nature of multi-domain results. This level of transparency is commendable.

- **Reproducibility**: Full data/code availability, deterministic analysis pipeline, and detailed prompt templates in appendix enable verification.

- **MAD metric**: The introduction of Mean Absolute Deviation to reveal bidirectional errors hidden by aggregate means (SACD: 93.7% aggregate, 18.1% MAD) is a useful contribution.

## Weaknesses

### 1. **Statistical Analysis is Fundamentally Flawed**

**Critical Issue**: The paper claims "bootstrap 95% CIs overlap for all pairwise #1 vs #2 comparisons" as evidence that techniques cannot be distinguished, but then reports effect sizes (d=1.06 for SACD vs DA) and p-values suggesting clear differences.

- **Section 4.2**: Reports Cohen's d=1.06 (large effect) for SACD vs Devil's Advocate, but then claims in the abstract and multi-domain section that differences are "not statistically significant." This is contradictory.

- **Confidence interval overlap ≠ non-significance**: The authors repeatedly use CI overlap as a test of significance, which is incorrect. Two means can have non-overlapping CIs and still not be significantly different at α=0.05, and vice versa. The proper test is whether the CI for the *difference* excludes zero.

- **Multiple comparisons**: Bonferroni correction is mentioned (α=0.0083 for 6 comparisons) but then ignored. Table 2 shows SACD [92, 95] vs DA [62, 65]—these CIs clearly don't overlap, yet the text claims we "cannot statistically distinguish" techniques.

- **Power analysis arrives too late**: Section 3.2.4 acknowledges effective n≈60-70 due to clustering (ICC=0.17), which is underpowered for d=0.39 effects. This should have informed the experimental design, not been discovered post-hoc.

**Recommendation**: Either conduct proper hypothesis tests with corrected α and report which comparisons are significant, OR frame the entire paper as exploratory/descriptive and remove all significance claims. The current hybrid approach is incoherent.

### 2. **The Turn-Count Confound Undermines the Main Finding**

The paper's headline result is that SACD achieves 93.7% of baseline (best performance). However:

- SACD uses ~6 API calls vs 3 turns for other techniques (acknowledged in Section 3.3.1, Limitation #10)
- Random Control (neutral content, 3 turns) achieves 78.3%—a +5.4pp improvement over no-technique baseline (72.9%)
- This suggests **turn count itself** contributes substantially to debiasing

**The problem**: We cannot determine how much of SACD's 93.7% performance is due to its iterative content vs simply having more turns. The authors acknowledge this but don't adequately address it:

- A 6-turn Random Control condition would isolate SACD's content contribution—this is the obvious control and its absence is a major flaw
- The paper recommends SACD in the abstract and conclusion without caveating that its advantage may be purely structural
- Table 3 shows SACD uses 2.5 median iterations (6 calls), making it 2× more expensive than alternatives, yet cost-benefit analysis is relegated to a single bullet point in Section 6.2

**Impact on claims**: The core finding that "SACD is best" may reduce to "more turns are better," which is trivial. This should be front-and-center, not buried in limitations.

### 3. **Proportional Anchor Design Introduces Circularity**

The authors set anchors proportionally to each model's baseline (±50%), then measure deviation from baseline. This creates several problems:

- **Circularity**: Models with low baselines get low anchors, making it easier to "return to baseline." Opus (baseline=18mo) gets anchors of 9mo/27mo, while o4-mini (baseline=35.7mo) gets 17.9mo/53.6mo. These are not comparable anchoring pressures.

- **Ratio scaling artifacts**: Section 6.2 (Limitation #6) acknowledges that "ratio scaling exaggerates deviations for low-baseline models," but this is exactly what the % of baseline metric does. A 5-month deviation is 27.8% for Opus but 14.0% for o4-mini.

- **Susceptibility comparisons invalid**: The authors correctly note (Section 4.2) that proportional anchors "limit cross-model susceptibility comparisons," but then report aggregate susceptibility values (Table 2) pooled across models. These numbers are meaningless.

**Why this matters**: The entire "% of baseline" metric depends on baseline measurement, but baselines are measured with the same models that show high variance (Table 1: SD ranges 0.0 to 11.2). For Haiku (SD=11.2), a single baseline trial could shift by ±11 months, changing all subsequent % calculations.

**Proposed fix**: Validate with fixed absolute anchors (e.g., 12mo/36mo for all models) to confirm findings aren't artifacts of the proportional design.

### 4. **Multi-Domain Results Are Severely Underpowered and Overclaimed**

Section 5 presents 6 domains × 4 techniques but uses only **4 models** (vs 10 in main study):

- **Sample size**: With n≈900 trials per domain but only 4 models, effective n≈15-20 per technique after accounting for clustering
- **No significance testing**: Table 4 shows point estimate rankings but the text admits "bootstrap 95% CIs overlap for all #1 vs #2 comparisons"
- **Overclaimed generalization**: The abstract states findings are "across six domains" but the multi-domain analysis is explicitly labeled "exploratory" in a warning box (Section 5)

**Specific issues**:
- Medical domain (n=893, 4 models): Random Control ranks #1 with MAD=3.7%, but with effective n≈15, this could easily be noise
- Fraud domain shows all techniques at 29-75% of baseline, suggesting the vignette itself is problematic (acknowledged in Section 5.2), yet it's included in the "6 domains" count
- Figure 2 (MAD heatmap) uses visual emphasis (green shading, asterisks) to highlight "best" techniques despite admitting differences aren't statistically distinguishable

**Recommendation**: Either collect data on 10 models for all domains, or clearly limit claims to the judicial domain and present multi-domain results as "preliminary evidence of domain-dependence" rather than confirmed findings.

### 5. **Baseline-as-Ground-Truth Assumption is Questionable**

The paper measures "debiasing" as returning to each model's unanchored baseline, but:

- **Baselines vary wildly**: 18mo (Opus) to 35.7mo (o4-mini)—a 17.7-month spread (Table 1)
- **Baselines may be wrong**: The vignette includes "12th offense," which is itself an anchor. The authors acknowledge this (Limitation #5) but don't address the implication: if baselines are anchored, then "100% of baseline" isn't debiased, it's just consistently anchored.

- **Opus zero-variance anomaly**: Opus responds with exactly 18mo at all temperatures (SD=0.0). The authors retain it because "excluding post-hoc would inflate technique effectiveness," but this is backwards—including a model that never varies *deflates* variance estimates and makes techniques appear more effective than they are.

**Example**: SACD achieves 127.8% of baseline for Opus (Table 5). But Opus's baseline is 18mo (suspiciously low), so SACD pushes it to 23mo. Is this "overshooting" or "correcting an underestimate"? We can't know without ground truth.

**The deeper problem**: The paper operationalizes debiasing as consistency (matching unanchored responses) rather than accuracy (matching correct answers). This is defensible for anchoring research, but the authors should acknowledge that a technique could "debias" a model toward a wrong answer.

### 6. **Outside View Confound Invalidates One Technique Entirely**

Section 3.3.1 and 6.1 acknowledge that Outside View required jurisdiction specification ("German federal courts") to avoid safety refusals, introducing a secondary anchor. The authors then:

- Exclude Outside View from technique rankings (correct)
- But still report its results (51.2% of baseline, Table 3)
- And include it in the trial count (2,423 trials, Table 2)

**Problem**: These 2,423 trials are contaminated data. They should be excluded from aggregate statistics (e.g., "21,139 trials") or clearly marked as invalid. Including them inflates the apparent sample size.

**Missed opportunity**: The authors could have tested Outside View *without* jurisdiction (accepting some safety refusals) to determine if the technique itself works. As presented, we learn nothing about Outside View except that their implementation was confounded.

### 7. **Mixed Effects Model is Underspecified**

Section 4.6 presents a mixed effects model but:

- **Only 10 clusters**: With 10 models, variance component estimates are highly uncertain. The ICC=0.17 has huge confidence intervals (not reported).
- **Satterthwaite correction mentioned but not applied**: "Caveat: This test uses residual df (anti-conservative with 10 clusters); Satterthwaite-corrected df would be smaller" (Section 4.6). Why not just use the corrected test?
- **Random slopes model**: Reports that adding random slopes reduces residual variance by 16.9% (χ²=1658, p<0.001), but doesn't report the actual random slope estimates or use this model for inference. If technique effects vary by model (which Table 5 clearly shows), the random intercepts model is misspecified.

**Recommendation**: Use the random slopes model as the primary analysis, report slope variance components, and use Satterthwaite-corrected df for all tests.

### 8. **Effect Size Interpretation is Inconsistent**

- Section 4.2 reports d=1.06 (SACD vs DA) as "large" and d=0.08 (SACD vs Premortem) as "negligible"
- But then Section 4.7 uses TOST to claim SACD and Premortem are "equivalent" with a ±5pp equivalence bound
- The equivalence bound (5pp ≈ 1.5 months) is arbitrary and not justified. Why is 1.5 months the "smallest difference that would plausibly affect deployment decisions"?

**Inconsistency**: If d=0.08 is negligible, just say they're not significantly different. The TOST test adds nothing except the appearance of rigor.

### 9. **Theoretical Grounding is Speculative and Disconnected**

Section 6.2 cites two 2025 papers on Bayesian reasoning and overconfidence to explain SACD's variance, but:

- These citations are labeled "speculative" by the authors themselves
- No mechanism is proposed for *why* iterative reflection would amplify biases
- The "debiasing theater" hypothesis (Opus overshoots to appear thoughtful) is interesting but untested

**Missed opportunity**: The paper could have tested predictions from these theories (e.g., does SACD variance correlate with model confidence scores? Do models with stronger priors show more overshoot?). As written, Section 6.2 reads like post-hoc storytelling.

### 10. **Writing Quality Issues**

- **Redundancy**: Figure 1 and the removed figure both show % of baseline by technique. Table 2 and Table 3 report overlapping information.
- **Inconsistent terminology**: "Percentage of baseline" vs "% of baseline" vs "baseline proximity"
- **Footnote overuse**: 3 footnotes in the abstract alone, including a critical caveat about turn count that should be in the main text
- **Warning box in Section 5**: The "Exploratory Analysis" warning is good transparency, but it undermines the abstract's claim of "six domains"—either the multi-domain results are robust enough to include in the abstract, or they're exploratory and shouldn't be.

## Questions for Authors

1. **Statistical testing**: Can you provide a table showing which pairwise technique comparisons are significant after Bonferroni correction? The current presentation (CIs overlap = not significant) is incorrect.

2. **Turn-count control**: Why was a 6-turn Random Control condition not included? This is the obvious control for SACD and its absence is a major limitation.

3. **Proportional anchors**: Have you validated findings with fixed absolute anchors? If not, how do you rule out that results are artifacts of the proportional design?

4. **Opus inclusion**: You argue that excluding Opus "would inflate technique effectiveness," but including a zero-variance model deflates variance estimates. Can you provide sensitivity analyses showing results with/without Opus for all techniques, not just aggregates?

5. **Baseline validity**: The vignette includes "12th offense"—how do you know this isn't anchoring the baseline itself? Have you tested with a truly unanchored vignette (no offense count)?

6. **Multi-domain power**: With only 4 models in Section 5, effective n≈15-20 per technique. What is the minimum detectable effect size at this sample size? Are you powered to detect meaningful differences?

7. **Outside View**: Why include 2,423 confounded trials in the total count? Why not test Outside View without jurisdiction specification?

8. **Mixed effects**: Why not use the random slopes model (which you show fits better) for primary inference? What are the actual slope variance estimates?

9. **Equivalence bound**: How was the ±5pp equivalence bound for SACD vs Premortem determined? Is this based on domain expertise, prior literature, or arbitrary choice?

10. **Generalization**: The abstract claims findings hold "across six domains," but five of those domains use only 4 models and show overlapping CIs. Should the abstract be revised to reflect that only the judicial domain has robust evidence?

## Minor Issues

- **Table 2 caption**: "95\% CIs from bootstrap" but CIs aren't shown in the table—they're in brackets in Table 3
- **Figure 2 caption**: "Caveat: Visual emphasis (color/asterisks) shows numerically lowest values only" contradicts the figure's apparent purpose of showing "best" techniques
- **Section 3.2.4**: "All comparisons use Welch's t-test" but Section 4.6 uses mixed effects—clarify which is primary
- **Limitation #7**: "Multi-domain coverage... results are exploratory" should be in the abstract
- **References**: \citet{lyu2025} and other 2025/2026 citations are future-dated (paper is dated Feb 2026)—are these real or placeholder?
- **Appendix**: Prompt templates are valuable but the SACD description ("average iterations: 2.5, median 3") is contradictory (median should be integer)

## Verdict

**MAJOR REVISION**

This paper makes valuable methodological contributions (susceptibility vs baseline proximity, MAD metric) and presents substantial empirical work (21,139 trials). However, it suffers from critical flaws that prevent acceptance:

1. **Statistical incoherence**: The paper simultaneously claims techniques cannot be distinguished (overlapping CIs) and reports large effect sizes (d=1.06). This must be resolved.

2. **Uncontrolled confound**: The turn-count confound undermines the main finding (SACD is best). A 6-turn Random Control is essential.

3. **Overclaimed generalization**: Multi-domain results are underpowered (4 models) and exploratory, yet presented in the abstract as robust findings.

4. **Circular design**: Proportional anchors create circularity that may invalidate cross-model comparisons.

The paper should be revised to:
- Conduct proper significance testing with Bonferroni correction and report which comparisons are significant
- Add a 6-turn Random Control condition to isolate SACD's content from turn-count effects
- Either expand multi-domain analysis to 10 models OR clearly limit claims to judicial domain
- Validate with fixed absolute anchors to rule out proportional design artifacts
- Use random slopes mixed effects model for primary inference

With these revisions, this could be a strong contribution to the debiasing literature. In its current form, the statistical issues and confounds are too severe for acceptance.

## Confidence

**5/5** - I am highly confident in this assessment. The statistical issues (CI overlap ≠ non-significance, missing turn-count control, underpowered multi-domain analysis) are clear methodological flaws. The proportional anchor circularity and baseline validity concerns are more subtle but equally important. I have expertise in experimental design, mixed effects modeling, and anchoring bias research.