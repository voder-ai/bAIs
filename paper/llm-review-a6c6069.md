# LLM Adversarial Review — a6c6069

Date: 2026-02-28T23:57:48.556Z
Model: claude-sonnet-4.5

# Adversarial Review: Debiasing Technique Rankings Are Metric- and Domain-Dependent

## Summary

This paper evaluates four debiasing techniques for anchoring bias in LLMs across 21,139 trials spanning six domains. The core claim is that technique rankings are metric-dependent: susceptibility (high-low spread) and baseline proximity give opposite rankings, with Devil's Advocate appearing best on susceptibility but worst on baseline proximity. The authors introduce Mean Absolute Deviation (MAD) to reveal per-trial errors masked by aggregate metrics. A deep-dive on judicial sentencing (10 models) shows substantial model-specific variance, while a multi-domain extension (4 models) suggests domain-dependent rankings. The paper argues practitioners must test debiasing interventions per-model and per-task rather than relying on published rankings.

## Strengths

- **Important methodological contribution**: The demonstration that susceptibility and baseline proximity give divergent rankings (Table 2) is valuable and well-illustrated. The Devil's Advocate failure mode (low susceptibility, poor baseline proximity) is a genuine insight.

- **Comprehensive empirical scope**: 21,139 trials across 10 models and 6 domains represents substantial experimental effort. The model diversity (Anthropic, OpenAI, DeepSeek, Moonshot, Zhipu) strengthens generalizability claims.

- **Transparent reporting**: Full data availability, detailed prompts in appendix, explicit acknowledgment of AI assistance, and clear disclosure of limitations (Section 6.8) are commendable.

- **MAD metric justification**: The observation that SACD achieves 93.7% aggregate proximity but 18.1% MAD due to bidirectional errors (Table 6) effectively motivates the need for per-trial deviation metrics.

- **Statistical rigor in places**: Bootstrap CIs, Bonferroni correction, mixed-effects modeling (Section 4.6), and TOST equivalence testing show appropriate statistical sophistication.

## Weaknesses

### 1. **Circular Baseline Design Undermines Core Claims** (CRITICAL)

The proportional anchor design (anchors = baseline × 0.5/1.5) creates circularity that invalidates cross-model comparisons:

- **The problem**: You measure "debiasing success" as proximity to baseline, but baseline _determines_ the anchor values. A model with baseline=18mo gets anchors of 9mo/27mo; a model with baseline=36mo gets 18mo/54mo. These are fundamentally different experimental conditions.

- **Why this matters**: Your claim that "SACD achieves 93.7% of baseline" is not comparable across models. For Opus (baseline=18mo), 93.7% = 16.9mo. For o4-mini (baseline=35.7mo), 93.7% = 33.4mo. These represent different absolute deviations (1.1mo vs 2.3mo) and different anchor pressures.

- **The defense doesn't hold**: You argue (Section 3.1) that "baselines are measured independently in anchor-absent conditions, then used to compute anchor values" and that this "is not circular." But the circularity is in the _interpretation_, not the measurement. You're claiming a technique "works" when it returns responses close to baseline, but you've calibrated the experimental pressure (anchor distance) to that same baseline. This is like testing a scale's accuracy by adjusting the weights to match the scale's readings.

- **Impact on main claims**: Your core finding—that SACD is "best" at baseline proximity—may simply reflect that SACD is best at _ignoring proportional anchors_, not that it's best at debiasing in any absolute sense. The fraud domain results (Table 7: all techniques at 29-75% of baseline) suggest the proportional design may create domain-specific anchor strengths that confound technique comparisons.

**Recommendation**: Rerun key comparisons with _fixed absolute anchors_ (e.g., all models get 12mo/36mo anchors regardless of baseline) to validate that rankings hold.

---

### 2. **Turn-Count Confound Undermines SACD Superiority Claims** (CRITICAL)

You acknowledge (Limitation 10, footnote 1) that SACD uses ~6 API calls vs 3 turns for other techniques, and that Random Control's strong performance (78.3%) suggests turn count affects results. But you don't adequately address this:

- **The problem**: SACD ranks #1 (93.7%) while Random Control ranks #3 (78.3%). The 15.4pp gap could be entirely due to SACD's extra 3 turns rather than its debiasing content.

- **Why this matters**: Your practical recommendation is to use SACD (Section 6.9), but if the benefit comes from turn count rather than content, practitioners should just add more Random Control turns (cheaper, simpler).

- **Missing control**: You needed a 6-turn Random Control condition to isolate SACD's content contribution. Without this, the SACD superiority claim is confounded.

- **Inconsistent treatment**: You exclude Outside View due to confound (jurisdiction anchor) but retain SACD despite turn-count confound. This is methodologically inconsistent.

