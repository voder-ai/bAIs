# LLM Adversarial Review — 3db1963

Date: 2026-02-28T12:35:32.151Z
Model: claude-sonnet-4.5

# Adversarial Review: "How Effective Are Debiasing Techniques for LLM Anchoring Bias?"

## Summary

This paper evaluates four debiasing techniques for anchoring bias in LLMs across 21,139 trials on 10 models. The central claim is that metric choice determines technique rankings: susceptibility (high-low spread) favors Devil's Advocate, while percentage-of-baseline favors SACD. The authors introduce Mean Absolute Deviation (MAD) to reveal that SACD's aggregate 93.7% baseline proximity masks 18.1% per-trial error due to bidirectional deviations. A multi-domain extension (6,987 trials, 4 models) shows technique rankings vary by domain with no clear winner. The paper argues practitioners must test per-model and per-domain, and researchers should report MAD alongside aggregate metrics.

## Strengths

- **Important methodological contribution**: The divergence between susceptibility and baseline-proximity metrics is well-demonstrated and has practical implications for how debiasing techniques are evaluated in the field.

- **Rigorous scale**: 21,139 trials across 10 models is substantial. The inclusion of multiple providers (Anthropic, OpenAI, DeepSeek, Moonshot, Zhipu) strengthens generalizability claims.

- **Transparent reporting**: Full data availability, detailed prompts in appendix, acknowledgment of AI assistance, and explicit discussion of limitations (Section 6.5) are commendable.

- **MAD metric insight**: The observation that aggregate baseline proximity (93.7%) masks per-trial variance (18.1% MAD) due to bidirectional errors is valuable and well-illustrated in Tables 6-7.

- **Mixed-effects analysis**: Section 4.6 properly accounts for model-level clustering (ICC=0.17) and demonstrates technique×model interaction via random slopes, justifying the "test per-model" recommendation.

## Weaknesses

### 1. **Circular Anchor Design Undermines Core Claims**

The proportional anchor design (high = 1.5×baseline, low = 0.5×baseline) creates fundamental circularity:

- **Problem**: Anchors are *defined* relative to the baseline you're measuring against. A technique that perfectly ignores anchors would score 100% of baseline *by construction*, not because it's "debiased."

- **Evidence**: The authors acknowledge this (Section 6.5: "Anchors scale with baseline... introduces potential circularity") but dismiss it too quickly. The "baseline as reference, not ground truth" framing (Section 3.1) doesn't resolve the issue—if anchors are calibrated to each model's baseline, then measuring "distance from baseline" is measuring "distance from the anchor calibration point."

- **Impact**: This undermines the entire percentage-of-baseline metric. The claim that "SACD achieves 93.7% baseline proximity" may simply mean "SACD responses average close to the midpoint between high and low anchors" (which are themselves defined as ±50% of baseline). This is not the same as "SACD restores anchor-independent reasoning."

- **What's needed**: Replication with *fixed absolute anchors* (e.g., always 12 months low, 36 months high, regardless of model baseline). The authors mention this in limitations but don't provide the data.

### 2. **Baseline Measurement Confound**

Section 6.5 acknowledges: "Baseline includes '12th offense'—'without explicit anchor,' not truly unanchored."

- **Problem**: The "baseline" condition still contains a numeric anchor (12th offense). This means you're not measuring deviation from an *unanchored* state, but from a *differently anchored* state.

- **Impact**: The entire percentage-of-baseline framework assumes the baseline represents "what the model would say without anchoring." But if the baseline itself is anchored (by "12th offense"), then 100% baseline proximity doesn't mean "debiased"—it means "anchored to 12 instead of to the prosecutor's demand."

- **Severity**: This is a fatal flaw for the paper's central claim. The authors present baseline proximity as the "correct" metric, but their baseline is contaminated.

### 3. **Statistical Power and Multiple Comparisons**

- **Effective sample size**: The authors correctly note (Section 3.2.4) that ICC=0.17 with ~200 trials/model yields n_eff ≈ 60-70 per technique. This is *barely* powered to detect d=0.50 effects.

