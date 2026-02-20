# bAIs Experiment Manifest
**Last Updated:** 2026-02-20 06:02 UTC

## SACD at Symmetric High Anchors - COMPLETE (10 models, n=30)

| Model | Anchor | n | Mean | Baseline | Debiasing | Mode |
|-------|--------|---|------|----------|-----------|------|
| Opus 4.5 | 43mo | 30 | 23.6mo | 22mo | ✅ 100% | Calibrated |
| Opus 4.6 | 33mo | 30 | 18mo | 18mo | ✅ 100% | Calibrated |
| Sonnet 4.5 | 43mo | 30 | 26.6mo | 22mo | ⚠️ 81% | Partial |
| Haiku 4.5 | 67mo | 30 | 26.7mo | 34mo | 🔴 -22% | Catastrophic |
| Hermes 405B | 21mo | 30 | 14.6mo | 12mo | ⚠️ 71% | Partial |
| Llama 3.3 | 21mo | 30 | 18mo | 12mo | ⚠️ 33% | Partial |
| o3-mini | 21mo | 30 | 20.9mo | 12mo | ❌ 1% | Resistant |
| GPT-4o | 45mo | 30 | 7.2mo | 24mo | 🔴 -70% | Catastrophic |
| GPT-5.2 | 45mo | 30 | 4.0mo | 24mo | 🔴🔴 -83% | Catastrophic |
| MiniMax | 21mo | 30 | 13.7mo | 12mo | ⚠️ 81% | Unstable |

*Note: n=30 (27 valid, 3 refused = 10%). Bimodal: over-correction (0-6mo) OR anchor-adherent (21mo).*

## Debiasing at Low Anchor (3mo) - EXISTING DATA

| Model | Baseline | Context-Hygiene | Premortem | SACD | File |
|-------|----------|-----------------|-----------|------|------|
| Opus 4.5 | ✅ n=20 | ✅ n=20 | ✅ n=20 | ✅ n=20 | opus45-debiasing-sweep.jsonl |
| Hermes 405B | ✅ n=20 | ✅ n=20 | ✅ n=20 | ✅ n=20 | hermes-3-llama-3.1-405b-debiasing-sweep.jsonl |
| Llama 3.3 | ✅ n=20 | ✅ n=20 | ✅ n=20 | ✅ n=20 | llama-3.3-70b-instruct-debiasing-sweep.jsonl |
| GPT-4o | ✅ n=25 | ✅ n=27 | ✅ n=29 | ✅ n=29 | gpt4o-debiasing-30.jsonl |
| GPT-5.2 | ✅ n=75 | - | - | - | gpt52-debiasing-suite.jsonl |
| Qwen 2.5 72B | ✅ n=20 | ✅ n=20 | ✅ n=20 | ✅ n=20 | qwen-2.5-72b-instruct-debiasing-sweep.jsonl |
| Gemma 2 9B | ✅ n=20 | ✅ n=20 | ✅ n=20 | ✅ n=20 | gemma-2-9b-it-debiasing-sweep.jsonl |
| Mistral 7B | ✅ n=33 | ✅ n=20 | ✅ n=20 | ❌ | mistral-7b-instruct-debiasing-sweep.jsonl |

### Low Anchor SACD (Full Protocol) - Additional Files

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

## Debiasing at Symmetric High Anchors

| Model | Anchor | Baseline | Context-Hygiene | Premortem | SACD | Disclosure |
|-------|--------|----------|-----------------|-----------|------|------------|
| Opus 4.5 | 43mo | ✅ | ✅ n=30 (1mo) | ✅ n=30 (1mo) | ✅ n=30 | ✅ |
| Opus 4.6 | 33mo | ✅ | ✅ n=30 (18mo=baseline) | ✅ n=30 (18mo=baseline) | ✅ n=30 | ✅ |
| Sonnet 4.5 | 43mo | ❌ | ✅ n=30 (18mo, -18%) | ✅ n=30 (18mo, -18%) | ✅ n=30 | ✅ |
| Haiku 4.5 | 67mo | ✅ | ✅ n=30 (24mo, -29%) | ✅ n=30 (24mo, -29%) | ✅ n=30 | ✅ |
| Hermes 405B | 21mo | ✅ | ✅ n=30 (14.6mo, +71%) | ✅ n=30 (13.8mo, +80%) | ✅ n=30 | ✅ |
| Llama 3.3 | 21mo | ❌ | ✅ n=30 (16.6mo, +49%) | ✅ n=30 (22.6mo, -18%) | ✅ n=30 | ✅ |
| o3-mini | 21mo | ✅ | ✅ n=30 (25.0mo, -44%) | ✅ n=30 (24.5mo, -39%) | ✅ n=30 | ✅ |
| GPT-4o | 45mo | ✅ | ✅ n=30 (27.6mo, +83%) | ✅ n=30 (27.0mo, +86%) | ✅ n=30 | ✅ |
| GPT-5.2 | 45mo | ✅ | ✅ n=30 (31.0mo, +67%) | ✅ n=30 (33.0mo, +57%) | ✅ n=30 | ✅ |
| MiniMax | 21mo | ❌ | ✅ n=30 (19.1mo, +21%) | 🔄 7/30 | ✅ n=30 | ❌ |

