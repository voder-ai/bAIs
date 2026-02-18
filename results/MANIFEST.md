# Results Manifest

**Purpose:** Single source of truth for all experimental data backing paper claims.

**Last verified:** 2026-02-17 23:55 UTC

---

## Paper Claims → Data Files

### Table 1: Mechanism Classification (main.tex ~line 155)

| Model            | Condition | n   | File                                | Status |
| ---------------- | --------- | --- | ----------------------------------- | ------ |
| Opus 4.5         | No-anchor | 30+ | `opus45-no-anchor-*.jsonl`          | ✅     |
| Opus 4.5         | Low/High  | 30  | `opus4-anchoring-baseline-30.jsonl` | ✅     |
| Llama 3.3        | No-anchor | 30  | `llama33-no-anchor-baseline.jsonl`  | ✅     |
| Llama 3.3        | Low/High  | 30  | `llama33-free-anchoring-30.jsonl`   | ✅     |
| GPT-4o (Copilot) | All       | 30  | `github-copilot-gpt-4o-*.jsonl`     | ✅     |
| MiniMax M2.5     | All       | 30+ | `minimax-m25-*.jsonl`               | ✅     |
| o3-mini          | All       | 30  | `o3-mini-*.jsonl`                   | ✅     |
| GPT-4o (Vultr)   | All       | 30+ | `gpt4o-*-vultr*.jsonl`              | ✅     |
| o1               | All       | 30+ | `o1-*.jsonl`                        | ✅     |
| Hermes 405B      | All       | 30  | `hermes-405b-*.jsonl`               | ✅     |

### Table 2: High Anchor (24mo) Results (main.tex ~line 237)

| Model          | n   | File                            | Status |
| -------------- | --- | ------------------------------- | ------ |
| o3-mini        | 30  | `o3-mini-24mo-anchor.jsonl`     | ✅     |
| GPT-5.2        | 30  | `gpt52-24mo-anchor.jsonl`       | ✅     |
| Opus 4.5       | 46  | `opus45-24mo-anchor.jsonl`      | ✅     |
| o1             | 41  | `o1-24mo-anchor.jsonl`          | ✅     |
| Llama 3.3      | 30  | `llama33-24mo-anchor.jsonl`     | ✅     |
| Opus 4.6       | 30  | `opus46-24mo-anchor.jsonl`      | ✅     |
| Hermes 405B    | 30  | `hermes405b-24mo-anchor.jsonl`  | ✅     |
| GPT-4o (Vultr) | 30  | `gpt4o-vultr-24mo-anchor.jsonl` | ✅     |
| MiniMax M2.5   | 33  | `minimax-24mo-anchor.jsonl`     | ✅ NEW |

### Table 3: SACD Results (main.tex ~line 315)

| Model    | Condition | n   | File                      | Status                     |
| -------- | --------- | --- | ------------------------- | -------------------------- |
| GPT-5.2  | SACD      | 30+ | `gpt52-*sacd*.jsonl`      | ✅                         |
| Opus 4.5 | SACD      | 30  | `anthropic-sacd-30.jsonl` | ✅                         |
| MiniMax  | SACD      | -   | N/A                       | --- (not claimed in paper) |
| o3-mini  | SACD      | -   | N/A                       | --- (not claimed in paper) |

---

## Models Removed from Paper

| Model     | Reason              | Date       |
| --------- | ------------------- | ---------- |
| Haiku 4.5 | Deprecated from API | 2026-02-17 |

---

## Sample Size Summary

All experiments meet n≥30 requirement:

```
gpt4o-vultr-24mo-anchor.jsonl: n=30 ✅
gpt52-24mo-anchor.jsonl: n=30 ✅
hermes405b-24mo-anchor.jsonl: n=30 ✅
llama33-24mo-anchor.jsonl: n=30 ✅
minimax-24mo-anchor.jsonl: n=33 ✅
o1-24mo-anchor.jsonl: n=41 ✅
o3-mini-24mo-anchor.jsonl: n=30 ✅
opus45-24mo-anchor.jsonl: n=46 ✅
opus46-24mo-anchor.jsonl: n=30 ✅
```

MiniMax 24mo now complete:
```
minimax-24mo-anchor.jsonl: n=33 ✅
```

---

## Verification Commands

```bash
# Check all 24mo files exist and have n≥30
cd /mnt/openclaw-data/workspace/bAIs/results
for f in *24mo*.jsonl; do
  n=$(wc -l < "$f")
  [[ $n -ge 30 ]] && echo "✅ $f: n=$n" || echo "❌ $f: n=$n"
done
```

---

## Data Hygiene Rules

1. **Never delete raw data** — archive to `results/archive/` if superseded
2. **Every paper claim needs a MANIFEST entry** — no exceptions
3. **Update MANIFEST when running new experiments** — before committing
4. **Verify before submission** — run checklist above
