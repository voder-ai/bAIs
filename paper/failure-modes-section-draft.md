# Failure Modes Taxonomy

## Overview

Our cross-model analysis reveals that anchoring bias and debiasing effectiveness are not uniform properties of large language models. Instead, we identify five distinct failure modes that determine how models respond to both anchoring stimuli and debiasing interventions.

## The Five Failure Modes

### 1. Fixed Default (Hermes 405B)

Some models exhibit anchor-agnostic behavior, producing consistent outputs regardless of the anchor value presented. Hermes 405B demonstrates this pattern with a fixed 6-month response across all conditions:

| Condition      | Low Anchor (3mo) | High Anchor (9mo) | Effect  |
| -------------- | ---------------- | ----------------- | ------- |
| Baseline       | 5.27mo           | 4.6mo             | -0.67mo |
| 3-turn control | 6mo              | 6mo               | 0mo     |
| Token-matched  | 6mo              | 6mo               | 0mo     |

**Implication:** SACD is unnecessary—there is no bias to correct. However, this "fixed default" may itself represent a different form of bias (consistent harshness regardless of case facts).

### 2. Full Susceptibility (GPT-5.2, Opus 4.5, Opus 4.6)

Models with "standard" anchoring bias respond predictably to SACD interventions:

| Model    | Baseline Effect | SACD Effect | Reduction |
| -------- | --------------- | ----------- | --------- |
| GPT-5.2  | 4.40mo          | 0.49mo      | 89%       |
| Opus 4.5 | 2.0mo           | 0.0mo       | ~100%     |
| Opus 4.6 | 1.3mo           | -1.13mo     | >100%     |

**Mechanism:** These models recognize anchors, are influenced by them, and can reflect and correct when prompted. SACD successfully interrupts the anchoring pathway.

### 2b. Weak Susceptibility (GPT-4o/Vultr)

Some models show standard anchoring bias but only partial SACD response:

| Condition      | Low Anchor | High Anchor | Effect |
| -------------- | ---------- | ----------- | ------ |
| 3-turn control | 6.00mo     | 11.20mo     | 5.20mo |
| SACD           | 6.00mo     | 9.82mo      | 3.82mo |

**SACD effectiveness: 27%** (5.20mo → 3.82mo)

**Distribution under SACD:** 36% of high-anchor trials debias to 6mo, 64% remain at 12mo. SACD "breaks through" inconsistently.

