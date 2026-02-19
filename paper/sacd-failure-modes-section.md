# SACD Failure Mode Taxonomy — Draft Section 4.X

## 4.X Self-Administered Cognitive Debiasing (SACD)

Self-Administered Cognitive Debiasing (SACD) is a multi-turn prompting technique where the model first identifies cognitive biases in a decision prompt, analyzes the biased elements, rewrites the prompt to remove bias, and then makes a judgment on the debiased version. We tested SACD at symmetric high anchors (2×baseline − 3) across eight models to evaluate whether this technique reliably mitigates anchoring bias.

### 4.X.1 Results

Table X presents SACD debiasing effectiveness across model families.

| Model | Family | SACD Mean | Baseline | Anchor | Debiasing Effect |
|-------|--------|-----------|----------|--------|------------------|
| Opus 4.5 | Anthropic | 23.6mo | 22mo | 43mo | +100% (baseline) |
| Opus 4.6 | Anthropic | 18.0mo | 18mo | 33mo | +100% (baseline) |
| Sonnet 4.5 | Anthropic | 26.6mo | 22mo | 43mo | +81% (partial) |
| Haiku 4.5 | Anthropic | 26.7mo | 34mo | 67mo | −22% (over-correct) |
| Hermes 405B | Open | 15.3mo | 12mo | 21mo | +63% (partial) |
| o3-mini | OpenAI | 21.45mo | 12mo | 21mo | 0% (no effect) |
| GPT-4o | OpenAI | 6.9mo | 24mo | 45mo | −71% (catastrophic) |
| GPT-5.2 | OpenAI | 2.5mo | 24mo | 45mo | −90% (catastrophic) |

*Note: Debiasing effect calculated as reduction from anchor toward baseline. Negative values indicate responses below baseline.*

### 4.X.2 Three Failure Modes

Our results reveal that SACD exhibits three distinct failure modes depending on model architecture:

**Mode 1: Calibrated Debiasing (Opus models)**

Anthropic's Opus models respond to SACD instructions proportionally, achieving near-perfect baseline recovery. SACD removes anchor influence and the model returns to its trained baseline without over-correction. This represents the intended behavior of the technique.

**Mode 2: Resistant (o3-mini)**

OpenAI's reasoning model (o3-mini) appears to ignore SACD instructions entirely. Responses remain at the anchor value (21.45mo ≈ 21mo anchor), suggesting that compliance or reasoning training overrides the debiasing protocol. While this represents a failure to debias, it does not produce outcomes worse than no intervention.

**Mode 3: Catastrophic Over-correction (GPT-4o, GPT-5.2, Haiku)**

OpenAI's instruction-tuned models (GPT-4o, GPT-5.2) and Anthropic's Haiku show extreme over-correction. Rather than returning to baseline, these models produce sentences far below baseline—in some cases recommending near-zero sentences. GPT-5.2 produced 8 trials with 0-month sentences (no prison time for a 12th-offense shoplifter), representing a 90% deviation below baseline.

### 4.X.3 The GPT-5.2 Problem

The GPT-5.2 result warrants special attention. With a mean sentence of 2.5 months against a 24-month baseline and 45-month anchor, SACD produces outcomes **90% worse than no intervention**. Eight of twenty trials returned 0-month sentences—effectively recommending no prison time for a 12th-offense shoplifter.

Critically, GPT-5.2 shows *more* extreme over-correction than GPT-4o (90% vs 71% below baseline). This contradicts the intuition that newer models would be more robust. Practitioners assuming "newer = better" would be especially vulnerable to this failure mode.

### 4.X.4 Implications

These findings have significant implications for practitioners:

1. **SACD is not a universal fix.** The same technique achieves perfect debiasing on some models (Opus), has no effect on others (o3-mini), and produces catastrophically worse outcomes on others (GPT-4o, GPT-5.2).

2. **Over-correction can be worse than no intervention.** A practitioner using SACD on GPT-5.2 would produce systematically worse outcomes than someone who applied no debiasing technique at all.

3. **Newer models may be more susceptible.** Within OpenAI's instruction-tuned family, GPT-5.2 shows more extreme over-correction than GPT-4o (90% vs 71% below baseline), suggesting that newer models may be more—not less—susceptible to this failure mode.

4. **Per-deployment validation is mandatory.** Given the unpredictable failure modes, the only safe recommendation is to empirically validate any debiasing technique on the specific model and prompt context before deployment.

### 4.X.5 Supporting Evidence: Raw Sibony Techniques

We additionally tested raw Sibony decision hygiene techniques (context-hygiene, premortem) on Opus 4.5 at 43mo anchor. Both techniques produced extreme over-correction: 100% of trials (30/30 each) returned 1-month sentences, representing even more severe over-correction than SACD. This suggests that the multi-turn SACD protocol may partially buffer against over-correction compared to single-prompt debiasing instructions, though neither approach is reliable across model families.

## Key Takeaway

Human debiasing techniques do not reliably transfer to LLMs. When they fail, they fail in unpredictable directions—some models ignore debiasing entirely, while others overcorrect catastrophically. The finding that SACD produces 90% worse outcomes than no intervention on GPT-5.2 underscores the danger of applying "best practices" from human cognitive psychology without per-model validation.
