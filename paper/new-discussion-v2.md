# Discussion (Draft v2)

## Why Structure Beats Content

Our most surprising finding is that Random Control—conversation turns with irrelevant content—outperforms deliberate debiasing techniques. We propose several explanations:

**Hypothesis 1: Attention redistribution.** Additional turns may dilute the anchor's influence by introducing competing context. The model's attention becomes distributed across more tokens, reducing the relative weight of the anchoring value.

**Hypothesis 2: Implicit reconsideration.** Multi-turn format may trigger different inference patterns than single-shot prompts. The model may treat subsequent turns as opportunities to revise rather than defend prior responses.

**Hypothesis 3: Debiasing content backfires.** Explicit debiasing instructions may activate "debiasing theater"—surface compliance without genuine reconsideration. The model produces language about reconsidering while maintaining the same underlying estimate. Structure avoids this because there's nothing to perform.

The temperature findings support Hypothesis 2: Random Control works best at t=0 (deterministic), suggesting the structural effect is robust and doesn't require sampling variance. Self-reflection techniques work best at t=0.7, suggesting they benefit from some exploration during the deliberation process.

## The Outside View Confound

Outside View performed worst despite being recommended in human debiasing literature (Sibony, Kahneman). Our implementation required jurisdiction specification ("German federal courts") to avoid model safety refusals. This may have introduced a secondary anchor:

- German probation for repeat shoplifting: ~12-18 months
- Our unanchored baselines: 18-36 months (model-dependent)
- Outside View consistently pulled toward ~15 months

The technique may be working exactly as designed—retrieving reference class statistics—but for the wrong reference class. This is a methodological limitation, not evidence that Outside View is inherently flawed.

**Implication for practitioners:** When using Outside View, ensure the reference class matches your actual decision context. Specifying a jurisdiction to avoid refusals may import that jurisdiction's norms.

## Calibration vs Susceptibility

We argue both metrics are valuable but measure different things:

**Susceptibility** answers: "Is this model influenced by arbitrary numeric context?"
- Useful for detecting vulnerability
- Doesn't require ground truth
- Standard in anchoring literature

**Calibration** answers: "Does this technique bring responses closer to the unbiased answer?"
- Useful for evaluating interventions
- Requires baseline collection
- Our proposed addition

A technique could reduce susceptibility (good) while worsening calibration (bad). This happens when the technique has an implicit prior that differs from ground truth. In our data, Outside View appears to have an implicit prior around 15 months, which "fixes" high anchors but "breaks" models whose baselines are 25+ months.

## Limitations

1. **Single domain.** All experiments use judicial sentencing. Results may not generalize to medical, financial, or other decision domains.

2. **Outside View confound.** We cannot fully disentangle technique failure from implementation choice (jurisdiction specification).

3. **Baseline validity.** Our "unanchored" baseline still includes numeric context ("12th offense"). GPT-4o showed halved baseline when "12th" was removed. Baselines may not represent true unbiased judgments.

4. **Model coverage.** 10 models from 4 providers is substantial but not exhaustive. Newer models may show different patterns.

5. **Temperature coverage.** We tested t=0, 0.7, 1.0. Intermediate values may reveal non-linear effects.

## Practical Recommendations

Based on our findings:

1. **Start with structure, not content.** Adding conversation turns is simpler and more effective than crafting debiasing prompts.

2. **Match temperature to technique.** Use t=0 for structural interventions, t=0.7 for self-reflection.

3. **Validate with calibration metric.** Don't just measure whether the technique reduces susceptibility—measure whether outputs land closer to unbiased baseline.

4. **Check reference class alignment.** If using Outside View, ensure the reference class matches your actual context.

5. **Test per-model.** Technique effectiveness varies substantially across models. Validate on your specific deployment.

## Future Work

1. **Cross-domain validation.** Test whether Random Control superiority holds in medical, financial, and other judgment domains.

2. **Outside View without jurisdiction.** Develop prompting strategies that elicit reference class reasoning without specifying jurisdiction.

3. **Mechanism investigation.** Why do additional turns help? Attention analysis or probing studies could reveal underlying mechanisms.

4. **Hybrid approaches.** Can structure + content be combined? Does Random Control + SACD outperform either alone?

5. **Real-world deployment.** Do these findings transfer to production LLM systems with safety wrappers, RLHF, and other modifications?
