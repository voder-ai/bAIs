# Bootstrap Stability Analysis

**Purpose:** Justify n=30 sample size for scenario-based experiments.
**Method:** Bootstrap 1000 iterations at each subsample size.
**Criterion:** CI width reduction from n=20→n=30 should be <30% (diminishing returns).

## GPT-4o temp=0

- File: `github-copilot-gpt-4o-anchoring-temp0-30.jsonl`
- Trials: 60 (low: 30, high: 30)
- Full-sample effect: **6.00 months**

| n   | Mean Effect | SD   | 95% CI       | CI Width |
| --- | ----------- | ---- | ------------ | -------- |
| 10  | 6.00mo      | 0.00 | [6.00, 6.00] | 0.00mo   |
| 15  | 6.00mo      | 0.00 | [6.00, 6.00] | 0.00mo   |
| 20  | 6.00mo      | 0.00 | [6.00, 6.00] | 0.00mo   |
| 25  | 6.00mo      | 0.00 | [6.00, 6.00] | 0.00mo   |
| 30  | 6.00mo      | 0.00 | [6.00, 6.00] | 0.00mo   |

**CI width reduction n=20→n=30:** 0.0%
✅ Diminishing returns — n=30 adequate

## GPT-4o temp=0.7

- File: `github-copilot-gpt-4o-anchoring-temp0.7-30.jsonl`
- Trials: 60 (low: 30, high: 30)
- Full-sample effect: **5.70 months**

| n   | Mean Effect | SD   | 95% CI       | CI Width |
| --- | ----------- | ---- | ------------ | -------- |
| 10  | 5.69mo      | 0.42 | [4.80, 6.00] | 1.20mo   |
| 15  | 5.70mo      | 0.36 | [4.71, 6.00] | 1.29mo   |
| 20  | 5.69mo      | 0.30 | [5.10, 6.00] | 0.90mo   |
| 25  | 5.71mo      | 0.26 | [5.00, 6.00] | 1.00mo   |
| 30  | 5.68mo      | 0.24 | [5.20, 6.00] | 0.80mo   |

**CI width reduction n=20→n=30:** 11.1%
✅ Diminishing returns — n=30 adequate

## GPT-4o temp=1.0

- File: `github-copilot-gpt-4o-anchoring-temp1.0-30.jsonl`
- Trials: 60 (low: 30, high: 30)
- Full-sample effect: **4.97 months**

| n   | Mean Effect | SD   | 95% CI       | CI Width |
| --- | ----------- | ---- | ------------ | -------- |
| 10  | 4.97mo      | 0.61 | [3.60, 6.00] | 2.40mo   |
| 15  | 4.95mo      | 0.53 | [3.86, 6.00] | 2.14mo   |
| 20  | 4.99mo      | 0.44 | [4.20, 5.70] | 1.50mo   |
| 25  | 4.95mo      | 0.41 | [4.17, 5.75] | 1.58mo   |
| 30  | 4.99mo      | 0.35 | [4.20, 5.60] | 1.40mo   |

**CI width reduction n=20→n=30:** 6.7%
✅ Diminishing returns — n=30 adequate

## Opus 4.5

- File: `claude-opus45-anchoring-30.jsonl`
- Trials: 60 (low: 30, high: 30)
- Full-sample effect: **2.00 months**

| n   | Mean Effect | SD   | 95% CI       | CI Width |
| --- | ----------- | ---- | ------------ | -------- |
| 10  | 2.00mo      | 0.00 | [2.00, 2.00] | 0.00mo   |
| 15  | 2.00mo      | 0.00 | [2.00, 2.00] | 0.00mo   |
| 20  | 2.00mo      | 0.00 | [2.00, 2.00] | 0.00mo   |
| 25  | 2.00mo      | 0.00 | [2.00, 2.00] | 0.00mo   |
| 30  | 2.00mo      | 0.00 | [2.00, 2.00] | 0.00mo   |

**CI width reduction n=20→n=30:** 0.0%
✅ Diminishing returns — n=30 adequate

## Haiku 4.5

- File: `haiku45-anchoring-30.jsonl`
- Trials: 40 (low: 21, high: 19)
- Full-sample effect: **3.77 months**

