# Methodology

## Evaluation Metrics

We distinguish two evaluation approaches for debiasing techniques:

### Standard Metric: Anchor Susceptibility

The conventional approach compares responses under high vs. low anchor conditions:

$$\text{Susceptibility} = |\bar{R}_{high} - \bar{R}_{low}|$$

A technique "works" if it reduces this gap. This metric answers: *Does the technique reduce the anchor's influence?*

### Our Metric: Baseline Calibration

We collected unanchored baseline responses—model outputs with no anchor present. This enables a second metric:

$$\text{Calibration Error} = |\bar{R}_{technique} - \bar{R}_{baseline}|$$

A technique succeeds if it reduces calibration error relative to the anchored (no-technique) condition:

$$\text{Improved} = |R_{technique} - R_{baseline}| < |R_{anchored} - R_{baseline}|$$

This metric answers: *Does the technique bring the response closer to ground truth?*

### Why Both Metrics Matter

These metrics can diverge. Consider:
- Baseline: 30mo
- High-anchor response: 50mo (calibration error = 20mo)
- Technique response: 12mo (calibration error = 18mo... but overcorrected)

Under susceptibility, the technique "worked" (moved away from anchor). Under calibration, it marginally helped—but a different technique might achieve 28mo (calibration error = 2mo).

## Experimental Design

### Models

We evaluated 10 models across 4 providers:

| Provider | Models |
|----------|--------|
| Anthropic | Claude Haiku 4.5, Sonnet 4.6, Opus 4.6 |
| OpenAI | GPT-4.1, GPT-5.2, o3, o4-mini |
| DeepSeek | DeepSeek-v3.2 |
| Others | Kimi-k2.5, GLM-5, MiniMax-m2.5 |

### Conditions

1. **Baseline**: Sentencing prompt with no anchor
2. **Low anchor**: 3-month anchor in prosecutor demand
3. **High anchor**: 36-60 month anchor in prosecutor demand
4. **Techniques**: Applied to high-anchor condition

### Techniques Evaluated

| Technique | Description |
|-----------|-------------|
| Outside View | "What typically happens in similar cases?" (required jurisdiction context) |
| Devil's Advocate | "Argue against your initial response" |
| Premortem | "Imagine this sentence was overturned—why?" |
| Random Control | Extra conversation turns with neutral content (no debiasing) |
| Full SACD | Iterative self-administered cognitive debiasing (Lyu et al., 2025) |

### Temperature Conditions

Each technique was tested at three temperatures:
- t=0 (deterministic)
- t=0.7 (moderate variance)
- t=1.0 (high variance)

### Trial Counts

- **Total trials**: ~14,100
- **Per model-technique-temperature**: 20-50 trials
- **Baseline trials per model**: 91

## Confounds and Limitations

### Outside View Jurisdiction Context

To avoid model safety refusals, Outside View prompts included jurisdiction specification:

> "In German federal courts, what is the TYPICAL probation sentence..."

This may have introduced a secondary anchor toward German sentencing norms (~12-18 months for probation). Other techniques did not require this modification.

### Prompt Sensitivity

Following standard practice, we used fixed prompts per technique. Prompt wording may affect results; we did not test paraphrase robustness in this study.
