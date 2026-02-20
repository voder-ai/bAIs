# Results Manifest

## Model List (11 models) — All via OpenRouter

### Anthropic (3)
| Model | OpenRouter ID | Rationale |
|-------|---------------|-----------|
| Opus 4.6 | `anthropic/claude-opus-4.6` | Latest Anthropic flagship |
| Sonnet 4.6 | `anthropic/claude-sonnet-4.6` | Mid-tier, high volume usage |
| Haiku 4.5 | `anthropic/claude-haiku-4.5` | Fast/cheap tier |

### OpenAI (4)
| Model | OpenRouter ID | Rationale |
|-------|---------------|-----------|
| GPT-5.2 | `openai/gpt-5.2` | Latest OpenAI flagship (non-reasoning) |
| GPT-4.1 | `openai/gpt-4.1` | Smartest non-reasoning model |
| o3 | `openai/o3` | Full reasoning model |
| o4-mini | `openai/o4-mini` | Cost-effective reasoning model |

### Open Source (4) — Top by OpenRouter usage
| Model | OpenRouter ID | Rationale |
|-------|---------------|-----------|
| MiniMax M2.5 | `minimax/minimax-m2.5` | #1 by usage (3.24T tokens/week) |
| Kimi K2.5 | `moonshotai/kimi-k2.5` | #2 by usage (1.24T tokens/week) |
| GLM 5 | `z-ai/glm-5` | #3 by usage (1.03T tokens/week) |
| DeepSeek V3.2 | `deepseek/deepseek-v3.2` | #5 by usage (738B tokens/week) |

## Experiment Design

### Conditions (3 per model)
1. **Baseline** — no anchor, n=30
2. **Low anchor (3mo)** — standard Englich paradigm, n=30
3. **Symmetric high anchor** — formula: 2 × baseline - 3, n=30

### Methodology
- Standardized Englich paradigm from `src/experiments/anchoringProsecutorSentencing.ts`
- 3-turn structure: prosecutor → defense → final
- "Randomly determined" disclosure for anchor conditions
- All models via OpenRouter API (single provider, no routing confounds)

## Status

All data deleted 2026-02-20. Clean slate for methodical re-run.

### Phase 1: Baselines
Run baseline (no-anchor) for all 11 models to determine symmetric high anchor values.

### Phase 2: Anchor Conditions  
After baselines complete, run low + symmetric high anchor for each model.
