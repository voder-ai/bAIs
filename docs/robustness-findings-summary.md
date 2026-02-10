# Robustness Testing Results — Summary

## Key Finding: Original Anchoring Effect is NOT Robust

### Original Experiment (Prosecutor Sentencing)

- Sonnet 4: 3 months anchoring effect
- 100% consistency (all 30 trials = identical answer per condition)
- Implied: Strong, reliable anchoring bias

### Prompt Robustness Test (4 paraphrases, n=10 each)

| Paraphrase     | Anchoring Effect | p-value |
| -------------- | ---------------- | ------- |
| Original       | 0.2 mo           | 0.34    |
| Formal         | 0.2 mo           | 0.34    |
| Conversational | 0 mo             | —       |
| Structured     | 0.6 mo           | 0.17    |

**Mean: 0.25 months** — 12× smaller than original!

### Scenario Variants (5 scenarios, n=10 each)

- Only 2/5 showed significant anchoring
- 3/5 showed zero or non-significant effects
- Effect is domain-dependent

## Implications for Paper

1. **Cannot claim "LLMs show 2x human anchoring bias"** — this was prompt-specific
2. **Need to reframe findings** — "Some prompts elicit anchoring, others don't"
3. **This is actually a richer finding** — LLM anchoring is context-dependent, not universal
4. **Temperature findings may also be prompt-specific** — need cross-prompt verification

## Honest Paper Framing

Instead of: "LLMs exhibit strong anchoring bias (3 months, 1.46× human)"

Say: "Anchoring susceptibility varies dramatically with prompt wording (0–3 months) and scenario domain (2/5 significant). The original prosecutor sentencing scenario elicited maximum bias; alternative formulations largely eliminated it."

## What This Means for AI Safety

1. **Prompt injection via anchoring is scenario-specific** — not a universal vulnerability
2. **Debiasing may be as simple as rephrasing** — not needing complex techniques
3. **Robustness testing is essential** — single-prompt experiments can mislead

## Updated Research Questions

1. What features of prompts elicit anchoring susceptibility?
2. Is the "conversational" paraphrase inherently more resistant?
3. Does the prosecutor framing activate specific compliance patterns?
