# Results Manifest

## Current Status (2026-02-20)

### Active Data
- **Baseline (no anchor):** ✅ Valid
- **Low anchor (3mo):** ✅ Valid
- **High anchor (9mo+):** ❌ ALL REMOVED

### Data Cleanup Summary
1. **All high anchor data (9mo+) removed** — methodology inconsistencies discovered
2. **9mo anchor data removed** — per Tom's directive
3. Only 3mo anchor and baseline data remains

### Standardized Methodology
All new experiments must use:
- Script: `scripts/run-symmetric-high-anchor-standardized.ts`
- Exact Englich paradigm from `src/experiments/anchoringProsecutorSentencing.ts`
- 3-turn structure: prosecutor → defense → final
- "Randomly determined" disclosure

### Symmetric High Anchors (To Be Re-Run)
| Model | Baseline | Low (3mo) | Symmetric High |
|-------|----------|-----------|----------------|
| GPT-5.2 | 32mo | ✅ | 61mo (pending) |
| GPT-4o | 24mo | ✅ | 45mo (pending) |
| o1 | 12mo | ✅ | 21mo (pending) |
| o3-mini | 12mo | ✅ | 21mo (pending) |
| Opus 4.5 | 18mo | ✅ | 33mo (pending) |
| Opus 4.6 | 18mo | ✅ | 33mo (pending) |
| Haiku 3.5 | 12mo | ✅ | 21mo (pending) |
| Haiku 4.5 | 18mo | ✅ | 33mo (pending) |
| Sonnet 4.5 | 18mo | ✅ | 33mo (pending) |
| Hermes 405B | 12mo | ✅ | 21mo (pending) |
| Llama 3.3 | 12mo | ✅ | 21mo (pending) |

Formula: Symmetric High = 2 × Baseline - 3

### Commits
- `082d96b` — Quarantine all high anchor data
- `6aab705` — Remove 9mo anchor data
