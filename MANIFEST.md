# bAIs Experiment Manifest

## Model Selection (2026-02-21)

All experiments run via **OpenRouter** — single API path to avoid routing confounds.

### Anthropic (3 models)

| Model ID | Rationale |
|----------|-----------|
| `anthropic/claude-opus-4.6` | Latest flagship model |
| `anthropic/claude-sonnet-4.6` | Mid-tier, released Feb 17 2026 |
| `anthropic/claude-haiku-4.5` | Fast/cheap tier, latest Haiku |

### OpenAI (3 models)

| Model ID | Rationale |
|----------|-----------|
| `openai/gpt-5.2` | Latest non-reasoning flagship |
| `openai/o3` | Reasoning model flagship |
| `openai/o4-mini` | Fast reasoning, successor to o3-mini |

### Open Source (4 models — top by OpenRouter usage)

| Model ID | Rationale |
|----------|-----------|
| `minimax/minimax-m2.5` | #1 by usage (3.24T tokens/week, +5,405%) |
| `moonshotai/kimi-k2.5` | #2 by usage (1.24T tokens/week) |
| `z-ai/glm-5` | #3 by usage (1.03T tokens/week, +1,448%) |
| `deepseek/deepseek-v3.2` | #5 by usage (738B tokens/week), top Chinese lab |

## Symmetric Anchor Formula

**High anchor = 2 × baseline - 3**

Where low_anchor = 3mo (standard)

## Required Conditions Per Model

For each model, we need:
- [ ] No-anchor baseline (n≥30)
- [ ] Low anchor (3mo) with Englich disclosure (n≥30)
- [ ] Symmetric high anchor with Englich disclosure (n≥30)
- [ ] SACD on low anchor (n≥30)
- [ ] SACD on high anchor (n≥30)

## Data Status (2026-02-21)

**ALL PREVIOUS DATA DELETED** — complete reset due to methodology issues:
1. Mixed prompt phrasing (jail time vs probation)
2. Wrong scenarios (assault vs shoplifting) 
3. Inconsistent 3-turn structure

Starting fresh with standardized methodology.

## Experiment Status

| Model | Baseline | Low (3mo) | High (sym) | SACD Low | SACD High |
|-------|----------|-----------|------------|----------|-----------|
| claude-opus-4.6 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| claude-sonnet-4.6 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| claude-haiku-4.5 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| gpt-5.2 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| o3 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| o4-mini | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| minimax-m2.5 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| kimi-k2.5 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| glm-5 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| deepseek-v3.2 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

⬜ = Not started | 🔄 = In progress | ✅ = Complete (n≥30)
