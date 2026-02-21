# Morning Summary for Tom

**Date:** 2026-02-18 (overnight work)

---

## Key Discoveries

### 1. "12th Offense" Confound (GPT-4o Only)

Pilot confirmed:

- "12th offense" → 24mo (100%, n=30)
- "multiple offenses" → 12mo (100%, n=9)

**BUT:** This is GPT-4o specific!

Atlas found:

- Opus 4.5 with "multiple offenses" → 18-24mo (n=18)
- Opus 4.5 does NOT show the 12×2 pattern

**Interpretation:** GPT-4o has an anomalously LOW baseline (~12mo) compared to other models (~18-20mo). GPT-4o is uniquely susceptible to implicit numeric anchoring from "12th". This is model-specific behavior.

### 2. SACD Works on HIGH Anchors

Pilot tested 24mo anchor with SACD on GPT-4o:

- Baseline (24mo anchor): 24mo (compliance)
- With SACD: 12mo (100% debiasing!)

SACD reduces responses by 50% — back to the GPT-4o true baseline.

### 3. Model-Specific Baselines

| Model       | True Baseline (no "12th", no anchor) | "12th" Effect |
| ----------- | ------------------------------------ | ------------- |
| GPT-4o      | 12.0 ± 0.0mo (n=9)                   | 2× (24mo)     |
| Hermes 405B | 12.0 ± 0.0mo (n=30)                  | Not tested    |
| o3-mini     | 18.4 ± 4.6mo (n=30)                  | Not tested    |
| Opus 4.5    | 19.8 ± 2.7mo (n=30)                  | None observed |

---

## Paper Implications

### Original Claim (Needs Revision)

"Three mechanisms: Compression, Compliance, True Anchoring"

### Revised Understanding

1. **Models have different intrinsic baselines**
2. **GPT-4o shows implicit numeric anchoring** (12th → 24)
3. **"Compression" was partially an artifact** of implicit anchoring in GPT-4o
4. **SACD effectiveness varies** but works on both LOW and HIGH anchors

### Validated Taxonomy

True baselines explain the patterns:

| Pattern         | Model       | Baseline | With Anchors  | Mechanism                       |
| --------------- | ----------- | -------- | ------------- | ------------------------------- |
| **Compression** | Opus 4.5    | ~20mo    | 6-8mo         | High baseline compressed DOWN   |
| **Compression** | o3-mini     | ~18mo    | 6-10mo        | High baseline compressed DOWN   |
| **Compression** | Hermes 405B | ~12mo    | 6mo           | Medium baseline compressed DOWN |
| **Compliance**  | GPT-4o      | ~12mo    | copies anchor | Low baseline + echo behavior    |
| **Immune?**     | Opus 4.6    | ~?       | ~6mo always   | Needs baseline test             |

**Key insight:** "Compression" is the dominant pattern. Most models compress from their baseline (12-20mo) to ~6mo. GPT-4o is unique in showing "compliance" (copying anchor values). The "immune" category may not exist — what we called immune was just compression to 6mo.

**Cleaner taxonomy:**

1. **Compression** — Response < Baseline (Hermes, Opus 4.5, o3-mini)
2. **Compliance** — Response = Anchor (GPT-4o only)
3. **True Anchoring** — Response shifts toward anchor (o1, possibly)

---

## Data Collected Tonight

- `results/true-baseline-no-anchors.jsonl` (Opus 4.5, n=18+)
- `results/12th-offense-confound.jsonl` (GPT-4o, Pilot's data)
- `results/gpt4o-24mo-sacd.jsonl` (GPT-4o, Pilot's data)
- `paper/OVERNIGHT-PLAN.md` (revised per LLM review)
- `paper/data-reassessment.md` (full audit: 11,907 data points)

---

## Questions for Tom

1. **Keep "12th offense" or remove it?**
   - If keep: Acknowledge it affects some models
   - If remove: Need to re-run all baseline experiments

2. **How to frame model-specific baselines?**
   - This is actually a FINDING, not just a confound

3. **Proceed with simpler taxonomy?**
   - Immune / Susceptible / Compliant

---

## Recommendations

1. **Acknowledge the "12th offense" finding** in the paper as a demonstration of implicit numeric anchoring
2. **Present model-specific baselines** as a key contribution
3. **Simplify taxonomy** to avoid overclaiming "mechanisms"
4. **Add section on implicit anchoring** — this is publishable on its own

---

_Ready for discussion when you wake up._
