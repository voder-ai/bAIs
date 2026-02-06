# SACD Paper Summary

**Paper:** Self-Adaptive Cognitive Debiasing for Large Language Models in Decision-Making  
**Authors:** Yougang Lyu, Shijie Ren, Yue Feng, Zihan Wang, Zhumin Chen, Zhaochun Ren, Maarten de Rijke  
**arXiv:** 2504.04141v4 (Nov 2025)  
**Code:** https://anonymous.4open.science/r/Debias-1732

## Key Contribution

**SACD handles multi-bias settings** — existing methods (like self-help) assume prompts contain only ONE type of bias. Real-world prompts often have multiple interacting biases. SACD's iterative approach addresses this.

## Method: Three-Step Iterative Process

### 1. Bias Determination

- Break prompt into sentences
- Determine if each sentence contains cognitive bias
- Binary classification per sentence: `d_i ∈ {0, 1}`

**Prompt example:**

> "Please first break the prompt into sentence by sentence, and then determine whether it may contain cognitive biases that affect normal decision."

### 2. Bias Analysis

- For flagged sentences, identify bias TYPE(s)
- Multi-label: one sentence can have multiple bias types
- Returns confidence scores

**Prompt example:**

> "The following is a task prompt that may contain cognitive biases. Please analyze what cognitive biases are included in these sentences and provide reasons."

### 3. Cognitive Debiasing

- Rewrite ONLY the biased sentences
- Preserve task semantics, entity names, variables, constraints

**Prompt example:**

> "The following task prompt may contain cognitive biases. Rewrite the prompt according to the bias judgment so that a human is not biased, while retaining the normal task."

### Iteration

- Repeat until: (a) no bias detected, or (b) max iterations reached
- Prevents drift by constraining rewrites to flagged sentences only

## Biases Tested

| Bias              | Description                                  | How Induced                             |
| ----------------- | -------------------------------------------- | --------------------------------------- |
| **Anchoring**     | Over-reliance on first piece of information  | "70% incorrect, 30% correct in dataset" |
| **Bandwagon**     | Following crowd vs independent judgment      | "Most people prefer [wrong answer]"     |
| **Loss Aversion** | Prefer avoiding losses over equivalent gains | "Severe punishments if wrong"           |

## Experimental Setup

**Domains:**

- Finance (FOMC market analysis)
- Healthcare (biomedical QA)
- Legal reasoning

**Models:**

- llama-3.1-8B-instruct
- llama-3.1-70b-instruct
- gpt-3.5-turbo
- gpt-4o

**Settings:**

1. No-bias control
2. Single-bias treatment
3. Multi-bias treatment (multiple biases targeting same wrong answer)

## Results

- SACD achieves **lowest average bias scores** across all settings
- Advanced prompting (CoT, self-refinement) degrades in single/multi-bias settings
- Existing debiasing (self-help) works for single-bias but struggles with multi-bias
- SACD's iterative approach is key to multi-bias success

## Comparison to Our Approach (bAIs Phase 4)

| Aspect         | Our Approach                             | SACD                                               |
| -------------- | ---------------------------------------- | -------------------------------------------------- |
| Debiasing      | Single-pass (context hygiene, premortem) | Iterative (detect → analyze → debias → repeat)     |
| Bias Detection | Implicit (technique applied regardless)  | Explicit (sentence-level determination)            |
| Multi-bias     | Not tested                               | Core contribution                                  |
| Source         | Sibony's decision architecture           | Cognitive psychology literature (Croskerry et al.) |

## Implications for Phase 5

1. **Add explicit bias detection** — Don't just apply debiasing blindly; detect first
2. **Implement iteration** — Repeat until clean or max iterations
3. **Test multi-bias scenarios** — Create prompts with 2-3 interacting biases
4. **Combine approaches** — SACD's structure + our Sibony techniques as the debiasing step

## Potential Hybrid: SACD + Sibony

```
1. Bias Determination (SACD)
2. Bias Analysis (SACD)
3. Cognitive Debiasing (OUR Sibony techniques)
   - Context Hygiene for anchoring
   - Premortem for overconfidence
   - Multiple alternatives for confirmation
4. Repeat until clean
```

This could give us the best of both: SACD's multi-bias handling + empirically-validated Sibony techniques.

## Contact

Lead author: Yougang Lyu (youganglyu@gmail.com)  
Location: Qingdao, China

---

_Summary by Green (Voder test instance), 2026-02-06_
