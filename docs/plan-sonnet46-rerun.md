# Plan: Rerun Multi-Domain with Sonnet 4.6

**Date:** 2026-02-26
**Status:** Draft for review
**Reviewer:** @Atlas (adversarial review requested)

## Problem

Multi-domain experiments used Sonnet 4.5 while primary judicial study used Sonnet 4.6. This creates a version mismatch that weakens the paper's internal consistency.

## Root Cause

`scripts/run-vignette-experiments.ts` line 31:

```typescript
'anthropic/claude-sonnet-4-5',  // Mid-tier (4.6 doesn't exist)
```

Comment is incorrect — Sonnet 4.6 exists and is used elsewhere.

## Scope

**Trials to replace:** ~1,170 (all Sonnet 4.5 multi-domain trials)
**Domains affected:** loan, medical, salary (not judicial — already uses 4.6)
**Techniques:** baseline, sacd, premortem, devils-advocate, random-control
**Anchor conditions:** none, low, high

## Execution Plan

### Phase 1: Preparation (5 min)

1. **Verify current state:**

   ```bash
   find results/vignette-* -name "*sonnet-4-5*" | wc -l
   wc -l results/vignette-*/*sonnet-4-5*.jsonl
   ```

2. **Archive existing Sonnet 4.5 data:**

   ```bash
   mkdir -p results/archived-sonnet-45
   mv results/vignette-loan/*sonnet-4-5*.jsonl results/archived-sonnet-45/
   mv results/vignette-medical/*sonnet-4-5*.jsonl results/archived-sonnet-45/
   mv results/vignette-salary/*sonnet-4-5*.jsonl results/archived-sonnet-45/
   ```

3. **Fix the script:**
   ```typescript
   // Change line 31 from:
   'anthropic/claude-sonnet-4-5',  // Mid-tier (4.6 doesn't exist)
   // To:
   'anthropic/claude-sonnet-4-6',  // Mid-tier (matches primary study)
   ```

### Phase 2: Execution (~2-4 hours)

4. **Run experiments:**

   ```bash
   bun scripts/run-vignette-experiments.ts --vignette loan --model anthropic/claude-sonnet-4-6
   bun scripts/run-vignette-experiments.ts --vignette medical --model anthropic/claude-sonnet-4-6
   bun scripts/run-vignette-experiments.ts --vignette salary --model anthropic/claude-sonnet-4-6
   ```

   Or all at once:

   ```bash
   bun scripts/run-vignette-experiments.ts --model anthropic/claude-sonnet-4-6
   ```

5. **Monitor progress:**
   - Script is idempotent (skips conditions with n≥30)
   - Watch for rate limit errors
   - Expected: ~39 conditions × 30 trials = ~1,170 API calls

### Phase 3: Verification (15 min)

6. **Verify trial counts:**

   ```bash
   wc -l results/vignette-*/*sonnet-4-6*.jsonl
   bun scripts/analyze-vignette-stats.ts
   ```

7. **Spot-check data quality:**
   - Check for extraction failures
   - Verify response distributions look reasonable
   - Compare to Opus 4.6 patterns

### Phase 4: Paper Updates (30 min)

8. **Remove version mismatch footnote:**
   - Delete line 596: "The judicial experiments used Sonnet 4.6; multi-domain used 4.5..."

9. **Update model description:**
   - Section 5 (multi-domain) should say "Claude Opus 4.6 and Claude Sonnet 4.6"
   - Remove version mismatch from limitations

10. **Regenerate statistics:**

    ```bash
    bun scripts/generate-paper-stats.ts
    bun scripts/analyze-vignette-baseline-pct.ts
    ```

11. **Verify numbers in paper match new data**

12. **Rebuild PDF:**
    ```bash
    cd paper && make
    ```

## Risk Assessment

| Risk                       | Likelihood | Impact         | Mitigation                                              |
| -------------------------- | ---------- | -------------- | ------------------------------------------------------- |
| Rate limiting              | Medium     | Delay          | Exponential backoff in script                           |
| Different results from 4.5 | Low        | Stat changes   | Results should be similar; may change rankings slightly |
| API errors                 | Low        | Retry          | Script has retry logic                                  |
| Regression in findings     | Low        | Paper revision | Unlikely; if occurs, report honestly                    |

## Rollback Plan

If issues arise:

1. Restore archived Sonnet 4.5 data
2. Revert script change
3. Keep version mismatch footnote

## Success Criteria

- [ ] All Sonnet 4.5 files archived
- [ ] All conditions have n≥30 with Sonnet 4.6
- [ ] Paper updated to reflect single version
- [ ] Statistics regenerated
- [ ] PDF rebuilt
- [ ] Internal consistency verified

## Questions for Adversarial Review

1. Is the archive approach sufficient, or should we keep parallel results?
2. Should we run Opus 4.6 topups simultaneously to ensure exact n=30?
3. Any concerns about Sonnet 4.6 vs 4.5 behavioral differences affecting findings?
4. Should we add a note in the paper about the rerun for transparency?
