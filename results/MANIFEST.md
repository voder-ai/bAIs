# bAIs Experiment Manifest
**Last Updated:** 2026-02-20 13:15 UTC
**Validation Script:** `scripts/validate-all-experiments.ts`

---

## No-Anchor Baselines

| Model | Expected | Measured | n | Notes |
|-------|----------|----------|---|-------|
| Opus 4.5 | 22mo | 21mo | 119 | ✅ |
| Opus 4.6 | 18mo | 18mo | 30 | ✅ |
| Sonnet 4.5 | 22mo | 24mo | 44 | Slight high bias |
| Haiku 4.5 | 34mo | 24mo | 60 | ⚠️ Lower than expected |
| Haiku 3.5 | 12mo | - | 0 | Not collected |
| Hermes 405B | 12mo | 12mo | 30 | ✅ |
| Llama 3.3 | 12mo | 12mo | 60 | ✅ |
| o3-mini | 12mo | 15mo | 60 | Slight high bias |
| o1 | 12mo | 12mo | 30 | ✅ |
| GPT-4o | 24mo | 9mo | 60 | ⚠️ From anchored condition |
| GPT-5.2 | 24mo | - | 0 | Not collected |
| MiniMax | 12mo | 12mo | 27 | ✅ |

---

## Low Anchor (3mo) Experiments

### Raw Anchoring Effect

| Model | Baseline | Anchored Mean | n | Anchoring Effect |
|-------|----------|---------------|---|------------------|
| Opus 4.5 | 22mo | 7mo | 140 | -68% |
| Opus 4.6 | 18mo | 7mo | 30 | -61% |
| Sonnet 4.5 | 22mo | 7mo | 670 | -68% |
| Haiku 4.5 | 34mo | 5mo | 40 | -85% |
| Haiku 3.5 | 12mo | 6mo | 6 | -50% |
| Hermes 405B | 12mo | 5mo | 76 | -58% |
| Llama 3.3 | 12mo | 6mo | 130 | -50% |
| o3-mini | 12mo | 7mo | 128 | -42% |
| o1 | 12mo | 8mo | 60 | -33% |
| GPT-4o | 24mo | 6mo | 881 | -75% |
| GPT-5.2 | 24mo | 8mo | 360 | -67% |
| MiniMax | 12mo | 6mo | 134 | -50% |

### SACD at Low Anchor (Full Protocol)

| Model | Mean | n | Debiasing Effect |
|-------|------|---|------------------|
| Opus 4.5 | 6mo | 140 | Minimal (anchor too close to SACD target) |
| Opus 4.6 | 7mo | 65 | Minimal |
| Sonnet 4.5 | 8mo | 30 | Minimal |
| Haiku 4.5 | 9mo | 64 | Partial recovery |
| Hermes 405B | 7mo | 80 | Partial |
| Llama 3.3 | 12mo | 117 | ✅ Full recovery to baseline |
| o3-mini | 7mo | 94 | Minimal |
| o1 | 8mo | 60 | Minimal |
| GPT-4o | 6mo | 270 | Minimal |
| GPT-5.2 | 9mo | 121 | Partial |
| MiniMax | 6mo | 124 | Minimal |

### Sibony at Low Anchor (3mo)

| Model | C-H Mean | C-H n | Pre Mean | Pre n | Effect vs Anchored |
|-------|----------|-------|----------|-------|-------------------|
| Opus 4.5 | 17mo | 20 | 11mo | 20 | C-H: +143%, Pre: +57% |
| Hermes 405B | 9mo | 20 | 9mo | 20 | C-H: +80%, Pre: +80% |
| Llama 3.3 | 12mo | 20 | 14mo | 20 | C-H: +100%, Pre: +133% |
| GPT-4o | 8mo | 45 | 7mo | 47 | C-H: +33%, Pre: +17% |
| Qwen 2.5 | ✅ | 20 | ✅ | 20 | In debiasing-sweep |
| Gemma 2 9B | ✅ | 20 | ✅ | 20 | In debiasing-sweep |
| Mistral 7B | ✅ | 20 | ✅ | 20 | In debiasing-sweep |

*Data from `*-debiasing-sweep.jsonl` files (field: `condition`) + `gpt4o-debiasing-30.jsonl`*

---

## High Anchor (Symmetric: 2×baseline - 3) Experiments

### SACD at Symmetric High Anchors - COMPLETE (10 models)

| Model | Anchor | n | Mean | Baseline | Debiasing | Mode |
|-------|--------|---|------|----------|-----------|------|
| Opus 4.5 | 43mo | 67 | 12mo | 22mo | ⚠️ -45% | Over-correction |
| Opus 4.6 | 33mo | 60 | 9mo | 18mo | ⚠️ -50% | Over-correction |
| Sonnet 4.5 | 43mo | 30 | 27mo | 22mo | ⚠️ +23% | Partial (wrong direction) |
| Haiku 4.5 | 67mo | 30 | 27mo | 34mo | ⚠️ -21% | Over-correction |
| Hermes 405B | 21mo | 30 | 15mo | 12mo | ⚠️ +33% | Partial |
| Llama 3.3 | 21mo | 30 | 18mo | 12mo | ❌ -50% | Over-correction |
| o3-mini | 21mo | 117 | 11mo | 12mo | ✅ +94% | Near-baseline |
| GPT-4o | 45mo | 88 | 14mo | 24mo | ⚠️ -42% | Over-correction |
| GPT-5.2 | 45mo | 30 | 4mo | 24mo | 🔴 -83% | Catastrophic |
| MiniMax | 21mo | 60 | 15mo | 12mo | ⚠️ +33% | Partial |

### Sibony Context-Hygiene at High Anchors - COMPLETE (10 models)

