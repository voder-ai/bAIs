# bAIs Experiment Manifest

## Model Selection (2026-02-21)

All experiments run via **OpenRouter** — single API path to avoid routing confounds.

### Anthropic (3 models)

| Model ID                      | Rationale                      |
| ----------------------------- | ------------------------------ |
| `anthropic/claude-opus-4.6`   | Latest flagship model          |
| `anthropic/claude-sonnet-4.6` | Mid-tier, released Feb 17 2026 |
| `anthropic/claude-haiku-4.5`  | Fast/cheap tier, latest Haiku  |

### OpenAI (4 models)

| Model ID         | Rationale                            |
| ---------------- | ------------------------------------ |
| `openai/gpt-5.2` | Latest non-reasoning flagship        |
| `openai/gpt-4.1` | Smartest non-reasoning model         |
| `openai/o3`      | Reasoning model flagship             |
| `openai/o4-mini` | Fast reasoning, successor to o3-mini |

### Open Source (4 models — top by OpenRouter usage)

| Model ID                 | Rationale                                       |
| ------------------------ | ----------------------------------------------- |
| `minimax/minimax-m2.5`   | #1 by usage (3.24T tokens/week, +5,405%)        |
| `moonshotai/kimi-k2.5`   | #2 by usage (1.24T tokens/week)                 |
| `z-ai/glm-5`             | #3 by usage (1.03T tokens/week, +1,448%)        |
| `deepseek/deepseek-v3.2` | #5 by usage (738B tokens/week), top Chinese lab |

---

## Trial Conditions (11 per model)

### Phase 1: Baselines

| #   | Condition     | Script            | Rationale                                                                                        |
| --- | ------------- | ----------------- | ------------------------------------------------------------------------------------------------ |
| 1   | **No anchor** | `run-baseline.ts` | Establishes natural judgment without any external influence. Reference point for measuring bias. |

### Phase 2: Anchoring Susceptibility

| #   | Condition                      | Script               | Rationale                                                                                                                                    |
| --- | ------------------------------ | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 2   | **Low anchor (baseline/2)**    | `run-low-anchor.ts`  | Tests susceptibility to low anchors. Proportional formula ensures fair cross-model comparison. Uses Englich 3-turn paradigm with disclosure. |
| 3   | **High anchor (baseline×1.5)** | `run-high-anchor.ts` | Tests susceptibility to high anchors. Symmetric: same proportional distance as low anchor.                                                   |

### Phase 3: Self-Reflection Debiasing (Single-Pass)

| #   | Condition                         | Script               | Rationale                                                                                                               |
| --- | --------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 4   | **Self-Reflection @ low anchor**  | `run-sacd.ts <low>`  | Single-pass debiasing: initial sentence → identify biases → debiased response. Tests if explicit bias reflection helps. |
| 5   | **Self-Reflection @ high anchor** | `run-sacd.ts <high>` | Same technique at high anchor. Tests if debiasing works for both directions.                                            |

**Note:** This is a simplified single-pass technique, NOT the full iterative SACD from Lyu et al. (which has up to 3 detect→analyze→debias iterations). Results show this single-pass approach backfires (-127% mean effect).

### Phase 3b: Random Elaboration Control (Reviewer-requested)

| #   | Condition                       | Script                         | Rationale                                                                                                                                                                           |
| --- | ------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6   | **Token-matched filler @ low**  | `run-random-control.ts <low>`  | Control: same token count as SACD, but random/irrelevant content. Isolates LENGTH effects from CONTENT effects. If same debiasing → length matters. If different → content matters. |
| 7   | **Token-matched filler @ high** | `run-random-control.ts <high>` | Same control at high anchor.                                                                                                                                                        |

**Purpose:** Reviewer specifically praised "novel methodology (random elaboration control)" — this isolates whether SACD's benefit comes from its reasoning content or just from extended multi-turn structure.

### Phase 4: Sibony Debiasing (Separate Techniques)