- **Underpowered comparisons**: The SACD vs. Premortem comparison (d=0.08, p=0.054) is clearly underpowered. The authors run TOST equivalence testing, but the ±5pp equivalence bound is arbitrary ("approximately 1.5 months given average baselines"—but baselines range 18-36 months, so 5pp means different absolute amounts across models).

- **Multiple comparisons**: Bonferroni correction for 6 pairwise comparisons (α=0.0083) is appropriate, but the multi-domain analysis (Section 5) reports *no significance testing at all*. Table 8 shows rankings but states "bootstrap 95% CIs overlap for all pairwise comparisons"—meaning *none* of the domain-specific rankings are statistically distinguishable. This severely undermines claims like "SACD drops from #1 on 5 domains to #1 on zero domains" (Section 5.2).

### 4. **Multi-Domain Analysis is Underpowered and Oversold**

- **Sample size**: Only 4 models (vs. 10 in main study). The authors label this "exploratory" but then make strong claims: "metric choice inverts technique rankings" (Abstract), "SACD consistently underperforms" (Section 5.2).

- **No statistical support**: All pairwise comparisons have overlapping CIs. The ranking differences in Table 8 could be noise.

- **Selective reporting**: The heatmap (Figure 2) uses asterisks to mark "best technique per domain," but these are point estimates without significance. This visually implies differences that aren't statistically supported.

- **Recommendation**: Either (a) collect more data to power the multi-domain claims, or (b) substantially soften the language and move this to supplementary material.

### 5. **Outside View Exclusion Weakens Claims**

- **Confound**: Outside View required jurisdiction specification ("German federal courts"), introducing a secondary anchor. The authors exclude it from technique rankings (Table 5).

- **Problem**: This is one of the four main techniques evaluated. Excluding it post-hoc raises concerns about selective reporting. If Outside View was confounded, why include it in the 21,139 trial count and the abstract's "four techniques" claim?

