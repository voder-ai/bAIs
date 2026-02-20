# Results Manifest

## Model List (11 models) — All via OpenRouter

### Anthropic (3)
| Model | OpenRouter ID |
|-------|---------------|
| Opus 4.6 | `anthropic/claude-opus-4.6` |
| Sonnet 4.6 | `anthropic/claude-sonnet-4.6` |
| Haiku 4.5 | `anthropic/claude-haiku-4.5` |

### OpenAI (4)
| Model | OpenRouter ID |
|-------|---------------|
| GPT-5.2 | `openai/gpt-5.2` |
| GPT-4.1 | `openai/gpt-4.1` |
| o3 | `openai/o3` |
| o4-mini | `openai/o4-mini` |

### Open Source (4)
| Model | OpenRouter ID |
|-------|---------------|
| MiniMax M2.5 | `minimax/minimax-m2.5` |
| Kimi K2.5 | `moonshotai/kimi-k2.5` |
| GLM 5 | `z-ai/glm-5` |
| DeepSeek V3.2 | `deepseek/deepseek-v3.2` |

## Experiment Conditions

### Per Model (3 conditions)
1. **Baseline** — no anchor, n=30
2. **Low anchor (3mo)** — standard Englich, n=30
3. **Symmetric high anchor** — 2 × baseline - 3, n=30

### Methodology
- Standardized Englich paradigm from `src/experiments/anchoringProsecutorSentencing.ts`
- 3-turn structure: prosecutor → defense → final
- "Randomly determined" disclosure for anchor conditions
- All models via OpenRouter API

## Status

All data deleted 2026-02-20. Clean slate.

### Phase 1: Baselines
Run baseline (no-anchor) for all 11 models to determine symmetric high anchor values.

### Phase 2: Anchor Conditions
After baselines complete, run low + symmetric high anchor for each model.
