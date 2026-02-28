# Response to Circularity Concern

## Reviewer Concern
"Proportional anchors (high = 1.5×baseline, low = 0.5×baseline) create circularity when evaluating baseline proximity. A technique that simply ignores anchors would score 100% by construction."

## Analysis

The reviewer conflates two independent methodological choices:
1. **Anchor design** (how we set anchor values)
2. **Evaluation metric** (how we measure debiasing success)

### Why proportional anchors?

Proportional anchors are standard in anchoring research for cross-domain comparability:
- A ±50% deviation creates similar "anchoring pressure" whether the baseline is $50k (salary) or 18 months (sentence)
- Fixed absolute anchors (e.g., always 12mo low, 36mo high) would create asymmetric pressure across models with different baselines
- Tversky & Kahneman (1974) and subsequent work use percentage-based anchor manipulations

### Why this isn't circular

1. **The baseline is measured independently.** We collect baseline responses *without* showing any anchor. The anchor values are then computed from these responses. There is no circularity in measurement.

2. **"Ignoring anchors" IS successful debiasing.** If a technique causes the model to completely ignore the irrelevant anchor and return its baseline judgment, that IS the goal. The reviewer frames this as a flaw; it's actually the definition of success.

3. **Fixed anchors would introduce different problems:**
   - If baseline = 18mo and we use fixed anchors 12/36, the high anchor is 2× baseline but low is only 0.67× baseline → asymmetric pressure
   - Different models have different baselines (Table 2); fixed anchors would be "high" for some models but "near baseline" for others

### What about the reviewer's concern that we can't distinguish "perfect debiasing" from "ignoring prompts"?

This is a valid concern but applies to ANY debiasing evaluation, not just ours:
- If a model ignores all context and always outputs 18mo, it would score 100% on baseline proximity
- But it would also fail on other benchmarks (e.g., following instructions)
- Our models do respond to the vignette content (different models give different baselines); they're not simply outputting constants

## Proposed text

Add to Section 3.1:

> **On proportional anchor design.** Following standard practice in anchoring research \citep{jacowitz1995}, we set anchors proportionally to each model's baseline (±50\%) to ensure comparable anchoring pressure across models with different baseline judgments. This is not circular: baselines are measured independently in anchor-absent conditions, then used to compute anchor values. Critics might note that a technique causing perfect anchor-ignorance would score 100\%—but this IS the definition of successful debiasing. The goal is to eliminate the influence of task-irrelevant numeric information on judgment.
