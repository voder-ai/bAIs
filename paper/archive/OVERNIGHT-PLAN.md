# Overnight Experiment Plan (REVISED)

**Date:** 2026-02-18
**Goal:** Bulletproof the 12th offense confound finding

---

## LLM Review Feedback (Applied)

1. ✅ Reduced scope to focus on core finding
2. ✅ Increased sample size target (n=100+)
3. ✅ Pre-specified analysis thresholds
4. ✅ Prioritized Tier 1 experiments

---

## Core Discovery

**The "12th offense" in our vignette acts as an implicit anchor.**

- With "12th offense": responses cluster at 24mo
- With "multiple offenses": responses cluster at 12mo
- Pattern: 12 × 2 = 24 (needs confirmation with larger n)

---

## Revised Experiment Plan

### Priority 1: Confirm 12×2 Pattern (ESSENTIAL)

**Target:** n=100+ per condition
**Models:** Opus 4.5 (primary), one backup

Tests:

- Condition A: "12th offense" → expect 24mo
- Condition B: "multiple offenses" → expect 12mo

**Success criterion:** Effect size d > 2.0 with p < 0.001

### Priority 2: Establish True Baseline

**Target:** n=30 per model
**Models:** Opus 4.5, o3-mini

Test: Vignette without ANY prosecutor anchor AND "multiple offenses"

- This establishes what models produce with no numeric cues

### Priority 3: 24mo Anchor Test (if time permits)

**Target:** n=30
**Model:** Opus 4.5

Test: True baseline vs 24mo anchor

- Confirms HIGH anchor pulls responses UP

---

## Pre-Specified Analysis

**Primary analysis:**

- Welch's t-test for condition differences
- Effect size: Cohen's d
- Threshold: d > 2.0 to claim "strong effect"

**Decision rules:**

- If d > 2.0 and p < 0.001: Core finding confirmed
- If d < 1.0: Finding needs reexamination
- If 1.0 < d < 2.0: Finding suggestive but needs more data

---

## Taxonomy Recommendation

Based on LLM review, propose **Option B:**

1. **Immune** — No response to anchors (~6mo fixed)
2. **Susceptible** — Shifts toward anchor (varying degrees)
3. **Compliant** — Copies anchor exactly

This avoids claiming "mechanisms" and describes behavioral patterns.

---

## Execution Timeline

**12:45-13:45 UTC (1h):** Pilot runs 12th offense confirmation (n=100)
**12:45-13:45 UTC (1h):** Atlas runs true baseline experiments
**13:45-14:30 UTC (45m):** Analyze results, calculate effect sizes
**14:30-15:00 UTC (30m):** Draft paper revisions

**Ready for Tom by ~15:00 UTC (morning in Sydney)**

---

## Success Criteria (Minimum Viable)

Before waking Tom, we need:

1. ✅ 12th offense confound confirmed (n≥100, d>2.0)
2. ⏳ True baseline established for 2+ models
3. ⏳ Clear taxonomy recommendation
4. ⏳ Draft abstract revision

---

## Current Status

- ✅ 12th offense discovery (Pilot, n=39)
- ✅ Data audit complete (11,907 points)
- ⏳ Confirmation experiment (need n=100)
- ⏳ True baseline experiments
