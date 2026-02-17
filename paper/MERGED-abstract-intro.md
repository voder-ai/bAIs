# MERGED Abstract and Introduction (Final Draft)

Combining best elements from Atlas and Pilot drafts.

---

## Title

**"Three Mechanisms of Numeric Context Influence in Large Language Models"**

(Both drafts agree on this title)

---

## Abstract (Merged Final)

How do large language models (LLMs) respond to numeric context in judgment tasks? Prior work assumes LLMs exhibit anchoring bias similar to humans—adjusting estimates toward arbitrary reference points. We find the reality is more complex.

Testing 15 model deployments across 4 providers on judicial sentencing scenarios (n=1,800+ trials), we identify **three distinct mechanisms** by which LLMs respond to numeric context:

1. **Compression**: Models compress responses toward a middle range regardless of anchor direction. Without any anchor, these models produce high sentences (13–24 months); with ANY anchor—high or low—responses compress to 6–8 months. Both anchors shift responses DOWN. (Opus 4.5, Llama 3.3)

2. **Compliance**: Models copy the anchor value exactly, treating numeric context as instruction rather than reference. A 3-month anchor produces 3-month output; 9-month produces 9-month. This resembles "perfect anchoring" but reflects instruction-following, not cognitive bias. (MiniMax, o3-mini, some GPT-4o deployments)

3. **True Anchoring**: Models show asymmetric adjustment toward anchor values, consistent with Tversky-Kahneman anchoring-and-adjustment. Only this mechanism resembles human cognitive bias. (GPT-4o via datacenter, GPT-5.2)

This taxonomy explains previously puzzling findings: why SACD (Self-Aware Cognitive Debiasing) achieves 89–99% reduction on some models but 0% on others. SACD targets true anchoring; it cannot address compliance (nothing to debias) or compression (may amplify severity).

**Critical deployment finding**: The SAME model (GPT-4o) shows different mechanisms depending on access path—compliance via residential IP, true anchoring via datacenter. "Model name" is insufficient granularity for reproducible LLM research.

**Practical implication**: Before applying debiasing, identify which mechanism your deployment exhibits. We provide a decision framework and deployment checklist.

---

## Introduction (Merged Final)

### Section 1: Introduction

When humans encounter numeric values in decision-making contexts, these values can systematically bias subsequent judgments—the anchoring effect (Tversky & Kahneman, 1974). Recent work has demonstrated that large language models (LLMs) also exhibit anchoring effects in various decision tasks (Binz & Schulz, 2023; Jones & Steinhardt, 2022). This has raised concerns about deploying LLMs in high-stakes domains like judicial sentencing, medical diagnosis, and financial forecasting.

But what if "LLM anchoring" is not a single phenomenon?

Prior studies report inconsistent results: debiasing techniques work dramatically on some models while failing completely on others. These inconsistencies are typically treated as noise or attributed to "model-specific effects" without explanation. We propose a different interpretation: **the inconsistency IS the finding**. Different models respond to numeric context through fundamentally different mechanisms.

In this paper, we report a discovery: what researchers measure as "anchoring bias" in LLMs actually reflects **three distinct mechanisms**—compression, compliance, and true anchoring—each with different behavioral signatures and requiring different interventions.

**Compression.** Some models compress responses toward a middle range whenever numeric context is present. Without any anchor, these models produce high values (13–24 months in sentencing tasks); with ANY anchor—high or low—responses compress to a moderate range (6–8 months). Both anchor directions shift responses DOWN from baseline. This is not classical anchoring-and-adjustment.

**Compliance.** Some models treat the anchor as an instruction and copy it exactly. A 3-month anchor produces a 3-month response; a 9-month anchor produces 9 months. This appears as "perfect anchoring" in effect-size calculations but reflects instruction-following rather than cognitive bias.

**True Anchoring.** Only a subset of models show classical Tversky-Kahneman anchoring: responses shift asymmetrically toward the anchor value, with the anchor serving as a starting point for insufficient adjustment.

This taxonomy has immediate practical implications:

- **SACD works on true anchoring (89–99%)** but fails on compliance (0%) and may backfire on compression (+66% severity).
- **The same model shows different mechanisms depending on deployment.** GPT-4o via residential IP shows compliance; GPT-4o via datacenter shows true anchoring.
- **"Model name" is insufficient for reproducibility.** Researchers must specify deployment path, provider, and access method.

### Contributions

1. **A taxonomy of LLM numeric context mechanisms** (Section 3)—we identify and characterize compression, compliance, and true anchoring with distinct behavioral signatures.

2. **Mechanism-dependent debiasing** (Section 4)—we show that SACD effectiveness depends entirely on which mechanism is active, explaining previously puzzling model-specific results.

3. **Deployment-specific variance** (Section 5)—we demonstrate that the SAME model shows different mechanisms depending on deployment context, establishing that "model name" is insufficient granularity.

4. **Practical decision framework** (Section 6)—we provide a protocol for identifying which mechanism a deployment exhibits and selecting appropriate interventions.

Our findings suggest that LLM behavior under numeric context is richer and more varied than the human anchoring analogy implies. Rather than asking "Do LLMs show anchoring like humans?", we should ask "Which mechanism does this deployment exhibit?"

---

## Comparison: Original vs Merged

| Element | Original Paper | Merged Draft |
|---------|---------------|--------------|
| Title | "Anchoring Bias in LLMs: Debiasing Interventions..." | "Three Mechanisms of Numeric Context Influence..." |
| Opening | "Can we debias LLM anchoring?" | "What if LLM anchoring is not a single phenomenon?" |
| Core claim | LLMs show anchoring, SACD helps some | LLMs show 3 mechanisms, explains everything |
| SACD variance | Unexplained model-specific effect | Central finding (mechanism-dependent) |
| Provider variance | Interesting anomaly | Key evidence for taxonomy |
| Structure | Debiasing focus | Discovery focus |
