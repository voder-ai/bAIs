# Baseline Audit - 2026-02-19

## Purpose
Verify all model baselines and calculate correct symmetric high anchors before running debiasing experiments.

## Formula
- Low anchor = 3mo (fixed)
- High anchor = baseline + (baseline - 3) = 2×baseline - 3

## Baselines to Verify

### Anthropic Models (Pilot's domain)
| Model | File | JSON Path | Baseline | High Anchor |
|-------|------|-----------|----------|-------------|
| Opus 4.5 | ? | ? | 22.8mo | 43mo |
| Opus 4.6 | ? | ? | 18.0mo | 33mo |
| Sonnet 4.5 | sonnet-45-no-anchor.jsonl | ? | 23.2mo | 43mo |
| Haiku 4.5 | haiku-45-no-anchor.jsonl | ? | 35.2mo | 67mo |
| Haiku 3.5 | haiku-35-no-anchor.jsonl | ? | 32.4mo | 62mo |

### OpenAI Models
| Model | File | JSON Path | Baseline | High Anchor |
|-------|------|-----------|----------|-------------|
| GPT-4o | gpt4o-baseline-*.jsonl | ? | 24.5mo | 46mo |
| GPT-5.2 | ? | ? | 32.1mo | 61mo |

### OpenRouter Models (Atlas's domain)
| Model | File | JSON Path | Baseline | High Anchor |
|-------|------|-----------|----------|-------------|
| o1 | o1-no-anchor-control.jsonl | .result.sentenceMonths | 12mo | 21mo |
| o3-mini | o3-mini-no-anchor-control.jsonl | .result.sentenceMonths | 12mo | 21mo |
| Llama 3.3 | ? | ? | 12mo | 21mo |
| Hermes 405B | ? | ? | 20.7mo | 38mo |
| MiniMax | ? | ? | ~12mo | 21mo |

## Experiments We Have

### Low Anchor (3mo)
- [ ] List all models with 3mo anchor data

### High Anchor (symmetric)
- [ ] List all models with correct high anchor data

### SACD Low Anchor
- [ ] List existing SACD data

### SACD High Anchor
- [ ] What's missing?

### Disclosure Low Anchor
- [ ] What's missing?

### Disclosure High Anchor
- [ ] What's missing?

## Next Steps
1. Verify each baseline from actual files
2. Identify gaps in coverage
3. Plan experiments to fill gaps
4. Execute with correct methodology
