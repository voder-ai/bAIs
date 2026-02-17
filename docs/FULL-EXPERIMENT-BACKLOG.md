# FULL EXPERIMENT BACKLOG — ALL GAPS

**Created:** 2026-02-17 11:15 UTC
**Purpose:** Complete inventory of every experiment gap, no exceptions

---

## CATEGORY 1: Missing Coverage Per Model

### Per-Model Checklist (Required for "Fully Characterized")

| Check | Description | Trials |
|-------|-------------|--------|
| Baseline | 30 low + 30 high anchor | 60 |
| 3-turn control | 15 low + 15 high | 30 |
| Token-matched control | 15 low + 15 high | 30 |
| No-anchor control | 30 trials (no anchor present) | 30 |
| Full SACD | 30 low + 30 high | 60 |
| Individual debiasing | 6 techniques × 30 each | 180 |

**Total per model:** 390 trials

### Current State (✅ = Done, ❌ = Missing, ⚠️ = Partial)

| Model | Baseline | 3-turn | Token | No-anchor | SACD | Debiasing |
|-------|----------|--------|-------|-----------|------|-----------|
| GPT-5.2 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| GPT-5.3 | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| GPT-4o (Vultr) | ✅ | ✅ | ✅ | ❌ | ✅ | ⚠️ |
| GPT-4o (Mac) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Opus 4.5 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Opus 4.6 | ✅ | ✅ | ✅ | ❌ | ⚠️ | ❌ |
| Sonnet 4.5 | ✅ | ⚠️ | ⚠️ | ❌ | ✅ | ⚠️ |
| Haiku 4.5 | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| MiniMax M2.5 | ✅ | ⚠️ | ⚠️ | ❌ | ✅ | ❌ |
| o1 | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| o3-mini | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Llama 3.3 | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Hermes 405B | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Nemotron 30B | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Mistral 7B | ⚠️ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Qwen 2.5 72B | ⚠️ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Gemma 2 9B | ⚠️ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Missing trials for full per-model coverage:** ~3,500

---

## CATEGORY 2: Temperature Sweeps

### Current State
- GPT-4o: ✅ (5 temps × 60 = 300 trials)
- GPT-5.2: ✅ (3 temps × 40 = 120 trials)
- All others: ❌

### Required for Cross-Provider Claim
| Model | Temps | Trials Needed |
|-------|-------|---------------|
| Opus 4.5 | 0, 0.5, 0.7, 1.0 | 240 |
| Sonnet 4.5 | 0, 0.5, 0.7, 1.0 | 240 |
| Llama 3.3 | 0, 0.5, 0.7, 1.0 | 240 |

**Missing trials:** 720

---

## CATEGORY 3: Prompt Template Variants

### Current State
- 3 variants exist (original, casual, structured)
- Only tested on ~3 models

### Required for Cross-Prompt Robustness
| Model | Variants Needed | Trials |
|-------|-----------------|--------|
| GPT-5.2 | 3 × 60 | 180 |
| GPT-4o | 3 × 60 | 180 |
| Opus 4.5 | 3 × 60 | 180 |
| Sonnet 4.5 | 3 × 60 | 180 |
| Llama 3.3 | 3 × 60 | 180 |

**Missing trials:** ~900 (already have some)

---

## CATEGORY 4: Alternative Anchor Values

### Current State
- Only 3mo (low) and 9mo (high) tested
- No intermediate or extreme anchors

### Required for Anchor Magnitude Analysis
| Condition | Anchors | Purpose |
|-----------|---------|---------|
| Extreme low | 1mo | Test floor effect |
| Mid-low | 4mo | Gradient check |
| Neutral | 6mo | Baseline proxy |
| Mid-high | 8mo | Gradient check |
| Extreme high | 12mo | Test ceiling effect |

**Minimum:** 3 key models × 4 new anchors × 30 trials = 360

---

## CATEGORY 5: Novel Scenarios (Beyond Anchoring)

### Current State
- Anchoring: 5 scenarios (classic + 4 novel) ✅
- Framing: Classic only ⚠️
- Conjunction: Classic only ⚠️
- Sunk Cost: Classic only ⚠️

### Required for Generalization Claim
| Bias | Novel Scenarios Needed | Trials |
|------|------------------------|--------|
| Framing | 2 novel variants | 120 |
| Conjunction | 2 novel variants | 120 |
| Sunk Cost | 2 novel variants | 120 |

**Missing trials:** 360

---

## CATEGORY 6: Analytical Gaps (No New Experiments)

