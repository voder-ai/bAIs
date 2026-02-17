# Experiment Coverage Table

Last updated: 2026-02-17 04:46 UTC

## Key Models

| Model | Baseline | 3-turn Ctrl | Token Ctrl | SACD (1-pass) | SACD (Full) | Notes |
|-------|----------|-------------|------------|---------------|-------------|-------|
| **GPT-4o** | ✅ | ✅ (structure-matched) | ❌ | ✅ | ✅ | Full coverage |
| **GPT-5.2** | ✅ | ✅ | ✅ | ❓ | ❌ (corrupted) | Need re-run full SACD |
| **Claude Opus 4.5** | ✅ | ✅ | ✅ | ✅ | ✅ | Full coverage |
| **Claude Opus 4.6** | ✅ | ✅ | ✅ | ❌ | ✅ | Missing single-pass |
| **Llama 3.3** | ✅ | ❌ | ❌ | ✅ | ✅ | Missing controls |
| **Hermes 405B** | ✅ | ❌ | ❌ | ❌ | ✅ | Missing controls + single-pass |
| **o1** | ✅ | ✅ | ✅ | ❌ | 🔄 running | Pilot running SACD |
| **Sonnet 4** | ✅ | ❌ | ❌ | ❌ | ❌ | Minimal coverage |
| **Sonnet 4.5** | ✅ (temp sweep) | ❌ | ❌ | ❌ | ❌ | Minimal coverage |
| **MiniMax M2.5** | ✅ | ❌ | ❌ | ✅ | ❌ | Missing full SACD |

## Legend

- ✅ = Complete (n≥30)
- ❌ = Missing
- ❓ = Partial or uncertain
- 🔄 = In progress

## Priority Gaps

1. **GPT-5.2 full SACD** — corrupted file, need re-run
2. **o1 SACD** — currently running
3. **Llama 3.3 controls** — 3-turn and token-matched
4. **Hermes 405B controls** — 3-turn and token-matched

## Files Reference

### Full SACD Results
- `results/gpt4o-full-sacd.jsonl` — GPT-4o
- `results/opus45-full-sacd.jsonl` — Opus 4.5
- `results/opus46-full-sacd.jsonl` — Opus 4.6
- `results/llama33-full-sacd.jsonl` — Llama 3.3
- `results/hermes405b-full-sacd.jsonl` — Hermes 405B

### Single-Pass SACD Results
- `results/anthropic-sacd-30.jsonl` — Anthropic (Opus 4.5)
- `results/minimax-m25-sacd.jsonl` — MiniMax

### Control Experiments
- `results/gpt52-3turn-random-control.jsonl` — GPT-5.2 3-turn
- `results/gpt52-token-matched-control.jsonl` — GPT-5.2 token-matched
- `results/opus45-control-3turn.jsonl` — Opus 4.5 3-turn
- `results/opus45-control-token.jsonl` — Opus 4.5 token-matched
- `results/opus46-control-3turn.jsonl` — Opus 4.6 3-turn
- `results/opus46-control-token.jsonl` — Opus 4.6 token-matched
