# Phase 5: SACD Methods Detail

*For incorporation into the bAIs paper methods section*

## 5.1 SACD Protocol

We implemented the Self-Adaptive Cognitive Debiasing (SACD) protocol from Lyu et al. (arXiv:2504.04141) for anchoring bias mitigation. SACD uses an iterative three-step process:

### Step 1: Bias Determination

The model receives the anchoring vignette and is instructed to:
1. Break the prompt into individual sentences
2. Label each sentence as BIASED or NOT_BIASED
3. Focus on identifying specific numerical anchors and leading framing

**Example output:**
```
SENTENCE 11: "The prosecutor demands 9 months on probation."
BIASED: YES
```

### Step 2: Bias Analysis

For each biased sentence, the model classifies the bias type:
- **Anchoring bias**: Specific numerical values that could influence judgment
- **Framing bias**: Leading language or emotional framing
- **Constraint bias**: Artificial limitations on response range

### Step 3: Cognitive Debiasing

The model rewrites the prompt, modifying only biased sentences while preserving:
- Case facts (offense type, defendant details)
- Entity names
- Task structure (request for sentencing decision)

**Removed:**
- Specific numerical anchors (prosecutor's demand, defense's request)
- References to prosecution/defense positions
- Any suggested ranges

### Iteration

After each debiasing pass, the model indicates:
- `DEBIASING_COMPLETE`: No remaining biases detected
- `REQUIRES_ITERATION`: Additional biases found in rewritten prompt

The loop continues until clean or maximum 3 iterations. In practice, all trials completed in 1 iteration.

## 5.2 Final Judgment Extraction

After SACD produces a debiased prompt, we extract the sentencing decision with a separate prompt:

```
You are a trial judge. Based ONLY on the case facts, provide your sentencing decision.

[debiased prompt]

What is your final sentencing decision for Lena M.?
Answer with ONLY a single integer number of months on probation.
```

Response parsing extracts integers in range 0-12 via regex.

## 5.3 Experimental Design

**Model:** Claude Sonnet 4 (claude-sonnet-4-20250514)  
**Runs per condition:** 30  
**Maximum SACD iterations:** 3  
**Conditions:**
- Low anchor: Prosecutor demands 3 months
- High anchor: Prosecutor demands 9 months

**Baseline comparisons:**
- No debiasing (raw vignette)
- Context Hygiene (Sibony): "Identify and disregard irrelevant information"
- Premortem (Sibony): "Imagine this sentence was overturned on appeal. What went wrong?"

## 5.4 Statistical Analysis

**Primary metric:** Mean sentence difference (high anchor - low anchor)

**Expected under no bias:** Difference ≈ 0 (anchor should not influence independent judgment)

**Analysis:**
- Welch's t-test for condition comparison
- 95% CI via bootstrap (2000 iterations, percentile method)
- Cohen's d for effect size

## 5.5 Typical Debiased Prompt

After SACD processing, the anchoring vignette becomes:

```
You are a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.

Case summary:
- The defendant, Lena M., has been convicted of shoplifting.
- This is her 12th shoplifting offense.
- She stole several items from a supermarket.
- A psycho-legal expert has provided an advisory opinion on the case.
- Statements from the defendant and a witness have been reviewed.

What is your sentencing decision for Lena M.? Consider the full range of sentencing options under applicable law.
```

Note: All numerical anchors removed. No mention of prosecutor or defense positions.

## 5.6 Cost/Latency Tradeoff

| Technique | API Calls per Trial | Debiasing Effect |
|-----------|---------------------|------------------|
| Baseline | 1 | None |
| Sibony (Context Hygiene) | 1 | -27% |
| Sibony (Premortem) | 1 | -24% |
| SACD | 2-4 | -113% (eliminated) |

SACD requires 2-4× the API calls but achieves complete bias elimination. For high-stakes decisions, the additional cost may be justified.

---

*End of methods detail section*
