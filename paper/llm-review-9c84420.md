# LLM Adversarial Review — 9c84420

Date: 2026-02-28T12:45:22.806Z
Model: claude-sonnet-4.5

# Adversarial Review: "How Effective Are Debiasing Techniques for LLM Anchoring Bias?"

## Summary

This paper evaluates four debiasing techniques for anchoring bias in LLMs across 21,139 trials on 10 models. The central claim is that standard susceptibility metrics (high-low anchor spread) give divergent rankings from baseline-relative metrics (proximity to unanchored judgment). The authors find Devil's Advocate reduces susceptibility (-8.8%) but performs worst on baseline proximity (63.6%), while SACD shows the reverse pattern (increases susceptibility +39.6% but achieves 93.7% baseline proximity). They introduce Mean Absolute Deviation (MAD) to reveal that SACD's aggregate proximity masks 18.1% per-trial error. A multi-domain extension (6,987 trials, 4 models) shows metric-dependent rankings persist across domains, though differences lack statistical significance.

## Strengths

- **Important methodological contribution**: The divergence between susceptibility and baseline-relative metrics is genuinely novel and practically important. The Devil's Advocate failure mode (consistent but wrong) would be missed by susceptibility-only evaluation.

- **Rigorous scale**: 21,139 trials across 10 models is substantial. The addition of multi-domain validation (6 vignettes) addresses generalization concerns.

- **Statistical transparency**: Mixed-effects analysis (Section 4.6), bootstrap CIs, Bonferroni correction, and TOST equivalence testing demonstrate methodological sophistication. The ICC=0.17 finding and design effect calculation are particularly valuable.

- **Honest limitations section**: The authors acknowledge proportional anchor circularity, Outside View confound, turn-count confound, and Opus zero-variance issue. The sensitivity analysis (excluding Opus preserves rankings) is reassuring.

- **MAD innovation**: Introducing MAD to reveal bidirectional error cancellation (Table 6) is a genuine contribution. The 93.7% aggregate vs. 18.1% MAD discrepancy for SACD is striking.

- **Reproducibility**: Full data/code availability, deterministic analysis pipeline, and detailed prompt templates (Appendix A) enable replication.

## Weaknesses

### 1. **Circular Anchor Design Undermines Core Claims**

The proportional anchor design (high = 1.5×baseline, low = 0.5×baseline) creates fundamental circularity:

- **Problem**: Anchors are *defined* relative to the baseline you're measuring proximity to. A technique that perfectly ignores anchors would score 100% by construction—but this is tautological. You're measuring "does the technique restore the baseline?" when the baseline *determined* the anchor values.

- **Impact on claims**: The entire "percentage of baseline" metric becomes suspect. SACD's 93.7% could reflect that SACD responses happen to fall near the arithmetic mean of (0.5×baseline, 1.5×baseline) = baseline, not that SACD successfully "debias."

- **Authors' defense** (Section 3.1): "This is not circular: baselines are measured independently in anchor-absent conditions." This misses the point. The circularity isn't in *measurement order*—it's that the anchor values themselves encode the baseline, creating a mechanical relationship.

- **What's needed**: Replication with *fixed absolute anchors* (e.g., always 12 and 36 months) across all models. If SACD still achieves ~100% of baseline under fixed anchors, the claim stands. Currently, we cannot distinguish "SACD debias" from "SACD happens to average the anchors."

**Severity**: This threatens the paper's central contribution. The susceptibility vs. baseline divergence could be an artifact of the anchor design rather than a genuine phenomenon.

### 2. **Statistical Power Claims Are Overstated**

Section 3.2.4 states: "At this effective n, we are powered (β=0.80, α=0.05) to detect effects of d≈0.50 or larger."

- **Problem**: With ICC=0.17 and ~200 trials/model, the design effect is ~35, yielding n_eff ≈ 60-70 *per technique*. For pairwise comparisons, this is n_eff ≈ 30-35 per group.

- **Actual power**: At n=35/group, α=0.0083 (Bonferroni-corrected), two-tailed, you need d≈0.90 for 80% power, not d=0.50. The SACD-Premortem comparison (d=0.08) is massively underpowered, yet the authors claim equivalence via TOST.

- **TOST issue**: The equivalence bound (±5pp) is arbitrary ("approximately 1.5 months given average baselines"). Why not ±3pp or ±7pp? The choice determines the conclusion. With n_eff ≈ 65 and observed difference 2.1pp, you have ~40% power to detect equivalence at ±5pp—the TOST p<0.01 is likely a Type I error.

