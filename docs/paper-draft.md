# Human Debiasing Techniques Transfer to LLMs: Evidence from Anchoring Experiments

**Draft Paper — bAIs Project**

## Abstract

Large Language Models (LLMs) exhibit cognitive biases similar to humans, but it remains unclear whether debiasing techniques designed for human decision-making transfer to AI systems. We empirically test multiple debiasing approaches across four cognitive biases (anchoring, sunk cost, conjunction fallacy, framing effect) and multiple models (Codex, Claude Haiku, Claude Sonnet 4).

**Key findings:** (1) Model capability reduces some biases — Sonnet 4 shows near-zero anchoring bias (0.2mo diff, p=0.34) while older models show 1.8× human levels. (2) Other biases persist regardless of capability — Sonnet 4 still exhibits classic framing effect (90%→80% preference reversal). (3) Both bias types are addressable: SACD eliminates anchoring (p=0.51), while DeFrame eliminates framing (100% bias reduction).

We propose a taxonomy: **training-eliminable biases** (anchoring, sunk cost) self-correct with model improvements, while **structurally persistent biases** (framing) require explicit debiasing interventions. Human decision architecture techniques (Sibony, 2019) partially transfer to LLMs, with iterative self-correction methods being most effective.

## 1. Introduction

Recent research has demonstrated that LLMs exhibit cognitive biases analogous to those documented in human psychology (Binz & Schulz, 2023; Jones & Steinhardt, 2022). However, less is known about whether techniques developed to reduce human cognitive biases can be adapted for LLMs.

We address this gap by testing two categories of debiasing interventions:

1. **Decision architecture techniques** from organizational psychology (Sibony, 2019) — specifically "context hygiene" (identifying and disregarding irrelevant information) and "premortem" (imagining future failure before deciding)

2. **Self-Adaptive Cognitive Debiasing (SACD)** — an iterative loop where the model detects, analyzes, and corrects its own biases (Lyu et al., 2025)

We use anchoring bias as our test case because:

- It is well-documented in both humans and LLMs
- The Englich et al. (2006) paradigm provides clear quantitative baselines
- Anchoring is practically relevant to AI decision-support systems

## 2. Related Work

### 2.1 Cognitive Biases in LLMs

Binz & Schulz (2023) demonstrated that GPT-3 exhibits many of the cognitive biases documented in Kahneman's work, including anchoring, framing effects, and representativeness heuristics. Malberg et al. (2024) found anchoring bias at 1.7× human levels across multiple models.

### 2.2 Human Debiasing Research

Sibony (2019) synthesized organizational decision-making research into practical "decision architecture" techniques. Key principles include:

- **Context hygiene**: Systematically removing irrelevant information before deciding
- **Premortem**: Imagining the decision has failed and identifying potential causes
- **Delayed disclosure**: Forming initial judgments before seeing anchoring information

### 2.3 LLM Debiasing Attempts

Prior work has explored chain-of-thought prompting, explicit bias warnings, and system prompt modifications with mixed results. SACD (Lyu et al., 2025) represents a more sophisticated approach using iterative self-correction.

## 3. Methods

### 3.1 Experimental Paradigm

We replicate Study 2 from Englich et al. (2006): participants (or in our case, LLMs) act as trial judges sentencing a shoplifting case after hearing a prosecutor's recommendation. The prosecutor's recommendation serves as an irrelevant anchor (3 months vs. 9 months, randomly varied).

**Case vignette**: [Details from original study]

### 3.2 Conditions

1. **Baseline**: Standard prompt with anchor included
2. **Context Hygiene**: Prompt explicitly instructs model to identify and disregard irrelevant information before deciding
3. **Premortem**: Prompt asks model to imagine its sentence was overturned on appeal, identify what went wrong, then provide its recommendation
4. **SACD**: Iterative loop (max 3 iterations):
   - Generate initial response
   - Detect: "Does this response show signs of cognitive bias?"
   - Analyze: "What type of bias and how is it manifesting?"
   - Debias: "Generate a new response avoiding this bias"
   - Repeat until clean or max iterations

