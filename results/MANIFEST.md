# Results Manifest

## Model List (10 models) — All via OpenRouter

### Anthropic (3)

| Model      | OpenRouter ID                 | Rationale                   |
| ---------- | ----------------------------- | --------------------------- |
| Opus 4.6   | `anthropic/claude-opus-4.6`   | Latest Anthropic flagship   |
| Sonnet 4.6 | `anthropic/claude-sonnet-4.6` | Mid-tier, high volume usage |
| Haiku 4.5  | `anthropic/claude-haiku-4.5`  | Fast/cheap tier             |

### OpenAI (4)

| Model   | OpenRouter ID    | Rationale                              |
| ------- | ---------------- | -------------------------------------- |
| GPT-5.2 | `openai/gpt-5.2` | Latest OpenAI flagship (non-reasoning) |
| GPT-4.1 | `openai/gpt-4.1` | Smartest non-reasoning model           |
| o3      | `openai/o3`      | Full reasoning model                   |
| o4-mini | `openai/o4-mini` | Cost-effective reasoning model         |

### Open Source (4) — Top by OpenRouter usage

| Model         | OpenRouter ID            | Rationale                       |
| ------------- | ------------------------ | ------------------------------- |
| Kimi K2.5     | `moonshotai/kimi-k2.5`   | #2 by usage (1.24T tokens/week) |
| GLM 5         | `z-ai/glm-5`             | #3 by usage (1.03T tokens/week) |
| DeepSeek V3.2 | `deepseek/deepseek-v3.2` | #5 by usage (738B tokens/week)  |

---

## Experimental Variables

### Temperature (3 levels)

| Temp | Description                   |
| ---- | ----------------------------- |
| 0    | Deterministic (argmax)        |
| 0.7  | Standard deployment           |
| 1.0  | High variance (full sampling) |

### Anchor Design — Proportional (Additive Symmetry)

| Anchor   | Formula          | Example (baseline=18mo) |
| -------- | ---------------- | ----------------------- |
| **Low**  | `baseline / 2`   | 9mo (−50%)              |
| **High** | `baseline × 1.5` | 27mo (+50%)             |

**Option B approach:** Baselines averaged across all temps → single anchor set per model → same anchors used at all temps. This enables clean comparison of "does temperature affect anchoring susceptibility?"

---

## Trial List (11 conditions × 3 temps)

### Core Anchoring (3 conditions)

| Condition       | Script               | Anchor         |
| --------------- | -------------------- | -------------- |
| **baseline**    | `run-baseline.ts`    | None           |
| **low-anchor**  | `run-low-anchor.ts`  | baseline / 2   |
| **high-anchor** | `run-high-anchor.ts` | baseline × 1.5 |

### SACD Debiasing (2 conditions)

| Condition     | Script        | Anchor         |
| ------------- | ------------- | -------------- |
| **sacd-low**  | `run-sacd.ts` | baseline / 2   |
| **sacd-high** | `run-sacd.ts` | baseline × 1.5 |

### Random Elaboration Control (2 conditions) — Reviewer-requested

| Condition               | Script                  | Anchor         |
| ----------------------- | ----------------------- | -------------- |
| **random-control-low**  | `run-random-control.ts` | baseline / 2   |
| **random-control-high** | `run-random-control.ts` | baseline × 1.5 |

**Purpose:** Token-matched filler text instead of SACD reasoning. Isolates LENGTH effects (multi-turn structure) from CONTENT effects (actual debiasing reasoning). Reviewer praised this as "novel methodology."

### Sibony Debiasing (6 conditions)

| Condition                | Script                   | Anchor         |
| ------------------------ | ------------------------ | -------------- |
| **outside-view-low**     | `run-outside-view.ts`    | baseline / 2   |
| **outside-view-high**    | `run-outside-view.ts`    | baseline × 1.5 |
| **premortem-low**        | `run-premortem.ts`       | baseline / 2   |
| **premortem-high**       | `run-premortem.ts`       | baseline × 1.5 |
| **devils-advocate-low**  | `run-devils-advocate.ts` | baseline / 2   |
| **devils-advocate-high** | `run-devils-advocate.ts` | baseline × 1.5 |

**Design notes:**

- **Jurisdiction:** Only Outside View includes German federal court context (needed for base rate estimation). Other Sibony techniques use baseline vignette without jurisdiction.
- **Final prompt:** All Sibony techniques use neutral final prompt ("What is your final sentencing decision?") to measure implicit priming, not instruction-following.
- **Englich structure:** All follow 4-5 turn structure with prosecutor demand (anchor) + defense demand (1mo) + final decision.

### Token-Matched Random Control (2 conditions)

| Condition               | Script                  | Anchor         |
| ----------------------- | ----------------------- | -------------- |
| **random-control-low**  | `run-random-control.ts` | baseline / 2   |
| **random-control-high** | `run-random-control.ts` | baseline × 1.5 |

**Purpose:** Isolate content effects from length/turn-count effects. Same structure as Sibony techniques but with irrelevant content.

**Critical design rationale (addressing turn count confound):**

| Condition      | Turns | Content    | Purpose                |
| -------------- | ----- | ---------- | ---------------------- |
| Baseline       | 3     | None       | Reference              |
| Sibony         | 4-5   | Debiasing  | Test intervention      |
| Random Control | 4-5   | Irrelevant | Control for turn count |

**Interpretation:**

- If Sibony > Random Control → debiasing CONTENT matters
- If Sibony ≈ Random Control → effect is from extra turns/thinking time, not content
- If Random Control > Baseline → turn count alone affects responses