### Sibony Technique Results (Anthropic @ High Anchors)

| Model | Anchor | Baseline | Context-Hygiene | Premortem | Effect |
|-------|--------|----------|-----------------|-----------|--------|
| Opus 4.5 | 43mo | 22mo | 1mo | 1mo | 🔴 Extreme over-correction |
| Opus 4.6 | 33mo | 18mo | 18mo | 18mo | ✅ 100% to baseline |
| Sonnet 4.5 | 43mo | 22mo | 18mo | 18mo | ⚠️ -18% over-correction |
| Haiku 4.5 | 67mo | 34mo | 24mo | 24mo | ⚠️ -29% over-correction |

**Pattern:** Sibony techniques work perfectly on Opus 4.6 but over-correct on other Anthropic models.

### Sibony Technique Results (OpenRouter @ High Anchors) - IN PROGRESS

| Model | Anchor | Baseline | Context-Hygiene | Premortem | SACD | Effect |
|-------|--------|----------|-----------------|-----------|------|--------|
| Hermes 405B | 21mo | 12mo | 14.6mo (+71%) | 13.8mo (+80%) | +71% | ✅ Both work |
| Llama 3.3 | 21mo | 12mo | 16.6mo (+49%) | 22.6mo (-18%) | +33% | ⚠️ Premortem backfires |
| o3-mini | 21mo | 12mo | 25.0mo (-44%) | 24.5mo (-39%) | +1% | 🔴 Both BACKFIRE |
| GPT-4o | 45mo | 24mo | 27.6mo (+83%) | 27.0mo (+86%) | -70% | ✅ Sibony works, SACD fails |
| GPT-5.2 | 45mo | 24mo | 31.0mo (+67%) | 33.0mo (+57%) | -83% | ✅ Sibony works, SACD fails |
| MiniMax | 21mo | 12mo | ✅ 19.1mo (+21%) | 🔄 7/30 | +81% | Weak effect |

**Key Insight:** SACD over-corrects GPT models, but Sibony techniques work well. Opposite for o3-mini.

## Five SACD Failure Modes

1. **Calibrated (100%)** - Opus 4.5, 4.6
2. **Partial (38-81%)** - Sonnet, Hermes, Llama
3. **Resistant (0%)** - o3-mini
4. **Catastrophic (-22 to -90%)** - GPT-4o, GPT-5.2, Haiku
5. **Unstable** - MiniMax (bimodal: over-correction OR anchor-adherent, 10% refusals)

## Disclosure Debiasing at Symmetric High Anchors - COMPLETE (10 models)

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
- [x] Hermes 405B SACD @ 21mo: ✅ n=30 (14.6mo)
- [x] Llama 3.3 SACD @ 21mo: ✅ n=30 (18mo)
- [x] o3-mini SACD @ 21mo: ✅ n=30 (20.9mo, resistant)
- [x] GPT-4o SACD @ 45mo: ✅ n=30 (7.2mo, -70%)
- [x] GPT-5.2 SACD @ 45mo: ✅ n=30 (4.0mo, -83%)
- [x] MiniMax SACD @ 21mo: ✅ n=30 (27 valid, 81% partial debiasing, bimodal)

### Context-Hygiene/Premortem at Symmetric High Anchors
- [x] Opus 4.6 @ 33mo ✅ (18mo = baseline)
- [x] Sonnet 4.5 @ 43mo ✅ (18mo, over-correction)
- [x] Haiku 4.5 @ 67mo ✅ (24mo, over-correction)
- [x] Hermes 405B @ 21mo ✅ (C-H: 14.6mo +71%, Pre: 13.8mo +80%)
- [x] Llama 3.3 @ 21mo ✅ (C-H: 16.6mo +49%, Pre: 22.6mo -18% BACKFIRES)
- [x] o3-mini @ 21mo ✅ (C-H: 25.0mo -44%, Pre: 24.5mo -39% BACKFIRES)
- [x] GPT-4o @ 45mo ✅ (C-H: 27.6mo +83%, Pre: 27.0mo +86%)
- [x] GPT-5.2 @ 45mo ✅ (C-H: 31.0mo +67%, Pre: 33.0mo +57%)
- [x] MiniMax @ 21mo ✅ (C-H: 19.1mo +21%, Pre: 🔄 running)

### Baselines at Symmetric High Anchors (Missing)
- [ ] Sonnet 4.5 @ 43mo
- [ ] Llama 3.3 @ 21mo
- [ ] MiniMax @ 21mo

### Skipped
- o1 SACD @ 21mo - timeout issues with reasoning model

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
Draft at `paper/sacd-failure-modes-section.md` - awaiting Tom's approval for LaTeX.

## Experiment Backlog

1. **MiniMax Sibony premortem** — running (`dawn-coral`), ~30min ETA
2. **Personality traits × debiasing** — arxiv:2502.14219 suggests conscientiousness enhances debiasing. Test "respond conscientiously" system prompt as lightweight alternative to SACD.