| Analysis | Data Exists? | Time |
|----------|--------------|------|
| Bootstrap power/stability | ✅ Yes | 1 hour |
| Random baseline simulation | N/A | 30 min |
| Classic vs novel comparison | ✅ Yes | 1 hour |
| Inter-model direction agreement | ✅ Yes | 1 hour |
| Contamination statistical test | ✅ Yes | 30 min |

**Total analysis time:** ~4 hours

---

## CATEGORY 7: Other Potential Gaps

### Not Currently Planned But Possible Reviewer Questions

| Gap | Experiments? | Priority |
|-----|--------------|----------|
| System prompt variations | Yes | Low |
| Response format (JSON vs prose) | Yes | Low |
| Multi-turn baseline vs single-turn | Yes | Medium |
| Different judge/prosecutor identities | Yes | Low |
| Non-English prompts | Yes | Low |
| Longer context windows | Yes | Low |
| Different random seeds (temp>0) | Yes | Medium |
| Chain-of-thought prompting variants | Yes | Medium |

---

## SUMMARY: TOTAL MISSING WORK

| Category | Trials | Time Est |
|----------|--------|----------|
| Per-model coverage | 3,500 | 30h |
| Temperature sweeps | 720 | 6h |
| Prompt variants | 900 | 8h |
| Anchor values | 360 | 3h |
| Novel scenarios | 360 | 3h |
| Analysis (no calls) | 0 | 4h |
| **TOTAL** | **5,840** | **54h** |

---

## PRIORITIZED EXECUTION ORDER

### Tier 1: Essential for Workshop Submission (4-6h)
1. ✅ All SACD n≥30 — DONE
2. Bootstrap power analysis — 1h
3. Random baseline simulation — 30min
4. Inter-model agreement analysis — 1h
5. Classic vs novel contamination test — 30min

### Tier 2: Strengthens for Main Conference (20h)
1. No-anchor controls for all models — 500 trials / 4h
2. Temperature sweeps (Opus, Llama) — 480 trials / 4h
3. Prompt template coverage — 540 trials / 4h
4. Missing controls for partial models — 400 trials / 3h
5. GPT-5.3, o3-mini full controls — 200 trials / 2h

### Tier 3: Complete Coverage (30h)
1. All debiasing for all models — 2,000+ trials
2. Anchor value gradient — 360 trials
3. Novel scenarios for other biases — 360 trials
4. Remaining model completions

---

## BLOCKERS

| Model | Blocker |
|-------|---------|
| Haiku 4.5 | ❌ Deprecated — no further experiments possible |
| o1/o3 | Rate limits, Pilot-only |
| MiniMax | Inconsistent API availability |

---

## CATEGORY 8: Additional Reviewer Anticipation

### Things We Haven't Done That Could Be Asked

| Question | Current Answer | Fix |
|----------|----------------|-----|
| Why these 9 models? | Ad hoc selection | Add justification paragraph |
| Cost/token comparison? | Not reported | Add SACD vs baseline token counts |
| Latency comparison? | Not reported | Add timing data from existing logs |
| Adversarial SACD attacks? | Not tested | Design adversarial prompts that trick SACD |
| Fine-tuning comparison? | Not tested | Out of scope (declare) |
| Real-world validity? | Lab tasks only | Acknowledged limitation |
| Cross-domain (non-judicial)? | Not done | Acknowledged limitation |
| Long-form responses? | Only short numeric | Could test essay-length responses |
| Multi-model ensemble? | Not tested | Out of scope |
| Prompt injection via anchor? | Not tested | Design injection attacks |

### Data We Have But Haven't Analyzed

| Data | Analysis Needed |
|------|-----------------|
| Response distributions | Full histogram plots per model |
| Response times | Timing analysis per intervention |
| Token counts | Cost comparison SACD vs baseline |
| Error messages | Categorize failure modes |
| Iteration counts (SACD) | How many iterations typically needed? |

---

## HONEST ASSESSMENT: What's Missing vs What's Enough

### For Workshop/Findings (Current State)
- ✅ Core claim supported (bias exists, SACD works on some)
- ✅ Failure modes documented
- ✅ Provider variance documented
- ⚠️ Sample size justification weak (add bootstrap)
- ⚠️ Cross-model claims slightly overstated (need prompt coverage)

### For Main Conference
- ❌ Temperature sweeps incomplete
- ❌ No-anchor controls incomplete
- ❌ Individual debiasing coverage sparse
- ❌ Novel scenarios only for anchoring

### For "Definitive" Paper
- ❌ Full 390-trial suite for all models
- ❌ Multiple domains (medical, legal, hiring)
- ❌ Human baseline validation
- ❌ Longitudinal stability testing

---

**Owner:** Atlas + Pilot
**Last Updated:** 2026-02-17 11:20 UTC
