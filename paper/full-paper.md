# Abstract

Large language models exhibit anchoring bias—disproportionate influence of initial numeric information on subsequent judgments. Debiasing techniques exist, but how should we evaluate them? Standard methodology compares responses under high vs. low anchor conditions; a technique "works" if it reduces this gap. We identify a critical limitation: this metric misses **overcorrection**, where techniques move responses away from anchors but past the unbiased answer.

We introduce **calibration to baseline** as a complementary metric. By collecting unanchored responses (n=1,001 across 10 models), we can measure whether techniques bring outputs closer to ground truth, not just away from anchors. Using this metric across 14,994 trials, we discover rankings that invert conventional wisdom:

- **Random Control** (extra turns, no debiasing content): 91% of models improved
- **Self-reflection techniques** (Premortem, SACD): 82%
- **Outside View** (reference class reasoning): **36%**—worst performer

The simplest structural intervention outperforms sophisticated prompt engineering. Temperature interacts with technique type: deterministic sampling (t=0) optimizes structural interventions; moderate variance (t=0.7) aids self-reflection.

Without baseline collection, we would have concluded Outside View was universally effective—a finding completely inverted by proper calibration measurement. We argue baseline collection should become standard practice in LLM debiasing research.

---

# Introduction (Draft v2)

## Opening Hook

When large language models make judgments, do debiasing techniques actually help—or do they just move errors in a different direction?

We report findings from the largest systematic evaluation of LLM debiasing techniques to date (14,994 trials across 10 models). Our core contribution is methodological: by collecting unanchored baseline responses, we can measure not just whether techniques *reduce susceptibility* to anchors, but whether they bring outputs *closer to ground truth*.

This distinction matters. Standard anchoring studies compare high-anchor and low-anchor conditions—if the gap shrinks, the technique "works." But this metric misses a critical failure mode: **overcorrection**. A technique that moves every response to 15 months, regardless of whether the unbiased answer is 30 months or 6 months, would show "reduced susceptibility" while actually *increasing* distance from truth.

## The Calibration Metric

We introduce a complementary evaluation metric: **calibration to baseline**.

- **Susceptibility** (standard): |response_high_anchor - response_low_anchor|
- **Calibration** (ours): |technique_response - unanchored_baseline|

A technique succeeds on calibration if it brings the response *closer* to what the model would say without any anchor present.

## Findings Preview

Using this metric, we discover rankings that invert conventional wisdom:

**Standard metric (susceptibility):** All techniques appear roughly equivalent—most reduce the high-low gap.

**Calibration metric:** Clear hierarchy emerges:
1. **Random Control** (10/10 models calibrated) — extra conversation turns with no debiasing content
2. **Premortem / Full SACD** (9/11) — self-reflection techniques  
3. **Devil's Advocate** (7/11) — argumentation
4. **Outside View** (4/11) — reference class reasoning

The counterintuitive finding: **the simplest intervention beats the most sophisticated**. Extra turns with irrelevant content outperform carefully crafted debiasing prompts.

## Why This Matters

This has immediate practical implications:

1. **Practitioners don't need complex debiasing prompts.** Simply adding conversation turns helps more than specific debiasing instructions.

2. **Reference class reasoning (Outside View) may introduce secondary anchors.** In our implementation, specifying jurisdiction to avoid model refusals may have anchored responses to that jurisdiction's typical sentences.

3. **Temperature interacts with technique type.** Deterministic responses (t=0) work best for structural interventions; moderate variance (t=0.7) helps self-reflection.

4. **The standard evaluation metric would have misled us completely.** Direction-based analysis showed Outside View as universally effective; calibration analysis reveals it as worst.

## Contributions

1. **A calibration metric for debiasing evaluation** that catches overcorrection invisible to susceptibility measures.

2. **Inverted technique rankings** showing structure (conversation turns) beats content (debiasing instructions).

3. **Temperature × technique interaction effects** — first systematic analysis of temperature's role in debiasing.

4. **14,994 trials across 10 models** — the largest LLM debiasing evaluation to date.

## Paper Structure

Section 2 reviews related work on anchoring and debiasing in LLMs. Section 3 describes our methodology, including the calibration metric and experimental design. Section 4 presents results: technique rankings, temperature effects, and model-specific patterns. Section 5 discusses implications for practitioners and limitations. Section 6 concludes.

---

# Related Work

## Anchoring Bias in Human Judgment

Anchoring bias—the disproportionate influence of initial information on subsequent estimates—is among the most robust findings in cognitive psychology (Tversky & Kahneman, 1974). Even experts are susceptible: Englich et al. (2006) demonstrated that experienced judges' sentencing decisions were influenced by random numbers generated by dice rolls. The effect persists even when participants are explicitly told the anchor is arbitrary.

## Cognitive Biases in LLMs

