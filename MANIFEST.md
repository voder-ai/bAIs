# bAIs Experiment Manifest

## Model Selection (2026-02-21)

All experiments run via **OpenRouter** — single API path to avoid routing confounds.

### Anthropic (3 models)

| Model ID | Rationale |
|----------|-----------|
| `anthropic/claude-opus-4.6` | Latest flagship model |
| `anthropic/claude-sonnet-4.6` | Mid-tier, released Feb 17 2026 |
| `anthropic/claude-haiku-4.5` | Fast/cheap tier, latest Haiku |

### OpenAI (4 models)

| Model ID | Rationale |
|----------|-----------|
| `openai/gpt-5.2` | Latest non-reasoning flagship |
| `openai/gpt-4.1` | Smartest non-reasoning model |
| `openai/o3` | Reasoning model flagship |
| `openai/o4-mini` | Fast reasoning, successor to o3-mini |

### Open Source (4 models — top by OpenRouter usage)

| Model ID | Rationale |
|----------|-----------|
| `minimax/minimax-m2.5` | #1 by usage (3.24T tokens/week, +5,405%) |
| `moonshotai/kimi-k2.5` | #2 by usage (1.24T tokens/week) |
| `z-ai/glm-5` | #3 by usage (1.03T tokens/week, +1,448%) |
| `deepseek/deepseek-v3.2` | #5 by usage (738B tokens/week), top Chinese lab |

---

## Trial Conditions (11 per model)

### Phase 1: Baselines

| # | Condition | Script | Rationale |
|---|-----------|--------|-----------|
| 1 | **No anchor** | `run-baseline.ts` | Establishes natural judgment without any external influence. Reference point for measuring bias. |

### Phase 2: Anchoring Susceptibility

| # | Condition | Script | Rationale |
|---|-----------|--------|-----------|
| 2 | **Low anchor (3mo)** | `run-low-anchor.ts` | Tests susceptibility to low anchors. Uses Englich 3-turn paradigm with "randomly determined" disclosure. |
| 3 | **High anchor (symmetric)** | `run-high-anchor.ts` | Tests susceptibility to high anchors. Symmetric formula (2×baseline-3) ensures equal distance from baseline. |

### Phase 3: SACD Debiasing (Lyu et al.)

| # | Condition | Script | Rationale |
|---|-----------|--------|-----------|
| 4 | **SACD @ low anchor** | `run-sacd.ts 3` | Tests Lyu et al. Self-Adaptive Cognitive Debiasing. Iterative: detect bias → analyze → rewrite → execute. |
| 5 | **SACD @ high anchor** | `run-sacd.ts <high>` | Same SACD method at symmetric high anchor. Tests if debiasing works for both directions. |

### Phase 4: Sibony Debiasing (Separate Techniques)

| # | Condition | Script | Rationale |
|---|-----------|--------|-----------|
| 6 | **Outside View @ low** | `run-outside-view.ts 3` | Sibony technique: establish base rates BEFORE seeing anchor. Tests reference class reasoning. |
| 7 | **Outside View @ high** | `run-outside-view.ts <high>` | Same technique at high anchor. |
| 8 | **Pre-mortem @ low** | `run-premortem.ts 3` | Sibony technique: imagine failure before deciding. Tests prospective hindsight. |
| 9 | **Pre-mortem @ high** | `run-premortem.ts <high>` | Same technique at high anchor. |
| 10 | **Devil's Advocate @ low** | `run-devils-advocate.ts 3` | Sibony technique: argue against the anchor. Tests adversarial reasoning. |
| 11 | **Devil's Advocate @ high** | `run-devils-advocate.ts <high>` | Same technique at high anchor. |

---

## Why These Conditions?

### Baselines
- **Purpose:** Measure natural judgment without anchoring
- **Use:** Calculate symmetric high anchors; reference point for effect sizes

### Anchoring (Low/High)
- **Purpose:** Replicate Englich et al. paradigm to measure anchoring susceptibility
- **Why Englich:** Gold standard in anchoring research; 3-turn structure with prosecutor/defense/final
- **Why disclosure:** "Randomly determined" statement tests if knowing the anchor is arbitrary helps
- **Why symmetric:** Ensures high anchor is equidistant from baseline (avoids asymmetric floor/ceiling effects)

### SACD (Lyu et al.)
- **Purpose:** Test state-of-the-art LLM debiasing technique
- **Method:** Iterative self-correction (detect → analyze → rewrite → execute)
- **Why include:** Most sophisticated published LLM debiasing approach (arXiv:2504.04141v4)

### Sibony Techniques (Separate)
- **Purpose:** Test established human debiasing techniques on LLMs
- **Why separate:** Measure each technique's independent effect (not confounded)
- **Outside View:** Reference class reasoning; "What's typical?" before anchoring
- **Pre-mortem:** Prospective hindsight; imagine failure to surface overlooked risks
- **Devil's Advocate:** Adversarial reasoning; argue against the provided anchor

---

## Symmetric Anchor Formula

**High anchor = 2 × baseline - 3**

Where low_anchor = 3mo (standard)

Example: If baseline = 18mo, then high = 2×18 - 3 = 33mo

This ensures the low anchor (3mo) and high anchor (33mo) are equidistant from baseline (15mo each direction).

---

## Trial Summary

| Metric | Count |
|--------|-------|
| Models | 11 |
| Conditions per model | 11 |
| Trials per condition | 30 |
| **Total trials** | **3,630** |

### Execution Order

1. **Phase 1:** Baselines (11 models × 30 = 330 trials)
2. Calculate symmetric high anchors from baseline means
3. **Phase 2:** Anchoring low/high (11 × 2 × 30 = 660 trials)
4. **Phase 3:** SACD low/high (11 × 2 × 30 = 660 trials)
5. **Phase 4:** Sibony techniques (11 × 6 × 30 = 1,980 trials)

---

## Data Status (2026-02-21)

**ALL PREVIOUS DATA DELETED** — complete reset due to methodology issues.

## Experiment Status

| Model | Baseline | Low | High | SACD-L | SACD-H | OV-L | OV-H | PM-L | PM-H | DA-L | DA-H |
|-------|----------|-----|------|--------|--------|------|------|------|------|------|------|
| claude-opus-4.6 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| claude-sonnet-4.6 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| claude-haiku-4.5 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| gpt-5.2 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| gpt-4.1 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| o3 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| o4-mini | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| minimax-m2.5 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| kimi-k2.5 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| glm-5 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| deepseek-v3.2 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

Legend: OV=Outside View, PM=Pre-mortem, DA=Devil's Advocate, L=Low anchor, H=High anchor

⬜ = Not started | 🔄 = In progress | ✅ = Complete (n≥30)
