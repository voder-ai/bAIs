# LLM Adversarial Review — cc4d022

Date: 2026-02-28T12:28:07.063Z
Model: claude-sonnet-4.5

# Review of "Debiasing Anchoring Bias in LLM Judicial Sentencing"

## Summary

This paper evaluates four debiasing techniques for anchoring bias in LLMs across 21,139 trials on 10 models. The central claim is that metric choice determines technique recommendations: susceptibility (high-low spread) favors Devil's Advocate, while percentage-of-baseline favors SACD. The authors introduce Mean Absolute Deviation (MAD) to reveal that SACD's aggregate 93.7% baseline proximity masks 18.1% per-trial error due to bidirectional deviations. A multi-domain extension (6,987 trials, 4 models) shows technique rankings vary by domain. The paper argues practitioners must report multiple metrics and test per-model/per-domain.

## Strengths

- **Important methodological contribution**: Applying Jacowitz & Kahneman's (1995) baseline methodology to LLM debiasing is valuable. The field has indeed over-relied on susceptibility metrics.

- **Rigorous experimental design**: 21,139 trials with proper baselines, temperature controls, and statistical corrections (Bonferroni, bootstrap CIs) demonstrate thoroughness.

- **Honest reporting of limitations**: The authors acknowledge confounds (Outside View jurisdiction), proportional anchor circularity, and exploratory status of multi-domain results. The Opus sensitivity analysis (footnote) is exemplary.

- **Practical value**: The finding that Random Control outperforms Devil's Advocate (+15pp, d=0.39) despite no debiasing content is actionable and surprising.

- **Reproducibility**: Full data/code availability with deterministic analysis pipeline is commendable.

## Weaknesses

### Major Issues

1. **Circular metric design (critical flaw)**
   - The proportional anchor design (high = 1.5×baseline, low = 0.5×baseline) creates circularity: anchors are *defined* relative to baseline, then techniques are evaluated on proximity to baseline. This is not "avoiding circularity" (p.4) but *embedding* it.
   - **Impact**: A technique that simply ignores anchors and returns baseline would score 100% by construction. The metric rewards baseline-matching, not debiasing.
   - **Evidence**: Table 7 shows SACD achieves 100.8% for DeepSeek—this could mean perfect debiasing *or* the model is ignoring prompts entirely. The metric cannot distinguish.
   - **Fix needed**: Validate with fixed absolute anchors (e.g., always 12mo low, 36mo high) to break circularity.

2. **MAD definition lacks justification**
   - Equation 4 defines MAD as deviation from *model's* baseline ($b_m$), not ground truth. Why is matching the model's unanchored judgment the goal?
   - **Problem**: If a model has a biased baseline (e.g., Opus always says 18mo regardless of case details), MAD rewards techniques that preserve this bias.
   - **Missing**: No validation that baselines are "correct" or even reasonable. The vignette includes "12th offense"—is 18mo (Opus) vs 36mo (o4-mini) a bias or legitimate disagreement?
   - **Suggestion**: Either (1) justify why model baselines are normative, or (2) reframe MAD as "consistency with unanchored state" rather than "correctness."

3. **Statistical analysis issues**
   - **Power analysis post-hoc**: Section 3.2 reports power analysis *after* data collection, finding some comparisons (SACD vs Premortem, d=0.08) are underpowered. This should have informed stopping rules.
   - **ICC=0.17 with n=10 models**: The mixed-effects analysis (Section 4.5) estimates variance components from only 10 clusters. With this small cluster count, ICC estimates are highly unstable (Hox et al., 2010). The reported ICC could easily be 0.10-0.25 with different model samples.
   - **Multiple comparison correction incomplete**: Bonferroni correction applied to 6 pairwise technique comparisons, but not to the 10 model-specific comparisons in Table 5. With 10 tests, α=0.05 → α_corrected=0.005.
   - **Bootstrap stratification**: "Resampling is stratified by model" (p.8)—but with unequal sample sizes per model (Table 2), this may not preserve the trial-weighted mean structure. Need clarification.

