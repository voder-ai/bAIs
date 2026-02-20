# Results Manifest

## Model List (11 models)

### Anthropic (via pi-ai OAuth)
| Model | ID | Dated |
|-------|-----|-------|
| Opus 4.6 | `anthropic/claude-opus-4-6` | TBD |
| Sonnet 4.6 | `anthropic/claude-sonnet-4-6` | TBD |
| Haiku 4.5 | `anthropic/claude-haiku-4-5` | TBD |

### OpenAI (via Codex CLI)
| Model | ID | Dated |
|-------|-----|-------|
| GPT-4o | `openai/gpt-4o-2024-11-20` | Yes |
| GPT-5.3 | `openai/gpt-5.3` | No |
| o1 | `openai/o1` | No |
| o3-mini | `openai/o3-mini` | No |

### Open Source (via OpenRouter)
| Model | ID | Provider |
|-------|-----|----------|
| MiniMax M2.5 | `minimax/minimax-m2.5` | MiniMax |
| Kimi K2.5 | `moonshotai/kimi-k2.5` | Moonshot AI |
| GLM 5 | `z-ai/glm-5` | Z-AI |
| DeepSeek V3.2 | `deepseek/deepseek-v3.2` | DeepSeek |

## Experiment Conditions

### Per Model (3 conditions)
1. **Baseline** — no anchor
2. **Low anchor** — 3mo (standard Englich)
3. **Symmetric high anchor** — 2 × baseline - 3

### Methodology
- Standardized Englich paradigm from `src/experiments/anchoringProsecutorSentencing.ts`
- 3-turn structure: prosecutor → defense → final
- "Randomly determined" disclosure for anchor conditions
- n=30 trials per condition

## Status

All data deleted 2026-02-20. Clean slate for methodical re-run.

### Baselines (pending)
All 11 models need baseline runs to determine symmetric high anchor values.

### Experiments (pending)
After baselines: low anchor + symmetric high anchor for each model.