### 3.3 Models and Sample Size

- Primary model: Claude Sonnet 4 (anthropic/claude-sonnet-4-20250514)
- Cross-model validation: Claude Haiku, GPT-4o, Gemini 2.0 Flash
- n=30 per condition (low anchor, high anchor) × 4 debiasing conditions = 240 trials

### 3.4 Analysis

- Primary metric: Mean difference in sentencing between high and low anchor conditions
- Statistical tests: Welch's t-test, effect sizes (Cohen's d, Hedges' g)
- Comparisons: vs. human baseline (Englich et al., 2006), vs. no-debiasing baseline

## 4. Results

### 4.1 Baseline Anchoring Bias

Without debiasing interventions, LLMs show anchoring bias at 1.79× human levels:

| Condition            | Low Anchor | High Anchor | Diff    | vs Human |
| -------------------- | ---------- | ----------- | ------- | -------- |
| Human (Englich 2006) | 4.00 mo    | 6.05 mo     | 2.05 mo | —        |
| LLM Baseline         | 5.33 mo    | 9.00 mo     | 3.67 mo | 1.79×    |

### 4.2 Sibony Debiasing Techniques

Both techniques significantly reduce anchoring bias:

| Technique       | Diff    | Reduction vs Baseline | vs Human |
| --------------- | ------- | --------------------- | -------- |
| Context Hygiene | 2.67 mo | -27%                  | 1.30×    |
| Premortem       | 2.80 mo | -24%                  | 1.37×    |

Context hygiene closes ~62% of the gap between LLM and human performance.

### 4.3 SACD Results

SACD essentially eliminates anchoring bias:

| Condition | Low Anchor | High Anchor | Diff     | p-value |
| --------- | ---------- | ----------- | -------- | ------- |
| SACD      | 3.67 mo    | 3.20 mo     | -0.47 mo | 0.51    |

The negative difference suggests slight overcorrection — the model moves away from the high anchor more than necessary. The non-significant p-value indicates no reliable anchoring effect.

### 4.4 Cross-Model Validation

Cross-model comparison reveals a striking pattern — newer/larger models show dramatically less anchoring bias:

| Model           | Release | Anchoring Diff | p-value | vs Human   |
| --------------- | ------- | -------------- | ------- | ---------- |
| Codex (OpenAI)  | 2023    | 3.67 mo        | <0.001  | 1.79× MORE |
| Claude Haiku    | 2024    | 1.80 mo        | <0.001  | 0.88× LESS |
| Claude Sonnet 4 | 2025    | 0.20 mo        | 0.34    | ~0× (none) |
| Human baseline  | —       | 2.05 mo        | <0.05   | —          |

**Key finding:** Sonnet 4 shows essentially no anchoring bias (p=0.34, not significant). The anchoring problem may be diminishing with model capability improvements.

This has important implications:

1. **Debiasing may be less critical for frontier models** — They're already less biased than humans
2. **The bias taxonomy may need revision** — What was "LLMs are 1.8× more biased" is now "latest models are essentially unbiased"
3. **Training advances may implicitly reduce biases** — Even without explicit debiasing, newer models anchor less

### 4.5 Complete Sonnet 4 Bias Profile

Running all four experiments on Claude Sonnet 4 reveals a nuanced pattern:

| Bias Type   | Human Pattern       | Sonnet 4 Result     | Category   |
| ----------- | ------------------- | ------------------- | ---------- |
| Anchoring   | 2.05mo diff         | 0.2mo diff (p=0.34) | ✅ IMMUNE  |
| Sunk Cost   | 85% continue        | 0% continue         | ✅ IMMUNE  |
| Conjunction | 85% wrong           | 0% Linda, 30% Bill  | ⚠️ PARTIAL |
| Framing     | Preference reversal | 90%→80% reversal    | ❌ BIASED  |

**Key finding:** Sonnet 4 is essentially immune to anchoring and sunk cost biases, but still shows the classic framing effect preference reversal.

