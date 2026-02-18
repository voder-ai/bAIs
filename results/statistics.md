# Statistical Analysis Results

Generated: 2026-02-18T10:05:34.732Z

## Summary Table

| Model                                         | n (low/high) | Mean Low [95% CI] | Mean High [95% CI] | Effect  | Cohen's d          | p-value |
| --------------------------------------------- | ------------ | ----------------- | ------------------ | ------- | ------------------ | ------- |
| claude-3-5-haiku-20241022                     | 78/69        | 7.3 [6.7, 8.0]    | 9.8 [9.0, 10.6]    | +2.5mo  | 0.80 (medium)      | 0.002   |
| claude-3-5-haiku-latest                       | 3/3          | 4.7 [3.6, 5.7]    | 7.7 [6.3, 9.1]     | +3.0mo  | 2.71 (large)       | 0.002   |
| claude-haiku-4-5                              | 23/21        | 3.3 [3.0, 3.7]    | 7.0 [6.6, 7.4]     | +3.7mo  | 4.04 (large)       | 0.002   |
| claude-opus-4-0                               | 30/30        | 6.0 [6.0, 6.0]    | 6.0 [6.0, 6.0]     | +0.0mo  | NaN (large)        | N/A     |
| claude-opus-4-5                               | 60/90        | 6.0 [5.8, 6.3]    | 10.7 [9.6, 11.7]   | +4.6mo  | 1.13 (large)       | 0.002   |
| claude-opus-4-5-20251101                      | 60/60        | 6.3 [5.9, 6.7]    | 7.1 [6.8, 7.4]     | +0.8mo  | 0.54 (medium)      | 0.003   |
| claude-opus-4-6                               | 50/75        | 7.0 [6.6, 7.5]    | 8.8 [8.2, 9.4]     | +1.7mo  | 0.75 (medium)      | 0.002   |
| claude-sonnet-4-20250514                      | 418/418      | 5.7 [5.6, 5.9]    | 6.0 [5.8, 6.2]     | +0.3mo  | 0.15 (negligible)  | 0.029   |
| claude-sonnet-4-5                             | 210/210      | 6.0 [6.0, 6.0]    | 9.0 [9.0, 9.0]     | +3.0mo  | Infinity (large)   | 0.002   |
| codex                                         | 92/140       | 5.4 [5.2, 5.6]    | 8.4 [8.1, 8.6]     | +2.9mo  | 2.37 (large)       | 0.002   |
| github-copilot/gpt-4o                         | 549/546      | 4.1 [4.0, 4.3]    | 9.1 [8.9, 9.2]     | +4.9mo  | 2.60 (large)       | 0.002   |
| github-copilot/gpt-5.2                        | 221/222      | 4.4 [4.2, 4.6]    | 8.5 [8.4, 8.7]     | +4.1mo  | 3.07 (large)       | 0.002   |
| meta-llama/llama-3.3-70b-instruct             | 0/3          | N/A               | 12.0 [12.0, 12.0]  | N/A     | N/A                | N/A     |
| openai-codex/gpt-5.2                          | 95/95        | 6.0 [6.0, 6.0]    | 9.6 [9.3, 9.9]     | +3.6mo  | 3.54 (large)       | 0.002   |
| openai-codex/gpt-5.3-codex                    | 0/30         | N/A               | 9.2 [8.5, 10.0]    | N/A     | N/A                | N/A     |
| anthropic/claude-opus-4-5                     | 90/90        | 6.0 [6.0, 6.0]    | 12.0 [12.0, 12.0]  | +6.0mo  | Infinity (large)   | 0.002   |
| arcee-ai/trinity-large-preview:free           | 39/28        | 5.6 [5.3, 5.9]    | 10.3 [9.4, 11.2]   | +4.6mo  | 2.66 (large)       | 0.002   |
| meta-llama/llama-3.3-70b-instruct             | 247/238      | 5.5 [5.3, 5.6]    | 8.2 [7.8, 8.6]     | +2.7mo  | 1.25 (large)       | 0.002   |
| meta-llama/llama-3.3-70b-instruct:free        | 24/25        | 5.0 [4.3, 5.7]    | 6.0 [6.0, 6.0]     | +1.0mo  | 0.83 (large)       | 0.005   |
| minimax/minimax-m2.5                          | 91/84        | 5.4 [4.8, 5.9]    | 12.8 [11.2, 14.4]  | +7.5mo  | 1.37 (large)       | 0.002   |
| mistralai/mistral-small-3.1-24b-instruct:free | 53/51        | 6.0 [6.0, 6.0]    | 6.0 [6.0, 6.0]     | +0.0mo  | NaN (large)        | N/A     |
| nousresearch/hermes-3-llama-3.1-405b          | 60/77        | 6.7 [6.2, 7.2]    | 6.2 [5.9, 6.4]     | -0.5mo  | -0.37 (small)      | 0.046   |
| nousresearch/hermes-3-llama-3.1-405b:free     | 32/11        | 5.3 [4.8, 5.8]    | 5.1 [4.5, 5.7]     | -0.2mo  | -0.16 (negligible) | 0.575   |
| nvidia/llama-3.1-nemotron-70b-instruct        | 3/3          | 6.0 [6.0, 6.0]    | 6.0 [6.0, 6.0]     | +0.0mo  | NaN (large)        | N/A     |
| nvidia/nemotron-3-nano-30b-a3b:free           | 40/31        | 3.6 [3.0, 4.2]    | 6.8 [6.0, 7.7]     | +3.2mo  | 1.47 (large)       | 0.002   |
| openai/gpt-4o                                 | 210/219      | 4.2 [4.0, 4.4]    | 11.5 [10.8, 12.1]  | +7.2mo  | 1.86 (large)       | 0.002   |
| openai/gpt-5.2                                | 0/30         | N/A               | 28.2 [26.9, 29.5]  | N/A     | N/A                | N/A     |
| openai/o1                                     | 0/16         | N/A               | 19.5 [16.7, 22.3]  | N/A     | N/A                | N/A     |
| openai/o3-mini                                | 54/75        | 5.8 [5.7, 6.0]    | 19.8 [17.2, 22.4]  | +14.0mo | 1.62 (large)       | 0.002   |
| qwen/qwen3-next-80b-a3b-instruct:free         | 53/56        | 6.0 [6.0, 6.0]    | 7.2 [6.6, 7.8]     | +1.2mo  | 0.69 (medium)      | 0.002   |
| stepfun/step-3.5-flash:free                   | 25/0         | 8.6 [7.5, 9.8]    | N/A                | N/A     | N/A                | N/A     |

