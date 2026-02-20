# bAIs Experiment Manifest
**Last Updated:** 2026-02-20 03:30 UTC

## SACD at Symmetric High Anchors — IN PROGRESS (10 models, topping to n=30)

| Model | Anchor | n | Mean | Baseline | Debiasing | Mode |
|-------|--------|---|------|----------|-----------|------|
| Opus 4.5 | 43mo | 30 | 23.6mo | 22mo | ✅ 100% | Calibrated |
| Opus 4.6 | 33mo | 30 | 18mo | 18mo | ✅ 100% | Calibrated |
| Sonnet 4.5 | 43mo | 30 | 26.6mo | 22mo | ⚠️ 81% | Partial |
| Haiku 4.5 | 67mo | 30 | 26.7mo | 34mo | 🔴 -22% | Catastrophic |
| Hermes 405B | 21mo | 20* | 15.3mo | 12mo | ⚠️ 63% | Partial |
| Llama 3.3 | 21mo | 20* | 17.6mo | 12mo | ⚠️ 38% | Partial |
| o3-mini | 21mo | 20* | 21.5mo | 12mo | ❌ 0% | Resistant |
| GPT-4o | 45mo | 20* | 6.9mo | 24mo | 🔴 -71% | Catastrophic |
| GPT-5.2 | 45mo | 20* | 2.5mo | 24mo | 🔴🔴 -90% | Catastrophic |
| MiniMax | 21mo | 17* | 11.7mo | 12mo | ⚠️ ~97% | Unstable |

*Need top-up to n=30

## Debiasing at Low Anchor (3mo) — EXISTING DATA

| Model | Baseline | Context-Hygiene | Premortem | SACD | File |
|-------|----------|-----------------|-----------|------|------|
| Opus 4.5 | ✅ n=20 | ✅ n=20 | ✅ n=20 | ✅ n=20 | opus45-debiasing-sweep.jsonl |
| Hermes 405B | ✅ n=20 | ✅ n=20 | ✅ n=20 | ✅ n=20 | hermes-3-llama-3.1-405b-debiasing-sweep.jsonl |
| Llama 3.3 | ✅ n=20 | ✅ n=20 | ✅ n=20 | ✅ n=20 | llama-3.3-70b-instruct-debiasing-sweep.jsonl |
| GPT-4o | ✅ n=25 | ✅ n=27 | ✅ n=29 | ✅ n=29 | gpt4o-debiasing-30.jsonl |
| GPT-5.2 | ✅ n=75 | — | — | — | gpt52-debiasing-suite.jsonl |
| Qwen 2.5 72B | ✅ n=20 | ✅ n=20 | ✅ n=20 | ✅ n=20 | qwen-2.5-72b-instruct-debiasing-sweep.jsonl |
| Gemma 2 9B | ✅ n=20 | ✅ n=20 | ✅ n=20 | ✅ n=20 | gemma-2-9b-it-debiasing-sweep.jsonl |
| Mistral 7B | ✅ n=33 | ✅ n=20 | ✅ n=20 | ❌ | mistral-7b-instruct-debiasing-sweep.jsonl |

### Low Anchor SACD (Full Protocol) — Additional Files

| Model | n | File |
|-------|---|------|
| Llama 3.3 | 60 | llama33-full-sacd.jsonl |
| Hermes 405B | 60 | hermes405b-full-sacd.jsonl |
| GPT-4o | 65 | gpt4o-full-sacd.jsonl |
| GPT-5.2 | 61 | gpt52-full-sacd.jsonl |
| Haiku 4.5 | 64 | haiku45-full-sacd.jsonl |
| Opus 4.5 | 60 | opus45-full-sacd.jsonl |
| Opus 4.6 | 90 | opus46-full-sacd.jsonl |
| MiniMax | 60 | minimax-m25-full-sacd-openrouter.jsonl |
| o1 | 60 | o1-full-sacd-openrouter.jsonl |
| o3-mini | 60 | o3-mini-full-sacd-openrouter.jsonl |

