# Plan: 24mo Anchor + SACD Experiments Across All Models (v2)

**Date:** 2026-02-18
**Author:** Atlas
**Status:** DRAFT v2 - Addressing Review Feedback
**Review Score v1:** 68/100

---

## Objective

Run debiasing experiments on the 24-month anchor across ALL models (not just GPT-4o).

Tom's pre-bed requests:
1. "Run the debiasing (including SACD) experiments on the 24 month anchor"
2. "Need to do 24mths on Sibony as well"
3. "Don't use GPT-4o... we need to run across all the models"

---

## Debiasing Protocols to Test

### 1. SACD (Self-Aware Counterfactual Dialogue)
**Source:** Lyu et al. 2025
**Protocol:**
1. Present biased prompt to model
2. Ask model to identify biased sentences (label BIASED/NOT_BIASED)
3. Ask model to analyze bias type (anchoring, framing, etc.)
4. Ask model to rewrite prompt removing bias
5. Extract final sentence from debiased prompt
**Max iterations:** 3

### 2. Sibony Protocol
**Source:** Olivier Sibony's debiasing techniques
**Protocol:**
1. Context hygiene: Remove unnecessary numeric context
2. Multiple perspectives: Ask for range of possible sentences
3. Devil's advocate: Ask model to argue against its initial response
4. Extract final sentence after reflection
**Steps:** 4-turn dialogue

---

## Models to Test

| Model | Provider | Baseline | Notes |
|-------|----------|----------|-------|
| Opus 4.5 | OpenRouter | ~20mo | Primary model |
| Opus 4.6 | OpenRouter | ~6mo? | Potentially immune |
| o3-mini | OpenRouter | ~18mo | Strong amplifier |
| Hermes 405B | OpenRouter | ~12mo | Compression |
| MiniMax M2.5 | OpenRouter | ~12mo | Variable |
| o1 | OpenRouter | ~12mo | Reasoning model |

**NOT INCLUDED:** GPT-4o (deployment variance issues per Tom)

---

## Experimental Conditions

For each model, test 4 conditions:

| Condition | Anchor | Debiasing | n |
|-----------|--------|-----------|---|
| Baseline | 24mo | None | 30 |
| SACD | 24mo | SACD protocol | 30 |
| Sibony | 24mo | Sibony protocol | 30 |
| Control (3mo) | 3mo | None | 30 |

**Total per model:** 120 trials
**Total overall:** 720 trials (6 models × 120)

---

## Tasks

### Phase 0: Pilot Run (30 min) [NEW]
1. Test 5 trials per condition on Opus 4.5 only
2. Validate extraction accuracy
3. Identify any protocol issues
4. **Checkpoint:** Confirm setup works before full run

### Phase 1: Setup (30 min)
1. Verify all models accessible via OpenRouter
2. Create/verify experiment scripts
3. Set up checkpointing (save after each model)
4. Set up data validation (format checks)

### Phase 2: Baseline + Control Collection (2 hours)
1. Run 24mo baseline + 3mo control on all 6 models
2. n=30 per condition per model = 360 trials
3. **Checkpoint after each model**
4. Log to `results/24mo-baseline-{model}.jsonl`

### Phase 3: SACD Collection (3 hours)
1. Run 24mo + SACD on all 6 models
2. n=30 per model = 180 trials
3. **Checkpoint after each model**
4. Log to `results/24mo-sacd-{model}.jsonl`

### Phase 4: Sibony Collection (3 hours)
1. Run 24mo + Sibony on all 6 models
2. n=30 per model = 180 trials
3. **Checkpoint after each model**
4. Log to `results/24mo-sibony-{model}.jsonl`

### Phase 5: Analysis (1 hour)
1. Calculate effect sizes for each condition
2. Statistical tests: Welch's t-test, Cohen's d
3. Compare HIGH (24mo) vs LOW (3mo) anchor effects
4. Compare SACD vs Sibony effectiveness

### Phase 6: Documentation (30 min)
1. Create summary table
2. Write findings paragraph
3. Commit all results

---

## Data Validation [NEW]

Each response must:
1. Contain valid JSON with `sentenceMonths` field
2. `sentenceMonths` is integer 0-60
3. For SACD: `sacdIterations` tracked
4. For Sibony: all 4 turns completed

**On validation failure:**
- Log error
- Retry up to 3 times
- Mark as failed if still invalid

---

## Statistical Analysis Plan [NEW]

### Primary comparison:
- HIGH anchor effect: 24mo baseline vs 24mo SACD vs 24mo Sibony
- Metric: Mean sentence reduction (months)

### Secondary comparison:
- HIGH vs LOW: Compare 24mo SACD effect to existing 3mo/9mo SACD data
- Test: Are effect sizes significantly different?

### Success thresholds:
- Effect size d > 0.5 = meaningful debiasing
- p < 0.05 with Bonferroni correction

---

## Success Criteria

1. ✅ Pilot run validates setup (5 trials/condition)
2. ✅ 24mo baseline collected for ≥5 models (n≥25 each)
3. ✅ 24mo SACD collected for ≥5 models (n≥25 each)
4. ✅ 24mo Sibony collected for ≥5 models (n≥25 each)
5. ✅ Checkpoints saved after each model
6. ✅ Clear finding: Does SACD/Sibony work on HIGH anchors?

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Rate limiting | Exponential backoff, sequential execution |
| Model unavailable | Skip and document, proceed with others |
| Extraction failures | 3 retries, log failures, aim n≥25 |
| Time overrun | Checkpoint after each model; minimum viable = 3 models |
| Protocol errors | Pilot run catches issues early |

### Rollback Strategy
- Git commit before starting
- If major issues: use checkpoint data, don't re-run completed models
- Minimum viable: Opus 4.5 + o3-mini + one other = valid finding

---

## Estimated Time

| Phase | Time |
|-------|------|
| Phase 0: Pilot | 30 min |
| Phase 1: Setup | 30 min |
| Phase 2: Baselines | 2 hours |
| Phase 3: SACD | 3 hours |
| Phase 4: Sibony | 3 hours |
| Phase 5: Analysis | 1 hour |
| Phase 6: Documentation | 30 min |
| **Total** | **10.5 hours** |

---

## Division of Labor

- **Atlas (Vultr):** Opus 4.5, Opus 4.6, Hermes 405B
- **Pilot (Mac):** o3-mini, MiniMax M2.5, o1

---

## Review Request

Please evaluate this revised plan (v2) for:
1. **Completeness** — All critical issues from v1 addressed?
2. **Feasibility** — Is 10.5 hours realistic?
3. **Logic** — Does the experimental design make sense?
4. **Risks** — Are mitigations adequate?

Score 0-100. If ≥75, mark APPROVED FOR EXECUTION.