| #   | Condition                   | Script                          | Rationale                                                                                     |
| --- | --------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------- |
| 6   | **Outside View @ low**      | `run-outside-view.ts <low>`     | Sibony technique: establish base rates BEFORE seeing anchor. Tests reference class reasoning. |
| 7   | **Outside View @ high**     | `run-outside-view.ts <high>`    | Same technique at high anchor.                                                                |
| 8   | **Pre-mortem @ low**        | `run-premortem.ts <low>`        | Sibony technique: imagine failure before deciding. Tests prospective hindsight.               |
| 9   | **Pre-mortem @ high**       | `run-premortem.ts <high>`       | Same technique at high anchor.                                                                |
| 10  | **Devil's Advocate @ low**  | `run-devils-advocate.ts <low>`  | Sibony technique: argue against the anchor. Tests adversarial reasoning.                      |
| 11  | **Devil's Advocate @ high** | `run-devils-advocate.ts <high>` | Same technique at high anchor.                                                                |

### Phase 5: Full SACD (Lyu et al.) — OPTIONAL

| #   | Condition                   | Script                    | Rationale                                                                                     |
| --- | --------------------------- | ------------------------- | --------------------------------------------------------------------------------------------- |
| 12  | **Full SACD @ low anchor**  | `run-full-sacd.ts <low>`  | Full iterative SACD per Lyu et al.: detect bias → analyze → debias → iterate (up to 3 rounds) |
| 13  | **Full SACD @ high anchor** | `run-full-sacd.ts <high>` | Same iterative technique at high anchor.                                                      |

**Status:** Not yet implemented. Will run if budget permits after Phase 4 completes.

**Lyu et al. spec (arXiv:2504.04141v4):**

1. Generate initial response
2. Detect: "Does this show cognitive bias?" (yes/no)
3. Analyze: "What type of bias and how does it affect the response?"
4. Debias: "Generate new response avoiding the identified bias"
5. Iterate steps 2-4 up to 3 times or until no bias detected

---

## Why These Conditions?

### Baselines

- **Purpose:** Measure natural judgment without anchoring
- **Use:** Calculate symmetric high anchors; reference point for effect sizes

### Anchoring (Low/High)

- **Purpose:** Measure anchoring susceptibility with proportional anchors
- **Why proportional:** Fair cross-model comparison; each model faces same % deviation from its baseline
- **Formula:** Low = baseline/2 (50% below), High = baseline×1.5 (50% above)
- **Why disclosure:** "Randomly determined" statement tests if knowing the anchor is arbitrary helps
- **Why symmetric:** Equal proportional distance ensures unbiased comparison of low vs high susceptibility

### Self-Reflection Debiasing (Single-Pass)

- **Purpose:** Test if explicit bias reflection helps reduce anchoring
- **Method:** Single-pass: initial sentence → identify biases → debiased response
- **Finding:** Backfires in 15/16 conditions (-127% mean effect) — models overcorrect toward anchor
- **Note:** NOT the full iterative SACD from Lyu et al. — see Phase 5 for that

### Sibony Techniques (Separate)

- **Purpose:** Test established human debiasing techniques on LLMs
- **Why separate:** Measure each technique's independent effect (not confounded)
- **Outside View:** Reference class reasoning; "What's typical?" before anchoring
- **Pre-mortem:** Prospective hindsight; imagine failure to surface overlooked risks
- **Devil's Advocate:** Adversarial reasoning; argue against the provided anchor

---

## Proportional Anchor Formula

**Low anchor = baseline / 2**
**High anchor = baseline × 1.5**

This ensures equal _proportional_ challenge across all models (50% deviation in each direction).

Example: If baseline = 18mo:

- Low anchor = 18 / 2 = 9mo (50% below)
- High anchor = 18 × 1.5 = 27mo (50% above)

Rationale: Fair cross-model comparison. A model with baseline 30mo gets low=15mo, high=45mo. A model with baseline 10mo gets low=5mo, high=15mo. Both face the same proportional challenge.

---

## Temperature Variable