| Model | Anchor | n | Mean | Baseline | Effect |
|-------|--------|---|------|----------|--------|
| Opus 4.5 | 43mo | 30 | 1mo | 22mo | 🔴 -95% over-correction |
| Opus 4.6 | 33mo | 60 | 9mo | 18mo | ⚠️ -50% over-correction |
| Sonnet 4.5 | 43mo | 73 | 8mo | 22mo | 🔴 -64% over-correction |
| Haiku 4.5 | 67mo | 60 | 12mo | 34mo | 🔴 -65% over-correction |
| Hermes 405B | 21mo | 30 | 15mo | 12mo | ⚠️ +25% partial |
| Llama 3.3 | 21mo | 30 | 17mo | 12mo | ❌ -42% backfire |
| o3-mini | 21mo | 60 | 28mo | 12mo | ❌ -133% severe backfire |
| GPT-4o | 45mo | 30 | 28mo | 24mo | ❌ -17% backfire |
| GPT-5.2 | 45mo | 30 | 31mo | 24mo | ❌ -29% backfire |
| MiniMax | 21mo | 63 | 21mo | 12mo | ❌ -75% backfire |

### Sibony Premortem at High Anchors - COMPLETE (10 models)

| Model | Anchor | n | Mean | Baseline | Effect |
|-------|--------|---|------|----------|--------|
| Opus 4.5 | 43mo | 30 | 1mo | 22mo | 🔴 -95% over-correction |
| Opus 4.6 | 33mo | 60 | 9mo | 18mo | ⚠️ -50% over-correction |
| Sonnet 4.5 | 43mo | 60 | 9mo | 22mo | 🔴 -59% over-correction |
| Haiku 4.5 | 67mo | 60 | 12mo | 34mo | 🔴 -65% over-correction |
| Hermes 405B | 21mo | 30 | 14mo | 12mo | ⚠️ +22% partial |
| Llama 3.3 | 21mo | 30 | 23mo | 12mo | ❌ -92% severe backfire |
| o3-mini | 21mo | 30 | 25mo | 12mo | ❌ -108% severe backfire |
| GPT-4o | 45mo | 30 | 27mo | 24mo | ❌ -13% backfire |
| GPT-5.2 | 45mo | 30 | 33mo | 24mo | ❌ -38% backfire |
| MiniMax | 21mo | 37 | 19mo | 12mo | ❌ -58% backfire |

### Englich Debiasing at High Anchors

| Model | Anchor | n | Mean | Baseline | Effect |
|-------|--------|---|------|----------|--------|
| Opus 4.5 | 43mo | 60 | 34mo | 22mo | ❌ -55% backfire |
| Opus 4.6 | 33mo | 120 | 33mo | 18mo | ❌ -83% backfire |
| Sonnet 4.5 | 43mo | 60 | 40mo | 22mo | ❌ -82% backfire |
| Haiku 4.5 | 67mo | 120 | 47mo | 34mo | ❌ -38% backfire |
| Hermes 405B | 21mo | 20 | 13mo | 12mo | ⚠️ +11% minimal |
| o3-mini | 21mo | 20 | 21mo | 12mo | ❌ -75% backfire |
| o1 | 21mo | 20 | 24mo | 12mo | ❌ -100% backfire |
| GPT-4o | 45mo | 20 | 45mo | 24mo | ❌ -88% severe backfire |
| GPT-5.2 | 45mo | 29 | 52mo | 24mo | ❌ -117% severe backfire |

---

## Five Debiasing Failure Modes

Based on high anchor experiments:

1. **Over-correction** - Anthropic models with Sibony techniques (shoot past baseline)
2. **Partial** - Open models show incomplete debiasing (Hermes best performer)
3. **Resistant** - Some models ignore debiasing entirely
4. **Backfire** - GPT models + o3-mini with Sibony (move AWAY from baseline)
5. **Catastrophic** - GPT-5.2 with SACD (-83% = worse than no intervention)

---

## Key Findings

### No Universal Debiasing
- SACD over-corrects GPT models but under-corrects Anthropic
- Sibony techniques over-correct Anthropic but backfire on GPT/o3-mini
- Englich backfires on nearly all models at high anchors

### Model-Specific Recommendations
| Model Family | Best Technique | Avoid |
|--------------|----------------|-------|
| Anthropic Opus | SACD (calibrated) | Sibony (over-corrects) |
| Anthropic Sonnet/Haiku | None reliable | All backfire or over-correct |
| OpenAI GPT-4o/5.2 | Sibony C-H (partial) | SACD (catastrophic) |
| o3-mini | SACD only | Sibony (severe backfire) |
| Hermes 405B | Any (most robust) | - |

### Newer ≠ Better
GPT-5.2 shows MORE extreme failure modes than GPT-4o across all techniques.

---

## File Index

### No-Anchor Baselines
- `opus-no-anchor-baseline-piai.jsonl`
- `hermes-baseline-openrouter.jsonl`
- `llama33-baseline.jsonl`
- `o3-mini-baseline.jsonl`
- `minimax-baseline.jsonl`

### Low Anchor (3mo)
- `*-full-sacd.jsonl` (contain low anchor SACD trials)
- `*-debiasing-sweep.jsonl` (older format, mixed techniques)
- `gpt4o-debiasing-30.jsonl`

### High Anchor (Symmetric)
- `sibony-high-anchor-*mo-*.jsonl` (Sibony experiments)
- `*-24mo-sacd.jsonl` / `*-45mo-sacd.jsonl` (SACD high anchor)
- `anthropic-sibony-high-*.jsonl` (Anthropic Sibony)
- `*-englich-*mo-*.jsonl` (Englich experiments)

---

*Generated by validation script. Run `npx tsx scripts/validate-all-experiments.ts` for latest counts.*
