# Reframed Abstract Draft

## Title Options

1. "Three Mechanisms of Numeric Context Influence in Large Language Models"
2. "Beyond Anchoring: How LLMs Process Numeric Demands in Judgment Tasks"
3. "Compression, Compliance, and Anchoring: A Taxonomy of LLM Numeric Bias"

## Abstract (Draft v1)

How do large language models (LLMs) respond to numeric context in judgment tasks? Prior work has assumed LLMs exhibit anchoring bias similar to humans—adjusting estimates toward arbitrary reference points. We find the reality is more complex. Across 10 model deployments and 6,000+ trials using judicial sentencing scenarios, we identify **three distinct mechanisms** by which LLMs respond to prosecutor sentencing demands:

1. **Compression**: Models compress responses toward a middle range regardless of anchor direction (observed in Claude Opus, Llama 3.3)
2. **Compliance**: Models copy the anchor value exactly, treating demands as instructions (observed in GPT-4o via residential IP, MiniMax)
3. **True Anchoring**: Models show asymmetric adjustment toward anchor values, resembling human anchoring bias (observed in GPT-4o via datacenter IP, GPT-5.2)

This taxonomy explains previously puzzling findings: why the same debiasing technique (SACD) achieves 89% bias reduction on some models while having zero effect on others. SACD successfully reduces true anchoring but cannot address compliance or compression, which operate through different cognitive mechanisms.

Our results have implications for AI safety: practitioners cannot assume a single debiasing strategy will generalize across models or even deployments of the same model. The same model accessed via different providers can exhibit entirely different response mechanisms. We provide a decision framework for identifying which mechanism is active and selecting appropriate interventions.

## Key Changes from Original

| Aspect | Original | Reframed |
|--------|----------|----------|
| Core claim | LLMs show anchoring bias | LLMs show 3 distinct mechanisms |
| SACD variance | Unexplained limitation | Central finding (mechanism-dependent) |
| Provider variance | Interesting anomaly | Evidence for mechanism diversity |
| Contribution | Replication + debiasing test | Novel taxonomy + explanatory framework |

## Intro Framing (Key Points)

1. **Hook**: Prior work assumes LLMs anchor like humans. We tested this assumption.

2. **Gap**: Existing studies report inconsistent debiasing results without explaining why.

3. **Contribution**: We identify three distinct mechanisms, explaining the inconsistency.

4. **Preview**: Our taxonomy predicts which interventions will work on which models.

## Discussion Framing (Key Points)

1. **Mechanism identification is prerequisite for debiasing**: You must know which mechanism is active before choosing an intervention.

2. **Compliance is not anchoring**: Models that copy anchors exactly are following instructions, not exhibiting cognitive bias.

3. **Compression may be beneficial**: In some contexts, compressing extreme values toward reasonable ranges could be desirable.

4. **Provider variance is a deployment concern**: The same model name can exhibit different mechanisms based on access path.

5. **Implications for AI safety**: No universal debiasing solution exists; per-deployment validation required.
