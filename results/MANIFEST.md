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

## Anchor Design — Proportional (Option 3)

**Rationale:** Using proportional anchors ensures fair cross-model comparison. Each model faces an equally extreme anchor relative to its natural baseline, allowing us to compare susceptibility directly without confounding baseline differences.

| Anchor | Formula | Example (baseline=18mo) |
|--------|---------|------------------------|
| **Low** | `baseline / 2` | 9mo |
| **High** | `baseline × 1.5` | 27mo |

This creates symmetric multiplicative deviation: low is 0.5× baseline, high is 1.5× baseline.

---

## Trial List (11 conditions)

### Core Anchoring (3 conditions)

| Condition | Script | Anchor | Rationale |
|-----------|--------|--------|-----------|
| **baseline** | `run-baseline.ts` | None | Establishes unanchored reference. Required to calculate proportional anchors. |
| **low-anchor** | `run-low-anchor.ts` | baseline / 2 | Tests downward anchoring susceptibility with proportional low anchor. |
| **high-anchor** | `run-high-anchor.ts` | baseline × 1.5 | Tests upward anchoring susceptibility with proportional high anchor. |

### SACD Debiasing (2 conditions)

Self-Administered Cognitive Debiasing (Lyu et al.) — Model detects and corrects its own bias through iterative reflection.

| Condition | Script | Anchor | Rationale |
|-----------|--------|--------|-----------|
| **sacd-low** | `run-sacd.ts` | baseline / 2 | Tests if self-reflection reduces low anchoring. |
| **sacd-high** | `run-sacd.ts` | baseline × 1.5 | Tests if self-reflection reduces high anchoring. |

### Sibony Debiasing (6 conditions)

Three techniques from Sibony's decision hygiene framework, tested independently.

| Condition | Script | Anchor | Rationale |
|-----------|--------|--------|-----------|
| **outside-view-low** | `run-outside-view.ts` | baseline / 2 | Base rates BEFORE anchor. Tests if pre-commitment reduces anchoring. |
| **outside-view-high** | `run-outside-view.ts` | baseline × 1.5 | Outside view with high anchor. |
| **premortem-low** | `run-premortem.ts` | baseline / 2 | Anticipate failure. Tests if considering criticism reduces anchoring. |
| **premortem-high** | `run-premortem.ts` | baseline × 1.5 | Pre-mortem with high anchor. |
| **devils-advocate-low** | `run-devils-advocate.ts` | baseline / 2 | Challenge anchor. Tests if counter-arguments reduce anchoring. |
| **devils-advocate-high** | `run-devils-advocate.ts` | baseline × 1.5 | Devil's advocate with high anchor. |

---

## Experiment Design

### Per Condition
- **n = 30 trials** per model per condition
- **Temperature = 0.7** (default)
- **3-turn structure** for anchor conditions (Englich paradigm)

### Methodology
- All models via OpenRouter API (single provider, no routing confounds)
- Standardized Englich paradigm from `src/experiments/anchoringProsecutorSentencing.ts`
- "Randomly determined" disclosure in anchor conditions
- **Proportional anchors:** low = baseline/2, high = baseline×1.5

### Output Files
```
results/
├── baseline-<model>.jsonl
├── low-anchor-<model>.jsonl
├── high-anchor-<model>.jsonl
├── sacd-<low>mo-<model>.jsonl
├── sacd-<high>mo-<model>.jsonl
├── outside-view-<low>mo-<model>.jsonl
├── outside-view-<high>mo-<model>.jsonl
├── premortem-<low>mo-<model>.jsonl
├── premortem-<high>mo-<model>.jsonl
├── devils-advocate-<low>mo-<model>.jsonl
└── devils-advocate-<high>mo-<model>.jsonl
```

---

## Totals

- **11 models × 11 conditions × 30 trials = 3,630 total trials**
- **Estimated API calls:** ~10,000+ (multi-turn conversations)

---

## Execution Order

1. **Phase 1: Baselines** — Run all 11 models (330 trials)
2. **Calculate proportional anchors** — Per model: low = mean(baseline)/2, high = mean(baseline)×2
3. **Phase 2: Low anchor conditions** — All 11 models (330 trials)
4. **Phase 3: High anchor conditions** — All 11 models (330 trials)
5. **Phase 4: SACD** — Low and high for all models (660 trials)
6. **Phase 5: Outside View** — Low and high for all models (660 trials)
7. **Phase 6: Pre-mortem** — Low and high for all models (660 trials)
8. **Phase 7: Devil's Advocate** — Low and high for all models (660 trials)

---

## Status

- **2026-02-20:** All prior data deleted. Clean slate.
- **2026-02-21:** Updated to proportional anchors (baseline/2, baseline×1.5). Scripts ready.
- **Awaiting:** Approval to begin Phase 1 baselines.
