# MAD Justification Draft

## Reviewer Concern
"Why is matching the model's unanchored baseline the correct goal? What if the baseline itself is biased?"

## Response

The goal is not to claim baselines are "correct" but to measure **consistency with the model's own unanchored judgment**. This is the standard approach in anchoring research (Jacowitz & Kahneman, 1995):

1. **Anchoring bias is defined relative to unanchored judgment.** If a model would normally say 18 months without an anchor, but says 24 months with a high anchor, that's anchoring bias—regardless of whether 18 months is the "right" answer.

2. **We're measuring susceptibility to irrelevant information, not correctness.** A debiased model should reach the same conclusion whether or not an irrelevant anchor is present. MAD measures this: how much does the anchored response deviate from what the model would say without the anchor?

3. **Ground truth is unknowable in judicial sentencing.** There is no objectively correct sentence for a hypothetical vignette. Using the model's own baseline avoids requiring external ground truth.

4. **This matches human anchoring research methodology.** Jacowitz & Kahneman (1995) defined anchoring effects relative to participants' own estimates, not external "correct" values.

## Proposed text for paper

Add to Section 3.1 (Metrics):

> **Baseline as reference, not ground truth.** Following Jacowitz & Kahneman (1995), we measure deviation from each model's unanchored baseline rather than an external ground truth. This operationalizes debiasing as *consistency*: a debiased model produces similar outputs regardless of irrelevant anchors. We make no claim that baselines are normatively correct—indeed, models disagree substantially (Table~\ref{tab:baselines}). The goal is to measure whether debiasing techniques restore anchor-independent reasoning, not whether that reasoning reaches any particular conclusion.
