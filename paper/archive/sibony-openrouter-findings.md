# Sibony vs SACD Comparison — OpenRouter Models

**Date:** 2026-02-20

## Key Finding

**SACD and Sibony techniques produce OPPOSITE results on the same models:**

| Model       | SACD Effect         | Sibony Effect    | Pattern                             |
| ----------- | ------------------- | ---------------- | ----------------------------------- |
| GPT-4o      | -70% (catastrophic) | +83-86% (works)  | Multi-turn triggers over-correction |
| GPT-5.2     | -83% (catastrophic) | +57-67% (works)  | Multi-turn triggers over-correction |
| o3-mini     | +1% (resistant)     | -44% (backfires) | Single-turn pushes ABOVE anchor     |
| Hermes 405B | +71% (partial)      | +71-80% (works)  | Both work similarly                 |
| Llama 3.3   | +33% (partial)      | +49% / -18%      | Premortem specifically backfires    |

## Detailed Results

### GPT-4o @ 45mo anchor (baseline 24mo)

| Technique       | Mean   | Debiasing             |
| --------------- | ------ | --------------------- |
| No intervention | ~45mo  | 0%                    |
| SACD            | 7.2mo  | -70% (below baseline) |
| Context-hygiene | 27.6mo | +83%                  |
| Premortem       | 27.0mo | +86%                  |

### GPT-5.2 @ 45mo anchor (baseline 24mo)

| Technique       | Mean   | Debiasing             |
| --------------- | ------ | --------------------- |
| No intervention | ~45mo  | 0%                    |
| SACD            | 4.0mo  | -83% (below baseline) |
| Context-hygiene | 31.0mo | +67%                  |
| Premortem       | 33.0mo | +57%                  |

### o3-mini @ 21mo anchor (baseline 12mo)

| Technique       | Mean   | Debiasing           |
| --------------- | ------ | ------------------- |
| No intervention | ~21mo  | 0%                  |
| SACD            | 20.9mo | +1% (no effect)     |
| Context-hygiene | 25.0mo | -44% (ABOVE anchor) |
| Premortem       | 24.5mo | -39% (ABOVE anchor) |

### Hermes 405B @ 21mo anchor (baseline 12mo)

| Technique       | Mean   | Debiasing |
| --------------- | ------ | --------- |
| No intervention | ~21mo  | 0%        |
| SACD            | 14.6mo | +71%      |
| Context-hygiene | 14.6mo | +71%      |
| Premortem       | 13.8mo | +80%      |

### Llama 3.3 @ 21mo anchor (baseline 12mo)

| Technique       | Mean   | Debiasing        |
| --------------- | ------ | ---------------- |
| No intervention | ~21mo  | 0%               |
| SACD            | 18.0mo | +33%             |
| Context-hygiene | 16.6mo | +49%             |
| Premortem       | 22.6mo | -18% (BACKFIRES) |

### MiniMax @ 21mo anchor (baseline 12mo) — PARTIAL

| Technique       | Mean   | Debiasing       |
| --------------- | ------ | --------------- |
| SACD            | 13.7mo | +81% (unstable) |
| Context-hygiene | ~19mo  | ~22% (partial)  |
| Premortem       | -      | Running         |

## Paper Implications

### 1. Multi-turn vs Single-turn

The SACD protocol (4 API calls: bias detection → analysis → prompt rewrite → judgment) triggers over-correction in OpenAI instruction-tuned models, while single-turn Sibony techniques (context-hygiene, premortem) work well.

**Hypothesis:** The extended back-and-forth in SACD may amplify the model's tendency to "correct" perceived biases, leading to extreme over-correction.

### 2. Reasoning Model Behavior

o3-mini shows the OPPOSITE pattern:

- SACD: No effect (resistant)
- Sibony: Goes ABOVE anchor (backfires)

The single-turn disclosure ("randomly determined") may trigger a different response in reasoning models — potentially treating the disclosure as a signal that MORE consideration is needed, not less.

### 3. Same Technique, Different Models

Llama 3.3's premortem backfires (-18%) while Hermes 405B's works (+80%). Same technique, similar open-source model families, opposite results.

This strongly supports the "test per deployment" thesis — even within similar model categories, debiasing technique effectiveness varies unpredictably.

## Commits

- `97d0281`: OpenRouter Sibony experiments - 5/6 complete
