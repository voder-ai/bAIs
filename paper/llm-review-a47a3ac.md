# LLM Adversarial Review — a47a3ac

Date: 2026-02-28T23:48:18.430Z
Model: claude-sonnet-4.5

# Adversarial Review: Debiasing Technique Rankings Are Metric- and Domain-Dependent

## Summary

This paper evaluates four debiasing techniques for anchoring bias in LLMs across 21,139 trials spanning six domains and ten models. The central claim is that technique rankings are metric-dependent (susceptibility vs. baseline proximity) and domain-dependent, precluding universal recommendations. The authors introduce Mean Absolute Deviation (MAD) to reveal per-trial errors masked by aggregate metrics. While the scale is impressive and the metric-dependence finding is valuable, the paper suffers from serious methodological flaws: circular anchor design, confounded comparisons (SACD uses 6 turns vs. 3 for others), underpowered statistical tests with overlapping confidence intervals, and exploratory multi-domain analysis presented alongside confirmatory results without clear demarcation.

## Strengths

- **Impressive scale**: 21,139 trials across 10 models and 6 domains represents substantial empirical effort
- **Important methodological contribution**: The demonstration that susceptibility and baseline proximity give opposite rankings (Table 2) is genuinely valuable and challenges prior work
- **MAD metric is useful**: Revealing that SACD's 93.7% aggregate masks 18.1% per-trial deviation (Table 6) is an important insight
- **Honest limitations section**: Authors acknowledge confounds (Outside View, turn count, proportional anchors) rather than hiding them
- **Full reproducibility**: Code, data, and prompts are publicly available
- **Model-specific analysis**: Table 4 showing SACD ranges from 47.8% (Haiku) to 127.8% (Opus) demonstrates important heterogeneity

## Weaknesses

### 1. **Circular Anchor Design Undermines Core Claims**

The proportional anchor design (high = 1.5×baseline, low = 0.5×baseline) creates circularity that invalidates cross-model comparisons:

- **The problem**: You measure baseline, use it to set anchors, then measure deviation from baseline. A model with a strong prior (Opus: 18mo, SD=0) will show artificially low susceptibility because the anchors are weak relative to its certainty.
- **Evidence**: Opus shows 0% susceptibility in some conditions—not because debiasing works, but because 27mo (1.5×18) isn't a strong anchor for a model that always says 18.
- **Authors acknowledge this** (Limitation 2, Section 3.2) but then report aggregate statistics pooling across models as if they're comparable. Table 2's "spread" column mixes models with different anchor strengths.
- **Fix required**: Rerun with fixed absolute anchors (e.g., always 12mo low, 36mo high) to validate that rankings hold.

**Section 3.2 defense is insufficient**: "This is not circular: baselines are measured independently" misses the point. The circularity isn't in *measurement order*, it's in *using baseline to define the test condition*. You're essentially asking "does the model return to its prior?" when you've calibrated the perturbation to that prior's strength.

### 2. **Turn-Count Confound Invalidates SACD Comparison**

SACD uses ~6 API calls vs. 3 turns for other techniques, but this is treated as a limitation rather than a fatal flaw:

- **Random Control (3 turns) achieves 78.3%**, outperforming Devil's Advocate (63.6%) despite neutral content
- **Authors acknowledge** "turn count itself affects results" and "SACD's advantage may partly reflect this confound" (footnote 2, Limitation 10)
- **But then rank SACD #1** in Table 3 without asterisks or caveats in the ranking itself
- **The fix is trivial**: Run a 6-turn Random Control condition. The authors had the budget (21k trials) but didn't do it.

**This is not a minor limitation**—it's a confound that directly affects the paper's central claim. You cannot conclude SACD is "best" when it uses 2× the turns of its competitors.

### 3. **Statistical Power Issues and Overlapping CIs**

The paper claims "we cannot identify a technique that consistently outperforms" but the evidence is weaker than presented:

- **Section 5 (multi-domain)**: "Bootstrap 95% CIs overlap for all #1 vs #2 comparisons" (page 11)—yet Table 7 presents point-estimate rankings as if they're meaningful
- **Power analysis** (Section 3.2): Effective n ≈ 60-70 per technique due to ICC=0.17, powered to detect d≥0.50. But SACD vs. Premortem is d=0.08—**clearly underpowered**, yet the paper reports p=0.054 as if it's "approaching significance"
- **TOST equivalence test**: 5pp equivalence bound is arbitrary (why not 3pp? 10pp?). The choice determines the conclusion.

