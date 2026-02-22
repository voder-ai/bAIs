# Plan: Paper Revision Based on Overnight Findings (v2)

**Date:** 2026-02-18
**Author:** Atlas
**Status:** DRAFT v2 - Addressing Review Feedback
**Review Score v1:** 68/100

---

## Objective

Revise the bAIs paper to incorporate overnight discoveries:

1. True baseline data (4 models)
2. Simplified 3-mechanism taxonomy
3. Related work positioning

---

## Key Findings to Incorporate

### 1. True Baselines (New Data)

| Model       | True Baseline | With Anchors  | Pattern     |
| ----------- | ------------- | ------------- | ----------- |
| GPT-4o      | 12.0 ± 0.0mo  | copies anchor | Compliance  |
| Hermes 405B | 12.0 ± 0.0mo  | 6mo           | Compression |
| o3-mini     | 18.4 ± 4.6mo  | 6-10mo        | Compression |
| Opus 4.5    | 19.8 ± 2.7mo  | 6-8mo         | Compression |

### 2. Taxonomy Simplification

**Old:** Compression, Compliance, True Anchoring, Immune
**New:** Compression, Compliance, True Anchoring (Immune eliminated - was actually compression)

### 3. Related Work Updates

- Cite Song et al. 2602.06176 (survey framing)
- Cite Huang et al. 2505.15392 (primary comparator)
- Position: "They found 1 mechanism, we found 3"

---

## Tasks

### Phase 0: Data Consistency Audit (1.5 hours) [NEW]

1. Map ALL existing tables/figures against new baseline interpretations
2. Create checklist of every location needing update
3. Flag potential contradictions for resolution
4. Document any statistical recalculations needed

**Deliverable:** `paper/REVISION-AUDIT.md` with complete change list

### Phase 1: Data Integration (1 hour)

1. Add true baseline table to Results section
2. Update mechanism classification based on baselines
3. Revise "12th offense" discussion (GPT-4o specific confound)

### Phase 2: Taxonomy Revision (1 hour)

1. Remove "Immune" category from taxonomy
2. Clarify compression = baseline > response
3. Update Figure 2 (mechanism diagram)

### Phase 2.5: Discussion/Conclusions Update (1.5 hours) [NEW]

1. Revise mechanism implications in Discussion
2. Update Limitations section (acknowledge reclassification)
3. Adjust Future Work recommendations

### Phase 3: Related Work (30 min)

1. Add Song et al. survey citation
2. Add Huang et al. as primary comparator
3. Write differentiation paragraph

### Phase 4: Abstract/Intro Update (30 min)

1. Update abstract with cleaner taxonomy
2. Revise intro contributions list

### Phase 5: Multi-Layer Verification (1 hour) [ENHANCED]

1. Run data verification scripts
2. Terminology consistency check (old vs new terms)
3. Cross-reference validation
4. Run Opus 4.6 review
5. Fix any flagged issues

---

## Success Criteria

1. All true baseline data incorporated
2. Taxonomy simplified to 3 mechanisms
3. Related work section cites key papers
4. Discussion/Limitations updated
5. Opus 4.6 review: 0 FAIL, ≤2 MINOR
6. Data verification: 100% PASS

---

## Risks & Mitigations

| Risk                                     | Mitigation                          |
| ---------------------------------------- | ----------------------------------- |
| Table inconsistencies                    | Phase 0 audit catches all locations |
| Terminology confusion                    | Systematic find/replace in Phase 5  |
| Reviewer pushback on removing "Immune"   | Justify with baseline data          |
| Statistical errors from reclassification | Recalculate in Phase 0              |

### Rollback Strategy [NEW]

- Git commit before starting revisions
- If Opus review shows >2 FAIL: revert and reassess scope
- Minimum viable revision: Just add true baseline table + footnote explaining reclassification

---

## Estimated Time

| Phase                        | Time        |
| ---------------------------- | ----------- |
| Phase 0: Data Audit          | 1.5 hours   |
| Phase 1: Data Integration    | 1 hour      |
| Phase 2: Taxonomy Revision   | 1 hour      |
| Phase 2.5: Discussion Update | 1.5 hours   |
| Phase 3: Related Work        | 30 min      |
| Phase 4: Abstract/Intro      | 30 min      |
| Phase 5: Verification        | 1 hour      |
| **Total**                    | **7 hours** |

---

## Review Request

Please evaluate this revised plan for:

1. **Completeness** — Are all critical updates now covered?
2. **Feasibility** — Is 7 hours realistic?
3. **Logic** — Does the revision flow make sense?
4. **Risks** — Are mitigations adequate?

Score 0-100 and list any remaining issues.
