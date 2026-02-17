# Failure Modes Taxonomy

## Overview

Our cross-model analysis reveals that anchoring bias and debiasing effectiveness are not uniform properties of large language models. Instead, we identify five distinct failure modes that determine how models respond to both anchoring stimuli and debiasing interventions.

## The Five Failure Modes

### 1. Fixed Default (Hermes 405B)

Some models exhibit anchor-agnostic behavior, producing consistent outputs regardless of the anchor value presented. Hermes 405B demonstrates this pattern with a fixed 6-month response across all conditions:

| Condition | Low Anchor (3mo) | High Anchor (9mo) | Effect |
|-----------|------------------|-------------------|--------|
| Baseline | 5.27mo | 4.6mo | -0.67mo |
| 3-turn control | 6mo | 6mo | 0mo |
| Token-matched | 6mo | 6mo | 0mo |

**Implication:** SACD is unnecessary—there is no bias to correct. However, this "fixed default" may itself represent a different form of bias (consistent harshness regardless of case facts).

### 2. Full Susceptibility (GPT-5.2, Opus 4.5, Opus 4.6)

Models with "standard" anchoring bias respond predictably to SACD interventions:

| Model | Baseline Effect | SACD Effect | Reduction |
|-------|-----------------|-------------|-----------|
| GPT-5.2 | 4.40mo | 0.49mo | 89% |
| Opus 4.5 | 2.0mo | 0.0mo | ~100% |
| Opus 4.6 | 1.3mo | -1.13mo | >100% |

**Mechanism:** These models recognize anchors, are influenced by them, and can reflect and correct when prompted. SACD successfully interrupts the anchoring pathway.

### 3. Compliance (MiniMax M2.5, o3-mini)

Compliance models exhibit a distinct pattern: they copy the anchor value exactly rather than being influenced by it in a graduated way.

| Model | Low Anchor → | High Anchor → | Pattern |
|-------|--------------|---------------|---------|
| MiniMax (baseline) | 3.1mo | 9.1mo | Copies anchor |
| MiniMax (SACD) | 3.4mo | 9.1mo | Still copies |
| o3-mini | 3.3mo | 9.1mo | Exact match |

**SACD effectiveness: ~0%**

**Mechanism:** These models skip the "influence" step entirely—they interpret the anchor as an instruction rather than a reference point. SACD cannot correct what was never processed as bias.

### 4. Rationalization (o1)

Reasoning models present a paradoxical failure mode: extended deliberation deepens rather than reduces bias.

| Condition | Low Anchor | High Anchor | Effect |
|-----------|------------|-------------|--------|
| Baseline | 6.5mo | 10.7mo | 4.2mo |
| 3-turn control | 5.0mo | 9.6mo | 4.6mo |
| Token-matched | 3.5mo | 9.1mo | 5.6mo |
| SACD | — | — | +7% worse |

**Mechanism:** o1's chain-of-thought reasoning generates post-hoc justifications for anchor-influenced judgments. The model "reasons" its way to the biased conclusion rather than correcting it. This aligns with findings from arXiv:2503.08679 showing that CoT is not always faithful to the model's actual decision process.

### 5. SACD-Triggered Amplification (Haiku 4.5)

Haiku presents a unique failure mode where SACD intervention triggers an amplification response:

| Condition | Low Anchor | High Anchor | Effect |
|-----------|------------|-------------|--------|
| Baseline | 5.5mo | 7.67mo | 2.17mo |
| 3-turn control | 6mo | 12mo | 6.0mo (3× baseline) |
| SACD (preliminary) | 9.07mo | ~10mo | ~1mo |

**Pattern:** SACD compresses the differential anchoring effect (good) but shifts the entire distribution upward (bad). The model becomes "anchor-blind" but defaults to harsher sentencing.

**Mechanism:** Haiku appears to have a two-layer architecture:
1. Base anchoring layer (SACD can reach this)
2. Amplification layer (triggered by structure/intervention)

SACD successfully reduces differential bias but activates the amplification layer, resulting in uniformly harsher outputs.

