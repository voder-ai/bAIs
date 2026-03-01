# LLM Adversarial Review — af1c92a

Date: 2026-03-01T00:10:14.882Z
Model: claude-sonnet-4.5

## Summary

This paper evaluates four debiasing techniques for anchoring bias in LLMs across 21,139 trials spanning six domains. The core finding is that technique rankings are both metric-dependent and domain-dependent: susceptibility (high-low spread) and baseline proximity (% of unanchored judgment) produce opposite rankings, and no technique consistently outperforms across domains. The authors introduce Mean Absolute Deviation (MAD) to reveal per-trial errors hidden by aggregate metrics. A deep validation on 10 models confirms substantial model-specific variance. The paper argues practitioners must test debiasing interventions per-model and per-task rather than relying on published rankings.

## Strengths

- **Important methodological contribution**: The demonstration that susceptibility and baseline proximity give divergent rankings (Table 1) is valuable and well-illustrated. Devil's Advocate reducing susceptibility while moving responses away from baseline is a genuine insight.

- **Comprehensive empirical scope**: 21,139 trials across 10 models and 6 domains represents substantial experimental effort. The multi-domain extension (Section 5) directly addresses generalization concerns.

- **Transparent reporting**: Full data availability, detailed prompts in appendix, explicit discussion of confounds (Outside View jurisdiction, SACD turn count), and AI assistance disclosure demonstrate commendable transparency.

- **Practical relevance**: The finding that Random Control (neutral conversation turns) outperforms Devil's Advocate has clear implications for practitioners and suggests turn count itself matters.

- **Statistical rigor in places**: Bootstrap CIs, mixed-effects modeling (Section 4.6), and Bonferroni correction show appropriate statistical care.

## Weaknesses

### Major Issues

1. **Circular baseline design undermines core claims** (Sections 3.2, 6.2, Limitation 2)
   - Anchors are set proportionally to each model's baseline (±50%), then debiasing success is measured as proximity to that same baseline
   - This creates circularity: a technique that perfectly ignores anchors would score 100% by definition, but this IS the definition of successful debiasing
   - The authors acknowledge this ("Proportional anchor design... introduces potential circularity") but don't adequately address how it affects interpretation
   - **Critical problem**: For models with different baselines, the same absolute deviation represents different % deviations. A 10-month error is 55% for Opus (baseline=18mo) but 28% for o4-mini (baseline=35.7mo). This makes cross-model comparisons of "% of baseline" problematic.
   - The claim that "100% = restored to unanchored state, not 'correct'" (Limitation 5) doesn't resolve this—the metric still conflates debiasing with baseline-matching

2. **Underpowered multi-domain analysis presented as core finding** (Section 5, boxed warning)
   - The abstract claims "no technique consistently outperforms" based on 4 models (vs 10 in main study)
   - Authors acknowledge "bootstrap 95% CIs overlap for all #1 vs #2 comparisons" but still present Table 4 rankings as if meaningful
   - **Statistical issue**: With only 4 models and ICC=0.17, effective sample size is ~15-20 per technique per domain. Power to detect even large effects (d=0.8) is <50%
   - The boxed warning ("exploratory... interpret with caution") is buried on page 14; the abstract makes strong claims without this caveat
   - **Recommendation**: Either increase model count for multi-domain or downgrade claims to "preliminary evidence suggests domain-dependence"

3. **SACD turn-count confound not adequately controlled** (Limitation 10, Section 4.4)
   - SACD uses ~6 API calls vs 3 turns for other techniques
   - Random Control's strong performance (78.3%) suggests turn count matters
   - Authors acknowledge this but don't provide a 6-turn Random Control to isolate SACD's content contribution
   - **Impact on main claim**: SACD's #1 ranking (93.7%) may be partly or entirely due to turn count, not iterative self-correction. This undermines the technique comparison.
   - The statement "we cannot fully disentangle SACD's iterative content from its additional turns" is too casual for a paper claiming to rank techniques

4. **MAD metric introduced but not validated** (Sections 1.2, 4.7)
   - MAD is presented as superior to aggregate % of baseline because it doesn't allow cancellation
   - But MAD is never compared to established metrics (e.g., RMSE, median absolute deviation)
   - No analysis of whether MAD's equal weighting of over/undershoots is appropriate—should a 20% overshoot be treated identically to a 20% undershoot?
   - Table 6 shows SACD has 18.1% MAD vs Premortem's 22.6%, but the paper doesn't establish what magnitude of MAD difference is practically meaningful