**Recommendation**: Either (a) rerun with turn-matched controls, (b) downgrade SACD claims to "SACD _or additional turns_ improve performance," or (c) exclude SACD from rankings as you did Outside View.

---

### 3. **Multi-Domain Analysis Lacks Statistical Power** (MAJOR)

Section 5 claims "technique rankings vary by domain" but uses only 4 models (vs 10 in main study):

- **Insufficient evidence**: You state "bootstrap 95% CIs overlap for all #1 vs #2 comparisons" (Table 7 caption), meaning you _cannot statistically distinguish_ which technique is best in any domain. Yet you present rankings as if they're meaningful.

- **Exploratory framing insufficient**: The warning box (p.14) says "results should be interpreted with caution" but the abstract claims "The technique that appears best for salary (SACD, 12.0% MAD) underperforms in fraud cases (46.1% MAD, rank #4)" as if this is a robust finding. This is misleading.

- **Model composition bias**: The 4-model subset (Opus, Sonnet, Haiku, GPT-5.2) is not representative. Haiku has 85%+ refusal rate in judicial tasks (footnote 3); Sonnet has elevated extraction failures in loan/SACD. The surviving trials may be systematically biased.

- **Power analysis missing**: You provide power analysis for the main study (Section 3.2.4) but not for the multi-domain extension. With n_eff ≈ 60-70 per technique in the main study (10 models), the 4-model extension likely has n_eff ≈ 25-30—underpowered for all but the largest effects.

**Recommendation**: Either (a) rerun multi-domain with 10 models, (b) remove domain-dependence claims from abstract/conclusion, or (c) reframe Section 5 as "preliminary evidence suggesting domain effects warrant further study."

---

### 4. **Baseline as "Ground Truth" Problem** (MAJOR)

You claim baseline represents "unanchored judgment" and that debiasing = restoring consistency with baseline. But:

- **Baselines vary wildly**: 18mo (Opus) to 35.7mo (o4-mini)—a 17.7mo spread (Table 1). You acknowledge "we make no claim that baselines are normatively correct" (Section 3.1), but then treat proximity to baseline as the success metric.

- **The problem**: If baselines are not "correct," why is 100% of baseline the target? A technique that moves all models toward a normatively better sentence (say, 24mo based on legal precedent) would score poorly on your metric if models' baselines are far from 24mo.

- **Opus zero-variance issue**: Opus has SD=0.0 at baseline (Table 1)—it _always_ says 18mo. Your metric treats this as "perfect consistency," but it could equally be a failure mode (overfitting to a training prior). You retain Opus because "excluding post-hoc would inflate apparent technique effectiveness" (Table 1 caption), but this is backwards: if Opus is an outlier, excluding it gives a _more accurate_ estimate of typical technique performance.

- **Compression pattern unexplained**: High anchors pull responses _below_ baseline for some models (Section 4.3). You hypothesize "anchor rejection" but provide no evidence. This could equally be a measurement artifact of the proportional design.

**Recommendation**: (a) Validate key findings against external ground truth (e.g., actual German sentencing data for judicial domain), or (b) reframe claims as "techniques restore consistency" rather than "techniques debias."

---

### 5. **Statistical Analysis Issues** (MAJOR)

Several statistical choices are questionable:

- **Trial-weighted vs model-averaged aggregates**: You report trial-weighted means (93.7% for SACD) but note the unweighted model-average is 97.7% (Section 3.2.4). The 4pp difference is substantial. You justify trial-weighted as "what happens on a random trial" but this conflates _frequency_ with _importance_. If Opus contributes 30% of trials due to zero variance (no resampling needed), it dominates the aggregate despite being a single model.

- **Design effect underestimated**: You calculate ICC=0.17 and design effect ≈ 35, yielding n_eff ≈ 60-70 (Section 3.2.4). But this assumes equal cluster sizes. Your trial counts vary widely by model (Table 1 note: "Sample sizes shown are for primary analyses; technique comparisons use matched model-temperature subsets"). If matching reduces some models to n=30 and others to n=200, the effective sample size calculation is wrong.

- **Multiple comparisons**: You Bonferroni-correct for 6 pairwise technique comparisons (α = 0.05/6 ≈ 0.0083) but then report 10 models × 4 techniques = 40 model-specific results (Table 5) without correction. The claim that "DeepSeek and Kimi achieve near-perfect debiasing" (Section 4.4) is based on uncorrected tests.

