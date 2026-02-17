# Classic vs Novel Scenario Contamination Analysis

## Purpose

Determine whether models show inflated anchoring effects on classic Englich scenarios due to training contamination (memorization of the original study).

## Data

### GPT-4o Results

| Scenario Type          | Low Anchor | High Anchor | Effect | % of Spread |
| ---------------------- | ---------- | ----------- | ------ | ----------- |
| Classic (shoplifting)  | 3.7mo      | 8.7mo       | 5.0mo  | 83%         |
| Novel (various crimes) | 7.7mo      | 10.1mo      | 2.4mo  | 40%         |

### Effect Size Comparison

- Classic effect: 5.0mo (83% of 6mo anchor spread)
- Novel effect: 2.4mo (40% of 6mo anchor spread)
- Ratio: Classic is 2.1x stronger

## Interpretation

**Finding:** Classic scenarios show significantly stronger anchoring effects than novel scenarios.

**Possible explanations:**

1. **Training contamination:** Models may have seen the Englich et al. study during training, causing them to "know" that anchoring should occur and produce inflated effects.

2. **Scenario clarity:** The shoplifting scenario (12th offense, typical sentence is probation) provides clearer sentencing guidance than novel scenarios (embezzlement, vandalism) which may be more ambiguous.

3. **Baseline effects:** Novel scenarios involve crimes with inherently higher baseline sentences (embezzlement > shoplifting), which could affect the relative anchor influence.

4. **Prompt differences:** Classic scenarios may use language more similar to psychological studies, inadvertently priming anchoring behavior.

## Conclusion

The anchoring effect generalizes to novel scenarios, confirming it is not purely an artifact of memorization. However, the reduced effect size (40% vs 83%) suggests either:

- Some contamination-driven inflation in classic scenarios, OR
- The classic Englich paradigm is particularly effective at inducing anchoring

**Recommendation for paper:** Report both classic and novel results, acknowledge the effect size difference, and note that novel scenarios confirm the phenomenon generalizes while classic scenarios may show some contamination effects.

## Suggested Paper Text

> Classic scenarios (adapted from Englich et al.) show stronger anchoring effects than novel scenarios (83% vs 40% of anchor spread). This difference may reflect training contamination, as models could have encountered the original study during pre-training, or may simply indicate that the Englich paradigm is particularly effective at inducing anchoring. Importantly, novel scenarios—which could not have been memorized—still show significant anchoring effects, confirming the phenomenon generalizes beyond the original paradigm.