**The honest conclusion**: "We lack power to distinguish SACD from Premortem" not "SACD and Premortem are equivalent."

### 4. **Exploratory Multi-Domain Analysis Presented as Confirmatory**

Section 5 uses only 4 models (vs. 10 in main study) and lacks significance testing:

- **Authors acknowledge**: "Results should be interpreted with caution" (page 11 box)
- **But then**: Table 7 presents rankings without CIs, Figure 3 shows a heatmap with asterisks marking "best" techniques
- **The framing**: "Our core finding: technique rankings vary by domain" (Abstract)—but this is based on exploratory analysis with overlapping CIs

**This is p-hacking territory**: Run exploratory analysis, find suggestive patterns, present them as confirmatory findings. The box warning is insufficient—this should be clearly labeled "Exploratory" in the section title and abstract.

### 5. **Baseline as "Ground Truth" Problem**

The paper claims baseline is not ground truth (Section 3.1) but then:

- **Defines debiasing success** as proximity to baseline (Equation 2)
- **Ranks techniques** by how close they get to baseline (Table 3)
- **Criticizes Devil's Advocate** for being "consistently wrong" (63.6% of baseline)

**But**: Baselines range from 18mo (Opus) to 36mo (o4-mini)—a 2× spread. If Opus's baseline is "wrong" (too lenient), then getting close to it is not debiasing, it's reproducing the wrong answer.

**The defense** ("we measure consistency, not correctness") is philosophically coherent but practically misleading. Practitioners will read "SACD achieves 93.7% of baseline" as "SACD works well," not "SACD makes the model consistent with its potentially-wrong prior."

### 6. **Outside View Excluded Post-Hoc**

Outside View is excluded from rankings due to "jurisdiction confound" (Section 4.6), but:

- **It was pre-registered** in the design (Table 1 shows n=2,423 trials)
- **Exclusion is post-hoc**: No pre-specification that it would be excluded
- **The confound is real** (requiring "German federal courts" introduces a secondary anchor), but post-hoc exclusion inflates apparent technique effectiveness

**Proper handling**: Report Outside View results with caveat, or pre-register exclusion criteria.

### 7. **Opus Zero-Variance Issue**

Opus 4.6 shows SD=0.0 across all conditions (Table 1). The authors:

- **Acknowledge it** (Table 1 caption)
- **Justify retention**: "Represents legitimate deployment scenario"
- **Sensitivity analysis**: "Rankings robust to exclusion" (Limitation 6)

**But**: A model with zero variance cannot exhibit anchoring bias by definition. Including it in aggregate statistics is like including a constant in a regression—it dilutes effects. The sensitivity analysis shows 2-3pp shifts, which is non-trivial when SACD vs. Premortem differs by 2.1pp.

**Better approach**: Report Opus separately as a case study, exclude from aggregates.

### 8. **Missing Comparisons and Baselines**

- **No comparison to simple prompting improvements**: What if you just add "Think carefully about whether the prosecutor's demand is reasonable"?
- **No comparison to few-shot examples**: Prior work shows few-shot can reduce biases
- **No analysis of *why* techniques fail**: SACD makes Haiku worse (47.8%)—why? Speculation in Discussion is insufficient.

### 9. **Presentation Issues**

- **Figures 1 and 2 are redundant**: Both show % of baseline by technique
- **Table 7 is overwhelming**: 6 domains × 5 techniques × 3 metrics = 90 numbers. A summary figure would help.
- **Inconsistent terminology**: "Baseline proximity" vs. "% of baseline" vs. "deviation from baseline"—pick one
- **The "recovery rate" framing** (Section 4.2): "77% recovery" sounds impressive but is just (93.7-72.9)/(100-72.9). This is marketing, not analysis.

### 10. **Overclaimed Generalization**

Abstract: "Our core finding: we cannot identify a technique that consistently outperforms across domains."

**But**:
- Main study: 1 domain (judicial), 10 models → SACD ranks #1
- Multi-domain: 6 domains, 4 models, exploratory → rankings vary but CIs overlap

**The honest claim**: "In exploratory analysis across 6 domains with 4 models, point estimates suggest domain-dependence, but confidence intervals overlap." Not "we cannot identify a consistently superior technique" (which implies definitive evidence).

## Questions for Authors

