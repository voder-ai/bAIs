# Discussion

## Summary of Findings

Our study provides the first comprehensive empirical evidence that large language models exhibit systematic anchoring bias across multiple model families, temperatures, and providers. From 4,345 trials across 11 frontier models, we identify three key findings: (1) all models show some form of anchoring susceptibility, though with qualitatively different patterns; (2) SACD debiasing achieves partial success (62% of conditions) but effectiveness is highly model-dependent; and (3) reasoning-focused models (o3) respond best to debiasing while some models (Haiku) show paradoxical worsening.

## Implications for AI Systems

### Decision Support Applications

The ubiquity of anchoring bias across LLM families has immediate implications for AI-assisted decision-making. In legal, medical, or financial contexts where models may be exposed to numerical anchors—whether through retrieved documents, user inputs, or system prompts—our findings suggest outputs may be systematically biased toward these anchors. The magnitude of effects observed (up to 16 months deviation in sentencing recommendations) represents practically significant bias that could influence real-world decisions.

The finding that anchoring effects persist at temperature=0 is particularly concerning for production deployments that rely on deterministic outputs for consistency. Practitioners cannot simply "turn down creativity" to eliminate this bias.

### Model Selection Guidance

Our taxonomy of anchoring patterns (classic, compression, asymmetric) provides actionable guidance for model selection:

- **Classic anchoring** (GPT-5.2, GLM-5): Models follow anchors bidirectionally. Use SACD or avoid anchor exposure entirely.
- **Compression** (Opus 4.6, Sonnet 4.6): Models collapse to low values regardless of anchor direction. May be safer for high-stakes decisions but produces artificially conservative outputs.
- **Asymmetric** (o3): Strong low-anchor effects, weak high-anchor effects. Reasoning capabilities provide partial protection against upward bias.

### SACD Debiasing in Practice

The 62% success rate of SACD debiasing is encouraging but insufficient for high-stakes applications. The model-dependent effectiveness suggests that debiasing interventions must be validated per-model rather than assumed to generalize. Critically, SACD can make bias worse in some cases (Haiku showed 5/6 conditions worsening), indicating that naive application of "consider this was randomly determined" prompts may backfire.

## Comparison to Human Cognitive Bias

Our findings both confirm and extend the parallel between LLM and human cognitive biases documented by Talboy & Fuller (2024). Like humans, LLMs show:

- **Sensitivity to arbitrary numerical anchors** in judgment tasks
- **Assimilation toward anchors** even when explicitly labeled as random
- **Resistance to simple awareness-based debiasing** (SACD mirrors human "consider the opposite" techniques)

However, we observe patterns not documented in human studies:

- **Compression effects** (Opus/Sonnet): Some models may have learned overcorrection behaviors, potentially from RLHF training discouraging extreme outputs
- **Zero-variance responses**: Several models produced identical outputs across all trials at temperature=0, suggesting deterministic decision rules rather than the probabilistic reasoning humans exhibit
- **Model-specific SACD vulnerability**: The dramatic variation in debiasing effectiveness (o3 succeeds, Haiku fails) has no clear human analog

## Limitations

### Experimental Design

1. **Single paradigm**: We tested only the Englich et al. sentencing task. Anchoring effects in other domains (pricing, estimation, risk assessment) may differ.

2. **Artificial anchor disclosure**: Real-world anchor exposure rarely comes with explicit "randomly determined" labels. Effects may be stronger with implicit anchors.

3. **Limited temperature exploration**: We tested only three temperatures (0, 0.7, 1.0). Finer granularity might reveal nonlinear effects.

4. **SACD as sole debiasing technique**: Other debiasing approaches (chain-of-thought, structured analytic techniques, tool use) were not tested.

### Model Coverage

1. **Open source model incompleteness**: API reliability issues prevented full SACD data collection for deepseek, kimi, and glm models. Our SACD conclusions primarily reflect commercial API models (Anthropic, OpenAI).

2. **Version sensitivity**: Our findings apply to specific model versions tested (e.g., claude-opus-4.6, gpt-5.2). Version updates may change anchoring characteristics.

3. **Provider-specific training**: Observed patterns may reflect provider-specific RLHF or fine-tuning rather than fundamental architectural differences.

### Generalization

1. **English-only**: All prompts were in English. Cross-linguistic anchoring effects are unexplored.

2. **Text-only**: Multimodal anchoring (numerical values in images) was not tested.

3. **Zero-shot only**: Effects under few-shot prompting or fine-tuned models may differ.

## Future Work

### Extended Bias Taxonomy

Future research should systematically test the full catalog of human cognitive biases (confirmation, availability, framing, etc.) across frontier models to build a comprehensive bias profile per model family.

### Robust Debiasing Methods

Given SACD's partial success and occasional backfiring, research into more reliable debiasing methods is urgent. Promising directions include:

- **Structured analytic techniques** adapted for LLMs
- **Tool-augmented reasoning** that externalizes calculations
- **Ensemble approaches** averaging across models with different bias patterns
- **Training-time interventions** if bias patterns prove consistent across versions

### Real-World Impact Measurement

Laboratory findings must be validated in deployment contexts. Do anchoring effects persist when models have access to retrieval, tools, or multi-turn reasoning? How do effects scale with anchor magnitude?

### Version Tracking

Our observation of different bias patterns across model versions (implied by the Opus/Sonnet compression pattern likely reflecting RLHF) suggests ongoing monitoring is needed. A public registry of bias profiles per model version would benefit the research community.

## Conclusion

Anchoring bias in LLMs is real, systematic, and practically significant. While all tested models show susceptibility, the diversity of response patterns—from classic anchoring to compression to asymmetry—demonstrates that bias is not a monolithic phenomenon. SACD debiasing offers partial mitigation but requires per-model validation and can fail catastrophically on some models.

For practitioners deploying LLMs in decision-support contexts, our findings support three recommendations: (1) minimize anchor exposure in prompts and retrieved context; (2) validate debiasing techniques on the specific model version in use; and (3) prefer models with documented bias profiles for high-stakes applications.

The parallels between human and LLM cognitive biases are striking but not perfect. As models continue to evolve through training updates, maintaining current knowledge of their bias characteristics will require ongoing empirical measurement rather than assumptions based on human cognition or prior model versions.
