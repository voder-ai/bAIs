# Calibration, Not Susceptibility: Evaluating LLM Debiasing with Unanchored Baselines

**Authors:** [TBD]

---

## Abstract

Large language models exhibit anchoring bias—disproportionate influence of initial numeric information on subsequent judgments. Debiasing techniques exist, but how should we evaluate them? Standard methodology compares responses under high vs. low anchor conditions; a technique "works" if it reduces this gap. We identify a critical limitation: this metric misses **overcorrection**, where techniques move responses away from anchors but past the unbiased answer.

We introduce **calibration to baseline** as a complementary metric. By collecting unanchored responses (n=1,001 across 11 models), we can measure whether techniques bring outputs closer to ground truth, not just away from anchors. Using this metric across 14,220 trials, we discover rankings that invert conventional wisdom:

- **Random Control** (extra turns, no debiasing content): 91% of models improved
- **Self-reflection techniques** (Premortem, SACD): 82%
- **Outside View** (reference class reasoning): **36%**—worst performer

The simplest structural intervention outperforms sophisticated prompt engineering. Temperature interacts with technique type: deterministic sampling (t=0) optimizes structural interventions; moderate variance (t=0.7) aids self-reflection.

Without baseline collection, we would have concluded Outside View was universally effective—a finding completely inverted by proper calibration measurement. We argue baseline collection should become standard practice in LLM debiasing research.

---

## 1. Introduction

[See: new-intro-v2.md]

---

## 2. Related Work

[TBD - anchoring bias literature, LLM cognitive bias studies, debiasing techniques]

---

## 3. Methodology

[See: methodology.md]

---

## 4. Results

[See: results.md]

---

## 5. Discussion

[See: new-discussion-v2.md]

---

## 6. Conclusion

We introduced calibration to baseline as a metric for evaluating LLM debiasing techniques. This metric catches overcorrection—a failure mode invisible to standard susceptibility measures.

Our key findings:

1. **Structure beats content.** Random Control (extra turns, no debiasing content) achieves 91% calibration improvement vs. 36% for Outside View.

2. **Temperature matters.** Structural interventions prefer t=0; self-reflection prefers t=0.7.

3. **Baseline collection is essential.** Without it, we would have published inverted rankings.

For practitioners: start with structure. Add conversation turns before crafting complex debiasing prompts. Validate with calibration metrics, not just susceptibility.

For researchers: collect unanchored baselines. The standard high-vs-low methodology has a blind spot. Ground truth matters.

---

## References

[See: archive/references.bib]
