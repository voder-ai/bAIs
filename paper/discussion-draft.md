# Discussion

## A Taxonomy of Debiasing Mechanisms

Our results reveal that debiasing techniques differ not just in effectiveness but in *mechanism*. We propose a four-category taxonomy based on how each technique interacts with the anchor:

### Distance Techniques (Dilute the Anchor)

**Random Control** (+9% baseline convergence, p<.001) and **Full SACD** (+24%, p<.001) work by inserting cognitive distance between anchor exposure and final decision. Neither asks the model to generate replacement numbers or directly engage with the anchor value.

Random Control achieves this through irrelevant elaboration—Arctic tern migration patterns and Swiss watchmaking history populate the context window with non-anchor tokens. Full SACD achieves it through iterative self-questioning, each round adding reasoning tokens that dilute the anchor's salience.

The mechanism is not "forgetting" the anchor but *diluting* it within a larger context vector. By the time the model generates its final answer, the anchor competes with thousands of other tokens for attention weight.

### Doubt Techniques (Undermine Without Replacing)

**Premortem** (+10%, p<.001) occupies a middle ground. By asking "what could go wrong with this sentence?", it prompts elaboration that undermines confidence in anchor-influenced reasoning without committing to an alternative value.

Critically, premortem does not ask the model to generate a replacement estimate. The doubt it creates is directed at the *reasoning process*, not at producing a new number. This distinguishes it from replacement techniques.

### Replacement Techniques (Swap One Anchor for Another)

**Outside View** (−22% baseline convergence, p<.001) exemplifies the danger of anchor replacement. By asking "what is the typical sentence for this type of offense?", Outside View prompts the model to generate its own base rate estimate—which then becomes a new anchor.

**Important caveat:** Our Outside View prompts included jurisdiction specification ("German federal courts") to avoid safety refusals. This may have introduced a secondary anchor, potentially confounding results. The poor performance could reflect double-anchoring rather than pure mechanism failure. Our conclusions about Outside View specifically should be interpreted with caution.

This explains the paradox in our spread analysis: Outside View achieves 85% reduction in the gap between high and low anchor responses (excellent by traditional metrics) while simultaneously moving responses *further* from baseline truth (poor calibration).

The model isn't debiased; it's re-anchored to its own estimate. If that estimate is accurate, this helps. If not—as our data shows—it hurts. The technique trades external anchoring for internal anchoring, with the added risk of IKEA-effect overconfidence in self-generated values.

### Confrontation Techniques (Argue With the Anchor)

**Devil's Advocate** (+2%, p=.327, not significant) asks the model to argue against the anchor value. This keeps the anchor front and center while generating counter-arguments.

The failure is predictable: confrontation requires repeatedly referencing the very number we're trying to escape. Each "the prosecutor's 48-month demand is excessive because..." reinforces the 48-month figure. The model argues against the anchor while simultaneously encoding it more deeply.

## Why Distance Beats Content

A striking finding is that Random Control—irrelevant filler with no debiasing content whatsoever—outperforms techniques designed specifically to counter anchoring bias (Outside View, Devil's Advocate).

This has implications for the debiasing literature. Studies claiming "our technique reduces anchoring by X%" typically compare against unstructured baselines. If irrelevant elaboration achieves comparable effects to purpose-built techniques (Random Control +9% vs Premortem +10%, no significant difference p=.468), reported technique-specific effects may be overestimated.

The practical implication is counterintuitive: **a "think about something unrelated" step may outperform sophisticated debiasing prompts**. The specific content of the intervention matters less than the distance it creates.

## Baseline Convergence vs. Spread Reduction

Traditional anchoring studies measure spread reduction: the difference between high-anchor and low-anchor responses. A technique that makes responses identical regardless of anchor appears perfectly effective.

We argue this metric can produce misleading results for debiasing evaluation. It conflates two very different outcomes:

1. **Baseline convergence**: Responses converge toward the model's unanchored judgment
2. **Re-anchoring**: Responses converge toward a replacement anchor

Outside View achieves #2, not #1. Spread reduction looks excellent (85%) while baseline convergence worsens (22%). The model isn't less biased; it's biased toward a different number.

**Baseline convergence** (|response - unanchored_baseline|) measures how close a debiased response comes to what the model would say without any anchor exposure. This is not "ground truth" in an absolute sense—the unanchored response is simply the model's unprompted judgment. However, it provides a meaningful reference point: if debiasing techniques move responses *away* from what the model would naturally conclude, they may be introducing new biases rather than removing old ones.

We recommend baseline convergence as the primary metric for debiasing evaluation. Spread reduction, while intuitive, can give misleading results when a technique overcorrects.

## Model-Specific Effects

Our data reveals substantial model variation that challenges "one-size-fits-all" debiasing recommendations:

- **Full SACD shows the strongest aggregate effect** (+24%, p<.001, d=0.41), with significant improvement in 5/10 models after Bonferroni correction, no significant effect in 4/10 (including o4-mini), and significant *worsening* in 1 model (Opus 4.6)
- **No technique universally succeeds** across all models tested
- **Temperature effects are inconsistent**, with no clear "optimal temperature for debiasing"

This heterogeneity likely reflects differences in training data, RLHF procedures, and architectural choices. A technique calibrated on GPT-4 may fail on Claude, and vice versa.

## Practical Recommendations

Based on our findings, we offer the following guidance for practitioners:

1. **Prefer distance over content**: When debiasing matters, add reasoning steps between anchor exposure and decision. The specific content is less important than the distance created.

2. **Avoid replacement prompts**: Techniques asking for base rates or alternative estimates risk re-anchoring. If you must use Outside View, treat the generated estimate with the same skepticism as the original anchor.

3. **Don't confront anchors directly**: Arguing against a number keeps it salient. If critique is necessary, focus on process rather than values.

4. **Test on your specific model**: Debiasing effectiveness varies substantially across models. Validate techniques on your target architecture before deployment.

5. **Measure calibration**: Distance from baseline truth is what matters. Spread reduction can mask overcorrection and give a false sense of effectiveness.

## Limitations

**Single-paradigm constraint.** Our study uses a single experimental paradigm (judicial sentencing from Englich et al.) which may not generalize to all anchoring contexts. The specific characteristics of legal reasoning—normative constraints, precedent considerations, jurisdictional variation—may interact with debiasing techniques differently than other domains (e.g., numerical estimation, probability judgment, negotiation). Future work should replicate these findings across multiple anchoring paradigms before drawing broad conclusions about "LLM debiasing" in general.

**Model coverage.** We tested 10 models representing major providers and architectures as of February 2026. The space of models is vast and rapidly evolving. Our taxonomy may require revision as new model families emerge, particularly as reasoning-focused models (like o3) show distinct vulnerability patterns.

**Baseline interpretation.** Our "baseline convergence" metric measures distance from the model's unanchored response, not from any external ground truth. The unanchored response is simply what the model would say without anchor exposure—it may itself be biased in ways we don't measure. We do not claim that converging toward baseline produces "correct" answers, only that techniques moving responses *away* from baseline may be introducing new biases rather than removing existing ones.

**Token length confound.** While we control for conversation structure in our Random Control condition, we do not perfectly control for total token count across techniques. Some techniques may benefit from the sheer volume of reasoning tokens rather than their specific content. Future work could include a "matched-length random tokens" control.
