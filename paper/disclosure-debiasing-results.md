# Disclosure Debiasing Results (Complete)

**Date:** 2026-02-19
**Authors:** Atlas & Pilot

## Executive Summary

**KEY FINDING:** Sibony-style disclosure debiasing ("randomly determined" disclaimer) shows MODEL-FAMILY-DEPENDENT effects.

| Response Type       | Models                                       | Effect         |
| ------------------- | -------------------------------------------- | -------------- |
| **Strong Positive** | Anthropic (Opus, Haiku, Sonnet), Hermes 405B | +35% to +97.5% |
| **Null Effect**     | OpenAI instruction-tuned (GPT-4o, o3-mini)   | 0%             |
| **BACKFIRES**       | OpenAI reasoning (o1, GPT-5.2)               | -14% to -28%   |

## Complete Results Table

| Model                  | Family      | Baseline | Anchor | Simplified | Disclosure | Debiasing  |
| ---------------------- | ----------- | -------- | ------ | ---------- | ---------- | ---------- |
| **Strong Responders**  |             |          |        |            |            |            |
| Haiku 4.5              | Anthropic   | 35.2mo   | 67mo   | 67.0mo     | 36.0mo     | **+97.5%** |
| Hermes 405B            | Open-source | 12.0mo   | 21mo   | 23.4mo     | 12.6mo     | **+95%**   |
| Opus 4.5               | Anthropic   | 22.8mo   | 43mo   | 43.0mo     | 24.0mo     | **+94%**   |
| Opus 4.6               | Anthropic   | 18.0mo   | 33mo   | 33.0mo     | 24.0mo     | **+60%**   |
| Haiku 3.5              | Anthropic   | 32.4mo   | 62mo   | 54.0mo     | 45.6mo     | **+39%**   |
| Sonnet 4.5             | Anthropic   | 23.2mo   | 43mo   | 43.0mo     | 36.0mo     | **+35%**   |
| **Non-Responders**     |             |          |        |            |            |            |
| GPT-4o                 | OpenAI      | 24.0mo   | 45mo   | 45.0mo     | 45.0mo     | **0%**     |
| o3-mini                | OpenAI      | 12.0mo   | 21mo   | 21.1mo     | 21.1mo     | **0%**     |
| **Inverse Responders** |             |          |        |            |            |            |
| GPT-5.2                | OpenAI      | 24.0mo   | 45mo   | 45.0mo     | 48.0mo     | **-14%**   |
| o1                     | OpenAI      | 12.0mo   | 21mo   | 21.3mo     | 23.9mo     | **-28%**   |

## Interpretation

### Why Disclosure Works for Anthropic

Anthropic models appear to treat the "randomly determined" disclosure as a **relevance signal** — if the anchor is explicitly stated to be arbitrary, the model appropriately reduces its influence on judgment.

This aligns with:

- RLHF training that rewards truthful, calibrated responses
- Constitutional AI principles about not being misled by irrelevant information

### Why Disclosure Fails for OpenAI Instruction-Tuned

GPT-4o and o3-mini show **compliance behavior** — they copy the anchor value exactly regardless of disclosure. The disclosure doesn't override the compliance mechanism because:

- These models are optimized to follow instructions literally
- The anchor appears in the instruction, so it's "followed"
- Disclosure is processed but doesn't change the compliance priority

### Why Disclosure BACKFIRES for OpenAI Reasoning

o1 and GPT-5.2 show **inverse response** — disclosure makes anchoring WORSE. Hypothesis:

> Reasoning models may over-process the disclosure, treating "randomly determined" as a signal that the anchor requires MORE careful consideration, not less. The extended reasoning chain incorporates the anchor more deeply rather than dismissing it.

This is analogous to the "ironic process" in psychology — trying to suppress a thought makes it more prominent.

## Implications for Paper

1. **Disclosure is NOT a universal debiasing technique** — must validate per model/family
2. **Training methodology determines response** — not just model capability
3. **Reasoning ≠ robustness** — o1/GPT-5.2 are MORE susceptible with disclosure, not less
4. **Hermes clusters with Anthropic** — open-source RLHF models may share debiasing properties

## Data Sources

- Atlas experiments: `results/correct-high-anchors-21mo.jsonl`, `results/gpt-correct-high-anchors-45mo.jsonl`
- Pilot experiments: Various `*-englich-*.jsonl` and `*-simplified-*.jsonl` files

## Next Steps

1. Run SACD comparison at correct anchors for same models
2. Determine if Sibony disclosure + SACD can be combined
3. Update paper Results section with taxonomy