## SACD Effectiveness Summary

| Model | SACD Effect | Category |
|-------|-------------|----------|
| Opus 4.5 | 99%↓ | Fully susceptible |
| GPT-5.2 | 89%↓ | Fully susceptible |
| Opus 4.6 | >100%↓ | Fully susceptible |
| Haiku 4.5 | Negative | Amplification trigger |
| MiniMax | ~0%↓ | Compliance (resistant) |
| o3-mini | 0%↓ | Compliance (resistant) |
| o1 | +7%↑ | Rationalization (backfires) |

**Success rate: 3/7 models (43%)**

## Decision Tree for Predicting Model Behavior

```
[Anchoring Present?]
    ├── No → Fixed Default (Hermes)
    │        SACD: Unnecessary
    │
    └── Yes → [Amplification Layer?]
                  ├── Yes → SACD-Triggered Amplification (Haiku)
                  │         SACD: Backfires (shifts distribution up)
                  │
                  └── No → [Processes Anchor as Influence?]
                              ├── No → Compliance (MiniMax, o3-mini)
                              │        SACD: Fails (0% effect)
                              │
                              └── Yes → [Can Reflect & Correct?]
                                          ├── No → Rationalization (o1)
                                          │        SACD: Backfires (+7%)
                                          │
                                          └── Yes → Full Susceptibility
                                                    (GPT-5.2, Opus)
                                                    SACD: Works (89-99%)
```

## Implications

1. **No universal debiasing:** SACD and similar interventions work on only 43% of models tested. Practitioners must validate debiasing effectiveness per model.

2. **Debiasing can backfire:** On Haiku and o1, SACD interventions increase bias or shift distributions in unintended directions. "First, do no harm" applies.

3. **Variance as diagnostic:** High response variance under SACD (as seen in Haiku) indicates partial susceptibility—the intervention "breaks through" inconsistently.

4. **Architecture determines response:** Model capability (size, benchmark performance) does not predict debiasing susceptibility. The underlying bias architecture matters.

5. **Test per model AND per version:** Opus 4.5 vs 4.6 showed opposite architectures (shallow vs deep bias). Version updates can fundamentally change bias behavior.

6. **Test per deployment:** Same API, same model name can yield different behavior depending on deployment infrastructure.

## Provider Variance: A Case Study

Our most striking finding emerged from running identical experiments from two different infrastructures:

### GPT-4o via OpenRouter: Two Deployments, Two Behaviors

| Metric | Mac (Residential IP) | Vultr (Datacenter IP) |
|--------|---------------------|----------------------|
| Low anchor response | 3mo | 6mo |
| High anchor response | 9mo | 11.2mo |
| Anchoring effect | 6mo (artificial) | 5.2mo (real bias) |
| SACD effectiveness | 0% | 26.5% |
| Pattern | Compliance | Weak susceptibility |

**Same API endpoint. Same model name. Same prompt. Different behavior.**

### Implications for Reproducibility

This finding has serious implications for AI safety research:

1. **"GPT-4o" is a label, not a model:** The same API name routes to different underlying models based on infrastructure factors we cannot observe.

2. **Debiasing validation is deployment-specific:** A technique validated from one deployment may not transfer to another—even within the same organization.

3. **Benchmarks on aggregated endpoints are suspect:** Published results on "GPT-4o" may not replicate across different callers.

4. **Required disclosure for reproducibility:**
   - Model name and version
   - API provider
   - Access method (direct/proxy)
   - Source infrastructure (datacenter/residential)
   - Geographic location
   - Timestamp

### The Four-Layer Testing Methodology

Based on our findings, we recommend a four-layer validation approach:

```
1. Test per MODEL (GPT vs Claude vs Llama)
2. Test per VERSION (Opus 4.5 vs 4.6)
3. Test per DEPLOYMENT (datacenter vs residential)
4. Test per ACCESS METHOD (direct API vs proxy)
```

Each layer revealed different behaviors in our study. Skipping any layer risks false confidence in debiasing effectiveness.