**Mechanism:** The model shows standard anchoring (distinct from compliance—doesn't copy anchor exactly). SACD partially works but cannot fully overcome the anchor influence. This may represent an intermediate architecture between compliance and full susceptibility.

### 3. Compliance (MiniMax M2.5, o3-mini, GPT-4o/Mac)

Compliance models exhibit a distinct pattern: they copy the anchor value exactly rather than being influenced by it in a graduated way.

| Model              | Low Anchor → | High Anchor → | Pattern       |
| ------------------ | ------------ | ------------- | ------------- |
| MiniMax (baseline) | 3.1mo        | 9.1mo         | Copies anchor |
| MiniMax (SACD)     | 3.4mo        | 9.1mo         | Still copies  |
| o3-mini            | 3.3mo        | 9.1mo         | Exact match   |
| GPT-4o (Mac)       | 3mo          | 9mo           | Exact match   |

**SACD effectiveness: ~0%**

**Mechanism:** These models skip the "influence" step entirely—they interpret the anchor as an instruction rather than a reference point. SACD cannot correct what was never processed as bias.

**Note:** GPT-4o appears in this category only when called from the Mac deployment. The same model via Vultr shows standard anchoring bias (see "Weak Susceptibility" below). This demonstrates that compliance vs susceptibility is not a fixed model property—it can vary by deployment context.

### 4. Rationalization (o1)

Reasoning models present a paradoxical failure mode: extended deliberation deepens rather than reduces bias.

| Condition      | Low Anchor | High Anchor | Effect    |
| -------------- | ---------- | ----------- | --------- |
| Baseline       | 6.5mo      | 10.7mo      | 4.2mo     |
| 3-turn control | 5.0mo      | 9.6mo       | 4.6mo     |
| Token-matched  | 3.5mo      | 9.1mo       | 5.6mo     |
| SACD           | —          | —           | +7% worse |

**Mechanism:** o1's chain-of-thought reasoning generates post-hoc justifications for anchor-influenced judgments. The model "reasons" its way to the biased conclusion rather than correcting it. This aligns with findings from arXiv:2503.08679 showing that CoT is not always faithful to the model's actual decision process.

### 5. Anchor-Blind Escalation (Haiku 4.5)

Haiku presents a unique failure mode where SACD eliminates differential anchoring but shifts the entire distribution upward:

| Condition      | Low Anchor | High Anchor | Effect              |
| -------------- | ---------- | ----------- | ------------------- |
| Baseline       | 5.5mo      | 7.67mo      | 2.17mo              |
| 3-turn control | 6mo        | 12mo        | 6.0mo (3× baseline) |
| Token-matched  | 6mo        | 12mo        | 6.0mo               |
| SACD           | 9.13mo     | 8.35mo      | **-0.78mo**         |

**Pattern:** SACD successfully eliminates differential anchoring (the -0.78mo shows slight reversal). However, both means shift dramatically upward—low anchor rises from 5.5mo to 9.13mo (+66%), high anchor stays elevated.

**Mechanism:** Haiku's architecture appears to have separate:

1. **Differential processing layer** — SACD can interrupt this (reduces anchor effect)
2. **Default severity layer** — SACD cannot reach this, and may even amplify it

The result is a model that becomes "anchor-blind" (no longer responds differentially to low vs high anchors) but defaults to harsher baseline judgments. The debiasing intervention successfully breaks the anchoring pathway while inadvertently escalating the severity baseline.

**Implication:** Eliminating a bias is not the same as eliminating harm. A court model that gives 9 months regardless of prosecution request has no anchoring bias, but may have worse calibration than one that shows some anchoring but centers on more appropriate values.

## SACD Effectiveness Summary

| Model          | SACD Effect            | Category                    |
| -------------- | ---------------------- | --------------------------- |
| Opus 4.5       | 99%↓                   | Fully susceptible           |
| GPT-5.2        | 89%↓                   | Fully susceptible           |
| Opus 4.6       | >100%↓                 | Fully susceptible           |
| GPT-4o (Vultr) | 27%↓                   | Weakly susceptible          |
| Haiku 4.5      | 0% diff, +66% severity | Anchor-blind escalation     |
| MiniMax        | ~0%↓                   | Compliance (resistant)      |
| o3-mini        | 0%↓                    | Compliance (resistant)      |
| o1             | +7%↑                   | Rationalization (backfires) |
| GPT-4o (Mac)   | 0%↓                    | Compliance (resistant)      |

**Success rate: 4/9 deployments (44%)** — counting GPT-4o deployments separately

Note: GPT-4o demonstrates that "model" is insufficient granularity. Same model name shows 0% (compliance) vs 27% (weak susceptibility) depending on deployment.

## Decision Tree for Predicting Model Behavior

```
[Anchoring Present?]
    ├── No → Fixed Default (Hermes)
    │        SACD: Unnecessary
    │
    └── Yes → [Severity Escalation Layer?]
                  ├── Yes → Anchor-Blind Escalation (Haiku)
                  │         SACD: Removes differential but escalates severity
                  │
                  └── No → [Processes Anchor as Influence?]
                              ├── No → Compliance (MiniMax, o3-mini, GPT-4o/Mac)
                              │        SACD: Fails (0% effect)
                              │
                              └── Yes → [Can Reflect & Correct?]
                                          ├── No → Rationalization (o1)
                                          │        SACD: Backfires (+7%)
                                          │
                                          └── Yes → [Strong Correction?]
                                                      ├── Yes → Full Susceptibility
                                                      │         (GPT-5.2, Opus)
                                                      │         SACD: Works (89-99%)
                                                      │
                                                      └── No → Weak Susceptibility
                                                                (GPT-4o/Vultr)
                                                                SACD: Partial (27%)
```

## Implications

1. **No universal debiasing:** SACD and similar interventions work on only 43% of models tested. Practitioners must validate debiasing effectiveness per model.

2. **Debiasing can backfire:** On Haiku and o1, SACD interventions increase bias or shift distributions in unintended directions. "First, do no harm" applies.

3. **Variance as diagnostic:** High response variance under SACD (as seen in Haiku) indicates partial susceptibility—the intervention "breaks through" inconsistently.

4. **Architecture determines response:** Model capability (size, benchmark performance) does not predict debiasing susceptibility. The underlying bias architecture matters.

5. **Test per model AND per version:** Opus 4.5 vs 4.6 showed opposite architectures (shallow vs deep bias). Version updates can fundamentally change bias behavior.

6. **Test per deployment:** Same model name, same API, different behavior across infrastructure. GPT-4o via OpenRouter shows fundamentally different patterns depending on deployment location:

| Deployment           | Low Anchor → | High Anchor → | Anchoring Effect | SACD |
| -------------------- | ------------ | ------------- | ---------------- | ---- |
| Mac (residential IP) | 3mo (copy)   | 9mo (copy)    | 0mo (compliance) | 0%   |
| Vultr (datacenter)   | 6mo          | 11.2mo        | 5.2mo (bias)     | 27%  |

**This is not sampling variance.** The distributions are categorically different: Mac copies anchors exactly (compliance pattern), Vultr shows standard anchoring bias with partial SACD response. The "same" model behaves as two entirely different architectures depending on where the API call originates.

**Possible explanations:**

- Regional model routing (different weights served to different regions)
- IP-based A/B testing or canary deployments
- Rate-limit tiers affecting model selection
- Infrastructure-level caching/approximation

**Implication:** Reproducibility requires specifying not just model name and API provider, but the deployment context. "OpenRouter/GPT-4o" is insufficient—the same identifier returns different models to different callers.
