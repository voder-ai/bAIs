# Paper Restructure Proposal: Multi-Domain Primary

## Current Structure (Judicial Primary)

```
1. Introduction
   - 1.1 Two Metrics, Opposite Conclusions
   - 1.2 The Divergence
   - 1.3 Contributions

2. Related Work
   - 2.1 Anchoring Bias in Human Judgment
   - 2.2 Cognitive Biases in LLMs
   - 2.3 Debiasing Techniques
   - 2.4 Evaluation Methodology

3. Methodology
   - 3.1 Evaluation Metrics
   - 3.2 Experimental Design
   - 3.3 Confounds and Limitations

4. Results [JUDICIAL - 14,152 trials, 10 models]
   - 4.1 Baseline Responses
   - 4.2 Metric Divergence
   - 4.3 High-Anchor Responses
   - 4.4 Technique Effectiveness
   - 4.5 Model-Specific Results
   - 4.6 Asymmetry
   - 4.7 Mixed Effects Analysis
   - 4.8 The SACD vs Premortem Tradeoff

5. Multi-Domain Generalization [EXPLORATORY - 6,987 trials, 4 models]
   - 5.1 Domain Comparison
   - 5.2 Key Findings
   - 5.3 Implications

6. Discussion
7. Conclusion
```

---

## Proposed Structure (Multi-Domain Primary)

```
1. Introduction
   - 1.1 The Domain Problem (NEW framing)
   - 1.2 Two Metrics, Opposite Conclusions (kept, reframed)
   - 1.3 Contributions (reordered)

2. Related Work (minimal changes)

3. Methodology
   - 3.1 Evaluation Metrics (same)
   - 3.2 Multi-Domain Design (NEW - bring forward)
       - Domains: judicial (3 vignettes), loan, medical, salary
       - Models: Opus 4.6, Sonnet 4.6, Haiku 4.5, GPT-5.2
   - 3.3 Deep Validation Design (was "Experimental Design")
       - 10 models, 14,152 trials on primary judicial vignette
   - 3.4 Confounds and Limitations

4. Results: Cross-Domain Analysis [PRIMARY - 6,987 trials]
   - 4.1 Domain Comparison (hero section - the heatmap)
   - 4.2 Technique Rankings Vary by Domain
   - 4.3 No Universal "Best Technique"
   - 4.4 Model-Domain Interactions

5. Deep Validation: Judicial Sentencing [SUPPORTING - 14,152 trials]
   - 5.1 Baseline Responses
   - 5.2 Metric Divergence (detailed demonstration)
   - 5.3 Technique Effectiveness at Scale
   - 5.4 Model-Specific Results
   - 5.5 Asymmetry Analysis
   - 5.6 Mixed Effects

6. Discussion
   - 6.1 Why Technique Rankings Vary by Domain (NEW primary)
   - 6.2 The SACD Pattern (kept)
   - 6.3 Practical Recommendations (revised)
   - 6.4 Limitations

7. Conclusion (reframed)
```

---

## Key Changes

### Title Options

- Current: "How Effective Are Debiasing Techniques for LLM Anchoring Bias? A 21,000-Trial Evaluation"
- Option A: "Debiasing Doesn't Generalize: A 21,000-Trial Cross-Domain Analysis of LLM Anchoring Techniques"
- Option B: "No Universal Fix: Domain-Specific Effectiveness of LLM Debiasing Techniques"
- Option C: "Test Per-Domain: Why Debiasing Technique Rankings Vary Across LLM Tasks"

### Abstract Reframe

**Current lead:** "How should we evaluate debiasing techniques?"  
**Proposed lead:** "Should you trust a debiasing technique that worked in one domain to work in another?"

### Hero Finding

**Current:** Metric divergence (susceptibility vs baseline proximity)  
**Proposed:** Domain divergence (no technique dominates across domains)

### Figure 3 (Heatmap) → Figure 1

Currently buried in Section 5, becomes the primary visualization.

---

## Trade-offs

| Aspect                 | Current                            | Proposed                              |
| ---------------------- | ---------------------------------- | ------------------------------------- |
| Trial count in primary | 14,152                             | 6,987                                 |
| Model count in primary | 10                                 | 4                                     |
| Novelty                | Metric methodology                 | Domain generalization                 |
| Practical claim        | "Use MAD alongside susceptibility" | "Test per-domain, not just per-model" |
| Reviewer risk          | "4 models underpowered"            | "4 models represent capability tiers" |

---

## Questions for Atlas

1. Does the new abstract lead work?
2. Do we need to caveat the 4-model limitation more heavily?
3. Should judicial become supplementary or stay in main paper as "deep validation"?