This is standard experimental design for isolating content vs. structure effects. Random Control directly addresses the confound that Sibony techniques use more turns than baseline.

---

## Experiment Design

### Per Condition

- **n = 30 trials** per model per condition per temperature
- **3 temperatures:** 0, 0.7, 1.0
- **3-turn structure** for anchor conditions (Englich paradigm)

### Output Files

```
results/
├── baseline-<model>-t0.jsonl
├── baseline-<model>-t07.jsonl
├── baseline-<model>-t1.jsonl
├── low-anchor-<model>-t<temp>.jsonl
├── high-anchor-<model>-t<temp>.jsonl
├── sacd-<anchor>mo-<model>-t<temp>.jsonl
├── outside-view-<anchor>mo-<model>-t<temp>.jsonl
├── premortem-<anchor>mo-<model>-t<temp>.jsonl
└── devils-advocate-<anchor>mo-<model>-t<temp>.jsonl
```

---

## Totals

- **10 models × 13 conditions × 30 trials × 3 temps = 12,870 trials**

| Phase                     | Conditions | Trials     |
| ------------------------- | ---------- | ---------- |
| Phase 1: Baselines        | 1          | 990        |
| Phase 2: Anchors          | 2          | 1,980      |
| Phase 3: SACD             | 2          | 1,980      |
| Phase 4: Outside View     | 2          | 1,980      |
| Phase 5: Pre-mortem       | 2          | 1,980      |
| Phase 6: Devil's Advocate | 2          | 1,980      |
| Phase 7: Random Control   | 2          | 1,980      |
| **Total**                 | **13**     | **12,870** |

---

## Execution Order

1. **Phase 1: Baselines** — Run all 10 models at all 3 temps (990 trials) ✅
2. **Calculate anchors** — Average baselines across temps → low/high per model ✅
3. **Phase 2: Anchor conditions** — Low + high at all temps (1,980 trials) ✅
4. **Phase 3: SACD** — Low + high at all temps (1,980 trials) 🔄
5. **Phase 4: Outside View** — Low + high at all temps (1,980 trials) ⏳
6. **Phase 5: Pre-mortem** — Low + high at all temps (1,980 trials) ⏳
7. **Phase 6: Devil's Advocate** — Low + high at all temps (1,980 trials) ⏳
8. **Phase 7: Random Control** — Token-matched random elaboration (1,980 trials) ⏳

---

## Computed Anchor Values

**Source:** `results/anchor-values.json` (computed by `calculate-anchors.ts`)

| Model             | Baseline | Low Anchor | High Anchor |
| ----------------- | -------- | ---------- | ----------- |
| claude-opus-4.6   | 18.0mo   | 9mo        | 27mo        |
| claude-sonnet-4.6 | 24.1mo   | 12mo       | 36mo        |
| claude-haiku-4.5  | 29.1mo   | 15mo       | 44mo        |
| gpt-5.2           | 31.8mo   | 16mo       | 48mo        |
| gpt-4.1           | 25.1mo   | 13mo       | 38mo        |
| o3                | 33.7mo   | 17mo       | 51mo        |
| o4-mini           | 35.7mo   | 18mo       | 54mo        |
| kimi-k2.5         | 30.7mo   | 15mo       | 46mo        |
| glm-5             | 31.8mo   | 16mo       | 48mo        |
| deepseek-v3.2     | 29.6mo   | 15mo       | 44mo        |

---

## Status

- **2026-02-21 02:44 UTC:** Option B methodology finalized.
- **2026-02-21 04:38 UTC:** Phase 1 baselines complete (998 trials).
- **2026-02-21 04:39 UTC:** Anchor values computed and saved.
- **2026-02-21 12:42 UTC:** Phase 2 anchor conditions complete.
  - 10/10 models complete (1,938 trials)
- **2026-02-21 13:06 UTC:** Phase 3 SACD complete for commercial models.
  - OpenAI (4 models): 682 trials ✅
  - Anthropic (3 models): 621 trials ✅
  - Open source (3 models): 125 trials (in progress, ~23%)
  - **Total SACD: 1,428 trials**

### Key Findings (Preliminary)

**Anchoring Effects:**

- All models susceptible to anchoring (Cohen's d > 0.5)
- Pattern varies: classic anchoring (GPT-5.2), compression (Opus), asymmetric (o3)

**SACD Debiasing:**

- 62% of conditions moved toward baseline (26/42)
- Best responder: o3 (-15mo effect on high anchors)
- Worst responder: Haiku (5/6 conditions worsened)
- Average debiasing effect: 4.8mo

### Current Totals

| Phase               | Trials    |
| ------------------- | --------- |
| Phase 1 (Baselines) | 998       |
| Phase 2 (Anchors)   | 1,938     |
| Phase 3 (SACD)      | 1,428     |
| **Total**           | **4,364** |

### Next Steps

2. 🔜 **Phase 4: Outside View** — Sibony technique #1 (1,980 trials)
3. 🔜 **Phase 5: Pre-mortem** — Sibony technique #2 (1,980 trials)
4. 🔜 **Phase 6: Devil's Advocate** — Sibony technique #3 (1,980 trials)
5. 🔜 **Phase 7: Random Control** — Token-matched control (1,980 trials)
6. 📝 **Paper integration** — Update with full debiasing comparison

**Remaining trials:** ~7,920 (Phases 4-7)
**Provider optimization:** Use high-throughput providers (SambaNova 84tps, Fireworks) for open source models
