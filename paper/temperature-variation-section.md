# Temperature Variation Results

## Draft Section for Paper

### Temperature Independence of Mechanism Classification

We investigated whether temperature affects anchoring mechanism classification by testing five model deployments across temperatures 0, 0.5, and 1.0 (n=30 per condition, 1,350 total trials).

**Table: Temperature Variation Results**

| Model                | Temp | No-anchor  | Low (3mo) | High (9mo) | Mechanism   |
| -------------------- | ---- | ---------- | --------- | ---------- | ----------- |
| GPT-4o (Residential) | 0.0  | 24.0 (0.0) | 3.0 (0.0) | 9.0 (0.0)  | Compliance  |
|                      | 0.5  | 24.0 (0.0) | 3.0 (0.0) | 9.0 (0.0)  | Compliance  |
|                      | 1.0  | 24.2 (1.1) | 3.0 (0.0) | 9.1 (0.3)  | Compliance  |
| GPT-4o (Datacenter)  | 0.0  | 24.0 (0.0) | 6.0 (0.0) | 12.0 (0.0) | Compression |
|                      | 0.5  | 24.0 (0.0) | 6.2 (1.1) | 12.4 (2.0) | Compression |
|                      | 1.0  | 25.6 (4.1) | 7.5 (3.0) | 11.7 (1.6) | Compression |
| GPT-5.2              | 0.0  | 32.4 (5.5) | 6.1 (0.5) | 11.9 (0.4) | Compression |
|                      | 0.5  | 30.8 (6.0) | 6.0 (0.0) | 11.9 (0.5) | Compression |
|                      | 1.0  | 33.0 (5.1) | 6.0 (0.0) | 11.7 (0.8) | Compression |
| Opus 4.5             | 0.0  | 24.0 (0.0) | 6.0 (0.0) | 12.0 (0.0) | Compression |
|                      | 0.5  | 24.4 (2.2) | 6.0 (0.0) | 12.0 (0.0) | Compression |
|                      | 1.0  | 24.8 (3.0) | 6.0 (0.0) | 12.0 (0.0) | Compression |
| Hermes 405B          | 0.0  | 23.2 (3.0) | 6.0 (0.0) | 12.0 (0.0) | Compression |
|                      | 0.5  | 21.2 (5.1) | 6.0 (0.0) | 12.0 (0.0) | Compression |
|                      | 1.0  | 17.8 (5.9) | 6.2 (1.1) | 11.4 (1.8) | Compression |

_Values shown as mean (SD) in months._

**Key Finding 1: Temperature does not change mechanism classification.** All models maintained their mechanism (compliance or compression) across the full temperature range. The compliance model (GPT-4o Residential) continued to copy anchor values exactly even at temperature 1.0. Compression models continued to show the characteristic shift toward—but not to—anchor values.

### Anchors as Entropy Reducers

**Key Finding 2: Anchors reduce output entropy at all temperatures.** Across all models, anchor conditions showed dramatically lower variance than no-anchor baselines. This effect persisted even at temperature 1.0:

- GPT-5.2 baseline SD: 5.5 (temp=0) → 5.1 (temp=1.0)
- GPT-5.2 anchor SD: 0.4-0.5 (temp=0) → 0.0-0.8 (temp=1.0)

This suggests anchors act as attractors that constrain the output distribution, not merely shift its mean.

### Orthogonal Controls: Temperature vs. Debiasing

We tested whether anchor-condition variance (SD) predicts SACD debiasing effectiveness. The prediction was falsified:

| Model          | Anchor SD | SACD Reduction |
| -------------- | --------- | -------------- |
| GPT-4o (Vultr) | 0.00      | 20%            |
| GPT-5.2        | 0.55      | 68%            |
| Opus 4.5       | 0.00      | 100%           |
| Hermes 405B    | 0.00      | 117%           |

**Key Finding 3: Temperature and SACD operate on orthogonal dimensions.** Temperature modulates variance around an attractor point, while SACD shifts the attractor position itself. A deterministic model (SD=0) can still be highly responsive to debiasing. This has practical implications: practitioners should not assume that deterministic model behavior indicates resistance to debiasing.

### Practical Implications

1. **Mechanism stability:** Temperature is not a confound for mechanism classification studies. Results obtained at any reasonable temperature generalize.

2. **Debiasing strategy:** Temperature and structured debiasing are complementary tools:
   - Temperature: controls output variance (precision vs. diversity tradeoff)
   - SACD: shifts attractor position (bias reduction)
3. **Diagnostic guidance:** Do not use temperature-variance as a proxy for debiasing potential. The cost of testing SACD is low; the cost of assuming it won't work is potentially high.

---

## LaTeX Version

```latex
\subsection{Temperature Independence}

We investigated whether temperature affects anchoring mechanism classification by testing five model deployments across temperatures 0, 0.5, and 1.0 ($n=30$ per condition, 1,350 total trials). Temperature does not change mechanism classification: all models maintained their mechanism (compliance or compression) across the full temperature range.

\paragraph{Anchors as Entropy Reducers}
Across all models, anchor conditions showed dramatically lower variance than no-anchor baselines, even at temperature 1.0. For GPT-5.2, baseline SD remained approximately 5.5 across temperatures while anchor-condition SD stayed below 1.0. This suggests anchors act as attractors that constrain the output distribution, not merely shift its mean.

\paragraph{Orthogonal Controls}
We tested whether anchor-condition variance predicts SACD effectiveness. The prediction was falsified: models with SD=0 (Opus 4.5, Hermes 405B) showed strong SACD response (100\% and 117\% bias reduction respectively). Temperature modulates variance \textit{around} an attractor, while SACD shifts the attractor \textit{position}. These are orthogonal controls. Practitioners should not assume deterministic behavior indicates debiasing resistance.
```
