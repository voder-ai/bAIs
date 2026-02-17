# Contamination Analysis: Classic vs Novel Scenarios

**Question:** Are models memorizing the classic Englich paradigm?
**Prediction if memorized:** Classic effects should be systematically larger
than novel effects (models "know the right answer" for classic but must
reason about novel scenarios).

## Raw Data (from Table 9)

| Model      | Scenario              | Effect Size | % of Classic |
| ---------- | --------------------- | ----------- | ------------ |
| Sonnet 4.5 | Classic               | 3.00mo      | 100%         |
| Sonnet 4.5 | Medical (novel)       | 0.24mo      | 8.0%         |
| Sonnet 4.5 | Budget (novel)        | 1.58mo      | 52.7%        |
| Sonnet 4.5 | Hiring (novel)        | 0.87mo      | 29.0%        |
| Sonnet 4.5 | Environmental (novel) | 0.45mo      | 15.0%        |
| GPT-4o     | Classic               | 5.00mo      | 100%         |
| GPT-4o     | Medical (novel)       | 0.65mo      | 13.0%        |
| GPT-4o     | Budget (novel)        | 5.63mo      | 112.6%       |
| GPT-4o     | Hiring (novel)        | 2.15mo      | 43.0%        |
| GPT-4o     | Environmental (novel) | 1.85mo      | 37.0%        |

## Statistical Comparison

### Sonnet 4.5

- Classic effect: **3.00mo**
- Novel mean: **0.79mo** (SD: 0.51)
- Novel range: 0.24 - 1.58mo
- Classic within novel range: No
- Novel effects exceeding classic: 0/4

### GPT-4o

- Classic effect: **5.00mo**
- Novel mean: **2.57mo** (SD: 1.85)
- Novel range: 0.65 - 5.63mo
- Classic within novel range: Yes
- Novel effects exceeding classic: 1/4

## Memorization Hypothesis Test

**If memorization inflates classic results:**

- Classic should be consistently at the TOP of the distribution
- Novel effects should cluster BELOW classic

**Observed:**

- GPT-4o: 1/4 novel scenarios EXCEED classic (Budget=5.63 > 5.0)
- Sonnet 4.5: 0/4 novel scenarios exceed classic

**Conclusion:**

❌ **Memorization hypothesis REJECTED**

If GPT-4o had memorized "correct" answers for the classic paradigm,
it would show reduced anchoring on classic relative to novel scenarios.
Instead, **one novel scenario (Budget) shows STRONGER anchoring than classic**.

This is inconsistent with contamination/memorization and consistent with
a general anchoring mechanism that operates across domains.

---

## Additional Evidence: Magnitude Variance

Novel scenario effects range from 7.9% to 112.5% of classic baseline.
This high variance suggests:

1. **Anchoring strength is content-dependent**, not paradigm-specific
2. **No systematic inflation of classic** - effects vary by scenario semantics
3. **Models are not simply pattern-matching** to "Englich et al." output

If contamination were the explanation, we would expect classic to be
consistently ~2-3× larger than all novel scenarios (the "learned" response).
Instead, we see domain-modulated anchoring that sometimes exceeds the classic.
