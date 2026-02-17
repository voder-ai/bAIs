# Experiment Backlog — Fill Coverage Gaps

Created: 2026-02-17 03:50 UTC
Goal: Complete full suite (baseline + controls + SACD + debiasing) for all models

## Legend

- ✅ Complete
- 🔄 In progress
- ❌ Missing
- ⚠️ Partial

## Full Suite Requirements Per Model

1. **Baseline** — 60 trials (30 low + 30 high anchor)
2. **Controls** — 60 trials (30 token-matched + 30 3-turn-random)
3. **Single-pass SACD** — 60 trials (one iteration only, `*-sacd.jsonl`)
4. **Full iterative SACD** — 60 trials (up to 3 iterations, `*-full-sacd.jsonl`)
5. **Debiasing** — 150 trials (6 techniques × 25 trials each)

Total per model: ~390 trials

**Note:** Single-pass vs full iterative SACD matters! See commit 4d01242 for dramatic differences (45% → 96% for GPT-4o).

---

## Priority 1: Near-Complete Models

### Opus 4.6 (Atlas)

- [x] Baseline ✅ (30 trials)
- [x] Controls ✅ (60 trials)
- [ ] SACD ❌ (60 trials needed)
- [ ] Debiasing ❌ (150 trials needed)

### MiniMax M2.5 (Atlas)

- [x] Baseline ✅ (60 trials)
- [ ] Controls ❌ (60 trials needed)
- [x] SACD ✅ (60 trials)
- [ ] Debiasing ❌ (150 trials needed)

### Llama 3.3 (Atlas - OpenRouter)

- [x] Baseline ✅
- [x] Controls ⚠️ (partial - need verification)
- [x] SACD ✅
- [ ] Debiasing ❌ (150 trials needed)

---

## Priority 2: Baseline-Only Models

### GPT-4o (Atlas - GitHub Copilot)

- [x] Baseline ✅
- [ ] Controls ❌ (60 trials)
- [x] SACD ✅
- [ ] Debiasing ⚠️ (partial)

### Hermes 405B (Atlas - OpenRouter free tier)

- [x] Baseline ✅
- [ ] Controls ❌ (60 trials)
- [x] SACD ✅
- [ ] Debiasing ⚠️ (partial)

### Sonnet 4 (Atlas)

- [x] Baseline ✅
- [ ] Controls ❌ (60 trials)
- [ ] SACD ❌ (60 trials)
- [ ] Debiasing ❌ (150 trials)

### Haiku 4.5 (Atlas)

- [x] Baseline ✅
- [ ] Controls ❌ (60 trials)
- [ ] SACD ❌ (60 trials)
- [ ] Debiasing ❌ (150 trials)

### Gemma 2 9B (Atlas - OpenRouter)

- [x] Baseline ✅
- [ ] Controls ❌ (60 trials)
- [ ] SACD ❌ (60 trials)
- [ ] Debiasing ⚠️ (partial)

### o1 (Pilot - Codex CLI)

- [x] Baseline ✅
- [ ] Controls ❌ (60 trials)
- [ ] SACD ❌ (60 trials)
- [ ] Debiasing ❌ (150 trials)

### o1-mini (needs baseline)

- [ ] Baseline ❌
- [ ] Controls ❌
- [ ] SACD ❌
- [ ] Debiasing ❌

### o1-preview (needs baseline)

- [ ] Baseline ❌
- [ ] Controls ❌
- [ ] SACD ❌
- [ ] Debiasing ❌

### Mistral 7B (Atlas - OpenRouter)

- [ ] Baseline ❌
- [ ] Controls ❌
- [ ] SACD ❌
- [ ] Debiasing ❌

### Gemini 2.0 Flash (Atlas - OpenRouter)

- [x] Baseline ⚠️ (smoke test only)
- [ ] Controls ❌
- [ ] SACD ❌
- [ ] Debiasing ❌

---

## Work Assignment

### Atlas (Vultr) — Anthropic + OpenRouter models

1. Opus 4.6: SACD + Debiasing
2. MiniMax M2.5: Controls + Debiasing
3. Sonnet 4: Controls + SACD + Debiasing
4. Haiku 4.5: Controls + SACD + Debiasing
5. Llama 3.3: Debiasing
6. Hermes 405B: Controls + Debiasing
7. Gemma 2 9B: Controls + SACD + Debiasing
8. Gemini 2.0 Flash: Full suite
9. Mistral 7B: Full suite

### Pilot (Mac) — OpenAI/Codex CLI models

1. o1: Controls + SACD + Debiasing
2. o1-mini: Full suite
3. o1-preview: Full suite
4. GPT-4o: Controls + Debiasing completion

---

## Estimated Trial Counts

| Instance  | Missing Trials | Est. Time (@ 30s/trial) |
| --------- | -------------- | ----------------------- |
| Atlas     | ~1,500         | ~12.5 hours             |
| Pilot     | ~1,000         | ~8.3 hours              |
| **Total** | ~2,500         | ~20.8 hours             |

---

## Execution Order (Atlas)

Starting with near-complete models first:

```bash
# 1. Opus 4.6 SACD (60 trials, ~1h with multi-turn)
npx tsx scripts/run-opus46-sacd.ts

# 2. Opus 4.6 Debiasing (150 trials, ~1.5h)
npx tsx scripts/run-opus46-debiasing.ts

# 3. MiniMax Controls (60 trials)
npx tsx scripts/run-minimax-controls.ts

# 4. Continue with remaining models...
```

---

## Progress Tracking

| Model        | Controls | SACD | Debiasing | Completed  |
| ------------ | -------- | ---- | --------- | ---------- |
| Opus 4.6     | ✅       | ❌   | ❌        | 2026-02-17 |
| MiniMax M2.5 | ❌       | ✅   | ❌        |            |
| Llama 3.3    | ✅       | ✅   | ❌        |            |
| ...          |          |      |           |            |
