# Results

## Overview

We collected 4,361 trials across 11 large language models, examining anchoring susceptibility and the effectiveness of Self-Administered Cognitive Debiasing (SACD). Our results reveal that while all models exhibit anchoring bias, the patterns vary substantially across model families, and debiasing effectiveness is highly model-dependent.

## Phase 1: Baseline Responses

Baseline responses (no anchor) varied substantially across models, ranging from 18.0 months (Claude Opus 4.6) to 35.7 months (o4-mini). Temperature had minimal effect on baseline responses for most models, with standard deviations typically under 3 months across temperature conditions.

**Table 1: Baseline Responses by Model**

| Model             | Mean (mo) | Std | t=0  | t=0.7 | t=1.0 |
| ----------------- | --------- | --- | ---- | ----- | ----- |
| claude-opus-4.6   | 18.0      | 0.0 | 18.0 | 18.0  | 18.0  |
| claude-sonnet-4.6 | 24.1      | 0.2 | 24.0 | 24.0  | 24.4  |
| claude-haiku-4.5  | 29.1      | 3.3 | 33.0 | 26.4  | 28.0  |
| gpt-4.1           | 25.1      | 1.0 | 24.0 | 25.2  | 26.0  |
| gpt-5.2           | 31.8      | 0.8 | 32.4 | 32.1  | 30.8  |
| o3                | 33.7      | 0.6 | 33.0 | 34.0  | 34.0  |
| o4-mini           | 35.7      | 1.2 | 35.2 | 34.8  | 37.2  |
| deepseek-v3.2     | 29.6      | 2.6 | 27.2 | 29.3  | 32.4  |
| kimi-k2.5         | 30.7      | 0.1 | 30.8 | 30.6  | 30.8  |
| glm-5             | 31.8      | 1.8 | 30.4 | 31.1  | 34.0  |
| minimax-m2.5      | 24.2      | 1.5 | 22.4 | 24.9  | 25.3  |

Notable: Claude Opus 4.6 exhibited perfect determinism (σ=0) across all temperature conditions.

## Phase 2: Anchoring Effects

All 11 models demonstrated statistically significant anchoring effects (Cohen's d > 0.5). However, the patterns differed qualitatively:

### Pattern 1: Classic Anchoring (GPT-5.2)

GPT-5.2 exhibited textbook anchoring behavior: low anchors pulled responses down (-8.9 months), while high anchors pulled responses up (+16.0 months).

### Pattern 2: Compression (Claude Opus, Sonnet)

Anthropic models showed a compression pattern, where both low and high anchors produced similar responses clustered around a fixed value (typically 12 months), regardless of anchor direction. This suggests a learned prior that overrides anchor influence.

### Pattern 3: Asymmetric Response (o3)

o3 showed strong susceptibility to low anchors (-8.3 months) but weak response to high anchors (+5.2 months), suggesting asymmetric anchor processing.

**Table 2: Anchoring Effect Sizes (Cohen's d)**

| Model             | Low Anchor Effect | High Anchor Effect | Pattern     |
| ----------------- | ----------------- | ------------------ | ----------- |
| gpt-5.2           | -2.16             | +2.16              | Classic     |
| gpt-4.1           | -3.28             | -1.98\*            | Paradoxical |
| o3                | -1.20             | +0.75              | Asymmetric  |
| o4-mini           | -1.68             | -0.55              | Asymmetric  |
| claude-opus-4.6   | ∞†                | ∞†                 | Compression |
| claude-sonnet-4.6 | -11.96            | -7.96              | Compression |
| claude-haiku-4.5  | -1.61             | -1.08              | Compression |
| deepseek-v3.2     | -1.60             | -0.66              | Asymmetric  |
| kimi-k2.5         | -1.23             | -1.51              | Mixed       |
| glm-5             | -1.87             | +1.48              | Classic     |
| minimax-m2.5      | -1.21             | -0.48              | Asymmetric  |

\*GPT-4.1 showed paradoxical behavior with high anchors pulling responses down.
†Claude Opus 4.6 had zero variance in baseline, making Cohen's d undefined.

## Phase 3: SACD Debiasing Effectiveness

Self-Administered Cognitive Debiasing moved responses toward baseline in 62% of conditions (26/42). However, effectiveness varied dramatically by model.

### Best Responders

**o3** achieved 100% SACD success rate (6/6 conditions improved), with particularly strong effects on high anchors (-14.7 to -11.9 months toward baseline). This suggests reasoning models may be more amenable to metacognitive debiasing.

### Worst Responders

**Claude Haiku 4.5** showed paradoxical SACD effects, with 5/6 conditions moving _away_ from baseline after debiasing. This suggests SACD may be counterproductive for some model architectures.

### Paradoxical Effects

**GPT-4.1** exhibited paradoxical SACD behavior specifically on high anchors: debiasing increased rather than decreased anchor influence (+6-7 months away from baseline).

**Table 3: SACD Debiasing Summary by Model**

| Model             | Conditions Improved | Avg Effect (mo) | Best Responding Anchor |
| ----------------- | ------------------- | --------------- | ---------------------- |
| o3                | 6/6 (100%)          | -10.1           | High                   |
| o4-mini           | 5/6 (83%)           | -6.5            | High                   |
| gpt-5.2           | 4/6 (67%)           | +1.9            | Low                    |
| claude-sonnet-4.6 | 4/6 (67%)           | +2.1            | Low                    |
| claude-opus-4.6   | 3/6 (50%)           | +3.8            | Low                    |
| gpt-4.1           | 3/6 (50%)           | +0.7            | Low                    |
| claude-haiku-4.5  | 1/6 (17%)           | -1.8            | Neither                |

**Average absolute debiasing effect: 4.8 months**

## Temperature Effects

Temperature had minimal impact on anchoring susceptibility for most models. Effect sizes remained consistent across t=0, t=0.7, and t=1.0 conditions, suggesting that anchoring bias is robust to sampling temperature variation.

## Summary

Our findings demonstrate that:

1. **Universal susceptibility**: All tested models exhibit significant anchoring bias
2. **Pattern diversity**: Anchoring manifests differently across model families (classic, compression, asymmetric)
3. **SACD effectiveness varies**: Reasoning models (o3) respond well to debiasing; fast/cheap models (Haiku) may be harmed
4. **Temperature robustness**: Anchoring effects persist across temperature settings

These results have significant implications for deploying LLMs in decision-support contexts, discussed in Section X.
