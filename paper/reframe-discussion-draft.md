# Reframed Discussion Draft

## Section 5: Discussion

### 5.1 Summary of Findings

We set out to investigate anchoring bias in LLMs and discovered something more nuanced: what appears as "anchoring" actually comprises three distinct mechanisms—compression, compliance, and true anchoring—each with different behavioral signatures, underlying causes, and appropriate interventions.

**Mechanism signatures:**

| Mechanism | No-Anchor → Low | No-Anchor → High | SACD Effect |
|-----------|-----------------|------------------|-------------|
| Compression | ↓↓ (large drop) | ↓ (smaller drop) | 0% or negative |
| Compliance | → anchor exactly | → anchor exactly | 0% |
| True Anchoring | ↓ (toward anchor) | ↑ (toward anchor) | 60-89% reduction |

### 5.2 Implications for AI Safety

**Finding 1: Debiasing is mechanism-dependent.**

The widely-cited SACD technique achieves 89% bias reduction on models exhibiting true anchoring but has zero effect on compliance-mode models and may actually worsen compression-mode responses. This means:

- Practitioners cannot apply debiasing techniques blindly
- Per-model (and per-deployment) validation is required
- Reported debiasing effectiveness from one study may not transfer

**Finding 2: "Bias" is not always bias.**

Compliance-mode responses (copying the anchor exactly) are better understood as instruction-following behavior than cognitive bias. A model that interprets "the prosecutor demands 3 months" as an instruction to output 3 months is not exhibiting anchoring—it's being overly literal. The intervention for this is not debiasing but clearer prompt design that distinguishes informational context from instructional commands.

**Finding 3: Provider variance is a deployment concern.**

We documented cases where the same model identifier (GPT-4o) exhibited different mechanisms depending on access path. This implies:

- Model evaluations may not generalize across providers
- Organizations cannot assume third-party benchmarks apply to their deployment
- Continuous monitoring is necessary even for "validated" models

### 5.3 Theoretical Implications

**Rethinking LLM "cognition":**

The existence of three distinct mechanisms suggests LLMs do not have a unified "bias architecture" analogous to human cognition. Instead, numeric context can influence outputs through multiple pathways:

1. **Token probability shifts** (true anchoring): The numeric value shifts attention weights, making nearby numbers more likely
2. **Instruction parsing** (compliance): The demand is parsed as a soft constraint or goal
3. **Distribution compression** (compression): Any numeric context triggers regression toward training distribution mean

These pathways may be differentially active based on model architecture, training data, or even the specific prompt format.

**Implications for bias research:**

Future work on LLM biases should:
1. Test for mechanism type before claiming bias presence
2. Report no-anchor baselines alongside anchored conditions
3. Validate debiasing effectiveness per-mechanism, not aggregate

### 5.4 Limitations

1. **Single domain:** All experiments use judicial sentencing scenarios. Generalization to other numeric judgment domains (medical dosing, financial estimates) requires further testing.

2. **Limited no-anchor data:** Our mechanism taxonomy is based on no-anchor controls for 5 models. Extending this coverage would strengthen the classification.

3. **Mechanism boundaries:** The three mechanisms may represent points on a spectrum rather than discrete categories. Some models may exhibit mixtures.

4. **Temporal stability:** We do not know whether mechanisms are stable over time or shift with model updates.

### 5.5 Recommendations for Practitioners

**Before deploying LLMs in numeric judgment contexts:**

1. **Run a mechanism identification test:**
   - Collect no-anchor baseline (n≥30)
   - Collect low-anchor and high-anchor conditions
   - Compare shift directions to identify mechanism

2. **Match intervention to mechanism:**
   - True anchoring → SACD or similar debiasing
   - Compliance → Prompt engineering (separate context from instruction)
   - Compression → Consider whether compression is actually harmful

3. **Validate per-deployment:**
   - Do not assume provider benchmarks apply
   - Re-test after model updates
   - Monitor for mechanism drift

### 5.6 Conclusion

What we call "anchoring bias" in LLMs is actually a family of phenomena. By distinguishing compression, compliance, and true anchoring, we explain previously puzzling findings—why debiasing works sometimes but not others, why provider variance exists, why model rankings are inconsistent—and provide practitioners with a framework for selecting appropriate interventions. The path to reliable AI judgment is not a single debiasing technique but mechanism-aware deployment practices.

---

## Key Messages

1. **Three mechanisms, not one bias** — The core contribution
2. **Compliance ≠ bias** — Reframes "failure" cases
3. **SACD is mechanism-specific** — Explains the spectrum
4. **Per-deployment validation required** — Practical recommendation
5. **Mechanism-aware deployment** — The new standard
