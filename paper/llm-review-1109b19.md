# LLM Adversarial Review — 1109b19

Date: 2026-03-01T00:27:48.253Z
Model: claude-sonnet-4.5

## Summary

This paper evaluates four debiasing techniques for anchoring bias in LLMs across 21,139 trials spanning six domains. The core finding is that technique rankings are both metric-dependent and domain-dependent: susceptibility (high-low spread) and percentage-of-baseline metrics yield opposite technique rankings, and no technique consistently outperforms across domains. The authors introduce Mean Absolute Deviation (MAD) to reveal per-trial errors masked by aggregate metrics, and demonstrate substantial model-specific variance through a 10-model validation study. The work argues that practitioners must test debiasing interventions per-model and per-task rather than relying on published rankings.

## Strengths

- **Important methodological contribution**: The demonstration that susceptibility and baseline-proximity metrics give divergent rankings (Table 2) is valuable and well-illustrated. Devil's Advocate reducing susceptibility while moving responses away from baseline is a genuine insight.

- **Comprehensive empirical scope**: 21,139 trials across 10 models and 6 domains represents substantial experimental investment. The model diversity (Anthropic, OpenAI, DeepSeek, etc.) strengthens generalizability claims.

- **Transparent reporting of limitations**: The paper admirably acknowledges confounds (turn-count, Outside View jurisdiction, proportional anchors) and provides sensitivity analyses (Opus exclusion).

- **Reproducibility**: Complete data/code availability, deterministic analysis pipeline, and detailed prompt templates (Appendix) enable verification.

- **Statistical rigor**: Bootstrap CIs, Bonferroni correction, mixed-effects modeling, and power analysis demonstrate methodological sophistication.

## Weaknesses

### Major Issues

1. **The core claim is overstated given the evidence**
   - Abstract claims "no technique consistently outperforms" but this is based on overlapping 95% CIs in the 4-model exploratory analysis (Section 5). In the main 10-model study, SACD vs Devil's Advocate shows d=1.06 with non-overlapping CIs [92,95] vs [62,65] (Table 4).
   - The paper conflates "no statistically significant difference between #1 and #2" with "no technique is better." SACD consistently ranks #1 or #2 across most domains by point estimate; the lack of significance may reflect insufficient power rather than true equivalence.
   - Section 4.4 reports SACD-Premortem difference is "not statistically significant (p≈0.054)" but then performs TOST equivalence testing with a ±5pp bound. This bound appears arbitrary and is not justified—why is 5pp the "smallest difference that would plausibly affect deployment decisions"?

2. **Confounding of turn count undermines the main result**
   - SACD uses ~6 API calls vs 3 for other techniques (acknowledged in Limitations). Random Control's strong performance (78.3%, ranking #1 in 3/6 domains) suggests turn count itself affects responses.
   - The paper states "we cannot fully disentangle SACD's iterative content from its additional turns" but then ranks SACD #1 overall. This is a critical confound that should either be controlled experimentally or result in SACD being excluded from rankings.
   - The recommendation to "consider cost" (Section 6.5) doesn't address the validity threat—if SACD's advantage is partly due to more turns, the comparison is unfair.

3. **Proportional anchor design introduces circularity**
   - Anchors are set to baseline × 0.5 and baseline × 1.5, then techniques are evaluated on how close they get to baseline. This is partially circular: models with extreme baselines get extreme anchors, potentially inflating measured effects.
   - Section 3.1 defends this: "This is not circular: baselines are measured independently in anchor-absent conditions." But the anchor _strength_ is calibrated to baseline, which affects the difficulty of the debiasing task.
   - The paper acknowledges this (Limitation 2) but doesn't provide the promised validation with "fixed absolute anchors." Without this, cross-model comparisons are questionable.

4. **Statistical analysis has design effect issues**
   - Section 4.6 reports ICC=0.17, implying design effect ≈35 and effective n≈60-70 per technique (not ~2,200). This drastically reduces power.
   - The paper acknowledges being "underpowered" for d=0.39 effects but then reports trial-level Cohen's d values that "may be inflated" due to ignoring clustering.
   - The mixed-effects model uses residual df for F-tests (acknowledged as "anti-conservative with 10 clusters"). With only 10 models, variance component estimates are imprecise (also acknowledged).
   - These issues should lead to more cautious conclusions, not just footnotes. The abstract should reflect the effective sample size.

