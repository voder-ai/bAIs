# Anchoring Bias Across Models - Summary

## Human Baseline (Englich et al. 2006)

- Low anchor (3mo): 4.0 months
- High anchor (9mo): 6.05 months
- **Anchoring effect: 2.05 months**
- Sample: 39 legal professionals (27 judges, 13 years experience avg)

## GPT-5.2 Results

### Baseline (No Debiasing)

- Low: 6.0, High: 8.7, Effect: **2.7 months (1.32× human)**
- Zero variance in low condition (all exactly 6)
- Effect size: Cohen's d = 4.81

### Chain-of-Thought ("Think step by step...")

- Low: 6.0, High: 9.63, Effect: **3.63 months (1.77× human)**
- Zero variance in low condition (all exactly 6)
- Effect size: Cohen's d = 3.80
- **❌ CoT INCREASED bias by 34%**

## Key Finding

**Chain-of-thought reasoning made anchoring worse, not better.**

The explicit reasoning instruction increased GPT-5.2's anchoring effect from 2.7 to 3.63 months (+34%), moving it further from human performance (1.32× → 1.77× human bias).

This suggests that generic "think step by step" prompts can amplify cognitive biases through post-hoc rationalization rather than critical evaluation.

## Files

- `gpt52-anchoring-30.jsonl` - Baseline
- `gpt52-anchoring-cot-30.jsonl` - Chain-of-thought
- `gpt52-cot-debiasing-comparison.md` - Detailed analysis