4. **Multi-domain extension underpowered and oversold**
   - Section 5 uses only 4 models (vs 10 in main study) and lacks significance testing: "Rankings lack confidence intervals and significance testing due to small model count" (p.18).
   - **Problem**: Table 6 presents rank orderings (#1, #2, etc.) without any indication these differences are reliable. The text states "bootstrap 95% CIs overlap for all #1 vs #2 comparisons" (caption)—so *none* of the rankings are statistically distinguishable.
   - **Overselling**: Abstract claims "SACD ranks #1 on zero domains" but this is based on point estimates from n=4 models with overlapping CIs. This is exploratory data, not a robust finding.
   - **Fix**: Either (1) increase model count to n≥10 per domain, or (2) clearly label Section 5 as "preliminary" and remove from abstract/conclusions.

5. **Confound handling inadequate**
   - Outside View required "German federal courts" specification (Section 4.8), introducing a secondary anchor. Authors acknowledge this but still include Outside View in trial counts (Table 2: n=2,423) and figures.
   - **Problem**: Contaminated data inflates total trial count (14,152 includes Outside View) and may bias aggregate statistics if not properly excluded.
   - **Evidence**: Table 2 caption says "Outside View is included in this count but excluded from technique rankings"—but Table 3 shows 4 techniques, suggesting proper exclusion. Clarify whether the 14,152 total includes Outside View trials in *any* aggregate calculations.

### Moderate Issues

6. **Baseline interpretation ambiguity**
   - The vignette includes "12th shoplifting offense" in the baseline condition (Appendix A.1). This is not "unanchored"—it's a strong numeric anchor.
   - **Impact**: The baseline may already be anchored, making "100% of baseline" an arbitrary target rather than ground truth.
   - **Suggestion**: Test a truly unanchored baseline (remove "12th offense") to validate that current baselines are stable.

7. **Devil's Advocate failure mode under-explored**
   - DA produces consistent responses (low spread) far from baseline (63.6%). The paper attributes this to "consistent but wrong" (p.6) but doesn't investigate *why*.
   - **Hypothesis**: DA may trigger adversarial reasoning that systematically underestimates sentences. This is testable: do DA responses cluster around a specific value (e.g., minimum probation)?
   - **Missing analysis**: Distribution plots for DA (mentioned in limitations: "Full per-trial distributions in supplementary materials") should be in main text.

8. **Temperature effects dismissed too quickly**
   - "No significant temperature×technique interaction (F(6,8944)=1.42, p=0.203); temperature effects <3pp" (Section 3.2.4).
   - **Problem**: 3pp is not trivial—it's ~10% of the 27.1pp gap between anchored (72.9%) and baseline (100%). A 3pp shift could change technique rankings.
   - **Missing**: Report temperature effects *per technique*. If SACD shows +3pp at t=1.0 but DA shows -3pp, the interaction may be meaningful even if not statistically significant.

9. **Theoretical grounding speculative and disconnected**
   - Section 6.2 cites two 2025 papers on Bayesian reasoning and overconfidence, but these are labeled "speculative" and not integrated into the experimental design.
   - **Problem**: Post-hoc theorizing without pre-registered hypotheses. If these mechanisms were suspected, why not test them (e.g., measure confidence calibration)?
   - **Suggestion**: Either (1) move to future work, or (2) add exploratory analyses testing these hypotheses.

10. **Fraud domain anomaly unexplained**
    - Table 6 shows fraud domain has severe anchoring (all techniques 29-75% of baseline). Authors note this but don't investigate.
    - **Missing**: Is this due to (1) sympathetic defendant framing, (2) first-offense vs repeat, (3) financial crime vs violent crime, or (4) model-specific behavior? A follow-up experiment varying these factors would strengthen claims.

## Questions for Authors

1. **Circularity**: How do you respond to the concern that proportional anchors (defined relative to baseline) create circularity when evaluating baseline proximity? Can you provide results with fixed absolute anchors?

2. **MAD normative status**: Why is matching the model's unanchored baseline the correct goal? What if the baseline itself is biased (e.g., Opus's deterministic 18mo)?

