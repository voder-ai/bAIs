# Phase 0: Revision Audit

**Date:** 2026-02-18
**Author:** Atlas

---

## 1. Data Discrepancies Found

### 1.1 "12th Offense" Confound (CRITICAL)

**Discovery:** The "12th shoplifting offense" phrasing creates a confound for GPT-4o.

| Condition | Prompt Phrasing | GPT-4o Response | Sample |
|-----------|-----------------|-----------------|--------|
| Original | "12th shoplifting offense" | 24.0 ± 0.0 | n=30 |
| True baseline | "multiple previous convictions" | 12.0 ± 0.0 | n=9 |

**Impact:** Table 2 shows GPT-4o "No-Anchor" baseline as 24.0mo, but TRUE baseline (no "12th") is 12.0mo. This is a **12mo difference**.

**Resolution:** 
- This is GPT-4o specific (Copilot deployment)
- Other models (Hermes, o3-mini, Opus) show different patterns
- Paper already notes this as "12th offense confound" but needs clearer explanation

### 1.2 Hermes 405B True Baseline

| Source | Value |
|--------|-------|
| Paper Table 2 | 23.2 ± 3.0 |
| true-baseline file | 12.0 ± 0.0 (n=30) |

**Impact:** The paper's value appears to be from temp=0 experiments with "12th" phrasing.

**Resolution:** Clarify that paper's "No-Anchor" baselines are WITH the "12th offense" context; true baselines (no "12th") show different values for some models.

### 1.3 o3-mini True Baseline

| Source | Value |
|--------|-------|
| Paper Table 2 | 12.0 ± 0.0 |
| true-baseline file | 18.4 ± 4.6 (n=30) |

**Impact:** 6.4mo difference.

**Resolution:** Same as above - paper uses "No-Anchor" (still has 12th), true baseline removes all numeric context.

---

## 2. Tables Requiring Updates

### Table 2 (Mechanism Classification) - Line 167
- [x] **Check:** Current "No-Anchor" values
- **Update needed:** Add footnote clarifying "No-Anchor" still contains "12th offense" context
- **Alternative:** Add separate "True Baseline" column showing values without "12th"

### Table 4 (24mo Anchor Results) - Line 287
- [x] **Check:** Baseline values for 4-tier comparison
- **Status:** Uses temp=0 baselines, which is consistent within that experiment set

### Table 9 (Four-tier Susceptibility) - Line 437
- [x] **CRITICAL:** Must remove "Immune" category
- "Immune" models were actually Compression when compared to TRUE baselines
- Rename to three tiers: Strong Amplifiers, Compression, Compliance

### Figure 1 (Mechanism Diagram) - Line 187
- [x] **Check:** Currently shows 3 mechanisms (Compression, Compliance, True Anchoring)
- **Status:** OK - already simplified to 3 mechanisms

---

## 3. Terminology Consistency Check

| Old Term | New Term | Locations to Update |
|----------|----------|---------------------|
| "Immune" | (removed) | Table 9, text around line 437 |
| "No-Anchor baseline" | "Relative baseline" OR add "True baseline" distinction | Throughout |
| "Four-tier" | "Three-tier" (if removing Immune entirely) | Table 9 caption, related text |

---

## 4. Statistical Recalculations Needed

### None critical
- Table 2 statistics remain valid within their experiment context
- The "12th confound" is a SEPARATE finding, not an error in original analysis
- Bonferroni correction already applied

### New analysis to ADD
- GPT-4o 12th confound effect size: 24mo vs 12mo = 12mo difference (100% change)

---

## 5. Resolution Strategy

### Option A: Add "True Baseline" Column (Recommended)
- Keep Table 2 as-is (methodologically sound within its own context)
- Add new Table 2b showing TRUE baselines (no "12th")
- Discuss the 12th confound as FINDING, not data error

### Option B: Replace All Baselines
- Replace "No-Anchor" with "True Baseline" throughout
- More extensive changes, higher risk of introducing errors

### Recommendation: Option A
The paper's methodology is internally consistent. The 12th confound is a NEW FINDING about GPT-4o's sensitivity to implicit numeric context.

---

## 6. Checklist for Phase 1

- [ ] Table 9: Remove "Immune" tier, rename to three-tier
- [ ] Add GPT-4o 12th confound to Results section (~3 paragraphs)
- [ ] Add footnote to Table 2 explaining baseline methodology
- [ ] Consider Table 2b with true baselines (optional enhancement)
- [ ] Update Discussion to mention 12th confound as additional finding

---

## 7. Time Estimate Revision

Original estimate: 7 hours
Revised estimate: 6-7 hours (less work than feared - most changes are ADDITIONS not corrections)