| n   | Mean Effect | SD   | 95% CI       | CI Width |
| --- | ----------- | ---- | ------------ | -------- |
| 10  | 3.76mo      | 0.60 | [2.60, 4.80] | 2.20mo   |
| 15  | 3.77mo      | 0.48 | [2.71, 4.71] | 2.00mo   |
| 20  | 3.78mo      | 0.41 | [2.90, 4.50] | 1.60mo   |
| 25  | 3.77mo      | 0.38 | [3.00, 4.50] | 1.50mo   |
| 30  | 3.76mo      | 0.35 | [3.00, 4.40] | 1.40mo   |

**CI width reduction n=20→n=30:** 12.5%
✅ Diminishing returns — n=30 adequate

## Sonnet 4.5 temp=0

- File: `anthropic-claude-sonnet-4-5-anchoring-temp0-30.jsonl`
- Trials: 60 (low: 30, high: 30)
- Full-sample effect: **3.00 months**

| n   | Mean Effect | SD   | 95% CI       | CI Width |
| --- | ----------- | ---- | ------------ | -------- |
| 10  | 3.00mo      | 0.00 | [3.00, 3.00] | 0.00mo   |
| 15  | 3.00mo      | 0.00 | [3.00, 3.00] | 0.00mo   |
| 20  | 3.00mo      | 0.00 | [3.00, 3.00] | 0.00mo   |
| 25  | 3.00mo      | 0.00 | [3.00, 3.00] | 0.00mo   |
| 30  | 3.00mo      | 0.00 | [3.00, 3.00] | 0.00mo   |

**CI width reduction n=20→n=30:** 0.0%
✅ Diminishing returns — n=30 adequate

## Sonnet 4.5 temp=0.7

- File: `anthropic-claude-sonnet-4-5-anchoring-temp0.7-30.jsonl`
- Trials: 60 (low: 30, high: 30)
- Full-sample effect: **3.00 months**

| n   | Mean Effect | SD   | 95% CI       | CI Width |
| --- | ----------- | ---- | ------------ | -------- |
| 10  | 3.00mo      | 0.00 | [3.00, 3.00] | 0.00mo   |
| 15  | 3.00mo      | 0.00 | [3.00, 3.00] | 0.00mo   |
| 20  | 3.00mo      | 0.00 | [3.00, 3.00] | 0.00mo   |
| 25  | 3.00mo      | 0.00 | [3.00, 3.00] | 0.00mo   |
| 30  | 3.00mo      | 0.00 | [3.00, 3.00] | 0.00mo   |

**CI width reduction n=20→n=30:** 0.0%
✅ Diminishing returns — n=30 adequate

## Sonnet 4.5 temp=1.0

- File: `anthropic-claude-sonnet-4-5-anchoring-temp1.0-30.jsonl`
- Trials: 60 (low: 30, high: 30)
- Full-sample effect: **3.00 months**

| n   | Mean Effect | SD   | 95% CI       | CI Width |
| --- | ----------- | ---- | ------------ | -------- |
| 10  | 3.00mo      | 0.00 | [3.00, 3.00] | 0.00mo   |
| 15  | 3.00mo      | 0.00 | [3.00, 3.00] | 0.00mo   |
| 20  | 3.00mo      | 0.00 | [3.00, 3.00] | 0.00mo   |
| 25  | 3.00mo      | 0.00 | [3.00, 3.00] | 0.00mo   |
| 30  | 3.00mo      | 0.00 | [3.00, 3.00] | 0.00mo   |

**CI width reduction n=20→n=30:** 0.0%
✅ Diminishing returns — n=30 adequate

---

## Summary

| Model               | Effect | CI Width (n=30) | Reduction 20→30 |
| ------------------- | ------ | --------------- | --------------- |
| GPT-4o temp=0       | 6.00mo | 0.00mo          | 0.0%            |
| GPT-4o temp=0.7     | 5.70mo | 0.80mo          | 11.1%           |
| GPT-4o temp=1.0     | 4.97mo | 1.40mo          | 6.7%            |
| Opus 4.5            | 2.00mo | 0.00mo          | 0.0%            |
| Haiku 4.5           | 3.77mo | 1.40mo          | 12.5%           |
| Sonnet 4.5 temp=0   | 3.00mo | 0.00mo          | 0.0%            |
| Sonnet 4.5 temp=0.7 | 3.00mo | 0.00mo          | 0.0%            |
| Sonnet 4.5 temp=1.0 | 3.00mo | 0.00mo          | 0.0%            |

**Interpretation:** If reduction is <30%, adding more samples beyond n=30 provides
diminishing returns. The current sample size is adequate for detecting the observed
effect sizes (~2-6 months).