3. **Power analysis**: Why was power analysis conducted post-hoc rather than used to determine stopping rules? How do you justify reporting underpowered comparisons (SACD vs Premortem, d=0.08)?

4. **Multi-domain statistical rigor**: Table 6 shows rank orderings from n=4 models with overlapping CIs. Why present these as definitive rankings rather than exploratory findings?

5. **Outside View contamination**: Does the 14,152 trial count include Outside View trials in any aggregate statistics beyond Table 2? If so, how does this affect results?

6. **Baseline anchoring**: The vignette includes "12th offense" in baseline condition. Have you tested a truly unanchored baseline (no numeric details) to validate current baselines?

7. **Temperature×technique interaction**: Can you report temperature effects separately per technique? The aggregate F-test may mask technique-specific patterns.

8. **Devil's Advocate mechanism**: Do DA responses cluster around a specific value (e.g., minimum sentence)? What is the distribution shape?

9. **Fraud domain**: What explains the severe anchoring in fraud cases? Can you test whether it's due to sympathetic framing, first-offense status, or crime type?

10. **Reproducibility**: The paper states trials were collected via OpenRouter in February 2026. Can you clarify: (1) Is this a typo (should be 2025)? (2) Are model versions frozen/reproducible?

## Minor Issues

- **Table 2 caption**: "Outside View is included in this count but excluded from technique rankings due to confound"—clarify whether it's excluded from *all* analyses or just rankings.
- **Figure 1 caption**: "Dashed line = 100% (unanchored judgment)"—this is the baseline, not necessarily "unanchored" (see issue #6).
- **Section 3.2.4**: "Results aggregated; baseline calculations use temperature-matched baselines"—does this mean separate baselines per temperature? Clarify.
- **Equation 4**: MAD uses $b_m$ (model baseline) but text sometimes refers to "baseline" generically. Use consistent notation.
- **Table 6**: "Bootstrap 95% CIs overlap for all #1 vs #2 comparisons"—if true, why report ranks at all? Consider reporting CIs in table.
- **References**: \citet{llm-bayesian-2025} and \citet{llm-judge-overconfidence-2025} appear to be placeholders (no entries in bibliography).
- **Appendix A.1**: "For experimental purposes, the following prosecutor's sentencing demand was randomly determined"—this framing may itself be a debiasing intervention. Have you tested anchor presentation without this disclaimer?

## Verdict

**MAJOR REVISION**

This paper addresses an important problem (metric choice in debiasing evaluation) with a large-scale empirical study. However, critical methodological flaws undermine the core claims:

1. **Proportional anchor circularity** (Issue #1) is a fundamental design flaw that invalidates baseline proximity as currently measured.
2. **Multi-domain results are underpowered** (Issue #4) and should not be presented as definitive findings in abstract/conclusions.
3. **Statistical issues** (Issue #3) including post-hoc power analysis and unstable ICC estimates weaken inferential claims.

The paper makes a valuable contribution—demonstrating that susceptibility and baseline metrics diverge—but needs substantial revision to address circularity, validate with fixed anchors, and appropriately scope multi-domain claims.

**Required for acceptance:**
- Rerun experiments with fixed absolute anchors to validate baseline proximity metric
- Reframe multi-domain results as exploratory or increase model count to n≥10
- Address MAD normative status (Issue #2)
- Correct statistical issues (multiple comparisons, power analysis)

**Recommended:**
- Investigate Devil's Advocate failure mode (distribution analysis)
- Test truly unanchored baseline (remove "12th offense")
- Add temperature×technique interaction analysis

## Confidence

**4/5** (High confidence)

I am confident in identifying the methodological issues (circularity, statistical power, multi-domain limitations) as these are standard concerns in experimental design. The proportional anchor circularity is a clear logical flaw. My confidence is not 5/5 because: (1) I may be missing domain-specific context about why model baselines are normative targets, and (2) the authors' full data/code availability means some concerns might be addressable with clarification rather than new experiments.