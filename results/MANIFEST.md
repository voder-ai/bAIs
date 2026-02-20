# bAIs Experiment Manifest
**Last Updated:** 2026-02-20 00:59 UTC

## SACD at Symmetric High Anchors — COMPLETE (10 models)

| Model | Anchor | n | Mean | Baseline | Debiasing | Mode |
|-------|--------|---|------|----------|-----------|------|
| Opus 4.5 | 43mo | 30 | 23.6mo | 22mo | ✅ 100% | Calibrated |
| Opus 4.6 | 33mo | 30 | 18mo | 18mo | ✅ 100% | Calibrated |
| Sonnet 4.5 | 43mo | 30 | 26.6mo | 22mo | ⚠️ 81% | Partial |
| Hermes 405B | 21mo | 20 | 15.3mo | 12mo | ⚠️ 63% | Partial |
| Llama 3.3 | 21mo | 20 | 17.6mo | 12mo | ⚠️ 38% | Partial |
| Haiku 4.5 | 67mo | 30 | 26.7mo | 34mo | 🔴 -22% | Catastrophic |
| o3-mini | 21mo | 20 | 21.5mo | 12mo | ❌ 0% | Resistant |
| GPT-4o | 45mo | 20 | 6.9mo | 24mo | 🔴 -71% | Catastrophic |
| GPT-5.2 | 45mo | 20 | 2.5mo | 24mo | 🔴🔴 -90% | Catastrophic |
| MiniMax | 21mo | 11* | 8.4mo | 12mo | 🔴 -30% | Unstable |

*MiniMax: 11/20 trials, 18% refusal rate, still running

## Five SACD Failure Modes

1. **Calibrated (100%)** — Opus 4.5, 4.6
2. **Partial (38-81%)** — Sonnet, Hermes, Llama
3. **Resistant (0%)** — o3-mini
4. **Catastrophic (-22 to -90%)** — GPT-4o, GPT-5.2, Haiku
5. **Unstable** — MiniMax (high variance + refusals)

## Disclosure Debiasing — COMPLETE (10 models)

| Model | Effect |
|-------|--------|
| Haiku 4.5 | +97.5% |
| Opus 4.5 | +94% |
| Hermes 405B | +90% |
| Opus 4.6 | +60% |
| Haiku 3.5 | +39% |
| Sonnet 4.5 | +35% |
| GPT-4o | 0% |
| o3-mini | 0% |
| GPT-5.2 | -14% |
| o1 | -28% |

## Gaps

- [ ] MiniMax SACD: 9 more trials to reach 20 (running)
- [ ] o1 SACD: Skipped (timeout issues)

## Result Files

- `sacd-high-anchor-21mo-llama-3.3-70b-instruct.jsonl` — Llama 3.3 (n=20)
- `sacd-high-anchor-21mo-minimax-m2.5.jsonl` — MiniMax (n=11, running)
- `sacd-high-anchor-21mo-o3-mini.jsonl` — o3-mini (n=20)
- `sacd-high-anchor-21mo-hermes-3-llama-3.1-405b.jsonl` — Hermes (n=20)
- `sacd-high-anchor-45mo-gpt-4o.jsonl` — GPT-4o (n=20)
- `sacd-high-anchor-45mo-gpt-5.2.jsonl` — GPT-5.2 (n=20)