## Debiasing at Symmetric High Anchors — GAPS

| Model | Anchor | Baseline | Context-Hygiene | Premortem | SACD | Disclosure |
|-------|--------|----------|-----------------|-----------|------|------------|
| Opus 4.5 | 43mo | ✅ | ✅ n=30 | ✅ n=30 | ✅ n=30 | ✅ |
| Opus 4.6 | 33mo | ✅ | ❌ | ❌ | ✅ n=30 | ✅ |
| Sonnet 4.5 | 43mo | ❌ | ❌ | ❌ | ✅ n=30 | ✅ |
| Haiku 4.5 | 67mo | ✅ | ❌ | ❌ | ✅ n=30 | ✅ |
| Hermes 405B | 21mo | ✅ | ❌ | ❌ | ✅ n=20* | ✅ |
| Llama 3.3 | 21mo | ❌ | ❌ | ❌ | ✅ n=20* | ✅ |
| o3-mini | 21mo | ✅ | ❌ | ❌ | ✅ n=20* | ✅ |
| GPT-4o | 45mo | ✅ | ❌ | ❌ | ✅ n=20* | ✅ |
| GPT-5.2 | 45mo | ✅ | ❌ | ❌ | ✅ n=20* | ✅ |
| MiniMax | 21mo | ❌ | ❌ | ❌ | 🔄 n=17* | ❌ |

*Need top-up to n=30

## Five SACD Failure Modes

1. **Calibrated (100%)** — Opus 4.5, 4.6
2. **Partial (38-81%)** — Sonnet, Hermes, Llama
3. **Resistant (0%)** — o3-mini
4. **Catastrophic (-22 to -90%)** — GPT-4o, GPT-5.2, Haiku
5. **Unstable** — MiniMax (high variance + refusals, but converging to baseline)

## Disclosure Debiasing at Symmetric High Anchors — COMPLETE (10 models)

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

## TODO / Gaps

### Immediate (n=30 top-ups)
- [ ] Hermes 405B SACD @ 21mo: +10 trials
- [ ] Llama 3.3 SACD @ 21mo: +10 trials  
- [ ] o3-mini SACD @ 21mo: +10 trials
- [ ] GPT-4o SACD @ 45mo: +10 trials
- [ ] GPT-5.2 SACD @ 45mo: +10 trials
- [ ] MiniMax SACD @ 21mo: continue to 30

### Context-Hygiene/Premortem at Symmetric High Anchors
- [ ] Opus 4.6 @ 33mo
- [ ] Sonnet 4.5 @ 43mo
- [ ] Haiku 4.5 @ 67mo
- [ ] Hermes 405B @ 21mo
- [ ] Llama 3.3 @ 21mo
- [ ] o3-mini @ 21mo
- [ ] GPT-4o @ 45mo
- [ ] GPT-5.2 @ 45mo
- [ ] MiniMax @ 21mo

### Baselines at Symmetric High Anchors (Missing)
- [ ] Sonnet 4.5 @ 43mo
- [ ] Llama 3.3 @ 21mo
- [ ] MiniMax @ 21mo

### Skipped
- o1 SACD @ 21mo — timeout issues with reasoning model

## Key Findings

### SACD Failure Mode Taxonomy
- **Calibrated:** Anthropic Opus models return to baseline perfectly
- **Partial:** Open models (Hermes, Llama) show 38-63% debiasing
- **Resistant:** o3-mini compliance training overrides SACD
- **Catastrophic:** GPT-4o, GPT-5.2 over-correct by 71-90%
- **Unstable:** MiniMax shows refusals + high variance

### Newer ≠ Better
GPT-5.2 shows MORE extreme over-correction than GPT-4o (90% vs 71%).
SACD produces 90% worse outcomes than no intervention on GPT-5.2.

### Paper Section Ready
Draft at `paper/sacd-failure-modes-section.md` — awaiting Tom's approval for LaTeX.