## Bonferroni Correction

- **Number of comparisons**: 23
- **Corrected α**: 0.0022 (0.05 / 23)
- **Significant after correction**: 18 / 23 models

### Models Significant After Bonferroni Correction

| Model                                     | p (uncorrected) | p (Bonferroni) | Significant |
| ----------------------------------------- | --------------- | -------------- | ----------- |
| claude-3-5-haiku-20241022                 | 0.0020          | 0.0460         | ✅ Yes      |
| claude-3-5-haiku-latest                   | 0.0020          | 0.0460         | ✅ Yes      |
| claude-haiku-4-5                          | 0.0020          | 0.0460         | ✅ Yes      |
| claude-opus-4-5                           | 0.0020          | 0.0460         | ✅ Yes      |
| claude-opus-4-5-20251101                  | 0.0030          | 0.0690         | ❌ No       |
| claude-opus-4-6                           | 0.0020          | 0.0460         | ✅ Yes      |
| claude-sonnet-4-20250514                  | 0.0286          | 0.6578         | ❌ No       |
| claude-sonnet-4-5                         | 0.0020          | 0.0460         | ✅ Yes      |
| codex                                     | 0.0020          | 0.0460         | ✅ Yes      |
| github-copilot/gpt-4o                     | 0.0020          | 0.0460         | ✅ Yes      |
| github-copilot/gpt-5.2                    | 0.0020          | 0.0460         | ✅ Yes      |
| openai-codex/gpt-5.2                      | 0.0020          | 0.0460         | ✅ Yes      |
| anthropic/claude-opus-4-5                 | 0.0020          | 0.0460         | ✅ Yes      |
| arcee-ai/trinity-large-preview:free       | 0.0020          | 0.0460         | ✅ Yes      |
| meta-llama/llama-3.3-70b-instruct         | 0.0020          | 0.0460         | ✅ Yes      |
| meta-llama/llama-3.3-70b-instruct:free    | 0.0046          | 0.1058         | ❌ No       |
| minimax/minimax-m2.5                      | 0.0020          | 0.0460         | ✅ Yes      |
| nousresearch/hermes-3-llama-3.1-405b      | 0.0456          | 1.0000         | ❌ No       |
| nousresearch/hermes-3-llama-3.1-405b:free | 0.5754          | 1.0000         | ❌ No       |
| nvidia/nemotron-3-nano-30b-a3b:free       | 0.0020          | 0.0460         | ✅ Yes      |
| openai/gpt-4o                             | 0.0020          | 0.0460         | ✅ Yes      |
| openai/o3-mini                            | 0.0020          | 0.0460         | ✅ Yes      |
| qwen/qwen3-next-80b-a3b-instruct:free     | 0.0020          | 0.0460         | ✅ Yes      |

## Interpretation

- **Effect**: Difference in mean sentence (high anchor - low anchor). Positive = anchoring toward higher values.
- **Cohen's d**: Standardized effect size. |d| < 0.2 = negligible, 0.2-0.5 = small, 0.5-0.8 = medium, > 0.8 = large.
- **p-value**: Two-tailed Welch's t-test. p < 0.05 suggests statistically significant difference.
- **Bonferroni**: Corrected p-values account for multiple comparisons (α = 0.05 / 23).

## Notes

- 95% CIs computed using normal approximation
- Models with insufficient data (n < 2) show N/A
- Only records with valid sentenceMonths are included