5. **Statistical testing issues**:
   - **Multiple comparisons**: Authors apply Bonferroni correction for 6 pairwise technique comparisons but don't correct for multiple domains (6) or multiple metrics (susceptibility, % baseline, MAD)
   - **Mixed effects**: Section 4.6 reports F-tests using residual df (8,950) with only 10 clusters, which is anti-conservative. Authors acknowledge this ("Satterthwaite-corrected df would be smaller") but still report the inflated F-values
   - **Equivalence testing**: TOST for SACD vs Premortem uses ±5pp equivalence bound, but no justification for why 5pp (vs 3pp or 10pp) is the right threshold
   - **Power analysis**: Reported in Section 3.2 but shows the design is underpowered for small effects (d<0.5). Yet Table 6 shows SACD-Premortem d=0.08, which is clearly undetectable

### Moderate Issues

6. **Baseline variance interpretation** (Table 2, Figure 1)
   - Opus 4.6 has SD=0.0 (always responds 18 months). Authors retain it because "excluding post-hoc would inflate technique effectiveness"
   - But Opus contributes 909/14,152 = 6.4% of trials. Its zero variance means it contributes disproportionately to aggregate statistics
   - Sensitivity analysis (Limitation 7) shows rankings are "robust to Opus exclusion" but only reports 2-3pp shifts—no test of whether CIs still overlap after exclusion
   - **Recommendation**: Report all main results with and without Opus, not just sensitivity checks

7. **Compression pattern under-explored** (Section 4.3)
   - High anchors causing responses *below* baseline is counterintuitive and potentially important
   - Authors hypothesize "anchor rejection" but provide no evidence (e.g., qualitative analysis of model reasoning, correlation with anchor magnitude)
   - This pattern affects 4/10 models (Anthropic + GPT-4.1) but receives only 2 paragraphs
   - **Missed opportunity**: This could be a major finding about model-family differences in anchor processing

8. **Outside View confound** (Section 6.3, Limitation 4)
   - Requiring "German federal courts" introduces a secondary anchor toward German norms
   - Authors exclude Outside View from rankings but still report its results (Table 3: 51.2% of baseline)
   - **Problem**: The confound makes Outside View results uninterpretable, yet they're presented alongside valid techniques
   - **Recommendation**: Move Outside View to appendix or clearly mark as "confounded—do not compare"

9. **Domain selection bias** (Section 5)
   - Multi-domain vignettes include 3 judicial scenarios (DUI, fraud, theft) but only 1 each of loan, medical, salary
   - This overweights judicial contexts (4/6 domains) and may inflate apparent domain-dependence
   - No justification for why these 6 domains were chosen vs others (e.g., hiring decisions, resource allocation)

10. **Presentation issues**:
    - **Figure 3 removed**: Caption says "Figure removed - redundant with Figure 1" but Figure 1 shows aggregate results, not the per-model breakdown that would be valuable
    - **Table 4 complexity**: 6 domains × 5 techniques × 3 columns (Low%, High%, MAD) = 90 cells. Hard to extract key patterns. A summary visualization would help
    - **Inconsistent terminology**: "Percentage of baseline" vs "baseline proximity" vs "% of baseline" used interchangeably

### Minor Issues

11. **Writing quality**:
    - Abstract: "our exploratory cross-domain analysis (4 models) suggests no technique consistently outperforms" buries the sample size limitation
    - Section 1.1: "susceptibility conflates consistency with correctness" is a strong claim but the logic isn't fully developed until Section 4.2
    - Footnote 2 (page 3): "SACD uses ~6 API calls vs 3 turns for other techniques" is critical information buried in a footnote

12. **Missing details**:
    - No inter-rater reliability for response extraction (though 99.9% regex success suggests this is minor)
    - No discussion of how temperature conditions (0, 0.7, 1.0) were aggregated—simple averaging? Weighted by n?
    - Table 2: "Opus 4.6 shows zero variance (SD=0.0)" but no investigation of *why* (deterministic sampling? Strong prior?)

13. **Reproducibility concerns**:
    - "All trials were collected via OpenRouter API during February 2026" but OpenRouter is a proxy—underlying model versions may have changed during data collection
    - No mention of rate limiting, retry logic, or how API failures were handled
    - "Request IDs logged with each trial for audit" but not clear if these are publicly available

