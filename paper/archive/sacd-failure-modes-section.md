# SACD Failure Mode Taxonomy — Draft Section 4.X

## 4.X Self-Administered Cognitive Debiasing (SACD)

Self-Administered Cognitive Debiasing (SACD) is a multi-turn prompting technique where the model first identifies cognitive biases in a decision prompt, analyzes the biased elements, rewrites the prompt to remove bias, and then makes a judgment on the debiased version. We tested SACD at symmetric high anchors (2×baseline − 3) across ten models (n=30 each) to evaluate whether this technique reliably mitigates anchoring bias.

### 4.X.1 Results

Table X presents SACD debiasing effectiveness across model families.

| Model       | Family     | SACD Mean | Baseline | Anchor | Debiasing Effect    |
| ----------- | ---------- | --------- | -------- | ------ | ------------------- |
| Opus 4.5    | Anthropic  | 23.6mo    | 22mo     | 43mo   | +100% (baseline)    |
| Opus 4.6    | Anthropic  | 18.0mo    | 18mo     | 33mo   | +100% (baseline)    |
| Sonnet 4.5  | Anthropic  | 26.6mo    | 22mo     | 43mo   | +81% (partial)      |
| Haiku 4.5   | Anthropic  | 26.7mo    | 34mo     | 67mo   | −22% (over-correct) |
| Hermes 405B | Open       | 14.6mo    | 12mo     | 21mo   | +71% (partial)      |
| Llama 3.3   | Open       | 18.0mo    | 12mo     | 21mo   | +33% (partial)      |
| o3-mini     | OpenAI     | 20.9mo    | 12mo     | 21mo   | +1% (resistant)     |
| GPT-4o      | OpenAI     | 7.2mo     | 24mo     | 45mo   | −70% (catastrophic) |
| GPT-5.2     | OpenAI     | 4.0mo     | 24mo     | 45mo   | −83% (catastrophic) |
| MiniMax     | Commercial | 13.7mo    | 12mo     | 21mo   | +81% (unstable)     |

_Note: Debiasing effect calculated as reduction from anchor toward baseline. Negative values indicate responses below baseline. All experiments n=30._

### 4.X.2 Five Failure Modes

Our results reveal that SACD exhibits five distinct failure modes depending on model architecture:

**Mode 1: Calibrated Debiasing (Opus 4.5, Opus 4.6)**

Anthropic's Opus models respond to SACD instructions proportionally, achieving near-perfect baseline recovery. SACD removes anchor influence and the model returns to its trained baseline without over-correction. This represents the intended behavior of the technique.

**Mode 2: Partial Debiasing (Sonnet, Hermes, Llama)**

These models show incomplete debiasing (33-81%), moving toward baseline but not reaching it. This may be acceptable depending on the use case, but indicates SACD is not fully effective.

**Mode 3: Resistant (o3-mini)**

OpenAI's reasoning model (o3-mini) appears to ignore SACD instructions entirely. Responses remain near the anchor value (20.9mo ≈ 21mo anchor), suggesting that compliance or reasoning training overrides the debiasing protocol. While this represents a failure to debias, it does not produce outcomes worse than no intervention.

**Mode 4: Catastrophic Over-correction (GPT-4o, GPT-5.2, Haiku)**

OpenAI's instruction-tuned models (GPT-4o, GPT-5.2) and Anthropic's Haiku show extreme over-correction. Rather than returning to baseline, these models produce sentences far below baseline—in some cases recommending near-zero sentences. GPT-5.2 shows 83% deviation below baseline, recommending sentences averaging 4 months for a 12th-offense shoplifter against a 24-month baseline.

This is not merely a failure to debias—it is introducing a new systematic bias in the opposite direction. The anchor bias is replaced with an equally problematic leniency bias.

**Mode 5: Unstable (MiniMax)**

MiniMax shows bimodal behavior: some trials over-correct to 0-6 months while others remain anchor-adherent at 21 months. Additionally, 10% of trials result in refusals. The mean (13.7mo) appears reasonable, but masks unstable underlying behavior that would be problematic in production.

### 4.X.3 The GPT-5.2 Problem

The GPT-5.2 result warrants special attention. With a mean sentence of 4.0 months against a 24-month baseline and 45-month anchor, SACD produces outcomes **83% worse than no intervention**. Multiple trials returned 0-month sentences—effectively recommending no prison time for a 12th-offense shoplifter.

Critically, GPT-5.2 shows _more_ extreme over-correction than GPT-4o (83% vs 70% below baseline). This contradicts the intuition that newer models would be more robust. Practitioners assuming "newer = better" would be especially vulnerable to this failure mode.

### 4.X.4 Implications

These findings have significant implications for practitioners:

1. **SACD is not a universal fix.** The same technique achieves perfect debiasing on some models (Opus), has no effect on others (o3-mini), and produces catastrophically worse outcomes on others (GPT-4o, GPT-5.2).

2. **Over-correction can be worse than no intervention.** A practitioner following "best practices" (use SACD to debias) would produce **systematically worse** outcomes than someone who applied no debiasing technique at all.

3. **Newer models may be more susceptible.** Within OpenAI's instruction-tuned family, GPT-5.2 shows more extreme over-correction than GPT-4o (83% vs 70% below baseline), suggesting that newer models may be more—not less—susceptible to this failure mode.

4. **Per-deployment validation is mandatory.** Given the unpredictable failure modes, the only safe recommendation is to empirically validate any debiasing technique on the specific model and prompt context before deployment.

### 4.X.5 Supporting Evidence: Raw Sibony Techniques

We additionally tested raw Sibony decision hygiene techniques (context-hygiene, premortem) on Opus 4.5 at 43mo anchor. Both techniques produced extreme over-correction: 100% of trials (30/30 each) returned 1-month sentences, representing even more severe over-correction than SACD. This suggests that the multi-turn SACD protocol may partially buffer against over-correction compared to single-prompt debiasing instructions, though neither approach is reliable across model families.

## Key Takeaway

Human debiasing techniques do not reliably transfer to LLMs. When they fail, they fail in unpredictable directions—some models ignore debiasing entirely, while others overcorrect catastrophically. The finding that SACD produces 83% worse outcomes than no intervention on GPT-5.2 underscores the danger of applying "best practices" from human cognitive psychology without per-model validation.
