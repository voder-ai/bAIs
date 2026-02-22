# New Introduction Draft — Three Mechanisms Framing

## Section 1: Introduction

When humans encounter numeric values in decision-making contexts, these values can systematically bias subsequent judgments—a phenomenon known as anchoring (Tversky & Kahneman, 1974). Recent work has demonstrated that large language models (LLMs) also exhibit anchoring effects in various decision tasks (Binz & Schulz, 2023; Jones & Steinhardt, 2022). This has raised concerns about deploying LLMs in high-stakes domains like judicial sentencing, medical diagnosis, and financial forecasting.

But what if "LLM anchoring" is not a single phenomenon?

In this paper, we report a surprising finding: what researchers measure as "anchoring bias" in LLMs actually reflects **three distinct mechanisms** that require different interventions:

1. **Compression.** Some models compress responses toward a middle range whenever numeric context is present. Without any anchor, these models produce high values (13–24 months in sentencing tasks); with ANY anchor—high or low—responses compress to a moderate range (6–8 months). Both anchor directions shift responses DOWN from baseline. This is not classical anchoring-and-adjustment.

2. **Compliance.** Some models (or deployments) treat the anchor as an instruction and copy it exactly. A 3-month anchor produces a 3-month response; a 9-month anchor produces 9 months. This appears as "perfect anchoring" but reflects instruction-following rather than cognitive bias.

3. **True Anchoring.** Only a subset of models show classical Tversky-Kahneman anchoring: responses shift asymmetrically toward the anchor value, with the anchor serving as a starting point for adjustment.

This taxonomy has immediate practical implications. Debiasing interventions like SACD (Self-Aware Cognitive Debiasing; Lyu et al., 2024) work well on models showing true anchoring (89–99% bias reduction) but fail or backfire on models showing compression (0% effect, +66% severity increase) or compliance (0% effect—nothing to debias). The mechanism determines the intervention.

We demonstrate these findings across 15 model deployments spanning 4 providers (Anthropic, OpenAI, Meta, NVIDIA), using judicial sentencing scenarios with controlled anchor conditions. Our key contributions:

1. **A taxonomy of LLM numeric context mechanisms** (Section 3)—we identify and characterize compression, compliance, and true anchoring with distinct behavioral signatures.

2. **Mechanism-dependent debiasing** (Section 4)—we show that SACD effectiveness depends entirely on which mechanism is active, explaining previously puzzling model-specific results.

3. **Deployment-specific variance** (Section 5)—we demonstrate that the SAME model (GPT-4o) shows different mechanisms depending on deployment context, establishing that "model name" is insufficient granularity for reproducible research.

4. **Practical guidelines** (Section 6)—we provide a decision tree for practitioners to identify which mechanism their model exhibits and select appropriate interventions.

Our findings suggest that LLM behavior under numeric context is richer and more varied than the human anchoring analogy implies. Rather than asking "Do LLMs show anchoring like humans?", we should ask "Which mechanism does this deployment exhibit?"

---

## Changes from Original Intro

**Original opening:**

> Recent research has demonstrated that LLMs exhibit cognitive biases such as anchoring, framing effects, and sunk cost fallacy. A natural question follows: can prompt-based techniques reduce these biases in LLMs?

**New opening:**

> When humans encounter numeric values in decision-making contexts... But what if "LLM anchoring" is not a single phenomenon?

**Key shift:** From "Can we fix this?" to "What is actually happening?"

---

## Contributions List (New)

1. Taxonomy of mechanisms
2. Mechanism-dependent debiasing
3. Deployment-specific variance
4. Practical decision tree

(Old contributions focused on debiasing techniques; new contributions focus on understanding mechanisms)
