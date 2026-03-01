# 6-Turn Random Control Analysis

Generated: 2026-03-01T12:50:02.668Z

## Results by Model

| Model | Anchor | n | Initial | Final | Changed | Rate |
|-------|--------|---|---------|-------|---------|------|
| GPT-5.2 | Low (16mo) | 30 | 4.0 | 13.1 | 30 | 100.0% |
| | High (48mo) | 30 | 4.0 | 28.0 | 30 | 100.0% |
| Haiku 4.5 | Low (14mo) | 28 | 12.5 | 10.4 | 20 | 71.4% |
| | High (43mo) | 30 | 23.4 | 14.6 | 25 | 83.3% |
| Opus 4.6 | Low (9mo) | 30 | 8.2 | 8.5 | 19 | 63.3% |
| | High (27mo) | 30 | 24.0 | 20.2 | 19 | 63.3% |
| Sonnet 4.6 | Low (12mo) | 30 | 11.1 | 11.3 | 9 | 30.0% |
| | High (36mo) | 30 | 24.2 | 23.2 | 3 | 10.0% |

## Overall Revision Rates

| Model | Filler + "revised" | SACD (86%) | Gap |
|-------|-------------------|------------|-----|
| GPT-5.2 | 100.0% | 86% | -14.0pp |
| Haiku 4.5 | 77.6% | 86% | 8.4pp |
| Opus 4.6 | 63.3% | 86% | 22.7pp |
| Sonnet 4.6 | 20.0% | 86% | 66.0pp |

## Model Taxonomy

- **Instruction-following** (Haiku): High response to implicit "revised" cue
- **Balanced** (Opus): Moderate response
- **Reasoning-anchored** (Sonnet): Resists implicit instruction, needs explicit bias prompts
