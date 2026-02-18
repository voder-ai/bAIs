# Data Reassessment — What We Actually Found

**Total:** 11,907 valid data points across 276 files

## Raw Patterns (No Interpretation)

### Pattern A: Anchor-Tracking (shifts toward anchor)
| Model | No-Anchor | Low (3mo) | High (9mo) | High (24mo) |
|-------|-----------|-----------|------------|-------------|
| GPT-4o | 24.4 | 4.2 | 9.4 | 24.0 |
| GPT-5.2 | 32.1 | 7.5 | 10.5 | 28.2 |
| Opus 4.5 | 21.2 | 7.0 | 10.2 | 18.0 |
| MiniMax | 11.6 | 4.3 | 8.7 | 19.8 |
| o3-mini | 12.0 | 4.2 | 9.8 | 33.0 |
| o1 | 11.9 | 5.5 | 10.2 | 19.5 |

**Observation:** Responses shift toward anchor direction. Higher anchor = higher response.

### Pattern B: Anchor-Insensitive (same response regardless)
| Model | No-Anchor | Low (3mo) | High (9mo) | High (24mo) |
|-------|-----------|-----------|------------|-------------|
| Opus 4.0 | - | 6.0 | 6.0 | - |
| Opus 4.6 | - | 7.0 | 6.6 | 12.0 |
| Mistral Small 3.1 | - | 6.0 | 6.0 | - |
| Sonnet 4 (dated) | - | 5.7 | 6.0 | - |

**Observation:** Response is ~6mo regardless of anchor.

### Pattern C: Near-Compliance (copies anchor closely)
Some GPT-4o runs show Low=3.0, High=9.0 (copies exactly).
Some Haiku 4.5 runs show Low=3.3, High=7.0.

**But:** This appears in SOME runs of models that also show Pattern A in other runs.

---

## What's Actually Solid

1. **Models differ in anchor sensitivity.** Some shift toward anchors, some ignore them.

2. **Same model shows different behavior across runs/deployments.** GPT-4o varies from copying anchors exactly to moderate shifting.

3. **24mo anchor reveals different behavior than 3/9mo.** o3-mini shows 33mo (overshooting), while Opus 4.6 shows 12mo (ignoring).

4. **Baselines vary dramatically.** GPT-5.2 baseline = 32mo, o3-mini = 12mo, GPT-4o = 24mo.

---

## What's Uncertain

1. **Is "compliance" (copying anchor) a distinct mechanism or just strong susceptibility?**
   - Could be endpoint of a susceptibility spectrum

2. **What causes same-model variance?**
   - Deployment (IP, API version)?
   - Random sampling?
   - Time-based model updates?

3. **Is 12mo baseline influenced by "12th offense"?**
   - Waiting for Pilot's confound test

---

## Honest Reframe Options

### Option 1: Susceptibility Spectrum
- Immune (Opus 4.6) → Weak → Moderate → Strong → Compliance (GPT-4o Residential)
- Single dimension, no distinct "mechanisms"

### Option 2: Two Categories
- **Anchor-Sensitive:** Responds to anchor presence (varying degrees)
- **Anchor-Immune:** Ignores anchors (~6mo fixed response)

### Option 3: Keep Three, But Reframe
- **Immune:** No response to anchors
- **Susceptible:** Shifts toward anchor (varying degrees)
- **Compliance:** Copies anchor exactly (may be extreme susceptibility)

---

## Waiting For

1. **"12th offense" confound test** — Does removing "12" change baseline?
2. **Tom's direction** — Which framing is most honest?