5. **Multi-domain analysis is severely underpowered**
   - Section 5 uses only 4 models (vs 10 in main study) and is labeled "exploratory" but Table 6 presents definitive rankings.
   - The paper states "bootstrap 95% CIs overlap for all #1 vs #2 comparisons" but doesn't show these CIs in Table 6, only point estimates.
   - Figure 3 uses visual emphasis (color, asterisks) to highlight "best" techniques despite admitting differences aren't statistically distinguishable. This is misleading.
   - The claim that "technique rankings vary by domain" is based on point estimates from an underpowered study. This should be presented as hypothesis-generating, not confirmatory.

### Moderate Issues

6. **Baseline as ground truth is philosophically problematic**
   - The paper measures deviation from each model's unanchored baseline, treating this as the "correct" answer. But Table 1 shows baselines range from 18-36 months—a 100% spread.
   - Section 3.1 acknowledges "we make no claim that baselines are normatively correct" but then the entire evaluation framework treats proximity to baseline as success.
   - For Opus (18mo baseline, SD=0), any technique that moves responses is penalized. But Opus's baseline might be wrong! The paper retains Opus because excluding it "would inflate apparent technique effectiveness"—this reveals the circularity.
   - A better approach: use expert consensus or legal guidelines as ground truth, then measure both bias (deviation from truth) and susceptibility (deviation due to anchors).

7. **The "Devil's Advocate failure mode" may be misinterpreted**
   - DA achieves 63.6% of baseline with low susceptibility. The paper interprets this as "consistently wrong."
   - But if baselines are themselves biased (e.g., Opus at 18mo is too lenient), then DA moving responses away from baseline could be _correcting_ a model bias.
   - Without external ground truth, we can't distinguish "DA introduces bias" from "DA corrects baseline bias but is still susceptible to anchors."

8. **Presentation issues obscure key findings**
   - The paper uses both trial-weighted and model-averaged statistics (Section 3.2.4) but doesn't consistently report which is being used. Table 5 shows model-level results but the text reports trial-weighted aggregates.
   - The "aggregate vs MAD" distinction (Table 7) is important but buried. This should be foregrounded—it's a key methodological contribution.
   - Figure 1 is redundant with Table 2 (both show % of baseline by technique). One should be cut.

9. **Missing analyses**
   - No analysis of whether anchoring effects differ by crime severity, defendant characteristics, or other vignette features. The fraud vignette shows "severe anchoring" (Section 5.2) but no investigation of why.
   - No analysis of whether techniques differentially affect high-capability vs low-capability models. Table 5 shows Haiku fails catastrophically with SACD (47.8%) but no investigation of whether this is capability-related.
   - No cost-benefit analysis. SACD costs 2× more than Premortem but achieves only 2.1pp better performance (non-significant). Is this worth it?

10. **Theoretical grounding is weak**
    - Section 6.2 speculates about mechanisms (Bayesian updating, overconfidence) but provides no evidence. These citations are tangential.
    - The claim that "human debiasing techniques may not transfer" (Section 6.5) is unsupported. The paper doesn't test whether these techniques work for humans in the same task.

### Minor Issues

11. **Inconsistent terminology**
    - "Percentage of baseline" vs "% of baseline" vs "baseline proximity"
    - "Full SACD" vs "SACD" (sometimes "Full" is dropped)
    - "Susceptibility" is defined as |high - low| but Table 2 reports this as "Spread"

12. **Statistical reporting**
    - Effect sizes are reported as Cohen's d but the paper acknowledges these are inflated due to clustering. Report mixed-effects estimates instead.
    - P-values are reported to 3 decimal places (p=0.054) but with Bonferroni correction, only p<0.0083 matters. Just report "p<0.05" or "p>0.05 after correction."

13. **Figure quality**
    - Figure 3 (MAD heatmap) is referenced as "figures/mad-heatmap.pdf" but the actual figure is missing from the LaTeX source. This suggests the PDF was compiled without the figure file.
    - Figure 2 uses color coding (red/orange/blue/green) that may not be accessible to colorblind readers.

