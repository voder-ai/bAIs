# New Abstract Draft — Three Mechanisms Framing

## Proposed Title Options

1. **"Three Mechanisms of Numeric Context Influence in Large Language Models"**
2. "Beyond Anchoring: How LLMs Process Numeric Context"
3. "Compression, Compliance, and Anchoring: A Taxonomy of LLM Numeric Responses"

**Recommended:** Option 1 — clear, specific, novel

---

## New Abstract (Draft v1)

When LLMs encounter numeric values in prompts, how do they process this context? Testing 15 model deployments on judicial sentencing scenarios (30 trials per condition, n=1,800 total), we discover that "anchoring bias" in LLMs actually reflects **three distinct mechanisms**:

**1. Compression.** Models like Opus 4.5 and Llama 3.3 compress responses toward a middle range regardless of anchor direction. Without any anchor, these models produce sentences of 13–24 months; with ANY anchor (low or high), responses compress to 6–8 months. Both anchors shift responses DOWN from baseline.

**2. Compliance.** Models like MiniMax M2.5, o3-mini, and some GPT-4o deployments copy the anchor value exactly. A 3-month anchor produces a 3-month sentence; a 9-month anchor produces 9 months. This is instruction-following, not cognitive bias.

**3. True Anchoring.** Only GPT-4o (via specific deployments) and GPT-5.2 show classical anchoring-and-adjustment: responses shift asymmetrically toward the anchor value, with low anchors pulling down and high anchors pulling up.

**Implications for debiasing:** This taxonomy explains why SACD (Self-Aware Cognitive Debiasing) works on some models (89–99% reduction for true anchoring) but fails on others (0% for compliance, +66% severity for compression). Debiasing interventions target the wrong mechanism for models that don't show classical anchoring.

**Implications for deployment:** Same model name (GPT-4o) shows different mechanisms depending on deployment context—compliance via residential IP, true anchoring via datacenter. "Model" is insufficient granularity for reproducible LLM research.

**Practical guidance:** (1) Test which mechanism your model exhibits before applying debiasing. (2) For compression models, avoid multi-turn prompts that amplify compression. (3) For compliance models, debiasing is unnecessary but anchors in prompts will be echoed exactly.

---

## Key Changes from Original

| Aspect | Original | New |
|--------|----------|-----|
| Framing | "Can we debias LLM anchoring?" | "What mechanisms underlie LLM numeric responses?" |
| Contribution | Replication + debiasing | Discovery of three mechanisms |
| SACD results | Central finding | Explained by mechanisms |
| Model variance | Limitation | Feature (reveals mechanisms) |
| Narrative | "Here's what works" | "Here's what's happening" |

---

## Suggested Title Change

**FROM:** "Anchoring Bias in LLMs: Debiasing Interventions and Model-Specific Effects"

**TO:** "Three Mechanisms of Numeric Context Influence in Large Language Models"

Or with subtitle: "Three Mechanisms of Numeric Context Influence in LLMs: Compression, Compliance, and Anchoring"
