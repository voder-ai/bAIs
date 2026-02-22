# Results: SACD Model-Dependency and Technique Comparison

## Updated Dataset

We collected **14,220 trials** across 11 models × 8 conditions × 3 temperatures, representing a 3.3× expansion from our initial 4,361-trial analysis.

**Trial Distribution by Condition:**

| Condition             | Trials | Purpose                   |
| --------------------- | ------ | ------------------------- |
| Baseline              | 998    | Unanchored responses      |
| Low-anchor            | 983    | Standard anchoring effect |
| SACD (single-pass)    | 1,616  | Lyu et al. replication    |
| Full SACD (iterative) | 2,112  | Multi-round debiasing     |
| Outside View          | 2,123  | Sibony technique          |
| Premortem             | 2,121  | Sibony technique          |
| Devil's Advocate      | 2,079  | Sibony technique          |
| Random Control        | 2,068  | Structural baseline       |

## Key Finding: Random Control Decomposition

We introduce **Random Control** as a methodological baseline—additional conversation turns with neutral content unrelated to debiasing. This reveals that approximately **50% of observed debiasing effects are attributable to conversation structure alone**, not technique content.

**Decomposition formula:**

```
True Debiasing Effect = Technique Effect − Random Control Effect
```

This decomposition is critical: raw technique deltas overstate effectiveness by conflating structural and content effects.

## Technique Comparison (Adjusted for Random Control)

**Table: Sibony Technique Effectiveness**

| Technique             | Models Improved | Models Backfired | Avg Δ (raw) | Avg Δ (adjusted) |
| --------------------- | --------------- | ---------------- | ----------- | ---------------- |
| Outside View          | 11/11 (100%)    | 0                | -12.7mo     | -6.7mo           |
| Devil's Advocate      | 10/11 (91%)     | 0                | -8.2mo      | -2.2mo           |
| Random Control        | 10/11 (91%)     | 1                | -6.0mo      | — (baseline)     |
| Premortem             | 8/11 (73%)      | 3                | varies      | ~0 to negative   |
| Full SACD (iterative) | 7/11 (64%)      | 4                | varies      | model-dependent  |

**Finding 1: Outside View is the only universally safe technique.** All 11 models improved, with no backfires. Even after adjusting for the Random Control structural effect, Outside View contributes ~6.7 months of genuine content-based debiasing.

**Finding 2: Premortem and SACD share a failure mode.** Both techniques cause 3-4 models to produce _worse_ outcomes than baseline. These techniques may trigger rationalization rather than reconsideration in certain architectures.

## Full SACD (Iterative) Model-Dependency

Iterative SACD—following Lyu et al.'s protocol of multiple debiasing rounds—shows dramatic model-dependency:

**Table: Full SACD Effect by Model**

| Model     | Δ from Baseline | Assessment          |
| --------- | --------------- | ------------------- |
| Haiku 4.5 | **-21.5mo**     | 🔥 Strong debiasing |
| o3        | -11.8mo         | Strong debiasing    |
| o4-mini   | -7.4mo          | Moderate debiasing  |
| MiniMax   | -6.7mo          | Moderate debiasing  |
| GPT-4.1   | -2.7mo          | Weak debiasing      |
| Sonnet    | -1.7mo          | Minimal effect      |
| Kimi      | -1.2mo          | Minimal effect      |
| DeepSeek  | +0.8mo          | Neutral             |
| GPT-5.2   | **+2.7mo**      | ⚠️ Backfire         |
| GLM-5     | +2.8mo          | ⚠️ Backfire         |
| Opus 4.6  | **+4.5mo**      | ⚠️ Backfire         |

**Finding 3: Model capability inversely correlates with SACD effectiveness.** The "cheapest" model (Haiku) shows the strongest debiasing response (-21.5mo), while flagship models (Opus, GPT-5.2) backfire. This contradicts the intuition that more capable models would be more amenable to metacognitive debiasing.

**Finding 4: Reasoning models show mixed responses.** o3 and o4-mini respond well to SACD, but this does not generalize to all reasoning-optimized architectures.

## Premortem Backfire Models

Three models showed increased anchoring effect under Premortem prompting:

| Model    | Premortem Δ | Interpretation                |
| -------- | ----------- | ----------------------------- |
| o3       | +6.9mo      | Rationalization amplification |
| GLM-5    | +5.4mo      | Overthinking trigger          |
| Opus 4.6 | +2.0mo      | Mild backfire                 |

Premortem asks "imagine this decision failed—why?" This may prompt certain models to elaborate justifications for anchor-adherent responses rather than challenge them.

## Temperature Effects on Backfire Models

We examined whether temperature modulates backfire effects:

**Table: Temperature × SACD Interaction**

| Model    | t=0        | t=0.7  | t=1.0      | Best           |
| -------- | ---------- | ------ | ---------- | -------------- |
| GLM-5    | 36.5mo     | 37.0mo | **32.8mo** | t=1.0 (-3.7mo) |
| GPT-5.2  | 40.1mo     | 38.7mo | 38.8mo     | t=0.7 (-1.3mo) |
| Opus 4.6 | **23.5mo** | 25.9mo | 24.1mo     | t=0            |

**Finding 5: Temperature can partially mitigate backfire for some models.** GLM-5 benefits significantly from t=1.0, reducing responses by 3.7 months. However, Opus 4.6 shows _non-monotonic_ behavior where t=0.7 is worst—suggesting an intermediate sampling regime that explores alternatives without escaping the anchor.

**Footnote:** We observe non-monotonic temperature effects in Opus 4.6, with t=0.7 producing worse outcomes than both t=0 and t=1. This suggests an intermediate sampling regime where the model explores alternatives without sufficient variance to overcome anchor-biased priors. Fine-grained temperature analysis is left for future work.

## Practical Guidance

Based on these findings, we recommend a **tiered debiasing approach**:

1. **Always safe:** Outside View ("What typically happens in similar cases?")
2. **Usually safe:** Devil's Advocate ("What arguments oppose this conclusion?")
3. **Use with caution:** Additional conversation turns (structural benefit, no specific content needed)
4. **Model-dependent:** Iterative SACD, Premortem (validate empirically before deployment)

**Critical warning:** Do not apply iterative SACD to Opus 4.6, GPT-5.2, or GLM-5 without empirical validation. These models show backfire effects where debiasing produces _worse_ outcomes than no intervention.

## Figure: Technique Ranking (Random Control Baseline)

[See technique-ranking-figure.py for visualization]

X-axis: Technique
Y-axis: Δ from baseline (months)

- Show Random Control as horizontal reference line
- Color-code: green (improved), red (backfired)
- Error bars: 95% CI across models
