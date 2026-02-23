# Results

## Trial Overview

We collected **14,324 trials** across 10 models, 5 debiasing techniques, and 3 temperature conditions (0, 0.7, 1.0). All conditions achieved n≥30 trials for statistical reliability.

## Baseline Responses

Unanchored baseline responses varied substantially across models:

- **o4-mini**: 35.7mo (highest)
- **o3**: 33.7mo
- **GLM-5**: 31.9mo
- **GPT-5.2**: 31.8mo
- **Kimi-k2.5**: 30.6mo
- **DeepSeek-v3.2**: 29.6mo
- **Haiku 4.5**: 29.1mo
- **GPT-4.1**: 25.1mo
- **Sonnet 4.6**: 24.1mo
- **Opus 4.6**: 18.0mo (lowest)

Model baselines span 17.7mo—underscoring why convergence to model-specific baselines matters.

## Anchored Response Distances

Without intervention, anchored prompts shift responses away from baseline. Average distance from baseline (no technique): **12.4mo** (95% CI: [12.0, 12.7]).

## Technique Convergence Results

All statistics computed from raw trial data using Welch's t-test with 95% confidence intervals.

### Summary Table

| Technique | n | Mean Distance | 95% CI | Improvement | p-value | Cohen's d |
|-----------|---|---------------|--------|-------------|---------|-----------|
| No technique | 1509 | 12.4mo | [12.0, 12.7] | — | — | — |
| Full SACD | 2391 | 9.4mo | [9.1, 9.8] | +24% | p<.001 | 0.41 (small) |
| Premortem | 2186 | 11.1mo | [10.8, 11.5] | +10% | p<.001 | 0.17 |
| Random Control | 2215 | 11.3mo | [11.0, 11.6] | +9% | p<.001 | 0.15 |
| Devil's Advocate | 2166 | 12.1mo | [11.8, 12.4] | +2% | p=.327 | 0.03 |
| Outside View | 2423 | 15.1mo | [14.8, 15.4] | −22% | p<.001 | −0.38 |

### Primary Finding: Technique Taxonomy

Techniques classified by mechanism:

**Distance techniques** (dilute the anchor):
- Full SACD: **+24%** improvement (p<.001, d=0.41)
- Random Control: **+9%** improvement (p<.001, d=0.15)

**Doubt techniques** (undermine confidence without replacing):
- Premortem: **+10%** improvement (p<.001, d=0.17)

**Confrontation techniques** (argue with anchor):
- Devil's Advocate: **+2%** improvement (**not significant**, p=.327)

**Replacement techniques** (swap anchors):
- Outside View: **−22%** worse convergence (p<.001, d=−0.38)

### Key Insight: Distance Outperforms Confrontation

Random Control—irrelevant elaboration about Arctic terns and Swiss watchmaking—shows comparable effectiveness to Premortem (no significant difference, p=.468) and outperforms Devil's Advocate.

This suggests token distance from the anchor contributes to debiasing effectiveness independently of technique-specific content.

### Pairwise Comparisons

Full SACD significantly outperforms all other techniques:
- vs Premortem: Δ=−1.67mo (p<.001)
- vs Random Control: Δ=−1.84mo (p<.001)
- vs Devil's Advocate: Δ=−2.70mo (p<.001)
- vs Outside View: Δ=−5.64mo (p<.001)

Premortem and Random Control show no significant difference (Δ=0.17mo, p=.468).

## Model-Specific Results

### Full SACD Performance by Model

| Model | Improvement | p-value | Sig |
|-------|-------------|---------|-----|
| o3 | +51% | p<.001 | *** |
| GPT-4.1 | +48% | p<.001 | *** |
| Sonnet 4.6 | +46% | p<.001 | *** |
| DeepSeek-v3.2 | +30% | p<.001 | *** |
| GPT-5.2 | +20% | p=.002 | ** |
| o4-mini | +12% | p=.021 | * |
| Haiku 4.5 | −2% | p=.619 | ns |
| Kimi-k2.5 | −3% | p=.691 | ns |
| GLM-5 | −4% | p=.554 | ns |
| Opus 4.6 | −68% | p<.001 | *** (worse) |

Note: Opus 4.6 shows a significant *worsening* with Full SACD. This model has the lowest baseline susceptibility (6.0mo distance)—SACD may disrupt its natural resistance.

### Models Where Full SACD Significantly Helps (6/10)

o3, GPT-4.1, Sonnet 4.6, DeepSeek-v3.2, GPT-5.2, o4-mini

### Models Where Full SACD Has No Significant Effect (3/10)

Haiku 4.5, Kimi-k2.5, GLM-5

### Model Where Full SACD Significantly Hurts (1/10)

Opus 4.6

## The Convergence vs. Spread Paradox

Outside View exemplifies why spread reduction alone can mislead:

**Spread reduction metric:** 85% (responses more consistent)
**Convergence metric:** −22% (responses further from baseline)

The technique eliminates sensitivity to the *external* anchor by replacing it with an *internal* estimate. Spread decreases because responses converge—but they converge toward the replacement anchor, not the unanchored baseline.

## Temperature Effects

No consistent pattern emerged across models:
- Some models showed improved convergence at higher temperatures
- Others showed degradation
- Full SACD remained the best technique across all temperature conditions

Temperature optimization should be model-specific.
