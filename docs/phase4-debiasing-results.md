# Phase 4: Sibony Debiasing Results

## Summary

**First empirical test of Sibony's decision architecture techniques on LLM anchoring bias.**

Two debiasing techniques from Olivier Sibony's "You're About to Make a Terrible Mistake!" were adapted as prompt engineering interventions and tested against the anchoring experiment from Englich, Mussweiler & Strack (2006).

## Experimental Design

**Base task:** LLM acts as trial judge, provides sentencing recommendation for a shoplifting case after hearing prosecutor's recommendation (the anchor).

**Conditions:** Low anchor (3 months) vs high anchor (9 months), 30 runs per condition.

**Debiasing interventions:**

1. **Context Hygiene** — Instructs the LLM to identify and disregard irrelevant information (like the prosecutor's recommendation) before making its judgment. Based on Sibony's principle of "dropping unnecessary context."

2. **Premortem** — Asks the LLM to imagine its sentencing decision was later overturned on appeal, identify what went wrong, then provide its recommendation. Based on Sibony's "premortem" technique for surfacing hidden assumptions.

## Results

| Condition | Low Anchor Mean | High Anchor Mean | Diff (months) | vs Baseline | vs Human |
|-----------|----------------|-----------------|---------------|-------------|----------|
| **Baseline** (no debiasing) | 5.33 | 9.00 | **3.67** | — | +1.62 (1.79x) |
| **Context Hygiene** | 5.67 | 8.33 | **2.67** | **-27.2%** | +0.62 (1.30x) |
| **Premortem** | 5.30 | 8.10 | **2.80** | **-23.7%** | +0.75 (1.37x) |
| **Human** (Englich 2006) | 4.00 | 6.05 | **2.05** | — | — |

### Statistical Details

**Context Hygiene:**
- Welch's t: t=8.42, df=42.0, p=1.49e-10
- Effect size: Cohen's d=2.17, Hedges' g=2.14
- 95% Bootstrap CI for diff: [2.07, 3.27]

**Premortem:**
- Welch's t: t=8.75, df=49.7, p=1.22e-11
- Effect size: Cohen's d=2.26, Hedges' g=2.23
- 95% Bootstrap CI for diff: [2.17, 3.43]

## Interpretation

1. **Both techniques reduce LLM anchoring bias** — Context hygiene by 27%, premortem by 24%. This is practically significant.

2. **Neither eliminates the bias** — Even with debiasing, LLMs anchor 30-37% more than human judges. The bias is partially structural (training data patterns).

3. **Context hygiene slightly outperforms premortem** — Directly instructing the LLM to identify and disregard irrelevant information is marginally more effective than the indirect premortem approach.

4. **The gap narrows significantly** — Baseline LLM anchoring was 1.79x human; with context hygiene it drops to 1.30x. This means Sibony's techniques close ~62% of the excess bias gap.

## Novel Contribution

To our knowledge, this is the **first empirical test of Sibony's decision architecture techniques on LLM cognitive biases**. Previous work (bAIs, Malberg et al.) demonstrated that LLMs exhibit cognitive biases similar to humans. This work demonstrates that **debiasing techniques designed for humans partially transfer to LLMs** — opening a practical path for reducing AI decision-making bias through prompt engineering.

## Limitations

- Single model (Codex) — cross-model comparison needed
- Single bias type (anchoring) — transfer to other bias types unknown
- Moderate sample size (n=30 per condition)
- Case vignette is simplified vs original study materials
- LLM has no legal training or real-world judicial experience

## Next Steps

1. Cross-model runs (need Anthropic API key + Gemini billing)
2. Test same techniques on framing effect (which also showed bias)
3. Design additional debiasing interventions (delayed disclosure, multiple alternatives)
4. Contact Olivier Sibony with results

## Data

Raw data in `results/codex-{context-hygiene,premortem}-30.jsonl`
Analysis in `results/codex-{context-hygiene,premortem}-30.jsonl.analysis.json`
