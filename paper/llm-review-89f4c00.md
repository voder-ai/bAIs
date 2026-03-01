# LLM Adversarial Review — 89f4c00

Date: 2026-02-28T23:40:28.765Z
Model: claude-sonnet-4.5

# Adversarial Review: Debiasing Technique Rankings Are Metric- and Domain-Dependent

## Summary

This paper evaluates four debiasing techniques for anchoring bias in LLMs across 21,139 trials spanning six domains. The core claim is that technique rankings are metric- and domain-dependent, with no technique consistently outperforming across contexts. The authors introduce Mean Absolute Deviation (MAD) as a complement to standard susceptibility metrics, arguing that aggregate measures hide per-trial error. A deep-dive validation on judicial sentencing (14,152 trials, 10 models) reveals substantial model-specific variance. The paper concludes that practitioners must test debiasing interventions per-model and per-task rather than relying on published rankings.

## Strengths

- **Important methodological contribution**: The demonstration that susceptibility and baseline proximity give divergent rankings (Table 2) is valuable and well-illustrated. Devil's Advocate reducing susceptibility while moving responses away from baseline is a genuine insight.

- **Comprehensive empirical scope**: 21,139 trials across 10 models and 6 domains represents substantial experimental investment. The model diversity (Anthropic, OpenAI, DeepSeek, Moonshot, Zhipu) strengthens generalizability claims.

- **Transparent reporting**: Full data availability, detailed prompts in appendix, and explicit acknowledgment of AI assistance demonstrate commendable research transparency.

- **MAD metric justification**: The observation that SACD achieves 93.7% aggregate proximity but 18.1% MAD due to bidirectional cancellation (Table 6) effectively motivates the new metric.

- **Honest limitation discussion**: Section 6.6 acknowledges multiple confounds (turn-count, proportional anchors, Outside View jurisdiction) rather than hiding them.

## Weaknesses

### 1. **Circular Baseline Design Undermines Core Claims**

The proportional anchor design (anchors = baseline × 0.5/1.5) creates fundamental circularity:

- **Problem**: You measure "debiasing success" as proximity to baseline, but baseline *determines* the anchor values. A technique that perfectly ignores anchors scores 100%—but this is definitionally what you're measuring. The metric cannot distinguish "restored to unanchored state" from "coincidentally landed near baseline."

- **Evidence of circularity**: Section 3.2 states "This is not circular: baselines are measured independently" but then admits "A technique causing perfect anchor-ignorance would score 100%—but this IS the definition of successful debiasing." This is exactly the circularity problem.

- **Impact on claims**: Your core finding—that SACD achieves 93.7% baseline proximity—may simply reflect that SACD responses happen to cluster near the proportional midpoint between high/low anchors, not that it "debias" in any meaningful sense.

- **Missing control**: You need fixed absolute anchors (e.g., always 12 and 36 months regardless of baseline) to validate that techniques restore anchor-independence rather than just producing responses near the arithmetic mean.

**Severity**: This threatens the validity of your primary metric and central claims.

### 2. **Turn-Count Confound Invalidates SACD Comparison**

Section 6.6 acknowledges SACD uses ~6 API calls vs. 3 turns for other techniques, and Random Control's strong performance "suggests turn count itself affects results." This is not a minor limitation—it's a fatal confound:

- **Problem**: You cannot attribute SACD's performance to its iterative content vs. simply having more turns. Random Control (78.3%) outperforms Devil's Advocate (63.6%) with identical turn structure but neutral content.

- **Missing control**: You explicitly state "A 6-turn Random Control condition would isolate SACD's content contribution" but did not run this critical control.

- **Impact**: Your claim that "SACD achieves highest baseline proximity" (Abstract, Table 4) is uninterpretable. The 93.7% could be entirely due to turn count, not the SACD procedure.

- **Cost claim undermined**: Section 6.7 states "Premortem matches SACD in one turn vs. six" as a practical recommendation, but if turn count drives performance, this comparison is meaningless.

**Severity**: This is a basic experimental design flaw that should have been caught in pilot testing.

### 3. **Statistical Analysis Does Not Support "Cannot Distinguish" Claims**

You repeatedly claim bootstrap CIs overlap therefore "we cannot statistically distinguish" techniques:

- **Abstract**: "bootstrap 95\% confidence intervals overlap for all pairwise #1 vs #2 comparisons"
- **Section 5**: "all pairwise #1 vs #2 CIs overlap, precluding confident technique recommendations"

**Problems**:

a) **Overlapping CIs ≠ non-significance**: This is a well-known statistical error. Two 95% CIs can overlap substantially while the difference is still significant at p < 0.05. You need formal hypothesis tests, which you provide elsewhere (Welch's t-tests) but then ignore in favor of the CI overlap heuristic.

b) **Selective reporting**: Table 2 shows SACD [92, 95] vs. Devil's Advocate [62, 65]—these CIs do NOT overlap, yet you claim "all pairwise comparisons" overlap. You later acknowledge "the CIs do not overlap with Full SACD, confirming the ranking difference is statistically reliable" (Table 4 caption), contradicting the abstract claim.

c) **Equivalence testing misapplied**: Section 4.6 uses TOST with ±5pp equivalence bounds for SACD vs. Premortem. But you chose 5pp post-hoc as "the smallest difference that would plausibly affect deployment decisions"—this is circular. Equivalence bounds should be pre-specified based on domain knowledge, not chosen to achieve the desired result.

d) **Power analysis buried**: Section 3.2.4 reveals effective n ≈ 60-70 per technique (not ~2,200) due to ICC=0.17, and you're underpowered for d < 0.50 effects. Yet you make strong claims about technique equivalence without acknowledging this limits your ability to detect real differences.

**Severity**: The statistical narrative is inconsistent and potentially misleading.

### 4. **Multi-Domain Analysis Lacks Rigor**

Section 5 presents 6,987 trials across 6 domains as evidence of domain-dependence, but:

- **Model count**: Only 4 models (vs. 10 in main study), acknowledged as "exploratory" but then used to support core claims in abstract.

- **No significance testing**: Table 7 shows point estimate rankings but you state "Rankings lack confidence intervals and significance testing due to small model count." Yet the abstract claims "technique rankings vary by domain" based on this data.

- **Selection bias**: Footnote 1 acknowledges "Haiku 4.5 shows domain-specific safety behavior: 85%+ of judicial sentencing trials returned policy-based refusals" and "Sonnet 4.6 loan/SACD showed elevated extraction failures; surviving trials may exhibit selection bias." This is not a footnote issue—it's a validity threat.

- **Inconsistent framing**: You call this "cross-domain validation" (Section 1.3) but then label it "exploratory" (Section 5). Which is it?

**Severity**: The multi-domain claims are overclaimed relative to the evidence quality.

### 5. **Baseline Variance Problem Not Adequately Addressed**

Table 1 shows Opus 4.6 has SD=0.0 (always responds 18 months). You retain it because:

1. "it represents a legitimate deployment scenario"
2. "excluding post-hoc would inflate apparent technique effectiveness"
3. "sensitivity analysis shows rankings are robust to exclusion"

**Problems**:

a) **Zero variance violates assumptions**: Your percentage-of-baseline metric requires baseline variance to be meaningful. For Opus, every anchored response is measured against the same 18-month baseline, making the metric degenerate.

b) **Sensitivity analysis not shown**: You claim rankings are robust to exclusion (Section 6.6) but only report aggregate shifts (2-3pp). Show the full re-analysis or move Opus to supplementary.

c) **Ratio scaling exaggeration**: Section 6.6 acknowledges "Ratio scaling exaggerates deviations for low-baseline models" but Opus has the *lowest* baseline (18mo). A 9-month response is 50% of baseline for Opus but would be 25% for o4-mini (36mo baseline). This is not a minor scaling issue.

**Severity**: Including Opus biases results in unknown ways; excluding it should be the primary analysis.

### 6. **"Debiasing" Definition Is Circular**

Section 3.1 states: "Baseline as reference, not ground truth... This operationalizes debiasing as *consistency*: a debiased model produces similar outputs regardless of irrelevant anchors."

**Problem**: This defines debiasing as "returning to baseline" but baseline itself may be biased. You acknowledge this ("We make no claim that baselines are normatively correct") but then use baseline proximity as your primary success metric.

**Implication**: A technique that moves responses *away* from a biased baseline toward a normatively correct answer would be scored as "worse" under your metric. You're measuring consistency, not correctness, but framing it as debiasing.

**Example**: If models systematically under-sentence (baseline = 18mo when normative range is 24-36mo), a technique that increases sentences would score poorly on your metric despite being normatively better.

**Severity**: This is a conceptual problem that limits the practical value of your findings.

### 7. **Missing Ablations and Controls**

Critical experiments are missing:

- **6-turn Random Control**: Acknowledged as necessary (Section 6.6) but not run.
- **Fixed absolute anchors**: Needed to validate proportional design (Limitation 2).
- **Temperature effects**: You test t=0, 0.7, 1.0 but find no interaction (F=1.42, p=0.203) and then aggregate across temperatures. Why test three temperatures if you're going to pool them? Show the null result properly or don't mention it.
- **Prompt variations**: All techniques use specific wordings (Appendix A). Did you test robustness to phrasing?

### 8. **Overclaimed Generalizability**