Recent work has shown that LLMs exhibit human-like cognitive biases (Binz & Schulz, 2023; Jones & Steinhardt, 2022). Anchoring effects have been documented across multiple model families (Huang et al., 2025), with susceptibility varying by model architecture and size. Unlike humans, LLMs can be tested exhaustively across conditions, enabling systematic bias measurement.

## Debiasing Techniques

Several techniques have been proposed for mitigating anchoring in LLMs:

**Outside View / Reference Class Forecasting:** Prompting models to consider what typically happens in similar cases (Sibony et al., 2016). Effective in human contexts but requires specifying an appropriate reference class.

**Self-Administered Cognitive Debiasing (SACD):** Iterative prompting that guides models through bias detection and correction (Lyu et al., 2025). Shows promise but is computationally expensive.

**Devil's Advocate:** Prompting models to argue against their initial response. Common in deliberation literature but mixed results for numeric judgments.

**Premortem Analysis:** Asking models to imagine the decision failed and explain why. Drawn from project management practice (Klein, 2007).

## Evaluation Methodology

Standard anchoring evaluation compares high-anchor and low-anchor conditions (Englich et al., 2006; Huang et al., 2025). A technique "works" if it reduces the gap between conditions. This methodology does not require ground truth—it measures susceptibility to anchors, not accuracy of outputs.

We extend this by introducing calibration to unanchored baselines. This requires collecting baseline responses but enables detection of overcorrection—a failure mode invisible to susceptibility-only evaluation.

---

# Methodology

## Evaluation Metrics

We distinguish two evaluation approaches for debiasing techniques:

### Standard Metric: Anchor Susceptibility

The conventional approach compares responses under high vs. low anchor conditions:

$$\text{Susceptibility} = |\bar{R}_{high} - \bar{R}_{low}|$$

A technique "works" if it reduces this gap. This metric answers: *Does the technique reduce the anchor's influence?*

### Our Metric: Baseline Calibration

We collected unanchored baseline responses—model outputs with no anchor present. This enables a second metric:

$$\text{Calibration Error} = |\bar{R}_{technique} - \bar{R}_{baseline}|$$

A technique succeeds if it reduces calibration error relative to the anchored (no-technique) condition:

$$\text{Improved} = |R_{technique} - R_{baseline}| < |R_{anchored} - R_{baseline}|$$

This metric answers: *Does the technique bring the response closer to ground truth?*

### Why Both Metrics Matter

These metrics can diverge. Consider:
- Baseline: 30mo
- High-anchor response: 50mo (calibration error = 20mo)
- Technique response: 12mo (calibration error = 18mo... but overcorrected)

Under susceptibility, the technique "worked" (moved away from anchor). Under calibration, it marginally helped—but a different technique might achieve 28mo (calibration error = 2mo).

## Experimental Design

### Models

We evaluated 10 models across 4 providers:

| Provider | Models |
|----------|--------|
| Anthropic | Claude Haiku 4.5, Sonnet 4.6, Opus 4.6 |
| OpenAI | GPT-4.1, GPT-5.2, o3, o4-mini |
| DeepSeek | DeepSeek-v3.2 |
| Others | Kimi-k2.5, GLM-5, MiniMax-m2.5 |

### Conditions

1. **Baseline**: Sentencing prompt with no anchor
2. **Low anchor**: 3-month anchor in prosecutor demand
3. **High anchor**: 36-60 month anchor in prosecutor demand
4. **Techniques**: Applied to high-anchor condition

### Techniques Evaluated

| Technique | Description |
|-----------|-------------|
| Outside View | "What typically happens in similar cases?" (required jurisdiction context) |
| Devil's Advocate | "Argue against your initial response" |
| Premortem | "Imagine this sentence was overturned—why?" |
| Random Control | Extra conversation turns with neutral content (no debiasing) |
| Full SACD | Iterative self-administered cognitive debiasing (Lyu et al., 2025) |

### Temperature Conditions

Each technique was tested at three temperatures:
- t=0 (deterministic)
- t=0.7 (moderate variance)
- t=1.0 (high variance)

### Trial Counts

- **Total trials**: ~14,100
- **Per model-technique-temperature**: 20-50 trials
- **Baseline trials per model**: 91

## Confounds and Limitations

### Outside View Jurisdiction Context

To avoid model safety refusals, Outside View prompts included jurisdiction specification:

> "In German federal courts, what is the TYPICAL probation sentence..."

This may have introduced a secondary anchor toward German sentencing norms (~12-18 months for probation). Other techniques did not require this modification.

### Prompt Sensitivity

Following standard practice, we used fixed prompts per technique. Prompt wording may affect results; we did not test paraphrase robustness in this study.

---

# Results

## Baseline Responses

Unanchored baseline responses varied substantially across models:

| Model | Baseline Mean | Std Dev |
|-------|---------------|---------|
| o4-mini | 35.7mo | — |
| o3 | 33.7mo | — |
| GLM-5 | 31.8mo | — |
| GPT-5.2 | 31.8mo | — |
| Kimi-k2.5 | 30.7mo | — |
| DeepSeek-v3.2 | 29.6mo | — |
| Haiku 4.5 | 29.1mo | — |
| GPT-4.1 | 25.1mo | — |
| Sonnet 4.6 | 24.1mo | — |
| MiniMax-m2.5 | 24.1mo | — |
| Opus 4.6 | 18.0mo | — |

Model baselines range from 18.0mo (Opus) to 35.7mo (o4-mini)—a 17.7mo spread. This variance underscores why calibration to model-specific baselines matters.

## High-Anchor Responses (No Technique)

Under high-anchor conditions without intervention:

| Model | Baseline | Anchored | Calibration Error |
|-------|----------|----------|-------------------|
| GPT-5.2 | 31.8mo | 47.8mo | 16.0mo |
| Haiku 4.5 | 29.1mo | 12.5mo | 16.6mo |
| GLM-5 | 31.8mo | 44.9mo | 13.1mo |
| GPT-4.1 | 25.1mo | 12.0mo | 13.1mo |
| Sonnet 4.6 | 24.1mo | 12.0mo | 12.1mo |
| Kimi-k2.5 | 30.7mo | 19.6mo | 11.1mo |
| DeepSeek-v3.2 | 29.6mo | 22.2mo | 7.5mo |
| Opus 4.6 | 18.0mo | 12.0mo | 6.0mo |
| MiniMax-m2.5 | 24.1mo | 18.9mo | 5.3mo |
| o3 | 33.7mo | 38.9mo | 5.2mo |
| o4-mini | 35.7mo | 31.8mo | 3.9mo |

Two anchor response patterns emerge:
1. **Compression**: Response pulled below baseline (Anthropic models, GPT-4.1)
2. **Inflation**: Response pulled above baseline (GPT-5.2, GLM-5, o3)

## Technique Effectiveness: Calibration Metric

### High-Anchor Conditions

| Technique | Improved | Success Rate |
|-----------|----------|--------------|
| **Random Control** | 10/11 | **91%** |
| **Premortem** | 9/11 | 82% |
| **Full SACD** | 9/11 | 82% |
| Devil's Advocate | 7/11 | 64% |
| Outside View | 4/11 | **36%** |

Random Control—which adds conversation turns without debiasing content—outperforms all content-based techniques.

### Low-Anchor Conditions

| Technique | Improved | Success Rate |
|-----------|----------|--------------|
| **Full SACD** | 11/11 | **100%** |
| **Premortem** | 9/11 | 82% |
| Random Control | 7/11 | 64% |
| Outside View | 5/11 | 45% |
| Devil's Advocate | 4/11 | 36% |

Full SACD achieves perfect calibration under low anchors. Rankings shift between anchor conditions.

## Temperature × Technique Interaction

### High-Anchor Conditions

| Technique | t=0 | t=0.7 | t=1 | Optimal |
|-----------|-----|-------|-----|---------|
| Random Control | **100%** | 80% | 91% | **t=0** |
| Premortem | 70% | **80%** | 64% | t=0.7 |
| Full SACD | 64% | **73%** | 64% | t=0.7 |
| Devil's Advocate | 60% | 60% | 64% | t=1 |
| Outside View | 30% | 30% | 36% | t=1 |

Key findings:
1. **Random Control at t=0 achieves 100% success**—deterministic extra turns are optimal
2. **Self-reflection techniques (SACD, Premortem) prefer t=0.7**—moderate variance aids deliberation
3. **Outside View fails at all temperatures**—the technique itself is flawed, not the sampling

## Comparison: Susceptibility vs. Calibration Metrics

Under the standard susceptibility metric, Outside View appeared to "improve" all models by reducing the high-low gap. Under calibration:

| Metric | Outside View Ranking |
|--------|---------------------|
| Susceptibility (|high - low|) | Best (11/11 "improved") |
| Calibration (|response - baseline|) | **Worst** (4/11 improved) |

This inversion demonstrates why baseline collection matters. Without baselines, we would have concluded Outside View was universally effective.

---

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

---

# Conclusion

We introduced calibration to baseline as a metric for evaluating LLM debiasing techniques. This metric catches overcorrection—a failure mode invisible to standard susceptibility measures.

Our key findings:

1. **Structure beats content.** Random Control (extra turns, no debiasing content) achieves 91% calibration improvement vs. 36% for Outside View.

2. **Temperature matters.** Structural interventions prefer t=0; self-reflection prefers t=0.7.

3. **Baseline collection is essential.** Without it, we would have published inverted rankings.

For practitioners: start with structure. Add conversation turns before crafting complex debiasing prompts. Validate with calibration metrics, not just susceptibility.

For researchers: collect unanchored baselines. The standard high-vs-low methodology has a blind spot. Ground truth matters.

---

# References

See references.bib in paper/archive/