- **TOST equivalence bound**: You use ±5pp as the equivalence bound for SACD vs Premortem (Section 4.7), claiming this is "the smallest difference that would plausibly affect deployment decisions." But 5pp = ~1.5 months given average baselines. For a 12th-offense shoplifting case, 1.5 months is a 10-15% difference in sentence—arguably meaningful. The bound seems arbitrary.

**Recommendation**: (a) Report both trial-weighted and model-averaged aggregates throughout, (b) recalculate design effects with actual cluster sizes, (c) apply family-wise error correction to model-specific claims, (d) justify equivalence bound with stakeholder input or legal precedent.

---

### 6. **Overclaimed Generalizability** (MODERATE)

The abstract claims "no technique consistently outperforms" across domains, but:

- **Limited domain coverage**: 6 domains, but 3 are judicial sentencing variants (original, DUI, fraud, theft). These are not independent—they share structure (defendant, offense, sentence) and likely share anchoring mechanisms. The true domain count is closer to 4 (judicial, loan, medical, salary).

- **Single vignette per domain**: Each domain has one vignette. The fraud case shows extreme anchoring (all techniques 29-75% of baseline); this could be vignette-specific rather than domain-specific. You'd need multiple vignettes per domain to separate domain effects from vignette effects.

- **Provider coverage**: 4 providers, but OpenAI contributes 4/10 models. The "cross-provider validation" claim (Section 5.2) is overstated—you're mostly validating across OpenAI model versions.

**Recommendation**: Soften generalizability claims. Change "across six domains" to "across four domain types" and note that within-domain variance is unexplored.

---

### 7. **Presentation and Clarity Issues** (MODERATE)

- **Inconsistent terminology**: You use "baseline proximity," "% of baseline," and "deviation from baseline" interchangeably. Table 2 header says "% of Baseline" but caption says "proximity to unanchored judgment." Pick one term and stick with it.

- **Figure redundancy**: Figure 1 (bar chart of % of baseline by technique) is redundant with Table 3. Figure 2 (SACD by model) adds value, but Figure 1 could be cut.

- **MAD definition confusion**: Equation 3 defines MAD as percentage deviation, but Table 6 reports MAD in percentage points (18.1% for SACD). Are these the same? The notation suggests yes, but it's unclear whether 18.1% means "18.1 percentage points" or "18.1% relative error."

- **Prompt templates**: Appendix A.2 shows the anchor is introduced as "randomly determined, therefore, it does not reflect any judicial expertise." This framing may _reduce_ anchoring by explicitly flagging the anchor as irrelevant. Did you test whether this disclaimer affects susceptibility?

- **Missing details**: How were extraction failures handled? You report 99.9% regex success (Section 3.2.4) but don't say what happened to the 0.1%. Were they excluded? Resampled? This matters for bias.

**Recommendation**: (a) Standardize terminology, (b) remove redundant figures, (c) clarify MAD units, (d) test anchor framing effects, (e) report extraction failure handling.

---

### 8. **Theoretical Grounding Weak** (MINOR)

Section 6.2 offers "speculative" theoretical explanations citing two 2025 papers on Bayesian reasoning and overconfidence. But:

- **Post-hoc theorizing**: These explanations are generated after seeing the results. You don't pre-register hypotheses or test predictions derived from these theories.

- **Unfalsifiable**: The Bayesian explanation predicts SACD could amplify _or_ correct biases depending on model architecture. The overconfidence explanation predicts external-challenge techniques (DA, Premortem) should outperform SACD—but SACD ranks #1. You don't reconcile this.

- **Missing mechanism**: Why does Random Control (neutral content) outperform Devil's Advocate (adversarial content)? Your "multi-turn structure helps" explanation (Section 6.4) is descriptive, not mechanistic.

**Recommendation**: Either (a) develop testable hypotheses and design experiments to test them, or (b) remove theoretical speculation and focus on empirical description.

---

## Questions for Authors

1. **Circular baseline design**: Can you provide results with fixed absolute anchors (e.g., all models get 12mo/36mo) to validate that SACD superiority holds when anchor pressure is constant across models?

2. **Turn-count control**: What is the performance of a 6-turn Random Control condition? If you haven't run this, why not, given that you acknowledge the confound in Limitation 10?

3. **Multi-domain power**: What is the effective sample size (accounting for ICC and clustering) for the 4-model multi-domain analysis? Are you powered to detect the effect sizes you observe?

4. **Baseline variance**: Why retain Opus (SD=0.0) when it's clearly an outlier? You say excluding it would "inflate apparent technique effectiveness," but wouldn't including it _deflate_ effectiveness by adding noise?

5. **Extraction failures**: Table 1 note mentions "Sonnet 4.6 loan/SACD showed elevated extraction failures." How many? Were they excluded? Could this create selection bias (e.g., SACD only "works" on trials where Sonnet produces parseable output)?

