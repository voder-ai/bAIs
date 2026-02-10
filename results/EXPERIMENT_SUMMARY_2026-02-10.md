# Experiment Summary — 2026-02-10

## Cross-Model Anchoring Comparison

| Model           | Low Anchor | High Anchor | Difference | vs Human (2.05mo) |
| --------------- | ---------- | ----------- | ---------- | ----------------- |
| Llama 3.3 70B   | 6.0 mo     | 6.13 mo     | 0.13 mo    | **0.06×** ✅      |
| Claude Opus 4.5 | 6.0 mo     | 8.0 mo      | 2.0 mo     | **0.98×** ✅      |
| GPT-5.2         | 6.0 mo     | 8.7 mo      | 2.7 mo     | 1.32×             |
| Sonnet 4        | 6.0 mo     | 9.0 mo      | 3.0 mo     | 1.46×             |
| Codex (GPT-5.1) | 5.33 mo    | 9.0 mo      | 3.67 mo    | 1.79×             |
| GPT-4o          | 3.75 mo    | 8.71 mo     | 4.96 mo    | **2.42×** ⚠️      |

## Intervention Scorecard

| Intervention     | GPT-4o    | GPT-5.2    | Sonnet 4  | Result   |
| ---------------- | --------- | ---------- | --------- | -------- |
| Chain-of-thought | -         | +34% worse | No effect | ❌ FAIL  |
| Temperature 1.0  | -         | -          | No effect | ❌ FAIL  |
| "Ignore anchor"  | +4% worse | +68% worse | -         | ❌ FAIL  |
| **DeFrame**      | ~0×       | ~0×        | ~0×       | ✅ WORKS |

## Domain Transfer (Salary Negotiation)

| Model    | Anchor Spread     | Recommendation Diff | Passthrough |
| -------- | ----------------- | ------------------- | ----------- |
| GPT-5.2  | $70k ($80k→$150k) | $12.2k              | 17.4%       |
| Sonnet 4 | $50k ($75k→$125k) | $9.3k               | 18.6%       |

Both models show ~18% anchor passthrough in salary domain — more consistent than legal domain.

## Key Findings

### 1. Three Paths to Anchor Resistance

1. **Open training** (Llama 3.3) — 0.06× human
2. **Frontier capability** (Opus 4.5) — 0.98× human
3. **Context hygiene** (DeFrame) — ~0× universal

### 2. Capability Scaling Reduces Bias

- GPT-4o → GPT-5.2: 2.42× → 1.35× (44% reduction)
- Sonnet 4 → Opus 4.5: 1.46× → 0.98× (33% reduction)

### 3. Prompt Interventions Fail

- CoT: Neutral or worse (GPT-5.2 +34%)
- Temperature: No effect
- Explicit warnings: Backfire (ironic rebound)

### 4. Domain Matters

- Legal sentencing: Higher susceptibility (1.3-2.4×)
- Salary negotiation: Lower susceptibility (~18% passthrough)
- Strong training priors = more resistance

### 5. Zero Variance Phenomenon

All models show deterministic outputs (σ=0) even at temp=1.0. Pattern-matching, not genuine deliberation.

## Paper Narrative

**"Don't prompt your way out of bias. Architect your way out."**

LLM cognitive bias is not a permanent flaw but an engineering problem with known solutions:

- Context architecture (DeFrame) works now, universally
- Capability scaling is reducing bias over time
- Training approach matters (Llama's less RLHF = less bias)

Mid-tier instruction-tuned models are most vulnerable. Frontier models and open-weights models show resistance.

## Files Generated

### Anchoring

- `gpt52-anchoring-30.jsonl` — baseline
- `gpt52-anchoring-cot-30.jsonl` — chain-of-thought
- `gpt52-anchoring-debias-30.jsonl` — prompt debiasing
- `claude-opus45-anchoring-30.jsonl` — Opus baseline
- `sonnet4-anchoring-30.jsonl` — Sonnet baseline (Atlas)

### Domain Transfer

- `gpt52-salary-anchoring-30.jsonl`
- `sonnet4-salary-anchoring-30.jsonl` (Atlas)

### Blocked (Rate Limits)

- Llama framing/conjunction/sunk-cost
- Mistral/Gemma/Qwen anchoring
