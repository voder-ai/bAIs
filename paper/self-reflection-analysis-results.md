# Self-Reflection Statistical Analysis
Generated: 2026-02-21

## Summary Table

| Model | Anchor | Base | Anchored | Self-Reflection | Δ Anch | Δ Self-Reflection | Debias% |
|-------|--------|------|----------|------|--------|--------|---------|
| gpt-4-1 | LOW 13 | 25.1 | 15.6 | 18.1 | -9.5 | -7.0 | -26% |
| gpt-4-1 | HIGH 38 | 25.1 | 12.0 | 44.3 | -13.1 | +19.2 | -246% |
| gpt-5-2 | LOW 16 | 31.8 | 22.9 | 23.9 | -8.9 | -7.9 | -12% |
| gpt-5-2 | HIGH 48 | 31.8 | 47.8 | 49.1 | +16.0 | +17.3 | -8% |
| o3 | LOW 17 | 33.7 | 25.4 | 28.4 | -8.3 | -5.3 | -37% |
| o3 | HIGH 51 | 33.7 | 38.9 | 45.1 | +5.2 | +11.4 | -119% |
| o4-mini | LOW 18 | 35.7 | 23.8 | 23.3 | -11.9 | -12.4 | +4% |
| o4-mini | HIGH 54 | 35.7 | 31.8 | 46.9 | -3.9 | +11.2 | -387% |
| claude-haiku-4-5 | LOW 15 | 29.1 | 9.5 | 12.7 | -19.6 | -16.4 | -17% |
| claude-haiku-4-5 | HIGH 44 | 29.1 | 12.5 | 25.0 | -16.6 | -4.1 | -75% |
| claude-sonnet-4-6 | LOW 12 | 24.1 | 6.0 | 18.0 | -18.1 | -6.1 | -66% |
| claude-sonnet-4-6 | HIGH 36 | 24.1 | 12.0 | 36.1 | -12.1 | +12.0 | -199% |
| claude-opus-4-6 | LOW 9 | 18.0 | 12.0 | 15.7 | -6.0 | -2.3 | -62% |
| claude-opus-4-6 | HIGH 27 | 18.0 | 12.0 | 30.2 | -6.0 | +12.2 | -304% |
| minimax-m2-5 | LOW 12 | 24.2 | 10.8 | 18.8 | -13.4 | -5.4 | -60% |
| minimax-m2-5 | HIGH 36 | 24.2 | 18.9 | 41.1 | -5.3 | +16.9 | -416% |

## Summary Statistics

- Total conditions analyzed: 16
- Mean debiasing effect: -126.8%
- Self-Reflection improved (positive debiasing): 1/16
- Self-Reflection worsened (negative debiasing): 15/16

## Interpretation

- **Positive %**: Self-Reflection disclosure moved response toward baseline (reduced bias)
- **Negative %**: Self-Reflection disclosure moved response away from baseline (increased bias / backfire)

## Key Finding

Self-Reflection (telling models the anchor was "randomly determined") **backfires** in 15/16 conditions.

This suggests LLMs may exhibit an "ironic process" effect where explicitly mentioning
the anchor causes increased attention to it, resulting in stronger anchoring effects.

### Notable Patterns:

1. **Compression in standard anchoring**: Most models show compression (responses closer to center regardless of anchor direction)
2. **Self-Reflection overcorrection**: After disclosure, models often overcorrect TOWARD the stated anchor
3. **Asymmetric effects**: HIGH anchors show more dramatic backfire effects than LOW anchors
4. **Only o4-mini LOW showed improvement**: +4% debiasing, all others negative
