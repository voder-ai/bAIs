# bAIs Experiment Backlog

**Updated: 2026-02-17 22:15 AEDT**

## CRITICAL GAPS (Adversarial Check Items)

### 1. Prompt Template Coverage (INCOMPLETE)

**Purpose:** Validate cross-model claims aren't prompt-specific

| Model       | Original | Casual | Structured | Status           |
| ----------- | -------- | ------ | ---------- | ---------------- |
| GPT-5.2     | ✅       | ❌     | ❌         | Needs 2 variants |
| GPT-5.3     | ✅       | ❌     | ❌         | Needs 2 variants |
| GPT-4o      | ✅       | ❌     | ❌         | Needs 2 variants |
| Opus 4.5    | ✅       | ❌     | ❌         | Needs 2 variants |
| Opus 4.6    | ✅       | ❌     | ❌         | Needs 2 variants |
| Haiku 4.5   | ✅       | ❌     | ❌         | DEPRECATED       |
| Llama 3.3   | ✅       | ❌     | ❌         | Needs 2 variants |
| Hermes 405B | ✅       | ❌     | ❌         | Needs 2 variants |
| MiniMax     | ✅       | ❌     | ❌         | Needs 2 variants |
| o1          | ✅       | ❌     | ❌         | Needs 2 variants |
| o3-mini     | ✅       | ❌     | ❌         | Needs 2 variants |

**Trials needed:** 10 models × 2 variants × 2 anchors × 30 trials = 1,200 calls

---

### 2. Temperature Sweep (INCOMPLETE)

**Purpose:** Validate "dead zone at 0.7" finding generalizes

| Model     | temp=0 | temp=0.3 | temp=0.5 | temp=0.7 | temp=1.0 | Status        |
| --------- | ------ | -------- | -------- | -------- | -------- | ------------- |
| GPT-4o    | ✅     | ✅       | ✅       | ✅       | ✅       | Complete      |
| GPT-5.2   | ✅     | ✅       | ❌       | ✅       | ✅       | Needs 0.5     |
| Opus 4.5  | ✅     | ❌       | ❌       | ❌       | ❌       | Needs 4 temps |
| Opus 4.6  | ✅     | ❌       | ❌       | ❌       | ❌       | Needs 4 temps |
| Llama 3.3 | ✅     | ❌       | ❌       | ❌       | ❌       | Needs 4 temps |

**Trials needed:** 4 models × 4 temps × 2 anchors × 30 trials = 960 calls

---

### 3. Random Baseline (MISSING)

**Purpose:** Calibrate what "anchoring effect" looks like from noise

**Implementation:**

- Generate random responses in [1, 18] months
- Compute spurious "effect" distribution
- Report: "Effects < Xmo could be noise"

**Trials needed:** 0 (computational only)

---

### 4. Bootstrap Power Analysis (MISSING)

**Purpose:** Justify n=30 per condition

**Implementation:**

- Resample existing 30 scenarios with replacement
- Show effect estimates stable at n≥20
- Report confidence bounds on effect sizes

**Trials needed:** 0 (analysis of existing data)

---

### 5. Inter-Model Agreement (INCOMPLETE)

**Purpose:** Do models shift same direction?

| Model       | No-Anchor Control | Status          |
| ----------- | ----------------- | --------------- |
| GPT-5.2     | ✅ 30 trials      | Complete        |
| Opus 4.5    | ✅ 30 trials      | Complete        |
| Hermes 405B | ✅ 30 trials      | Complete        |
| GPT-4o      | ❌                | Needs 30 trials |
| Llama 3.3   | ❌                | Needs 30 trials |
| MiniMax     | ❌                | Needs 30 trials |
| o1          | ❌                | Needs 30 trials |
| o3-mini     | ❌                | Needs 30 trials |

**Trials needed:** 5 models × 30 trials = 150 calls

---

### 6. Contamination Analysis (ANALYSIS ONLY)

**Purpose:** Compare classic vs novel effect sizes

**Data exists:** Table 9 has classic + 4 novel scenarios
**Needed:** Statistical comparison (are classic effects inflated?)

**Trials needed:** 0 (analysis of existing data)

---

## EXISTING GAPS (Model Coverage)

### Controls Coverage

| Model        | 3-Turn | Token-Matched | Random-Elab | Status              |
| ------------ | ------ | ------------- | ----------- | ------------------- |
| GPT-5.2      | ✅     | ✅            | ✅          | Complete            |
| GPT-5.3      | ✅     | ✅            | ❌          | Needs random-elab   |
| GPT-4o Mac   | ✅     | ✅            | ✅          | Complete            |
| GPT-4o Vultr | ✅     | ✅            | ❌          | Needs random-elab   |
| Opus 4.5     | ✅     | ❌            | ✅          | Needs token-matched |
| Opus 4.6     | ❌     | ❌            | ❌          | Needs all 3         |
| Haiku 4.5    | ✅     | ✅            | ❌          | DEPRECATED          |
| Llama 3.3    | ✅     | ✅            | ✅          | Complete            |
| Hermes 405B  | ✅     | ✅            | ❌          | Needs random-elab   |
| MiniMax      | ✅     | ❌            | ❌          | Needs 2 controls    |
| o1           | ✅     | ✅            | ❌          | Needs random-elab   |
| o3-mini      | ✅     | ❌            | ❌          | Needs 2 controls    |

---

## TOTAL EXPERIMENT BACKLOG

| Category                 | Trials Needed |
| ------------------------ | ------------- |
| Prompt template coverage | 1,200         |
| Temperature sweep        | 960           |
| No-anchor controls       | 150           |
| Missing controls         | ~300          |
| **TOTAL**                | ~2,610 calls  |

---

## ANALYSIS BACKLOG (No New Experiments)

1. ✅ Remove human baseline comparisons
2. ⬜ Bootstrap power analysis
3. ⬜ Random baseline calibration
4. ⬜ Contamination statistical comparison
5. ⬜ Inter-model agreement analysis (on existing data)

---

## PRIORITY ORDER

**P0 (Blockers):**

1. Remove human baseline comparisons from paper
2. Bootstrap power analysis
3. Random baseline calibration

**P1 (Major gaps):** 4. Temperature sweep (Opus 4.5, Llama 3.3) 5. No-anchor controls for remaining models 6. Contamination analysis

**P2 (Completeness):** 7. Prompt template coverage (all models) 8. Missing controls

---

## OTHER GAPS NOT YET MENTIONED

1. **Domain diversity:** All experiments use judicial sentencing. Medical/budget domains not tested.
2. **Model version pinning:** Some models use dated IDs, others undated. Reproducibility risk.
3. **Provider diversity for same model:** Only GPT-4o tested on multiple providers (Mac vs Vultr).
4. **Retry tracking:** Excluded trials not characterized (were they systematic?).
5. **Response length analysis:** Do biased responses differ in length/verbosity?
6. **Confidence calibration:** When models express uncertainty, is bias reduced?

---

_Last updated: 2026-02-17 22:15 AEDT_
