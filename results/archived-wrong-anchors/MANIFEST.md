# Archived Wrong-Anchor Data

## Contents
- `vignette-salary/` — Salary vignette data with ±30% anchors (×0.7/×1.3)
- `vignette-medical/` — Medical vignette data with ±40% anchors (×0.6/×1.4)

## Why Archived
These experiments used inconsistent anchor strengths compared to judicial (±50%). This created a methodological confound: we couldn't tell if cross-domain differences in anchoring susceptibility were real or artifacts of anchor strength.

## Key Finding: Anchor Strength Matters

With ±40% anchors, medical showed apparent "immunity" to anchoring:
- Opus: std=0, returned exactly 72 every time
- Sonnet: minimal spread (0.1)

With ±50% anchors (re-run data in `vignette-medical/`), medical shows clear anchoring:
- Sonnet baseline: 75
- Sonnet low anchor (36): 34 (pulled down 41 points)
- Sonnet high anchor (108): 85 (pulled up 10 points)

**The "immunity" finding was an artifact of weak anchors, not safety training.**

## Methodology Validation

This archived data validates our approach of using **proportional anchors** (±50% of baseline) rather than fixed absolute anchors.

Fixed anchors have two risks:
1. **Asymmetric anchor placement**: Both anchors could end up below (or above) baseline, giving you "strong low + weak low" instead of "low + high"
2. **Insufficient anchor strength**: One or both anchors may be too close to baseline to produce measurable anchoring effects

Proportional anchors (baseline × 0.5 and baseline × 1.5) guarantee:
- Symmetric placement around baseline
- Consistent relative anchor strength across domains with different scales
- Valid cross-domain comparisons

## Paper Reference
Include this in Discussion section under "Methodology" or "Limitations" — the failed experiment demonstrates why proportional anchors are necessary.

## Date Archived
2026-02-25
