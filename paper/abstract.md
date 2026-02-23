# Abstract

Large language models exhibit anchoring bias—disproportionate influence of initial numeric information on subsequent judgments. Debiasing techniques exist, but how should we evaluate them? Standard methodology compares responses under high vs. low anchor conditions; a technique "works" if it reduces this spread. We identify a critical limitation: this metric misses **overcorrection**, where techniques move responses away from anchors but past the unanchored baseline.

We introduce **baseline convergence** as a complementary metric. By collecting unanchored responses across 10 models, we measure whether techniques bring outputs closer to the model's unprompted judgment—not just away from the anchor. Using this metric across **14,324 trials** with 5 debiasing techniques, we discover that rankings can invert conventional wisdom.

**Key findings** (Welch's t-test, α=0.05):

- **Full SACD** (iterative self-questioning): +24% convergence improvement (p<.001, d=0.41, 5/10 models significantly improved after Bonferroni correction)
- **Premortem**: +10% (p<.001, d=0.17)
- **Random Control** (irrelevant elaboration): +9% (p<.001, d=0.15)
- **Devil's Advocate**: +2% (**not significant**, p=.327)
- **Outside View**: −22% (**worse** than no technique, p<.001)

Outside View achieves 85% spread reduction but 22% *worse* baseline convergence—it replaces the external anchor with an internal one. Premortem and Random Control show no significant difference (p=.468), suggesting token distance from the anchor contributes to debiasing independently of technique content.

**Limitations:** All trials use a single paradigm (judicial sentencing vignette). Results may not generalize to other anchoring domains. Baseline convergence measures deviation from unprompted response, not objective ground truth.

We argue baseline collection should become standard practice in LLM debiasing evaluation.

**Reproducibility:** Code, data, and prompts available at https://github.com/voder-ai/bAIs
