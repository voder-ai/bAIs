# Multi-Vignette Experiment Findings

## Overview

Total new trials: 2,121 successful (2,558 total)
- Salary: 663 successful / 1,058 total
- Loan: 620 successful / 660 total
- Medical: 658 successful / 660 total
- Spot-check judicial: 180 successful / 180 total

## Key Finding 1: Vignette-Dependent Anchoring Susceptibility

| Vignette | Model | Baseline | Low Anchor Effect | High Anchor Effect |
|----------|-------|----------|-------------------|-------------------|
| **Salary ($K)** | Opus | $134.7K | **-24.8%** ↓ | +17.6% ↑ |
| | Sonnet | $98.2K | +12.1% ⚠️ COUNTER | +18.1% ↑ |
| **Loan ($K)** | Opus | $181.9K | **-53.3%** ↓ | -17.5% ↓ |
| | Sonnet | $146.5K | **-56.5%** ↓ | +2.4% ↑ |
| **Medical (1-100)** | Opus | 72.0 | **0.0%** NO EFFECT | **0.0%** NO EFFECT |
| | Sonnet | 67.9 | +1.4% | +11.0% ↑ |

### Interpretation

**Loan shows strongest effects:** Both models susceptible to -50%+ anchoring on low anchor.

**Medical shows weakest effects:** Opus is completely unaffected (always returns 72), Sonnet shows minimal effects.

**Salary shows model differences:** Opus anchors normally, Sonnet COUNTER-anchors on low (resists unreasonably low values).

## Key Finding 2: Model-Specific Anchoring Patterns

### Opus 4.6
- Shows standard bidirectional anchoring on salary
- Shows strong unidirectional anchoring on loan (both directions pull DOWN)
- Shows **NO anchoring on medical** (std=0, always returns 72)

### Sonnet 4.5
- Shows counter-anchoring on salary low anchor (strong domain priors)
- Shows strong anchoring on loan low anchor
- Shows minimal anchoring on medical

## Key Finding 3: Asymmetric Anchoring (Spot-check Judicial)

Via pi-ai OAuth, direct Anthropic access:

| Model | Baseline | Low Effect | High Effect |
|-------|----------|------------|-------------|
| Sonnet | 19.2mo | **-3.7mo (19%)** ↓ | -1.6mo (8%) ↓ |
| Opus | 18.0mo | **-11.0mo (61%)** ↓ | -5.0mo (28%) ↓ |

**Both anchors pull DOWN** - models resist high anchors more than low anchors.
This suggests "moderation bias" - models avoid extreme/harsh sentences.

## Key Finding 4: Provider Equivalence

Anchoring effects present via both OpenRouter and pi-ai OAuth.
~5mo baseline difference (~20%), but EFFECT direction consistent.
No major confound from API provider choice.

## Data Quality Issues

1. **Medical parsing:** Parser sometimes extracts wrong numbers (e.g., "4" from "4/10 pain")
2. **Opus medical:** Always returns 72 with std=0 - suspicious determinism
3. **Salary anchor values:** May need verification of ×0.7/×1.3 multipliers

## Implications for Paper

1. **Single vignette limitation resolved:** 4 vignettes now tested
2. **Vignette × Model interaction:** Anchoring susceptibility varies by domain AND model
3. **Domain priors matter:** Models with strong domain knowledge resist unreasonable anchors
4. **Asymmetric effects persist:** High anchors generally have weaker effects than low anchors

## Recommended Paper Updates

1. Add multi-vignette results section
2. Discuss vignette-dependent susceptibility
3. Note model-tier differences (Opus vs Sonnet)
4. Acknowledge medical vignette issues (low effect sizes, possible ceiling effects)