14. **Writing quality**
    - Abstract is dense (200+ words) and buries the lede. Lead with "no technique consistently outperforms" rather than burying it after methodology.
    - Excessive hedging: "suggests," "may," "appears to" weaken claims unnecessarily in some places while overstating in others.
    - Section 1.1 title "Why Susceptibility Misleads" is too strong—susceptibility is a valid metric, just incomplete.

## Questions for Authors

1. **Turn count control**: Why not run a 6-turn Random Control condition to isolate SACD's content from turn-count effects? This seems essential for validating the main claim.

2. **Fixed anchor validation**: You acknowledge proportional anchors as a limitation and promise "future work" with fixed anchors. Can you provide even preliminary results? Without this, how confident are you in cross-model comparisons?

3. **Equivalence bounds**: How did you choose ±5pp as the TOST equivalence bound for SACD vs Premortem? What analysis supports this as the "smallest difference that would plausibly affect deployment decisions"?

4. **Baseline validity**: Have you compared model baselines to actual sentencing data or legal guidelines? If Opus's 18-month baseline is an outlier, should it be excluded on substantive (not just statistical) grounds?

5. **Domain selection**: Why these six domains? Were others tested and excluded? The fraud vignette shows extreme anchoring—was this anticipated or discovered post-hoc?

6. **Model-specific mechanisms**: Table 5 shows Haiku fails catastrophically with SACD (47.8%) while DeepSeek succeeds (100.8%). Do you have hypotheses about what architectural or training differences explain this 53pp gap?

7. **Practical recommendations**: If a practitioner can only test one technique due to cost constraints, what would you recommend? The paper says "test per-model" but doesn't provide a decision rule.

8. **Replication**: Have you attempted to replicate the Englich et al. (2006) judicial anchoring study with human judges using your vignette? This would validate that your task actually induces anchoring in humans.

## Minor Issues

- **Line 47**: "our exploratory cross-domain analysis (4 models) suggests no technique consistently outperforms" — this should specify "in the 4-model subset" to avoid confusion with the 10-model main study.

- **Table 1 caption**: "Opus 4.6 shows zero variance (SD=0.0) at all temperatures" — clarify whether this is across all 90 baseline trials or just within-temperature.

- **Section 3.2.4**: "Trial-weighted means answer 'what happens on a random trial?'" — this is only true if trials are sampled uniformly. If some models have more trials due to "high-variance conditions," this is selection bias.

- **Table 6**: Missing confidence intervals despite text claiming "bootstrap 95% CIs overlap for all #1 vs #2 comparisons."

- **References**: Several citations are incomplete (e.g., "lim2026deframe" has no entry in bibliography). The .bib file is missing from the submission.

- **Appendix A.4**: "Average iterations to convergence: 2.5 (median 3)" — mean < median suggests left skew, but this seems unlikely for count data. Please verify.

## Verdict

**MAJOR REVISION**

This paper makes important methodological contributions (metric divergence, MAD, model-specific variance) and represents substantial empirical work. However, the core claim that "no technique consistently outperforms" is not adequately supported by the evidence:

1. The turn-count confound undermines SACD's ranking
2. The 4-model multi-domain analysis is underpowered for the strong claims made
3. The proportional anchor design needs validation with fixed anchors
4. Statistical issues (design effects, inflated effect sizes) require more conservative conclusions

The paper should be revised to:

- Either control the turn-count confound experimentally or exclude SACD from rankings
- Present the multi-domain analysis as exploratory/hypothesis-generating
- Provide fixed-anchor validation or substantially hedge cross-model claims
- Report mixed-effects estimates rather than trial-level Cohen's d
- Clarify that "no consistent winner" applies to the underpowered 4-model analysis, not the 10-model study where SACD shows large, significant advantages over some techniques

With these revisions, this would be a strong contribution to the debiasing literature. The current version oversells underpowered findings while underselling robust ones.

## Confidence

**4/5** — I am confident in this assessment. I have expertise in experimental design, mixed-effects modeling, and LLM evaluation. I may be missing domain-specific context about judicial sentencing or cognitive debiasing techniques, but the statistical and methodological issues are clear.
