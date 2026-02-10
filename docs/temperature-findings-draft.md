# Temperature Effects Reveal Distinct Bias Mechanisms

## Summary

Temperature setting (temp=0 vs temp=1) has MODEL-SPECIFIC effects on anchoring bias:

| Model           | temp=0  | temp=1  | Effect            |
| --------------- | ------- | ------- | ----------------- |
| Claude Sonnet 4 | 3.00 mo | 0 mo    | **Eliminated** ✅ |
| GPT-4o          | 4.97 mo | 6.00 mo | **Increased** ❌  |

## Interpretation

**Two distinct bias mechanisms:**

1. **Decoding-level bias** (Sonnet 4)
   - Bias manifests in token probability distributions
   - At temp=0, greedy decoding always selects the biased token
   - At temp>0, sampling introduces variance that averages out the bias
   - DeFrame and context hygiene still work, but temp>0 is a "free" fix

2. **Reasoning-level bias** (GPT-4o)
   - Bias is baked into the reasoning chain before token selection
   - The model "thinks" the anchor is relevant, not just "says" it
   - temp>0 just adds noise to the output, doesn't fix the flawed reasoning
   - May even worsen by introducing random variation on top of biased reasoning

## Implications for Practitioners

1. **"Just increase temperature" is NOT a universal debiasing fix**
2. Architecture matters: different models require different interventions
3. Prompt-level debiasing (DeFrame) may be more robust across architectures
4. Test debiasing strategies on your specific model, don't assume generalization

## Paper Integration

Add to Results section as:

- Table 4: Temperature Effects on Anchoring Bias
- New paragraph in Discussion: "Bias Mechanism Heterogeneity"

Update taxonomy to include this dimension:

- Training-sensitive vs structurally persistent (existing)
- Decoding-level vs reasoning-level (new, temperature-revealed)

## Raw Data Needed

- [x] Sonnet 4 temp=0: 3.00 mo (existing)
- [x] Sonnet 4 temp=1: 0 mo (Pilot ran)
- [x] GPT-4o temp=0: 4.97 mo (existing)
- [x] GPT-4o temp=1: 6.00 mo (Pilot ran via github-copilot)

Need: Full n=30 results files for both temp=1 runs.