- **What's needed**: Report actual achieved power for each comparison, or use Bayesian estimation with credible intervals instead of NHST.

**Severity**: Moderate. The large effects (SACD vs. DA, d=1.06) are likely real, but claims about SACD≈Premortem equivalence are not credible.

### 3. **Multi-Domain Results Contradict Main Claims**

Table 7 shows SACD ranks #1 on 0/6 domains by MAD, contradicting the main study where SACD ranks #1 by baseline proximity.

- **Authors' framing**: "Exploratory... 4 models vs. 10 in main study." But this isn't just noise—it's a *qualitative reversal*. In the main study, SACD is the clear winner by baseline proximity. In multi-domain, it's middle-of-the-pack.

- **Model composition issue**: The 4-model subset (Opus, Sonnet, Haiku, GPT-5.2) includes Haiku, where SACD catastrophically fails (47.8% in main study). If Haiku dominates the multi-domain sample, this could mechanically pull SACD down. But the authors don't report per-model trial counts for multi-domain.

- **Domain-technique interaction**: The fraud domain shows SACD at #3 (46.2% MAD) while no-intervention is #1 (44.2%). This suggests SACD *increases* error in some domains—directly contradicting the "SACD is best" narrative.

- **What's needed**: (a) Report per-model trial counts for multi-domain. (b) Test whether the SACD ranking reversal is driven by Haiku oversampling or genuine domain effects. (c) If domain effects are real, the title claim ("How Effective Are Debiasing Techniques") is too broad—it should be "...in Judicial Sentencing."

**Severity**: Major. This undermines generalizability claims and suggests the main finding may be vignette-specific.

### 4. **Baseline Interpretation Is Confused**

The authors claim (Section 3.1): "Baseline as reference, not ground truth... We make no claim that baselines are normatively correct."

But then:
- Table 1 caption: "100% = perfect"
- Figure 2 caption: "Dashed line = 100% (perfect)"
- Section 4.2: "SACD achieves 93.7%—closest to the model's unanchored judgment" [framed as success]

**Contradiction**: If baseline isn't "correct," why is proximity to it "better"? The paper conflates two goals:
1. **Consistency**: Responses shouldn't vary with irrelevant anchors (valid)
2. **Accuracy**: Responses should match baseline (only valid if baseline is correct)

The "12th offense" is in the baseline prompt (Limitation 5), so baseline *is* anchored—just not with a prosecutor demand. This makes "100% of baseline" even less interpretable.

**What's needed**: Either (a) defend baseline as normatively correct (e.g., "unanchored expert consensus"), or (b) reframe the metric as "consistency" and stop using "perfect" language.

**Severity**: Moderate. This is more conceptual confusion than fatal flaw, but it muddies interpretation.

### 5. **Turn-Count Confound Invalidates Random Control**

Section 4.5: "Random Control outperforms Devil's Advocate (+15pp, d=0.39) despite no debiasing content. Multi-turn structure alone helps."

- **Problem**: Random Control uses 3 turns, Devil's Advocate uses 3 turns, SACD uses ~6 turns. If turn count matters, SACD's advantage could be entirely mechanical (more turns = regression to mean).

- **Authors acknowledge this** (Limitation 10) but don't address it. The obvious control is a 6-turn Random Control. Without it, we can't distinguish "SACD content works" from "6 turns > 3 turns."

- **Implication**: The paper's core recommendation (SACD > Premortem) could reverse if Premortem were given 6 turns.

**Severity**: Moderate-to-major. This is a basic confound that should have been controlled.

### 6. **Missing Baselines for Multi-Domain**

Section 5 reports MAD from baseline but doesn't report the *baselines themselves*. Table 7 shows "Low %" and "High %" but not "Baseline %."

- **Why this matters**: If the salary baseline is $85k and SACD produces $80k (low anchor) and $88k (high anchor), that's MAD=6.5%. But if the baseline is $120k, those same responses yield MAD=32%. We can't interpret Table 7 without knowing the reference point.

- **What's needed**: Add a "Baseline" column to Table 7, or report baselines in Appendix B.

**Severity**: Minor but frustrating. This is basic reporting.

### 7. **Opus Zero-Variance Issue**

Opus 4.6 responds with exactly 18 months at all temperatures (SD=0.0). The authors retain it because "excluding post-hoc would inflate apparent technique effectiveness."

