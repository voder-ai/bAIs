# Session Summary: 2026-02-17 Evening (14:35-16:46 AEDT)

## Major Findings

### 1. Reasoning Models Don't Debias — They Comply

**o1 Results:**
| Condition | Low (3mo) | High (9mo) | Effect |
|-----------|-----------|------------|--------|
| Baseline | 6.5mo | 10.7mo | 4.2mo |
| 3-turn-random | 5.0mo | 9.6mo | 4.6mo |
| token-matched | 3.5mo | 9.1mo | 5.6mo |
| SACD (iterative) | 6.3mo | 10.8mo | 4.5mo |

**SACD effect on o1: +7% (WORSE)**

Native CoT reasoning doesn't prevent anchoring. SACD external debiasing also fails.

**o3-mini Results:**
| Condition | Low (3mo) | High (9mo) | Effect |
|-----------|-----------|------------|--------|
| Baseline | 3.3mo | 9.1mo | 5.8mo |
| 3-turn-random | 3.0mo | 9.0mo | 6.0mo |
| token-matched | 3.0mo | 9.0mo | 6.0mo |

**o3-mini = PURE COMPLIANCE** — matches prosecutor demand exactly. Zero independent judgment. "Compliance, not reasoning."

### 2. Version Drift Changes Bias Architecture

**Opus 4.5 vs 4.6:**
| Metric | Opus 4.5 | Opus 4.6 |
|--------|----------|----------|
| Baseline | 2.0mo | 1.3mo |
| Controls | 0.0mo (eliminated) | 3.6mo (amplified) |
| Full SACD | 0.03mo (99%↓) | -1.13mo (>100%↓) |
| Pattern | Shallow/brittle | Deep/robust |

Same model family, opposite bias architecture. Debiasing validation needed per MODEL VERSION.

### 3. Multi-Turn Structure Creates Bias

**Llama 3.3:**
| Condition | Effect |
|-----------|--------|
| Baseline | 0.0mo |
| 3-turn-random | 8.6mo |

Multi-turn structure CREATES anchoring on previously unbiased models. Confirms random elaboration control finding.

### 4. SACD Works on Standard Models

**GPT-5.2 SACD:** 89% reduction (4.4mo → 0.5mo)
**Opus 4.6 SACD:** >100% reduction (1.3mo → -1.1mo)

SACD remains effective on non-reasoning models.

## Paper Contributions

1. **"Why not just use reasoning models?"** — o1 shows reasoning ≠ debiasing
2. **"Compliance not reasoning"** — o3-mini copies anchors exactly
3. **Version drift matters** — same model family, different bias architecture
4. **Structure effect** — multi-turn alone can introduce bias
5. **No universal solution** — must validate per model AND version

## Files Created/Updated

- `results/o1-baseline-openrouter.jsonl`
- `results/o1-controls-openrouter.jsonl`
- `results/o1-full-sacd-openrouter.jsonl`
- `results/o3-mini-baseline-openrouter.jsonl`
- `results/o3-mini-controls-openrouter.jsonl`
- `results/opus46-full-sacd.jsonl`
- `results/llama33-3turn-control.jsonl`
- `paper/main.tex` (commits 70c95e5, 94c7374, 6a642bb)
- `docs/experiment-coverage.md`
- `EXPERIMENT-BACKLOG.md`

## Remaining Gaps

- o3-mini SACD (OpenRouter issues)
- Hermes 405B controls
- Llama 3.3 token-matched control
- Sonnet 4 full suite
- GPT-4o remaining experiments

## Technical Issues

- OpenRouter o3-mini returning errors (both instances)
- 30% parse error rate on o1 (verbose reasoning format)