6. **Anchor framing**: The prompt says the anchor is "randomly determined, therefore, it does not reflect any judicial expertise." Did you test whether this disclaimer reduces anchoring? If so, your results may underestimate real-world anchoring effects.

7. **Domain independence**: The three judicial vignettes (DUI, fraud, theft) share structure. Did you test whether they cluster together in a factor analysis? If so, they're not independent domains.

8. **SACD implementation**: You say SACD averages 2.5 iterations (median 3). What's the distribution? Do models that converge faster (fewer iterations) show different debiasing effectiveness?

9. **Equivalence bound**: How did you choose ±5pp for the SACD vs Premortem equivalence test? Did you consult legal experts on what sentence difference is meaningful?

10. **Reproducibility**: You provide OpenRouter model identifiers, but these are API endpoints that may change over time. Did you log model version hashes or request IDs to ensure exact reproducibility?

---

## Minor Issues

- **Table 1 caption**: "Opus 4.6 shows zero variance (SD=0.0) at all temperatures, consistently responding with exactly 18 months." This is buried in a caption—it deserves discussion in main text.

- **Footnote 1 (p.3)**: The SACD turn-count caveat is critical but relegated to a footnote. Move to main text.

- **Section 3.2.4**: "Choice rationale: Trial-weighted means answer 'what happens on a random trial?'" This is confusing. A random trial is equally likely to come from any model if you sample uniformly. Trial-weighted means answer "what happens if you sample trials proportional to how many we collected?"

- **Table 7**: "Rankings are point estimates; bootstrap 95% CIs overlap for all #1 vs #2 comparisons." If CIs overlap, why present rankings at all? This is misleading.

- **Figure 3 caption**: "Asterisks mark _numerically lowest_ point estimate per domain (not statistically distinguishable—all pairwise CIs overlap)." The asterisks imply significance; remove them if differences aren't significant.

- **References**: \citet{tversky1974} is cited for anchoring bias, but the canonical reference is Tversky & Kahneman (1974) "Judgment under Uncertainty: Heuristics and Biases" in _Science_. Is this the correct citation?

- **Typo (p.14)**: "our exploratory cross-domain analysis suggests no technique consistently outperforms" — but Table 7 shows SACD ranks #1 or #2 in 5/6 domains. This seems inconsistent.

- **Appendix A.6**: Random Control prompt asks models to "describe the courtroom setting you imagine." This is not truly neutral—it may prime legal/procedural thinking that affects sentencing. Did you test other neutral prompts (e.g., "describe the weather today")?

---

## Verdict

**MAJOR REVISION**

This paper makes a valuable methodological contribution (metric-dependent rankings) and presents substantial empirical work (21,139 trials). However, three critical flaws undermine the main claims:

1. **Circular baseline design**: The proportional anchor approach creates circularity that invalidates cross-model comparisons and may confound technique rankings.

2. **Turn-count confound**: SACD's superiority may be due to extra turns rather than debiasing content; without turn-matched controls, the SACD recommendation is unjustified.

3. **Underpowered multi-domain analysis**: The 4-model extension lacks statistical power to support domain-dependence claims, yet these claims appear in the abstract and conclusion.

Additionally, the paper has several moderate issues (statistical analysis choices, overclaimed generalizability, presentation clarity) that should be addressed.

**Required for acceptance**:

- Rerun key comparisons with fixed absolute anchors OR provide strong theoretical justification for proportional design and reframe claims accordingly
- Add 6-turn Random Control condition OR exclude SACD from rankings OR downgrade SACD claims to "SACD or additional turns"
- Either strengthen multi-domain analysis (10 models) OR remove domain-dependence claims from abstract/conclusion and reframe Section 5 as exploratory

**Recommended**:

- Address statistical analysis issues (trial-weighted vs model-averaged, design effects, multiple comparisons)
- Soften generalizability claims (4 domain types, not 6 independent domains)
- Improve presentation (terminology, redundant figures, MAD clarity)

The core insight—that susceptibility and baseline proximity give divergent rankings—is important and well-demonstrated. With revisions addressing the circular baseline design and turn-count confound, this could be a strong contribution to the debiasing literature.

---

## Confidence

**4/5** (High confidence)

I am confident in this assessment. The methodological issues (circular baseline, turn-count confound) are clear and well-supported by the paper's own data. The statistical concerns are based on standard practices in mixed-effects modeling and multiple comparisons. The only uncertainty is whether the authors have additional analyses (e.g., fixed-anchor validation, turn-matched controls) that weren't included in this draft. If such analyses exist and support the claims, my assessment would change. But based on the submitted manuscript, major revision is warranted.