- **Problem**: Opus contributes 1/10 of the model sample but has *zero information* about variance. It mechanically pulls all techniques toward 18 months. The sensitivity analysis (excluding Opus shifts means 2-3pp) is reassuring, but the decision to include it is still questionable.

- **Better approach**: Report main results with and without Opus in parallel, or weight models by baseline variance (downweight Opus).

**Severity**: Minor. The sensitivity analysis mitigates this, but the decision is odd.

## Questions for Authors

1. **Proportional anchors**: Can you replicate the key finding (susceptibility vs. baseline divergence) using *fixed absolute anchors* (e.g., 12 and 36 months for all models)? If not, how do you rule out that the divergence is an artifact of the anchor design?

2. **Multi-domain reversal**: Why does SACD rank #1 in the main study but #3-5 in most multi-domain vignettes? Is this driven by Haiku oversampling, domain effects, or model subset? Please report per-model trial counts for Table 7.

3. **Turn-count control**: What happens if you give Premortem 6 turns (matching SACD)? Does the SACD advantage disappear?

4. **Power analysis**: You claim 80% power to detect d=0.50, but with n_eff≈65 and α=0.0083, you need d≈0.90. Can you clarify this discrepancy? What is the achieved power for SACD vs. Premortem (d=0.08)?

5. **Baseline normativity**: Is the baseline "correct" or just "consistent"? If the latter, why use language like "perfect" (Table 1) and "100% = unanchored judgment" (Figure 2)?

6. **SACD mechanism**: You speculate (Section 6.1) that SACD may cause "debiasing theater" (Opus overshoots to 127.8%). Do you have evidence for this, or is it post-hoc storytelling? Can you test whether SACD responses show markers of "trying to appear debiased" (e.g., explicit mentions of reconsidering)?

7. **Fraud domain**: Why does no-intervention outperform all techniques in the fraud domain (Table 7)? Does this suggest some domains are *harmed* by debiasing attempts?

8. **MAD vs. susceptibility**: You recommend "MAD alongside susceptibility" (Abstract). But if a practitioner can only optimize one metric, which should they choose? The paper doesn't answer this.

## Minor Issues

- **Table 7 caption**: "Bootstrap 95% CIs overlap for all pairwise comparisons" but CIs aren't shown in the table. Add them or move this to text.

- **Figure 3 (MAD heatmap)**: Referenced but marked as "figures/mad-heatmap.pdf"—is this included? If not, remove the reference or include the figure.

- **Section 3.2.4**: "Reproducibility" paragraph lists model identifiers but doesn't specify API versions or dates. OpenRouter models can change; include version hashes if available.

- **Appendix A.4 (SACD)**: "Average iterations to convergence: 2.5 (median 3)" is confusing (mean < median?). Clarify or report mode.

- **References**: \citet{llm-bayesian-2025} and \citet{llm-judge-overconfidence-2025} are cited in Section 6.2 but not in bibliography. Add or remove.

- **Typo** (Section 4.3): "Devil's Advocate keeps responses at 63.6% of baseline—consistently far from the unanchored judgment despite appearing 'best' under susceptibility." The scare quotes around "best" are editorializing; remove or rephrase.

## Verdict

**MAJOR REVISION**

This paper makes a valuable contribution (metric divergence in debiasing evaluation) but has serious methodological issues that must be addressed:

1. **Critical**: The proportional anchor design creates circularity that threatens the core claim. Replication with fixed anchors is essential.

2. **Critical**: The multi-domain results contradict the main findings. Either reconcile this or narrow the scope to judicial sentencing.

3. **Important**: The turn-count confound must be controlled (6-turn Random Control or Premortem).

4. **Important**: Power analysis is incorrect; SACD≈Premortem equivalence claim is not credible.

If the authors can address (1) and (2)—particularly showing that the susceptibility/baseline divergence holds under fixed anchors, and explaining the multi-domain reversal—this could be a strong contribution. As written, I cannot recommend acceptance because the core empirical claim may be an artifact of the experimental design.

The paper is well-executed in many respects (scale, transparency, statistical rigor), but the foundational issues outweigh the strengths. A major revision addressing the anchor design and multi-domain inconsistency is required.

## Confidence

**5/5** (Expert in experimental design, LLM evaluation, and anchoring bias literature)

I have high confidence in this assessment. The proportional anchor circularity is a fundamental issue that any expert reviewer would flag. The multi-domain reversal is an empirical fact that contradicts the main narrative. These are not subjective judgments—they are structural problems with the methodology and claims.