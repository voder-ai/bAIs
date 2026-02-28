# Bootstrap CI Results for Table V

Generated: 2026-02-28 11:35 UTC
Models: Opus 4.6, Sonnet 4.6, Haiku 4.5, GPT-5.2
Bootstrap iterations: 1000
Method: Per-model baseline-none as reference

## Summary

| Domain | #1 Technique | MAD | 95% CI | Status |
|--------|--------------|-----|--------|--------|
| salary | sacd | 12.0% | [9.3, 14.8] | ⚠️ CI overlap |
| loan | random-control | 53.9% | [37.7, 60.8] | ⚠️ CI overlap |
| medical | random-control | 3.1% | [2.6, 3.7] | ⚠️ CI overlap |
| judicial-dui | devils-advocate | 19.0% | [16.6, 21.2] | ⚠️ CI overlap |
| judicial-fraud | baseline | 44.1% | [41.7, 46.4] | ⚠️ CI overlap |
| judicial-aggravated-theft | baseline | 24.1% | [22.3, 26.1] | ⚠️ CI overlap |

## Key Finding

**No technique achieves statistically significant #1 ranking** at the 95% confidence level in any domain. All top rankings show overlapping CIs with the second-best technique.

## Implication for Paper

This supports the paper's core claim: technique rankings are unstable and domain-dependent. Even the point-estimate rankings may be artifacts of sampling variability.

Recommend adding footnote to Table V: "Rankings are point estimates; 95% bootstrap CIs overlap for all #1 vs #2 comparisons."

## Full Results

### SALARY (1394 trials)
| Technique | MAD | 95% CI | Width |
|-----------|-----|--------|-------|
| sacd | 12.0% | [9.3, 14.8] | 5.5 |
| random-control | 13.6% | [11.1, 16.7] | 5.6 |
| devils-advocate | 14.7% | [12.2, 17.6] | 5.4 |
| premortem | 15.4% | [12.9, 18.3] | 5.4 |
| baseline | 25.3% | [22.9, 27.5] | 4.6 |

### LOAN (1298 trials)
| Technique | MAD | 95% CI | Width |
|-----------|-----|--------|-------|
| random-control | 53.9% | [37.7, 60.8] | 23.2 |
| devils-advocate | 54.3% | [38.8, 60.5] | 21.8 |
| premortem | 54.9% | [41.1, 60.8] | 19.7 |
| sacd | 56.1% | [46.0, 63.8] | 17.8 |
| baseline | 105.4% | [42.5, 892.3] | 849.8 |

### MEDICAL (1152 trials)
| Technique | MAD | 95% CI | Width |
|-----------|-----|--------|-------|
| random-control | 3.1% | [2.6, 3.7] | 1.1 |
| baseline | 4.4% | [3.7, 5.5] | 1.8 |
| premortem | 7.0% | [6.3, 7.7] | 1.4 |
| sacd | 10.2% | [9.3, 11.1] | 1.8 |
| devils-advocate | 12.0% | [5.8, 25.2] | 19.4 |

### JUDICIAL-DUI (997 trials)
| Technique | MAD | 95% CI | Width |
|-----------|-----|--------|-------|
| devils-advocate | 19.0% | [16.6, 21.2] | 4.6 |
| sacd | 20.7% | [18.6, 22.6] | 4.0 |
| baseline | 22.0% | [21.0, 23.2] | 2.2 |
| random-control | 23.5% | [22.3, 24.9] | 2.7 |
| premortem | 27.5% | [26.2, 28.6] | 2.4 |

### JUDICIAL-FRAUD (1019 trials)
| Technique | MAD | 95% CI | Width |
|-----------|-----|--------|-------|
| baseline | 44.1% | [41.7, 46.4] | 4.7 |
| premortem | 45.2% | [43.0, 47.1] | 4.1 |
| sacd | 46.1% | [43.7, 48.4] | 4.6 |
| random-control | 49.1% | [47.4, 50.8] | 3.4 |
| devils-advocate | 58.1% | [56.0, 60.1] | 4.1 |

### JUDICIAL-AGGRAVATED-THEFT (992 trials)
| Technique | MAD | 95% CI | Width |
|-----------|-----|--------|-------|
| baseline | 24.1% | [22.3, 26.1] | 3.8 |
| premortem | 25.7% | [24.4, 27.0] | 2.6 |
| random-control | 25.7% | [24.5, 27.1] | 2.6 |
| sacd | 26.2% | [24.7, 27.7] | 3.0 |
| devils-advocate | 29.9% | [28.1, 31.8] | 3.6 |