## Questions for Authors

1. **Baseline circularity**: How do you respond to the concern that proportional anchors + baseline-relative metrics create circularity? Would results hold with fixed absolute anchors (e.g., always 12mo low, 36mo high)?

2. **SACD turn count**: Can you provide results for a 6-turn Random Control condition to isolate SACD's content contribution from turn-count effects? Without this, how confident are you that SACD's #1 ranking reflects its iterative self-correction rather than just more conversation turns?

3. **Multi-domain power**: With only 4 models and overlapping CIs for all #1 vs #2 comparisons, what is the justification for claiming "no technique consistently outperforms"? Isn't the more accurate conclusion "we lack power to detect differences"?

4. **MAD validation**: Why is MAD superior to RMSE or median absolute deviation? Have you tested whether MAD correlates with downstream task performance (e.g., decision quality in a real deployment)?

5. **Compression pattern**: Can you provide qualitative analysis of model reasoning for cases where high anchors cause compression? Does this pattern correlate with anchor magnitude, model size, or training methodology?

6. **Statistical corrections**: Why not correct for multiple domains and metrics in addition to pairwise technique comparisons? With 6 domains × 3 metrics × 6 comparisons = 108 tests, the family-wise error rate is substantial.

7. **Practical significance**: Table 6 shows SACD (93.7%) vs Premortem (91.6%) differ by 2.1pp. In a real judicial sentencing scenario with baseline=30mo, this is ~0.6 months. Is this difference meaningful enough to justify SACD's 2× cost (6 turns vs 3)?

8. **Baseline interpretation**: You state "baselines are not ground truth" but then measure debiasing as proximity to baseline. If baselines can be wrong (Opus=18mo vs o4-mini=35.7mo), how do we know proximity to baseline represents successful debiasing rather than successful baseline-matching?

## Minor Issues

- **Table 1 caption**: "95\% CIs from bootstrap" but methodology (Section 3.2) specifies 10,000 resamples—include this in caption
- **Figure 2**: Y-axis label "% of Baseline (100% = perfect)" is misleading—100% means "matches unanchored judgment," not "perfect" in a normative sense
- **Section 4.6**: "ICC=0.17" reported to 2 decimal places but footnote says "with only 10 models, variance component estimates may be imprecise"—consider reporting as "ICC≈0.17"
- **Limitation 7**: "Opus sensitivity: Excluding Opus 4.6... shifts means 2-3pp but preserves rankings" needs a table showing actual values, not just summary
- **References**: \citet{llm-bayesian-2025} and \citet{llm-judge-overconfidence-2025} in Section 6.2 are not in bibliography
- **Appendix A.4**: "Average iterations to convergence: 2.5 (median 3)" is contradictory—if median=3, mean should be ≥3 unless there are outliers <3

## Verdict

**MAJOR REVISION**

This paper addresses an important problem (debiasing technique evaluation) and makes valuable methodological contributions (metric divergence, MAD). However, three critical issues prevent acceptance:

1. **Circular baseline design**: The proportional anchor + baseline-relative metric creates fundamental interpretability problems that undermine the core claims
2. **Underpowered multi-domain analysis**: The abstract's main claim ("no technique consistently outperforms") rests on 4-model exploratory analysis with overlapping CIs
3. **SACD turn-count confound**: The #1-ranked technique's advantage may be entirely due to uncontrolled turn count

**Required revisions**:
- Add fixed absolute anchor conditions to validate that findings hold without circularity
- Either increase multi-domain model count to 10 or downgrade claims to "preliminary evidence"
- Add 6-turn Random Control to isolate SACD's content contribution
- Provide comprehensive sensitivity analyses (with/without Opus, different equivalence bounds, different MAD thresholds)

**Optional but recommended**:
- Qualitative analysis of compression pattern
- Validation that MAD correlates with downstream task performance
- Comprehensive multiple testing correction across domains and metrics

The paper has potential for high impact if these issues are addressed. The empirical scope is impressive and the transparency is commendable, but the statistical and methodological concerns are too substantial for acceptance in current form.

## Confidence

**4/5** (High confidence)

I am confident in this assessment. The statistical issues (circularity, power, confounds) are clear-cut. The main uncertainty is whether the authors have additional analyses (e.g., fixed anchor conditions, 6-turn Random Control) that would address these concerns but were omitted for space. If such analyses exist and show robust results, this could move to Minor Revision.