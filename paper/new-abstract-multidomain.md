# New Abstract — Multi-Domain Focus

## Current Title

"How Effective Are Debiasing Techniques for LLM Anchoring Bias? A 21,000-Trial Evaluation"

## New Title Options

1. "Debiasing Techniques Don't Transfer: A Cross-Domain Evaluation of Anchoring Bias Interventions in LLMs"
2. "No Universal Debiasing: Why Anchoring Bias Interventions Fail to Generalize Across Domains"
3. "Domain-Dependent Debiasing: Evaluating Anchoring Bias Interventions Across 6 Tasks"

## New Abstract (Draft)

Do debiasing techniques for anchoring bias transfer across domains? We evaluate four interventions—Devil's Advocate, SACD (Self-Ask Chain of Deliberation), Premortem, and Random Control—across 21,139 trials spanning six domains: salary negotiation, loan approval, medical triage, and three judicial sentencing scenarios.

**Our core finding: no technique generalizes.** Technique rankings vary dramatically by domain, and bootstrap 95% confidence intervals overlap for all pairwise comparisons—we cannot statistically distinguish technique effectiveness within any domain. The technique that appears best for salary (SACD, 12.0% MAD) underperforms in fraud cases (46.1% MAD, rank #4). Random Control—which provides no debiasing content, only additional conversation turns—ranks #1 in 3 of 6 domains.

We introduce Mean Absolute Deviation (MAD) from unanchored baseline as a metric that reveals per-trial error hidden by aggregate measures. SACD's aggregate 93.7% baseline proximity in judicial sentencing masks 18.1% per-trial deviation due to bidirectional errors that cancel out.

A deep-dive validation on judicial sentencing (14,152 trials, 10 models) confirms substantial model-specific variance: the same technique can improve one model's responses while degrading another's. Combined with domain dependence, this implies practitioners must test debiasing interventions per-model AND per-task rather than relying on published technique rankings.

**Keywords:** anchoring bias, debiasing, LLM evaluation, cognitive bias, domain transfer

---

## New Intro Structure

### §1 Introduction

- Hook: "Human debiasing techniques (Devil's Advocate, Premortem) are increasingly applied to LLMs. But do they transfer across tasks?"
- Gap: Prior work tests single domains; we test 6
- Finding preview: "No technique generalizes"

### §1.1 The Transfer Problem

- Different domains have different anchoring patterns
- What works for salary negotiation may fail for medical triage

### §1.2 Contributions

1. **Cross-domain evaluation:** 6 domains, 4 models, 6,987 trials
2. **MAD metric:** Reveals per-trial error hidden by aggregates
3. **Deep validation:** 14,152 judicial trials on 10 models confirms model-specific variance

### §2 Related Work (condensed)

### §3 Methodology

- Domains: salary, loan, medical, DUI, fraud, theft
- Models: Opus 4.6, Sonnet 4.6, Haiku 4.5, GPT-5.2 (spanning capability tiers)
- Techniques: DA, SACD, Premortem, Random Control

### §4 Results: Cross-Domain Comparison

- Table: MAD by domain × technique (currently Table V, becomes Table 1)
- Figure: Heatmap (currently Figure 3, becomes Figure 1)
- Key finding: CI overlap → can't pick winners

### §5 Deep Dive: Judicial Sentencing

- 10 models, 14,152 trials
- Model-specific variance
- SACD vs Premortem equivalence

### §6 Discussion

- Why techniques don't transfer
- Practical implications: test per-task

### §7 Limitations & Conclusion

---

## Key Message Shift

**Old:** "Metric choice determines technique recommendation" (methodological)
**New:** "Debiasing techniques don't transfer across domains" (practical)

Both are supported by the data. The new framing is more actionable for practitioners.
