# Introduction (Draft v2)

## Opening Hook

When large language models make judgments, do debiasing techniques actually help—or do they just move errors in a different direction?

We report findings from the largest systematic evaluation of LLM debiasing techniques to date (14,994 trials across 11 models). Our core contribution is methodological: by collecting unanchored baseline responses, we can measure not just whether techniques *reduce susceptibility* to anchors, but whether they bring outputs *closer to ground truth*.

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
1. **Random Control** (10/11 models calibrated) — extra conversation turns with no debiasing content
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

4. **14,994 trials across 11 models** — the largest LLM debiasing evaluation to date.

## Paper Structure

Section 2 reviews related work on anchoring and debiasing in LLMs. Section 3 describes our methodology, including the calibration metric and experimental design. Section 4 presents results: technique rankings, temperature effects, and model-specific patterns. Section 5 discusses implications for practitioners and limitations. Section 6 concludes.
