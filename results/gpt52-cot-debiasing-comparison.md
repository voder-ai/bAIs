# Chain-of-Thought Debiasing Experiment: Anchoring Bias

**Experiment Date:** 2026-02-10  
**Model:** GPT-5.2 (openai-codex/gpt-5.2)  
**Trials:** 30 per condition (60 total)

## Research Question

Does explicit chain-of-thought reasoning ("Think step by step about the appropriate sentence before answering.") reduce anchoring bias in judicial decision-making?

## Results Summary

| Condition             | Baseline (No CoT) | With CoT    | Change           |
| --------------------- | ----------------- | ----------- | ---------------- |
| **Low anchor (3mo)**  | 6.0 months        | 6.0 months  | 0.0              |
| **High anchor (9mo)** | 8.7 months        | 9.63 months | +0.93            |
| **Anchoring effect**  | 2.7 months        | 3.63 months | **+0.93 (+34%)** |
| **vs Human baseline** | 1.32×             | 1.77×       | **+34%**         |

## Key Finding

**❌ Chain-of-thought reasoning INCREASED anchoring bias by 34%**

Instead of reducing the anchoring effect, the explicit reasoning instruction made GPT-5.2 more susceptible to anchor influence.

## Detailed Comparison

### Baseline (No CoT)

- Low anchor: Mean 6.0 (SD 0.0) - all responses exactly 6 months
- High anchor: Mean 8.7 (SD 0.79) - range 8-12 months
- Anchoring effect: 2.7 months (95% CI: 2.47-3.00)
- Effect size: Cohen's d = 4.81, Hedges' g = 4.74
- vs Human: 2.7 / 2.05 = **1.32× human bias**

### With Chain-of-Thought

- Low anchor: Mean 6.0 (SD 0.0) - all responses exactly 6 months
- High anchor: Mean 9.63 (SD 1.35) - range 8-12 months
- Anchoring effect: 3.63 months (95% CI: 3.17-4.13)
- Effect size: Cohen's d = 3.80, Hedges' g = 3.75
- vs Human: 3.63 / 2.05 = **1.77× human bias**

### Human Baseline (Englich et al. 2006)

- Low anchor: Mean 4.0 months
- High anchor: Mean 6.05 months
- Anchoring effect: 2.05 months
- Sample: 39 legal professionals (27 judges, mean 13 years experience)

## Statistical Significance

Both experiments show highly significant anchoring effects (p < 0.001), with very large effect sizes.

The CoT condition shows:

- **Larger mean difference**: 3.63 vs 2.7 months
- **Higher variance in high anchor**: SD 1.35 vs 0.79
- **More extreme responses**: 7 trials at 12 months vs 1 trial at 12 months

## Interpretation

### Why might CoT increase bias?

1. **Post-hoc rationalization**: The model may construct logical-sounding justifications for anchored responses rather than reasoning from first principles
2. **Anchor elaboration**: Explicitly thinking about the anchor gives it more cognitive weight
3. **Confirmation bias**: Reasoning processes may search for evidence supporting the anchored value
4. **Lack of critical evaluation**: CoT doesn't automatically include metacognitive debiasing strategies

### Implications

This result aligns with cognitive science research showing that "thinking more" doesn't automatically reduce bias. In some cases, deliberation can amplify biases through motivated reasoning and post-hoc justification (Kahneman & Frederick, 2002; Wilson & Brekke, 1994).

## Recommendations for Future Experiments

Rather than generic "think step by step," test:

1. **Context hygiene**: Explicitly instruct to ignore the anchor
2. **Consider-the-opposite**: Force evaluation of alternative sentences
3. **Premortem**: Ask "What would make this sentence inappropriate?"
4. **Structured reasoning**: Provide explicit factors to consider (offense severity, recidivism, legal precedent)
5. **Comparative anchors**: Present multiple reference points to dilute single anchor influence

## Files

- Baseline data: `results/gpt52-anchoring-30.jsonl`
- Baseline analysis: `results/gpt52-anchoring-30.jsonl.analysis.json`
- CoT data: `results/gpt52-anchoring-cot-30.jsonl`
- CoT analysis: `results/gpt52-anchoring-cot-30.jsonl.analysis.json`
- CoT report: `results/gpt52-anchoring-cot-30.jsonl.report.md`

## References

Englich, B., Mussweiler, T., & Strack, F. (2006). Playing dice with criminal sentences: The influence of irrelevant anchors on experts' judicial decision making. _Personality and Social Psychology Bulletin, 32_(2), 188–200.

Kahneman, D., & Frederick, S. (2002). Representativeness revisited: Attribute substitution in intuitive judgment. In T. Gilovich, D. Griffin, & D. Kahneman (Eds.), _Heuristics and biases: The psychology of intuitive judgment_ (pp. 49–81). Cambridge University Press.

Wilson, T. D., & Brekke, N. (1994). Mental contamination and mental correction: Unwanted influences on judgments and evaluations. _Psychological Bulletin, 116_(1), 117–142.
