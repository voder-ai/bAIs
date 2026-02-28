# Adversarial Review — 2026-02-28

**Reviewer:** Atlas (Opus 4.5)
**Paper version:** `acce486` (21,139 trials)

## MUST FIX (Before arXiv submission)

### 1. Table V needs Haiku 4.5 judicial refusal footnote
The paper documents Haiku refusals in the abstract/intro, but Table V (multi-domain results) doesn't explain why Haiku is missing from judicial rows. Add footnote: "Haiku 4.5 excluded from judicial vignettes due to 85%+ safety refusal rate."

### 2. Trial count inconsistency in Table V
Table V caption says "Haiku for non-judicial only" but the n counts don't clearly show this. Verify n values match actual data:
- Salary: should have 4 models × ~30 trials × 5 techniques × 2 anchors = ~1,200
- Judicial: should have 3 models × ~30 trials × 5 techniques × 2 anchors = ~900

Check `analyze-vignette-stats.ts` output against Table V n values.

### 3. Abstract claims "6,987 trials" for multi-domain
But commit message says 6,987. With new Haiku data (1,654 trials), should this now be higher? Verify: 6,987 includes Haiku or not?

### 4. Figure 2/3 may need regeneration
If Haiku data changed rankings or percentages, regenerate figures. Currently shows:
- DeepSeek 100.8%
- Haiku 47.8%
Are these still accurate after new data?

## SHOULD FIX (Strengthens paper)

### 5. Haiku refusal finding deserves more prominence
Currently buried in footnote. This is actually an interesting finding: domain-specific safety guardrails affect research. Consider 1-2 sentences in Discussion about implications for LLM research methodology.

### 6. Multi-domain model count inconsistency
Abstract says "3-4 models" but should be more precise. Specify: "4 models for non-judicial (Opus 4.6, Sonnet 4.6, Haiku 4.5, GPT-5.2); 3 for judicial (excluding Haiku due to safety refusals)."

### 7. Random-control dominance finding
Random-control wins 4/6 domains under MAD. This is buried in Table V but deserves highlighting in Key Findings or Discussion. It's a striking result: "doing nothing special except adding conversation turns" beats SACD.

### 8. Confidence interval notation
Some tables use [92, 95] notation, others use ±. Standardize throughout.

## NICE TO HAVE (For polishing)

### 9. Compression pattern explanation
The "anchor rejection" hypothesis for compression is interesting but speculative. Either add "we hypothesize" qualifier or cite supporting evidence.

### 10. Power analysis clarity
The effective n calculation (ICC=0.17, n_eff≈60-70) is good but could be clearer. Consider moving to Methods rather than Results.

### 11. Reproducibility statement
Add specific date range for data collection (e.g., "February 1-28, 2026") and note that model weights may have changed since.

## VERIFIED CORRECT

- ✅ Total trials: 21,139 (14,152 + 6,987)
- ✅ MAD as primary metric throughout
- ✅ Per-model baselines used
- ✅ Authorship follows AI-assistance guidelines
- ✅ SACD ranks #1 on zero domains (correct)

## Action Items for Pilot

1. Fix Table V footnote for Haiku
2. Verify all n counts match generated stats
3. Confirm 6,987 multi-domain count is still accurate
4. Regenerate figures if data changed
5. Add random-control finding to Key Findings
6. Standardize CI notation

---
*Review complete. Recommend addressing MUST FIX items before Tom's review.*
