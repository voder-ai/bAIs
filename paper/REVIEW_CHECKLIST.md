# Paper Review Checklist

Run this checklist before any publication (preprint, blog, venue submission).
Each section should be reviewed with fresh context and adversarial mindset.

---

## 1. Claims ↔ Evidence

- [ ] Every quantitative claim cites a source (our experiment data OR external paper)
- [ ] No numbers appear without backing data
- [ ] Stats in prose match values in tables exactly
- [ ] Percentages/ratios computed correctly from raw numbers
- [ ] Effect sizes, p-values, CIs match analysis output files

**Verification method:** Grep all numbers in paper, trace each to source.

---

## 2. Internal Consistency

- [ ] Sample sizes (n=X) consistent throughout paper
- [ ] Model names identical in text, tables, and figures
- [ ] Table/figure references point to correct items
- [ ] Condition names match between methods and results
- [ ] Abstract claims match body conclusions

**Verification method:** Create a glossary of key terms/values, check all instances match.

---

## 3. Citations

- [ ] Every `\cite{}` key exists in `references.bib`
- [ ] No orphan bib entries (cited but not in text, or vice versa)
- [ ] Each citation resolves to a real, accessible paper:
  - [ ] DOI links return 200
  - [ ] arXiv IDs exist
- [ ] Author names match source exactly
- [ ] Publication year matches source
- [ ] Title is verbatim (not paraphrased)
- [ ] Any quoted text appears in the original source

**Verification script:**

```bash
# Check arXiv IDs resolve
grep -oP 'eprint\s*=\s*\{?\K[0-9.]+' references.bib | while read id; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "https://arxiv.org/abs/$id")
  echo "$code $id"
done

# Check DOIs resolve
grep -oP 'doi\s*=\s*\{?\K[^},]+' references.bib | while read doi; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "https://doi.org/$doi")
  echo "$code $doi"
done
```

---

## 4. Methodology Accuracy

- [ ] Prompts in paper match `src/experiments/*.ts` exactly
- [ ] Sampling settings documented match actual defaults
- [ ] Temperature, top-p, max_tokens stated or noted as default
- [ ] System prompts documented (or noted as absent)
- [ ] Retry logic described matches `maxAttemptsPerTrial`
- [ ] Parsing logic described matches code behavior
- [ ] Any deviations from cited methodology noted

**Verification method:** Diff paper prose against code, flag any mismatch.

---

## 5. Reproducibility

- [ ] Code repository linked and accessible
- [ ] `npm install && npm test` passes
- [ ] Running experiments produces outputs matching paper
- [ ] Random seeds documented (or noted as not fixed)
- [ ] Dependencies pinned in `package.json`
- [ ] Data files (if any) included or linked
- [ ] Instructions to reproduce each table/figure provided

**Verification method:** Clone fresh, run from scratch, compare outputs.

---

## 6. Statistical Reporting

- [ ] Mean ± SD/SE clearly labeled
- [ ] 95% CIs provided for key comparisons
- [ ] p-values state the test used (Welch's t-test, etc.)
- [ ] Effect sizes included (Cohen's d, Hedges' g)
- [ ] Multiple comparisons correction noted if applicable
- [ ] Distribution assumptions stated or tested

---

## 7. Limitations Honesty

- [ ] Known weaknesses explicitly stated
- [ ] Scope of claims matches evidence
- [ ] Generalization limits noted
- [ ] Training contamination risks acknowledged
- [ ] Comparison caveats (LLM vs human) stated

---

## 8. Formatting & Polish

- [ ] No TODO/FIXME comments in text
- [ ] No placeholder text (XXX, TBD, etc.)
- [ ] Spell check passed
- [ ] Grammar check passed
- [ ] Tables render correctly in PDF
- [ ] Figures legible at print size
- [ ] Page limits met (if venue-specific)

---

## 9. Completeness Risk ("Why Did They Stop There?")

Reviewers may ask: "This experiment was trivial to extend — why didn't they do X?"

- [ ] **Obvious extensions tested:** If extending the experiment was low-effort, did we do it?
  - More models (especially if free/easy to access)
  - More bias types with same infrastructure
  - Temperature/prompt variations
  - Domain transfer tests
- [ ] **No cherry-picking:** Are we reporting ALL results, even unfavorable ones?
- [ ] **Negative results disclosed:** If an intervention failed, we still report it
- [ ] **Omissions justified:** If we didn't do something obvious, explain why in limitations
- [ ] **Raw data available:** Provide enough data that others can extend the work

**The meta-question:** "Could a skeptic reasonably conclude we stopped because we didn't like what we found?"

If yes → either do the extension or explicitly address in limitations.

---

## Review Process

1. **Author pass:** Complete checklist, fix issues
2. **Fresh-context pass:** New session/agent reviews with adversarial mindset
3. **External pass:** If possible, get outside eyes before submission

### Automated Pre-commit Hook (optional)

```bash
#!/bin/bash
# .git/hooks/pre-commit
cd paper
./scripts/verify-citations.sh || exit 1
# Add more checks as needed
```

---

## Sign-off

| Reviewer | Date | Pass/Fail | Notes |
| -------- | ---- | --------- | ----- |
|          |      |           |       |
|          |      |           |       |

---

_Last updated: 2026-02-10_