1. **Circular anchors**: Can you provide results with fixed absolute anchors (e.g., always 12mo low, 36mo high) to validate that metric-dependence holds when anchor strength is constant across models?

2. **Turn-count control**: Why not run a 6-turn Random Control to isolate SACD's content from its turn count? This seems like an obvious control given you acknowledge the confound.

3. **Power analysis**: Given effective n≈65 and d=0.08 for SACD vs. Premortem, what is the actual power of your test? The p=0.054 suggests you're underpowered—why present this as "approaching significance" rather than "insufficient evidence"?

4. **Multi-domain CIs**: Table 7 lacks confidence intervals. Can you provide bootstrap CIs for all pairwise comparisons in each domain? If they all overlap, the "rankings vary by domain" claim is not statistically supported.

5. **Baseline validity**: You claim baseline is not ground truth, but then rank techniques by proximity to baseline. If Opus's 18mo baseline is "wrong" (too lenient), is SACD's 127.8% (23mo) actually *better* than Devil's Advocate's 75.5% (14mo)? How should practitioners interpret this?

6. **Outside View**: Was the exclusion of Outside View from rankings pre-specified, or decided post-hoc after seeing the results?

7. **Haiku failure mode**: SACD makes Haiku worse (47.8%). Can you provide qualitative analysis of *why*? Are there patterns in the SACD iterations that explain the failure?

8. **Equivalence bound**: The 5pp TOST bound is arbitrary. How sensitive are your equivalence conclusions to this choice? Would 3pp or 10pp change the conclusion?

9. **Model selection**: Why these 10 models? Was this pre-specified or chosen based on availability/budget?

10. **Replication**: Have you attempted to replicate the main finding (metric-dependence) on a held-out domain or model to confirm it's not specific to your judicial vignette?

## Minor Issues

- **Table 1 caption**: "Opus 4.6 shows zero variance (SD=0.0)"—this deserves more than a footnote. It's a major anomaly.
- **Equation 3 (MAD)**: The formula uses $r_i / b_m - 1$, but text describes it as "deviation from baseline." Clarify that this is *relative* deviation (percentage points).
- **Figure 3 (heatmap)**: Asterisks mark "best" but CIs overlap—this is misleading. Use different notation for "numerically lowest point estimate."
- **Section 4.2**: "Recovery rate" is introduced without definition, then used as if it's a standard metric. Define it formally or remove it.
- **References**: \citet{llm-bayesian-2025} and \citet{llm-judge-overconfidence-2025} are cited but not in bibliography. Are these real papers or placeholders?
- **Typo, page 11**: "per-model AND per-task" (inconsistent capitalization)
- **Table 7**: "n shows technique trials only"—but the numbers don't sum to 6,987. Clarify what's included.

## Verdict

**MAJOR REVISION**

This paper makes a valuable contribution (metric-dependence in debiasing evaluation) but has serious methodological flaws that undermine its central claims:

1. **Circular anchor design** invalidates cross-model comparisons
2. **Turn-count confound** makes SACD comparison unfair
3. **Underpowered tests** with overlapping CIs presented as definitive findings
4. **Exploratory multi-domain analysis** framed as confirmatory

**Required for acceptance**:
- Rerun with fixed absolute anchors OR clearly limit claims to within-model comparisons
- Add 6-turn Random Control OR remove SACD from rankings with caveat
- Reframe multi-domain analysis as exploratory with appropriate caveats in abstract
- Provide CIs for all multi-domain comparisons
- Tone down claims about "cannot identify a superior technique" to match statistical evidence

**Optional but recommended**:
- Exclude Opus from aggregates (report separately)
- Add qualitative analysis of failure modes (Haiku/SACD)
- Simplify presentation (merge redundant figures, summarize Table 7)

The core insight—that susceptibility and baseline proximity give opposite rankings—is important and likely robust. But the paper overclaims generalization based on underpowered exploratory analysis and doesn't adequately address confounds. With revisions, this could be a strong contribution to the debiasing literature.

## Confidence

**5/5** (Expert in experimental design, statistical inference, and LLM evaluation)

I am highly confident in this assessment. The methodological issues (circular anchors, turn-count confound, power analysis) are clear-cut. The paper's own acknowledgments (Limitations section, exploratory analysis box) support my critiques. The authors are transparent about weaknesses, which is commendable, but transparency doesn't excuse methodological flaws that undermine central claims.