- **Impact**: The paper evaluates *three* techniques cleanly (SACD, Premortem, Devil's Advocate) plus a control (Random Control). The "four techniques" framing is misleading.

### 6. **Opus 4.6 Zero-Variance Issue**

Table 2 shows Opus 4.6 has SD=0.0 (always responds 18 months). The authors retain it because "excluding post-hoc would inflate apparent technique effectiveness."

- **Problem**: Including a model with *zero variance* in the baseline distorts all percentage-of-baseline calculations for that model. Any technique response ≠18 months will show large deviation, but this isn't meaningful—it's an artifact of Opus's deterministic behavior.

- **Sensitivity analysis**: The authors report (Section 6.5) that excluding Opus shifts means 2-3pp but preserves rankings. This should be in the main text, not buried in limitations. Better yet: report results *with and without* Opus in parallel.

### 7. **MAD Definition Ambiguity**

Equation 4 defines MAD as:
$$\text{MAD} = \frac{1}{n} \sum_{i=1}^{n} \left| \frac{r_i}{b_m} - 1 \right| \times 100\%$$

- **Ambiguity**: Is $b_m$ the model's baseline (one value per model), or the trial-specific baseline? The text says "model $m$'s unanchored baseline response," implying one value per model.

- **Problem**: If $b_m$ is constant per model, then MAD is computed *within* each model and then averaged *across* models. But the paper reports a single aggregate MAD (18.1% for SACD). How is this aggregated? Trial-weighted? Model-weighted?

- **Impact**: Without clarity on aggregation, the MAD values are hard to interpret. This is especially important given the "trial-weighted vs. model-averaged" discussion in Section 3.2.4.

### 8. **Theoretical Grounding is Weak**

Section 6.2 offers "speculative" mechanisms for why SACD works/fails, citing two 2025 papers on Bayesian reasoning and overconfidence. 

- **Problem**: These citations are speculative and not well-integrated. The paper would be stronger either (a) developing a theoretical framework upfront and testing predictions, or (b) removing the theory section entirely and focusing on empirical patterns.

- **Current state**: The theory section reads like post-hoc rationalization rather than hypothesis-driven research.

## Questions for Authors

1. **Circular anchors**: How do you respond to the concern that proportional anchors (±50% of baseline) make percentage-of-baseline a circular metric? Can you provide results with fixed absolute anchors to validate the findings?

2. **Baseline contamination**: The baseline condition includes "12th offense." How do you justify treating this as an "unanchored" reference point? Have you tested a truly anchor-free baseline (e.g., "The defendant has been convicted of shoplifting. What sentence do you recommend?")?

3. **Multi-domain power**: Given that all pairwise comparisons in Table 8 have overlapping CIs, how do you justify claims like "SACD consistently underperforms" (Section 5.2)? Would you consider softening this language or collecting more data?

4. **MAD aggregation**: Equation 4 uses $b_m$ (model baseline). Is MAD computed per-model then averaged, or pooled across all trials? Please clarify the aggregation procedure.

5. **Outside View**: Why include Outside View in the trial count and abstract if it's excluded from rankings due to confound? Would the paper be clearer if you presented it as "3 techniques + 1 control + 1 confounded technique"?

6. **Opus sensitivity**: You report (Section 6.5) that excluding Opus changes means by 2-3pp. Can you show results with/without Opus in the main text (e.g., as a supplementary table)? This would strengthen transparency.

7. **SACD vs. Premortem**: You run TOST equivalence testing with ±5pp bound. How did you choose 5pp? This represents different absolute amounts for models with different baselines (18mo vs. 36mo). Would a percentage-based bound (e.g., ±10% of baseline) be more appropriate?

8. **Temperature effects**: You report "no significant temperature×technique interaction" (Section 3.2.3) and aggregate across temperatures. But you also say "baseline calculations use temperature-matched baselines." If there's no interaction, why match temperatures? Please clarify.

## Minor Issues

- **Table 1 caption**: "Outside View is included in this count but excluded from technique rankings due to confound" is confusing on first read. Consider footnoting this or restructuring the table.

- **Figure 1 vs. text**: Figure 1 shows Devil's Advocate at 63.6%, but the text (Section 4.2) emphasizes this is "consistently far from baseline." The figure alone doesn't convey the *direction* of deviation (always below baseline). Consider adding a reference line or annotation.

- **Section 4.3 title**: "High-Anchor Responses (No Technique)" is vague. Consider "Compression vs. Inflation Patterns Under High Anchors."

- **Equation 2**: The denominator is "Spread_no-technique" but Table 5 uses "No Technique" (with capital T). Standardize terminology.

- **References**: Several citations are to 2025-2026 papers (e.g., lim2026deframe, llm-bayesian-2025). If these are real, provide full citations. If they're placeholders, note this.

- **Appendix A.5**: "Full SACD" description says "average iterations to convergence: 2.5 (median 3)." Mean < median suggests left skew, but you'd expect right skew (some trials take many iterations). Please verify.

- **Typo, Section 6.5**: "Opus 4.6 shows zero variance (SD=0.0) at all temperatures, consistently responding with exactly 18 months." This is stated twice (Table 2 caption and Section 6.5). Remove redundancy.

## Verdict

**MAJOR REVISION**

This paper addresses an important question (how to evaluate debiasing techniques) and demonstrates a real methodological issue (metric choice affects rankings). However, the proportional anchor design creates circularity that undermines the core claims, the baseline is itself anchored (12th offense), and the multi-domain analysis is underpowered. The paper needs:

1. **Replication with fixed absolute anchors** to validate percentage-of-baseline findings.
2. **Truly unanchored baseline** (remove "12th offense" or justify why it's not an anchor).
3. **Softened claims** for multi-domain results (or more data to power them).
4. **Clearer presentation** of Opus sensitivity, MAD aggregation, and Outside View exclusion.

With these revisions, this could be a strong contribution. In its current form, the circular anchor design is a fatal flaw that requires empirical resolution, not just acknowledgment in limitations.

## Confidence

**5/5** (Expert in experimental design, statistical methodology, and LLM evaluation)

I have carefully reviewed the methodology, statistical analyses, and claims. The circular anchor issue is a fundamental problem that cannot be dismissed as a minor limitation. The authors are clearly capable researchers (transparent reporting, mixed-effects modeling, large-scale data collection), but the experimental design has a flaw that undermines the central contribution. I am confident this assessment is correct and that the requested revisions are necessary for publication at a top venue.