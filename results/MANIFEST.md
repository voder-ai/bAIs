# Results Manifest

## Model List (11 models) — All via OpenRouter

### Anthropic (3)
| Model | OpenRouter ID | Rationale |
|-------|---------------|-----------|
| Opus 4.6 | `anthropic/claude-opus-4.6` | Latest Anthropic flagship |
| Sonnet 4.6 | `anthropic/claude-sonnet-4.6` | Mid-tier, high volume usage |
| Haiku 4.5 | `anthropic/claude-haiku-4.5` | Fast/cheap tier |

### OpenAI (4)
| Model | OpenRouter ID | Rationale |
|-------|---------------|-----------|
| GPT-5.2 | `openai/gpt-5.2` | Latest OpenAI flagship (non-reasoning) |
| GPT-4.1 | `openai/gpt-4.1` | Smartest non-reasoning model |
| o3 | `openai/o3` | Full reasoning model |
| o4-mini | `openai/o4-mini` | Cost-effective reasoning model |

### Open Source (4) — Top by OpenRouter usage
| Model | OpenRouter ID | Rationale |
|-------|---------------|-----------|
| MiniMax M2.5 | `minimax/minimax-m2.5` | #1 by usage (3.24T tokens/week) |
| Kimi K2.5 | `moonshotai/kimi-k2.5` | #2 by usage (1.24T tokens/week) |
| GLM 5 | `z-ai/glm-5` | #3 by usage (1.03T tokens/week) |
| DeepSeek V3.2 | `deepseek/deepseek-v3.2` | #5 by usage (738B tokens/week) |

---

## Experimental Variables

### Temperature (3 levels)
| Temp | Description |
|------|-------------|
| 0 | Deterministic (argmax) |
| 0.7 | Standard deployment |
| 1.0 | High variance (full sampling) |

### Anchor Design — Proportional (Additive Symmetry)

| Anchor | Formula | Example (baseline=18mo) |
|--------|---------|------------------------|
| **Low** | `baseline / 2` | 9mo (−50%) |
| **High** | `baseline × 1.5` | 27mo (+50%) |

**Option B approach:** Baselines averaged across all temps → single anchor set per model → same anchors used at all temps. This enables clean comparison of "does temperature affect anchoring susceptibility?"

---

## Trial List (11 conditions × 3 temps)

### Core Anchoring (3 conditions)
| Condition | Script | Anchor |
|-----------|--------|--------|
| **baseline** | `run-baseline.ts` | None |
| **low-anchor** | `run-low-anchor.ts` | baseline / 2 |
| **high-anchor** | `run-high-anchor.ts` | baseline × 1.5 |

### SACD Debiasing (2 conditions)
| Condition | Script | Anchor |
|-----------|--------|--------|
| **sacd-low** | `run-sacd.ts` | baseline / 2 |
| **sacd-high** | `run-sacd.ts` | baseline × 1.5 |

### Sibony Debiasing (6 conditions)
| Condition | Script | Anchor |
|-----------|--------|--------|
| **outside-view-low** | `run-outside-view.ts` | baseline / 2 |
| **outside-view-high** | `run-outside-view.ts` | baseline × 1.5 |
| **premortem-low** | `run-premortem.ts` | baseline / 2 |
| **premortem-high** | `run-premortem.ts` | baseline × 1.5 |
| **devils-advocate-low** | `run-devils-advocate.ts` | baseline / 2 |
| **devils-advocate-high** | `run-devils-advocate.ts` | baseline × 1.5 |

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

- **11 models × 11 conditions × 30 trials × 3 temps = 10,890 trials**

---

## Execution Order

1. **Phase 1: Baselines** — Run all 11 models at all 3 temps (990 trials)
2. **Calculate anchors** — Average baselines across temps → low/high per model
3. **Phase 2: Anchor conditions** — Low + high at all temps (1,980 trials)
4. **Phase 3: SACD** — Low + high at all temps (1,980 trials)
5. **Phase 4: Outside View** — Low + high at all temps (1,980 trials)
6. **Phase 5: Pre-mortem** — Low + high at all temps (1,980 trials)
7. **Phase 6: Devil's Advocate** — Low + high at all temps (1,980 trials)

---

## Computed Anchor Values

**Source:** `results/anchor-values.json` (computed by `calculate-anchors.ts`)

| Model | Baseline | Low Anchor | High Anchor |
|-------|----------|------------|-------------|
| claude-opus-4.6 | 18.0mo | 9mo | 27mo |
| claude-sonnet-4.6 | 24.1mo | 12mo | 36mo |
| claude-haiku-4.5 | 29.1mo | 15mo | 44mo |
| gpt-5.2 | 31.8mo | 16mo | 48mo |
| gpt-4.1 | 25.1mo | 13mo | 38mo |
| o3 | 33.7mo | 17mo | 51mo |
| o4-mini | 35.7mo | 18mo | 54mo |
| minimax-m2.5 | 24.2mo | 12mo | 36mo |
| kimi-k2.5 | 30.7mo | 15mo | 46mo |
| glm-5 | 31.8mo | 16mo | 48mo |
| deepseek-v3.2 | 29.6mo | 15mo | 44mo |

---

## Status

- **2026-02-21 02:44 UTC:** Option B methodology finalized.
- **2026-02-21 04:38 UTC:** Phase 1 baselines complete (990 trials).
- **2026-02-21 04:39 UTC:** Anchor values computed and saved.
- **Next:** Phase 2 anchor conditions (1,980 trials).