Each condition is run at **3 temperatures**: 0, 0.7, 1.0

| Temp | Description                     |
| ---- | ------------------------------- |
| 0    | Deterministic (greedy decoding) |
| 0.7  | Standard deployment setting     |
| 1.0  | Full distribution sampling      |

**Anchor Calculation (Option B):** Average baselines across all 3 temperatures, then use the same anchors for all temperature conditions. This allows clean comparison of "does temperature affect anchoring susceptibility?"

---

## Trial Summary

| Metric               | Count      |
| -------------------- | ---------- |
| Models               | 11         |
| Conditions per model | 11         |
| Temperatures         | 3          |
| Trials per condition | 30         |
| **Total trials**     | **10,890** |

### Execution Order

1. **Phase 1:** Baselines at all 3 temps (11 models × 3 temps × 30 = 990 trials)
2. Calculate anchors from averaged baselines (per model)
3. **Phase 2:** Anchoring low/high at all temps (11 × 2 × 3 × 30 = 1,980 trials)
4. **Phase 3:** SACD low/high at all temps (11 × 2 × 3 × 30 = 1,980 trials)
5. **Phase 4:** Sibony techniques at all temps (11 × 6 × 3 × 30 = 5,940 trials)

---

## Data Status (2026-02-21)

**ALL PREVIOUS DATA DELETED** — complete reset due to methodology issues.

## Experiment Status

| Model             | Baseline | Low | High | SACD-L | SACD-H | OV-L | OV-H | PM-L | PM-H | DA-L | DA-H |
| ----------------- | -------- | --- | ---- | ------ | ------ | ---- | ---- | ---- | ---- | ---- | ---- |
| claude-opus-4.6   | ⬜       | ⬜  | ⬜   | ⬜     | ⬜     | ⬜   | ⬜   | ⬜   | ⬜   | ⬜   | ⬜   |
| claude-sonnet-4.6 | ⬜       | ⬜  | ⬜   | ⬜     | ⬜     | ⬜   | ⬜   | ⬜   | ⬜   | ⬜   | ⬜   |
| claude-haiku-4.5  | ⬜       | ⬜  | ⬜   | ⬜     | ⬜     | ⬜   | ⬜   | ⬜   | ⬜   | ⬜   | ⬜   |
| gpt-5.2           | ⬜       | ⬜  | ⬜   | ⬜     | ⬜     | ⬜   | ⬜   | ⬜   | ⬜   | ⬜   | ⬜   |
| gpt-4.1           | ⬜       | ⬜  | ⬜   | ⬜     | ⬜     | ⬜   | ⬜   | ⬜   | ⬜   | ⬜   | ⬜   |
| o3                | ⬜       | ⬜  | ⬜   | ⬜     | ⬜     | ⬜   | ⬜   | ⬜   | ⬜   | ⬜   | ⬜   |
| o4-mini           | ⬜       | ⬜  | ⬜   | ⬜     | ⬜     | ⬜   | ⬜   | ⬜   | ⬜   | ⬜   | ⬜   |
| minimax-m2.5      | ⬜       | ⬜  | ⬜   | ⬜     | ⬜     | ⬜   | ⬜   | ⬜   | ⬜   | ⬜   | ⬜   |
| kimi-k2.5         | ⬜       | ⬜  | ⬜   | ⬜     | ⬜     | ⬜   | ⬜   | ⬜   | ⬜   | ⬜   | ⬜   |
| glm-5             | ⬜       | ⬜  | ⬜   | ⬜     | ⬜     | ⬜   | ⬜   | ⬜   | ⬜   | ⬜   | ⬜   |
| deepseek-v3.2     | ⬜       | ⬜  | ⬜   | ⬜     | ⬜     | ⬜   | ⬜   | ⬜   | ⬜   | ⬜   | ⬜   |

Legend: OV=Outside View, PM=Pre-mortem, DA=Devil's Advocate, L=Low anchor, H=High anchor

⬜ = Not started | 🔄 = In progress | ✅ = Complete (n≥30)
