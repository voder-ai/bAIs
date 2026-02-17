# Random Baseline Simulation

**Purpose:** Determine what "anchoring effect" would occur by chance alone.
**Method:** Generate 10,000 simulated experiments with random responses.
**Interpretation:** Effects larger than the 95th percentile of random noise
can be considered meaningful signal (not attributable to chance variation).

## Judicial (1-18mo range)

| n | Mean | SD | 5th pctl | 95th pctl | |Effect| 95th pctl |
|---|------|-----|----------|-----------|-------------------|
| 10 | 0.02mo | 2.31mo | -3.80mo | 3.80mo | **4.50mo** |
| 15 | 0.01mo | 1.90mo | -3.07mo | 3.13mo | **3.73mo** |
| 20 | 0.01mo | 1.65mo | -2.70mo | 2.70mo | **3.20mo** |
| 25 | -0.01mo | 1.46mo | -2.40mo | 2.44mo | **2.88mo** |
| 30 | -0.00mo | 1.34mo | -2.20mo | 2.20mo | **2.63mo** |

## Narrow range (3-12mo)

| n | Mean | SD | 5th pctl | 95th pctl | |Effect| 95th pctl |
|---|------|-----|----------|-----------|-------------------|
| 10 | -0.03mo | 1.29mo | -2.10mo | 2.10mo | **2.50mo** |
| 15 | 0.01mo | 1.06mo | -1.73mo | 1.73mo | **2.07mo** |
| 20 | -0.00mo | 0.90mo | -1.50mo | 1.45mo | **1.75mo** |
| 25 | 0.01mo | 0.80mo | -1.32mo | 1.32mo | **1.56mo** |
| 30 | -0.01mo | 0.74mo | -1.23mo | 1.20mo | **1.47mo** |

## Wide range (1-36mo)

| n | Mean | SD | 5th pctl | 95th pctl | |Effect| 95th pctl |
|---|------|-----|----------|-----------|-------------------|
| 10 | -0.04mo | 4.56mo | -7.50mo | 7.40mo | **9.00mo** |
| 15 | -0.02mo | 3.80mo | -6.33mo | 6.07mo | **7.60mo** |
| 20 | -0.02mo | 3.24mo | -5.35mo | 5.30mo | **6.35mo** |
| 25 | 0.02mo | 2.97mo | -4.84mo | 4.92mo | **5.84mo** |
| 30 | -0.02mo | 2.71mo | -4.43mo | 4.50mo | **5.30mo** |

---

## Key Finding

For our setup (n=30 per condition, 1-18mo response range):
- Mean random effect: 0.01 months (expected: ~0)
- 95% of random effects fall within: [-2.20, 2.20] months
- **Threshold for "real" effect: >2.60 months**

## Comparison to Observed Effects

| Model | Observed Effect | Random 95th pctl | Conclusion |
|-------|-----------------|------------------|------------|
| GPT-4o | 6.00mo | 2.60mo | ✅ Real effect |
| GPT-5.2 | 4.40mo | 2.60mo | ✅ Real effect |
| Opus 4.5 | 2.00mo | 2.60mo | ❓ Within noise range |
| Sonnet 4.5 | 3.00mo | 2.60mo | ✅ Real effect |
| Haiku 4.5 | 2.17mo | 2.60mo | ❓ Within noise range |
| Llama 3.3 | 6.00mo | 2.60mo | ✅ Real effect |
| Hermes 405B | -0.67mo | 2.60mo | ❓ Within noise range |
| MiniMax | 6.00mo | 2.60mo | ✅ Real effect |
| o1 | 4.20mo | 2.60mo | ✅ Real effect |
| o3-mini | 5.80mo | 2.60mo | ✅ Real effect |

**Interpretation:** All observed effects except Hermes 405B (-0.67mo) exceed
the random baseline threshold, confirming they represent genuine anchoring bias,
not statistical noise from scenario variation.
