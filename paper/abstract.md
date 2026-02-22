# Abstract

Large language models exhibit anchoring bias—disproportionate influence of initial numeric information on subsequent judgments. Debiasing techniques exist, but how should we evaluate them? Standard methodology compares responses under high vs. low anchor conditions; a technique "works" if it reduces this gap. We identify a critical limitation: this metric misses **overcorrection**, where techniques move responses away from anchors but past the unbiased answer.

We introduce **calibration to baseline** as a complementary metric. By collecting unanchored responses (n=1,001 across 10 models), we can measure whether techniques bring outputs closer to ground truth, not just away from anchors. Using this metric across 13,800 trials, we discover rankings that invert conventional wisdom:

- **Random Control** (extra turns, no debiasing content): 91% of models improved
- **Self-reflection techniques** (Premortem, SACD): 82%
- **Outside View** (reference class reasoning): **36%**—worst performer

The simplest structural intervention outperforms sophisticated prompt engineering. Temperature interacts with technique type: deterministic sampling (t=0) optimizes structural interventions; moderate variance (t=0.7) aids self-reflection.

Without baseline collection, we would have concluded Outside View was universally effective—a finding completely inverted by proper calibration measurement. We argue baseline collection should become standard practice in LLM debiasing research.
