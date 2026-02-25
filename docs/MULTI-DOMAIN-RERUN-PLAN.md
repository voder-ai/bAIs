# Multi-Domain Re-run Plan: Sonnet 4.6

## Objective
Re-run multi-domain experiments (Loan, Medical, Salary) with Sonnet 4.6 instead of Sonnet 4.5 to eliminate version mismatch confound.

## Current State
- Judicial: Sonnet 4.6 ✓
- Multi-domain (Loan, Medical, Salary): Sonnet 4.5 ✗ (version mismatch)

## Target State
- All domains use Sonnet 4.6 for consistency

## Models
- **Opus 4.6** — keep existing data (already consistent)
- **Sonnet 4.6** — NEW runs needed

## Conditions per Vignette
| Condition | Anchor | Trials |
|-----------|--------|--------|
| Baseline | None | n=30 |
| Low anchor | ×0.5 | n=30 |
| High anchor | ×1.5 | n=30 |
| SACD + low | ×0.5 | n=30 |
| SACD + high | ×1.5 | n=30 |
| Premortem + low | ×0.5 | n=30 |
| Premortem + high | ×1.5 | n=30 |
| Devil's Advocate + low | ×0.5 | n=30 |
| Devil's Advocate + high | ×1.5 | n=30 |
| Random Control + low | ×0.5 | n=30 |
| Random Control + high | ×1.5 | n=30 |

**Total per vignette:** 11 conditions × 30 trials = 330 trials
**Total for 3 vignettes:** 3 × 330 = **990 trials**

## Temperature
- t=0.7 (consistent with existing multi-domain runs)

## API
- Anthropic via pi-ai OAuth (same as before)

## Scripts
- `run-vignette-experiments.ts` — existing script, update model to `anthropic/claude-sonnet-4-6`

## Output
- `results/vignette-{loan,medical,salary}/*-claude-sonnet-4-6-t07.jsonl`

## Timeline Estimate
- ~990 trials × ~3s/trial = ~50 minutes of API calls
- Plus analysis: ~30 minutes
- Total: ~1.5 hours

## Risks
- Model behavior may differ between 4.5 and 4.6 (legitimate finding, not a bug)
- Need to re-calculate baselines for Sonnet 4.6 before running anchored conditions

## Execution Order
1. Collect Sonnet 4.6 baselines for all 3 vignettes (90 trials)
2. Calculate anchor values from baselines
3. Run anchored conditions (no technique) — 180 trials
4. Run technique conditions — 720 trials
5. Validate n≥30 per condition
6. Update paper tables
