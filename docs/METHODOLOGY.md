# Anchoring Experiment Methodology

## CRITICAL: Read Before Running ANY Experiment

### Symmetric Anchoring Formula

**Low anchor = 3mo (fixed for all models)**

**High anchor = baseline + (baseline - 3) = 2×baseline - 3**

This ensures equal distance from baseline in both directions.

---

## Verified Baselines (2026-02-19)

| Model | Baseline | Low Anchor | High Anchor | Source File |
|-------|----------|------------|-------------|-------------|
| **Anthropic** | | | | |
| Opus 4.5 | 22.8mo | 3mo | **43mo** | opus-45-no-anchor.jsonl |
| Opus 4.6 | 18.0mo | 3mo | **33mo** | opus-46-no-anchor.jsonl |
| Sonnet 4.5 | 23.2mo | 3mo | **43mo** | sonnet-45-no-anchor.jsonl |
| Haiku 4.5 | 35.2mo | 3mo | **67mo** | haiku-45-no-anchor.jsonl |
| Haiku 3.5 | 32.4mo | 3mo | **62mo** | haiku-35-no-anchor.jsonl |
| **OpenAI** | | | | |
| GPT-4o | 24.0mo | 3mo | **45mo** | gpt4o-vultr-temp00-variation.jsonl |
| GPT-5.2 | 24.0mo | 3mo | **45mo** | gpt52-no-anchor-temp0.jsonl |
| **OpenRouter** | | | | |
| o1 | 12.0mo | 3mo | **21mo** | o1-no-anchor-control.jsonl |
| o3-mini | 12.0mo | 3mo | **21mo** | o3-mini-no-anchor-control.jsonl |
| Llama 3.3 | 12.0mo | 3mo | **21mo** | llama33-no-anchor-baseline.jsonl |
| Hermes 405B | 12.0mo | 3mo | **21mo** | hermes405b-no-anchor-control.jsonl |
| MiniMax | ~12mo | 3mo | **21mo** | minimax-m25-no-anchor-control.jsonl |

---

## JSON Structure Warning

Different result files use different JSON paths:

- `.sentenceMonths` — direct path (most files)
- `.result.sentenceMonths` — nested path (o1, o3-mini, llama, etc.)

**ALWAYS check the JSON structure before calculating means:**
```bash
head -1 file.jsonl | jq 'keys'
```

---

## Experiment Checklist

Before running ANY experiment:

1. ☐ Verify model baseline from source file
2. ☐ Calculate symmetric high anchor: 2×baseline - 3
3. ☐ Confirm JSON path for sentenceMonths
4. ☐ Check that anchor values match this document
5. ☐ Run experiment
6. ☐ Verify results make sense relative to baseline

---

## Debiasing Techniques

### 1. Disclosure (Sibony-style)
- Add "randomly determined" to anchor description
- Keeps task structure intact
- Effect: neutralizes anchor influence

### 2. SACD (Self-Adaptive Cognitive Debiasing)
- Multi-turn: identify biases, rewrite prompt, then judge
- Changes task structure significantly
- Effect: removes anchor but may introduce variance

---

## Common Mistakes to Avoid

1. **Wrong JSON path** — check structure before parsing
2. **Wrong high anchor** — always use 2×baseline - 3
3. **Mixed baselines** — ensure comparing same model consistently
4. **Running before planning** — verify methodology first

---

Last updated: 2026-02-19
