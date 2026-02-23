# Discussion

## A Taxonomy of Debiasing Mechanisms

Our results reveal that debiasing techniques differ not just in effectiveness but in *mechanism*. We propose a four-category taxonomy based on how each technique interacts with the anchor:

### Distance Techniques (Dilute the Anchor)

**Random Control** (30% calibration improvement) and **Full SACD** (39% improvement) work by inserting cognitive distance between anchor exposure and final decision. Neither asks the model to generate replacement numbers or directly engage with the anchor value.

Random Control achieves this through irrelevant elaboration—Arctic tern migration patterns and Swiss watchmaking history populate the context window with non-anchor tokens. Full SACD achieves it through iterative self-questioning, each round adding reasoning tokens that dilute the anchor's salience.

The mechanism is not "forgetting" the anchor but *diluting* it within a larger context vector. By the time the model generates its final answer, the anchor competes with thousands of other tokens for attention weight.

### Doubt Techniques (Undermine Without Replacing)

**Premortem** (22% improvement) occupies a middle ground. By asking "what could go wrong with this sentence?", it prompts elaboration that undermines confidence in anchor-influenced reasoning without committing to an alternative value.

Critically, premortem does not ask the model to generate a replacement estimate. The doubt it creates is directed at the *reasoning process*, not at producing a new number. This distinguishes it from replacement techniques.

### Replacement Techniques (Swap One Anchor for Another)

**Outside View** (29% *worse* calibration) exemplifies the danger of anchor replacement. By asking "what is the typical sentence for this type of offense?", Outside View prompts the model to generate its own base rate estimate—which then becomes a new anchor.

This explains the paradox in our spread analysis: Outside View achieves 85% reduction in the gap between high and low anchor responses (excellent by traditional metrics) while simultaneously moving responses *further* from baseline truth (poor calibration).

The model isn't debiased; it's re-anchored to its own estimate. If that estimate is accurate, this helps. If not—as our data shows—it hurts. The technique trades external anchoring for internal anchoring, with the added risk of IKEA-effect overconfidence in self-generated values.

### Confrontation Techniques (Argue With the Anchor)

**Devil's Advocate** (2% improvement, statistically negligible) asks the model to argue against the anchor value. This keeps the anchor front and center while generating counter-arguments.

The failure is predictable: confrontation requires repeatedly referencing the very number we're trying to escape. Each "the prosecutor's 48-month demand is excessive because..." reinforces the 48-month figure. The model argues against the anchor while simultaneously encoding it more deeply.

## Why Distance Beats Content

A striking finding is that Random Control—irrelevant filler with no debiasing content whatsoever—outperforms techniques designed specifically to counter anchoring bias (Outside View, Devil's Advocate).

This has uncomfortable implications for the debiasing literature. Studies claiming "our technique reduces anchoring by X%" typically compare against unstructured baselines. If ~30% of improvement comes from structure alone (more reasoning turns, more tokens, more cognitive distance), reported effects may be substantially inflated.

The practical implication is counterintuitive: **a "think about something unrelated" step may outperform sophisticated debiasing prompts**. The specific content of the intervention matters less than the distance it creates.

## The Calibration vs. Spread Problem

Traditional anchoring studies measure spread reduction: the difference between high-anchor and low-anchor responses. A technique that makes responses identical regardless of anchor appears perfectly effective.

We argue this metric is fundamentally flawed for debiasing evaluation. It conflates two very different outcomes:

1. **True debiasing**: Responses converge toward baseline truth
2. **Re-anchoring**: Responses converge toward a replacement anchor

Outside View achieves #2, not #1. Spread reduction looks excellent (85%) while calibration worsens (29%). The model isn't less biased; it's biased toward a different number.

**Calibration** (|response - baseline|) captures what we actually care about: distance from ground truth. A technique that overcorrects—moving responses past baseline to the opposite extreme—shows poor calibration despite good spread reduction.

We recommend calibration as the primary metric for debiasing research, with spread reduction as a secondary diagnostic for anchor sensitivity.

## Model-Specific Effects

Our data reveals substantial model variation that challenges "one-size-fits-all" debiasing recommendations:

- **Full SACD backfires on 3/10 models** (Opus, GLM-5, GPT-5.2), suggesting iterative self-questioning can amplify rather than reduce bias in some architectures
- **No technique universally succeeds** across all models tested
- **Temperature effects are inconsistent**, with no clear "optimal temperature for debiasing"

This heterogeneity likely reflects differences in training data, RLHF procedures, and architectural choices. A technique calibrated on GPT-4 may fail on Claude, and vice versa.

## Practical Recommendations

Based on our findings, we offer the following guidance for practitioners:

1. **Prefer distance over content**: When debiasing matters, add reasoning steps between anchor exposure and decision. The specific content is less important than the distance created.

2. **Avoid replacement prompts**: Techniques asking for base rates or alternative estimates risk re-anchoring. If you must use Outside View, treat the generated estimate with the same skepticism as the original anchor.

3. **Don't confront anchors directly**: Arguing against a number keeps it salient. If critique is necessary, focus on process rather than values.

4. **Test on your specific model**: Debiasing effectiveness varies substantially across models. Validate techniques on your target architecture before deployment.

5. **Measure calibration, not just spread**: Spread reduction can mask overcorrection. Always check distance from baseline truth.

## Limitations

Our study uses a single experimental paradigm (judicial sentencing) which may not generalize to all anchoring contexts. The Englich et al. vignette, while well-validated for human studies, may interact differently with LLM training distributions that include legal reasoning.

We tested 10 models; the space of architectures is vast and evolving. Our taxonomy may require revision as new model families emerge.

Finally, "baseline truth" in our paradigm is empirically derived (mean response without anchor) rather than normatively determined. Whether 24 months is the "correct" sentence for a 12th-offense shoplifter is beyond our scope—we measure only deviation from what the model would say unprompted.
