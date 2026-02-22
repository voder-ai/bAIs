# Discussion Section Draft

## Section 6: Discussion

### 6.1 Beyond Anchoring: A Richer Picture of LLM Numeric Processing

Our findings suggest that "anchoring bias in LLMs" is not a unitary phenomenon. When researchers report that "LLMs show anchoring," they may be observing any of three distinct mechanisms—compression, compliance, or true anchoring—each with different implications for deployment and mitigation.

**Compression** suggests that LLMs have learned to moderate responses when numeric context is present, possibly as a safety or calibration heuristic. This could be beneficial (avoiding extreme outputs) or harmful (suppressing appropriate variation).

**Compliance** suggests that some LLMs treat numeric values in prompts as implicit instructions. This has clear implications for prompt engineering: avoid including reference values you don't want echoed.

**True anchoring** is the only mechanism that matches the human cognitive bias literature. Only for these models do traditional debiasing techniques apply.

### 6.2 Implications for AI Safety

The three-mechanism taxonomy has direct implications for AI safety and deployment:

1. **Mechanism identification is prerequisite to intervention.** Deploying SACD or similar debiasing on a compliance model wastes compute. Deploying it on a compression model may increase harm.

2. **"Model" is insufficient specification.** We demonstrated that GPT-4o shows compliance via one deployment path and true anchoring via another. Organizations must test their specific deployment, not rely on general model characterizations.

3. **Debiasing interventions need validation.** The 44% success rate of SACD (4/9 deployments) suggests that debiasing techniques from the human literature do not transfer reliably to LLMs.

### 6.3 Implications for Benchmarking

Current LLM bias benchmarks typically report aggregate "anchoring effects" without distinguishing mechanisms. Our findings suggest:

1. **Include no-anchor controls.** Without this baseline, compression cannot be distinguished from anchoring.

2. **Report response distributions, not just means.** Compliance produces different distributions (bimodal, peaked at anchor values) than true anchoring (unimodal, shifted).

3. **Test multiple deployments.** Same model via different APIs may show different mechanisms.

### 6.4 Limitations

1. **Single domain.** We tested only judicial sentencing. The three mechanisms may distribute differently in other numeric judgment tasks.

2. **Limited no-anchor data.** We have no-anchor controls for only 4 models. Some mechanism assignments are inferred from anchor-condition patterns alone.

3. **Mechanism stability.** We did not test whether mechanisms persist across model updates or prompt variations.

4. **Human comparison.** We did not run human participants on identical tasks, so direct LLM-human comparison is not possible.

### 6.5 Future Work

1. **Expand no-anchor coverage.** Run no-anchor controls for all models to confirm mechanism assignments.

2. **Cross-domain testing.** Test whether the same model shows the same mechanism across judicial, medical, and financial domains.

3. **Mechanism interventions.** Develop debiasing techniques specific to compression (reduce over-moderation) and compliance (break instruction-following pattern).

4. **Training analysis.** Investigate whether mechanism differences arise from training data, RLHF, or architecture.

### 6.6 Conclusion

We set out to test whether prompt-based techniques could reduce anchoring bias in LLMs. What we discovered was more fundamental: "anchoring bias" in LLMs reflects at least three distinct mechanisms, only one of which resembles the human cognitive bias. This finding reframes both the problem and the solution space. Rather than seeking universal debiasing techniques, practitioners should first identify which mechanism their deployment exhibits, then select mechanism-appropriate interventions—or recognize that intervention may be unnecessary or harmful.

---

## Section 7: Practical Guidelines (Decision Tree)

### 7.1 Identifying Your Model's Mechanism

**Step 1:** Run no-anchor control (remove numeric anchor from prompt)

**Step 2:** Compare to anchored conditions

| If no-anchor is...               | And anchored responses are...  | Mechanism is... |
| -------------------------------- | ------------------------------ | --------------- |
| HIGHER than both anchored        | Similar for low and high       | Compression     |
| Between low and high anchored    | Exactly matching anchor values | Compliance      |
| HIGHER than low, LOWER than high | Asymmetrically shifted         | True Anchoring  |
| Any pattern                      | Reversed (high < low)          | Reversal        |

### 7.2 Selecting Interventions

| Mechanism      | Recommended Intervention                                 |
| -------------- | -------------------------------------------------------- |
| Compression    | Avoid multi-turn; consider if moderation is acceptable   |
| Compliance     | Remove numeric anchors from prompts; no debiasing needed |
| True Anchoring | Apply SACD (89-99% effectiveness)                        |
| Reversal       | Investigate; likely idiosyncratic                        |

### 7.3 Deployment Checklist

1. ☐ Run no-anchor control (n=30)
2. ☐ Run low-anchor and high-anchor conditions (n=30 each)
3. ☐ Classify mechanism using decision tree
4. ☐ If True Anchoring, validate SACD effectiveness
5. ☐ Document deployment path (API, region, date) for reproducibility