The conjunction fallacy results suggest training data contamination — the famous "Linda" scenario produces 0% errors (likely memorized), while the obscure "Bill" scenario produces 30% errors.

## 5. Discussion

### 5.1 Human Techniques Transfer to LLMs

Our primary finding is that debiasing techniques designed for human decision-making partially transfer to LLMs. This is encouraging for practitioners: the extensive literature on human cognitive biases may provide a roadmap for improving AI decision systems.

### 5.2 Iterative Self-Correction is Highly Effective

SACD outperforms static prompt interventions by a large margin. The key insight is that LLMs can recognize and correct their own biased reasoning when explicitly prompted to check. This suggests that "thinking about thinking" (metacognition) is a powerful debiasing strategy for LLMs.

### 5.3 Model Size and Bias

Cross-model comparison reveals that anchoring bias decreases with model capability:

| Model           | Release Era | Anchoring Diff | vs Human   |
| --------------- | ----------- | -------------- | ---------- |
| Codex (OpenAI)  | 2023        | 3.67mo         | 1.79× MORE |
| Claude Haiku    | 2024        | 1.80mo         | 0.88× LESS |
| Claude Sonnet 4 | 2025        | 0.20mo         | ~0× (none) |

However, **not all biases follow this pattern**. The framing effect persists even in the most capable models (Sonnet 4 shows 90%→80% preference reversal, similar to humans).

This suggests a taxonomy of LLM biases:

1. **Training-eliminable biases** (anchoring, sunk cost) — diminish with model capability and training improvements
2. **Structurally persistent biases** (framing) — require explicit debiasing interventions regardless of model size
3. **Contamination-dependent biases** (conjunction) — performance varies based on training data exposure to specific scenarios

### 5.4 DeFrame Eliminates Framing Effect

While framing effect persists in Sonnet 4, we tested whether the DeFrame technique (arXiv:2602.04306) could eliminate it. DeFrame exposes the alternative framing before the decision, forcing the model to recognize the logical equivalence.

| Scenario | Frame | Baseline | DeFrame |
|----------|-------|----------|---------|
| Layoffs | Gain | 100% certain | 100% certain |
| Layoffs | Loss | 90% gamble | **100% certain** |
| Pollution | Gain | 100% certain | 100% certain |
| Pollution | Loss | 50% gamble | **100% certain** |

**DeFrame achieves 100% bias reduction** — the preference reversal is completely eliminated. The model now consistently chooses the certain option in both frames, demonstrating that framing effect is debiasable even when model capability alone doesn't eliminate it.

This confirms our taxonomy: some biases require explicit intervention (framing), while others self-correct with capability improvements (anchoring).

### 5.5 Limitations

- Moderate sample sizes (n=10-30 per condition)
- Simplified case vignettes vs original study materials
- Computational cost of SACD/DeFrame (2-3× API calls)
- Cross-model comparison limited to Anthropic + Codex models

## 6. Conclusion

Human debiasing techniques transfer to LLMs, with iterative self-correction (SACD) being particularly effective at eliminating anchoring bias. These findings suggest a practical path for reducing AI decision-making biases through prompt engineering informed by cognitive science.

## References

- Binz, M., & Schulz, E. (2023). Using cognitive psychology to understand GPT-3. PNAS.
- Englich, B., Mussweiler, T., & Strack, F. (2006). Playing dice with criminal sentences. PSPB.
- Lyu, Y., et al. (2025). Self-Adaptive Cognitive Debiasing for LLMs. arXiv:2504.04141.
- Sibony, O. (2019). You're About to Make a Terrible Mistake!
- Tversky, A., & Kahneman, D. (1974). Judgment under uncertainty: Heuristics and biases. Science.

---

**Status**: Draft v2 — Cross-model results complete, DeFrame results complete. Ready for n=30 confirmation runs and author outreach.

**Next steps:**
1. Confirm DeFrame results at n=30 (Green running)
2. Contact Sibony, Strack, Lyu et al. with findings
3. Prepare for arXiv submission
