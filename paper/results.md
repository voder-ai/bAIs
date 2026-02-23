# Results

## Trial Overview

We collected **14,324 trials** across 10 models, 5 techniques, and 3 temperature conditions (0, 0.7, 1.0). All conditions achieved n≥30 trials for statistical reliability.

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

Model baselines span 17.7mo—underscoring why calibration to model-specific baselines matters.

## Anchored Response Distances

Without intervention, anchored prompts shift responses away from baseline:

**Average calibration error (|response - baseline|) by model:**
- Haiku 4.5: 17.9mo (most susceptible)
- Sonnet 4.6: 15.1mo
- DeepSeek-v3.2: 13.2mo
- GPT-5.2: 12.1mo
- GPT-4.1: 11.3mo
- GLM-5: 10.3mo
- Kimi-k2.5: 8.9mo
- o4-mini: 7.9mo
- o3: 6.7mo
- Opus 4.6: 6.0mo (least susceptible)

## Technique Calibration Results

### Primary Finding: Technique Taxonomy

Techniques ranked by calibration improvement (reduction in |response - baseline|):

**Distance techniques** (dilute the anchor):
- Full SACD: **+39%** improvement (10/10 models improved)
- Random Control: **+30%** improvement (8/10 models improved)

**Doubt techniques** (undermine without replacing):
- Premortem: **+22%** improvement (8/10 models improved)

**Confrontation techniques** (argue with anchor):
- Devil's Advocate: **+2%** improvement (5/10 models improved)

**Replacement techniques** (swap anchors):
- Outside View: **-29%** (WORSE calibration, only 3/10 models improved)

### Key Insight: Structure Beats Content

Random Control—irrelevant elaboration about Arctic terns and Swiss watchmaking—outperforms purpose-built debiasing techniques (Devil's Advocate, Outside View).

This suggests ~30% of debiasing "effectiveness" in prior studies may be attributable to structural factors (more reasoning turns, token distance) rather than technique-specific content.

## Model-Specific Results

### Full SACD (Universal Winner)

All 10 models improved:
- Sonnet 4.6: +85%
- DeepSeek-v3.2: +58%
- GPT-4.1: +58%
- o3: +54%
- GLM-5: +28%
- GPT-5.2: +24%
- o4-mini: +21%
- Haiku 4.5: +16%
- Opus 4.6: +12%
- Kimi-k2.5: +10%

### Random Control (8/10 Improved)

Most models improved, but reasoning models showed slight worsening:
- DeepSeek-v3.2: +60%
- GLM-5: +59%
- Kimi-k2.5: +42%
- Opus 4.6: +37%
- GPT-5.2: +34%
- Sonnet 4.6: +28%
- Haiku 4.5: +27%
- GPT-4.1: +8%
- o4-mini: -5%
- o3: -12%

### Outside View (3/10 Improved, 7/10 Worsened)

Dramatic failures on reasoning models:
- Sonnet 4.6: +77%
- Haiku 4.5: +40%
- Opus 4.6: +10%
- GPT-4.1: -3%
- DeepSeek-v3.2: -4%
- GPT-5.2: -64%
- Kimi-k2.5: -78%
- o4-mini: -92%
- GLM-5: -117%
- o3: **-252%** (worst result in study)

## The Calibration vs. Spread Paradox

Outside View exemplifies why spread reduction is a flawed metric:

**Spread reduction metric:** 85% improvement (excellent)
**Calibration metric:** -29% (worse than no intervention)

The technique eliminates sensitivity to the *external* anchor by replacing it with an *internal* estimate. Spread decreases because responses converge—but they converge toward the wrong value.

## Temperature Effects

No consistent pattern emerged across models:
- Some models showed improved calibration at higher temperatures
- Others showed degradation
- Full SACD remained effective across all temperature conditions

Temperature optimization should be model-specific.
