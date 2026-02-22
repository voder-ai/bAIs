# Results

## Baseline Responses

Unanchored baseline responses varied substantially across models:

| Model | Baseline Mean | Std Dev |
|-------|---------------|---------|
| o4-mini | 35.7mo | — |
| o3 | 33.7mo | — |
| GLM-5 | 31.8mo | — |
| GPT-5.2 | 31.8mo | — |
| Kimi-k2.5 | 30.7mo | — |
| DeepSeek-v3.2 | 29.6mo | — |
| Haiku 4.5 | 29.1mo | — |
| GPT-4.1 | 25.1mo | — |
| Sonnet 4.6 | 24.1mo | — |
| MiniMax-m2.5 | 24.1mo | — |
| Opus 4.6 | 18.0mo | — |

Model baselines range from 18.0mo (Opus) to 35.7mo (o4-mini)—a 17.7mo spread. This variance underscores why calibration to model-specific baselines matters.

## High-Anchor Responses (No Technique)

Under high-anchor conditions without intervention:

| Model | Baseline | Anchored | Calibration Error |
|-------|----------|----------|-------------------|
| GPT-5.2 | 31.8mo | 47.8mo | 16.0mo |
| Haiku 4.5 | 29.1mo | 12.5mo | 16.6mo |
| GLM-5 | 31.8mo | 44.9mo | 13.1mo |
| GPT-4.1 | 25.1mo | 12.0mo | 13.1mo |
| Sonnet 4.6 | 24.1mo | 12.0mo | 12.1mo |
| Kimi-k2.5 | 30.7mo | 19.6mo | 11.1mo |
| DeepSeek-v3.2 | 29.6mo | 22.2mo | 7.5mo |
| Opus 4.6 | 18.0mo | 12.0mo | 6.0mo |
| MiniMax-m2.5 | 24.1mo | 18.9mo | 5.3mo |
| o3 | 33.7mo | 38.9mo | 5.2mo |
| o4-mini | 35.7mo | 31.8mo | 3.9mo |

Two anchor response patterns emerge:
1. **Compression**: Response pulled below baseline (Anthropic models, GPT-4.1)
2. **Inflation**: Response pulled above baseline (GPT-5.2, GLM-5, o3)

## Technique Effectiveness: Calibration Metric

### High-Anchor Conditions

| Technique | Improved | Success Rate |
|-----------|----------|--------------|
| **Random Control** | 10/11 | **91%** |
| **Premortem** | 9/11 | 82% |
| **Full SACD** | 9/11 | 82% |
| Devil's Advocate | 7/11 | 64% |
| Outside View | 4/11 | **36%** |

Random Control—which adds conversation turns without debiasing content—outperforms all content-based techniques.

### Low-Anchor Conditions

| Technique | Improved | Success Rate |
|-----------|----------|--------------|
| **Full SACD** | 11/11 | **100%** |
| **Premortem** | 9/11 | 82% |
| Random Control | 7/11 | 64% |
| Outside View | 5/11 | 45% |
| Devil's Advocate | 4/11 | 36% |

Full SACD achieves perfect calibration under low anchors. Rankings shift between anchor conditions.

## Temperature × Technique Interaction

### High-Anchor Conditions

| Technique | t=0 | t=0.7 | t=1 | Optimal |
|-----------|-----|-------|-----|---------|
| Random Control | **100%** | 80% | 91% | **t=0** |
| Premortem | 70% | **80%** | 64% | t=0.7 |
| Full SACD | 64% | **73%** | 64% | t=0.7 |
| Devil's Advocate | 60% | 60% | 64% | t=1 |
| Outside View | 30% | 30% | 36% | t=1 |

Key findings:
1. **Random Control at t=0 achieves 100% success**—deterministic extra turns are optimal
2. **Self-reflection techniques (SACD, Premortem) prefer t=0.7**—moderate variance aids deliberation
3. **Outside View fails at all temperatures**—the technique itself is flawed, not the sampling

## Comparison: Susceptibility vs. Calibration Metrics

Under the standard susceptibility metric, Outside View appeared to "improve" all models by reducing the high-low gap. Under calibration:

| Metric | Outside View Ranking |
|--------|---------------------|
| Susceptibility (|high - low|) | Best (11/11 "improved") |
| Calibration (|response - baseline|) | **Worst** (4/11 improved) |

This inversion demonstrates why baseline collection matters. Without baselines, we would have concluded Outside View was universally effective.