- **Abstract**: "cross-domain analysis" based on 4-model exploratory study
- **Section 1.3**: "Cross-domain evaluation" as a contribution, but Section 5 admits "results should be interpreted with caution"
- **Conclusion**: "we cannot identify a technique that consistently outperforms across domains" but you only tested 6 domains with 4 models each

The evidence does not support claims of broad generalizability.

## Questions for Authors

1. **Circularity**: How do you respond to the charge that proportional anchors create circularity? Can you provide results with fixed absolute anchors (e.g., always 12 and 36 months) to validate that baseline proximity reflects debiasing rather than arithmetic averaging?

2. **Turn-count control**: Why was the 6-turn Random Control not run, given you explicitly identify it as necessary to isolate SACD's content from turn-count effects?

3. **Statistical claims**: Please reconcile the abstract claim that "all pairwise #1 vs #2 CIs overlap" with Table 2 showing SACD [92, 95] vs. Devil's Advocate [62, 65] (non-overlapping). Which claim is correct?

4. **Opus inclusion**: Given zero baseline variance, why is Opus included in primary analyses rather than relegated to supplementary materials? Please show full results with Opus excluded.

5. **Equivalence bounds**: How were the ±5pp TOST bounds for SACD vs. Premortem determined? Were they pre-specified or chosen post-hoc?

6. **Multi-domain rigor**: Section 5 is labeled "exploratory" but used to support core claims. Should this be moved to supplementary materials with appropriately hedged claims in the main text?

7. **Normative correctness**: Do you have any ground truth data (e.g., actual sentencing guidelines, expert judgments) to validate whether baselines are reasonable? Without this, how can you claim to measure "debiasing" vs. just "consistency"?

8. **Model selection**: Why were these specific 10 models chosen? Was this convenience sampling or principled selection?

9. **Extraction failures**: You report 99.9% regex extraction success but Footnote 1 mentions "elevated extraction failures" for Sonnet loan/SACD. What is the actual failure rate and how were failures handled?

10. **Replication**: Can you provide the exact OpenRouter API request IDs for a random sample of trials to enable independent verification?

## Minor Issues

- **Table 1 caption**: "We retain Opus rather than excluding it because..." is defensive. Either justify inclusion in main text or exclude it.

- **Figure 1**: Y-axis starts at 55%, exaggerating visual differences. Start at 0% or justify the truncation.

- **Section 2.4**: "Unlike the classic Anchoring Index, which uses baseline in both numerator and denominator, our metric avoids circularity." But your metric still uses baseline to set anchor values—this is a different circularity, not avoided.

- **Footnote 2**: "SACD uses ~6 API calls vs. 3 turns for other techniques" should be in main text, not a footnote. This is a critical confound.

- **Table 7**: "asterisks mark best technique per domain" but no asterisks are visible in the table.

- **References**: \citet{llm-bayesian-2025} and \citet{llm-judge-overconfidence-2025} in Section 6.2 are not in bibliography. Are these placeholder citations?

- **Inconsistent terminology**: "percentage of baseline" vs. "% of baseline" vs. "baseline proximity"—pick one.

- **Section 4.3**: "The compression pattern is counterintuitive" but then you hypothesize anchor rejection. If you have a hypothesis, test it rather than speculating.

## Verdict

**MAJOR REVISION**

This paper addresses an important problem (metric-dependence in debiasing evaluation) and provides valuable empirical data, but suffers from fundamental methodological flaws that undermine its core claims:

1. **Circular baseline design**: Proportional anchors create circularity that invalidates the primary metric.
2. **Turn-count confound**: SACD comparison is uninterpretable without a 6-turn Random Control.
3. **Statistical inconsistencies**: Claims about CI overlap and equivalence are contradictory or unsupported.
4. **Overclaimed generalizability**: Multi-domain results are exploratory (4 models) but presented as definitive.

The paper makes a valuable contribution by demonstrating metric divergence (susceptibility vs. baseline proximity), but the execution has too many confounds to support the strong claims. A major revision should:

- Re-run experiments with fixed absolute anchors to validate the baseline proximity metric
- Add 6-turn Random Control to isolate SACD's content contribution
- Reconcile statistical claims or remove unsupported statements about CI overlap
- Reframe multi-domain results as exploratory or expand to 10 models
- Move Opus to supplementary materials or provide full sensitivity analysis
- Clarify that you're measuring consistency, not normative correctness

With these revisions, this could be a strong empirical paper. In its current form, the methodological issues are too severe for acceptance at a top venue.

## Confidence

**5/5** - I am highly confident in this assessment. The circular baseline design and turn-count confound are clear methodological flaws, not matters of interpretation. The statistical inconsistencies are verifiable from the paper's own tables. I have expertise in experimental design, anchoring bias research, and LLM evaluation methodology.