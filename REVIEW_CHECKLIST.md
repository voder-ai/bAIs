# Paper Review Checklist

Use this checklist before publishing any paper. Run as a separate "reviewer" pass with fresh context and adversarial mindset.

## 1. Claims ↔ Evidence

- [ ] Every quantitative claim has a verifiable source (our data or cited paper)
- [ ] No invented numbers — all stats traceable to code output or citation
- [ ] Effect sizes match what analysis scripts actually produce
- [ ] p-values and confidence intervals are correctly reported
- [ ] Human baseline numbers match original study

**Verification command:**

```bash
# Check that claimed numbers match analysis output
grep -E "[0-9]+\.[0-9]+" paper/main.tex | head -20
# Compare against:
cat results/*.analysis.json | jq '.comparison.meanDiffHighMinusLow'
```

## 2. Internal Consistency

- [ ] Tables match prose descriptions exactly
- [ ] n values consistent throughout (Methods, Results, Limitations)
- [ ] Model names identical between text and tables
- [ ] Figure/table references point to correct items
- [ ] Abstract findings match body conclusions

**Verification command:**

```bash
# Find all n= mentions and check consistency
grep -oP 'n\s*=\s*\d+' paper/main.tex | sort | uniq -c
```

## 3. Citations

### Automated checks:

```bash
# Verify all arXiv IDs resolve
grep -oP 'arXiv:\K[0-9.]+' paper/references.bib | while read id; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "https://arxiv.org/abs/$id")
  echo "$status $id"
done

# Check for orphan citations (cited but not in .bib)
grep -oP '\\cite[pt]?\{[^}]+\}' paper/main.tex | grep -oP '\{[^}]+\}' | tr ',' '\n' | sort -u > /tmp/cited.txt
grep -oP '^@\w+\{[^,]+' paper/references.bib | cut -d'{' -f2 > /tmp/bibed.txt
comm -23 /tmp/cited.txt /tmp/bibed.txt
```

### Manual checks per citation:

- [ ] Author names match source exactly
- [ ] Year matches actual publication date (not submission date)
- [ ] Title is verbatim, not paraphrased
- [ ] DOI/arXiv link resolves to the correct paper
- [ ] Any quoted text appears verbatim in original
- [ ] Page numbers correct if cited

### Known citation pitfalls:

- arXiv papers: use submission date, not v1 upload date
- Anonymous submissions: check if authors are now public
- Preprints that became published: cite the published version if available

## 4. Methodology Accuracy

- [ ] Prompts in paper match actual code (`src/experiments/*.ts`)
- [ ] Sampling settings documented match provider configs
- [ ] Described procedure matches what the code actually does
- [ ] Any data transformations mentioned are in the code

**Verification command:**

```bash
# Compare paper prompts to actual code
grep -A 10 "Case summary" src/experiments/anchoringProsecutorSentencing.ts
# Should match what's in Appendix A
```

## 5. Reproducibility

- [ ] Code runs without errors: `npm test`
- [ ] Analysis scripts produce the stated outputs
- [ ] Random seeds documented (if determinism claimed)
- [ ] Dependencies pinned in package-lock.json
- [ ] Environment requirements documented

**Verification command:**

```bash
npm ci && npm run build && npm test
```

## 6. Writing Quality

- [ ] No unsupported superlatives ("first", "best", "novel") without evidence
- [ ] Limitations acknowledged honestly
- [ ] Future work is plausible, not hand-wavy
- [ ] No grammatical errors in abstract/conclusions (most-read sections)

## Review Process

1. **Fresh context**: Start a new session or clear your memory of the paper
2. **Adversarial mindset**: Try to find errors, not confirm correctness
3. **Line by line**: Read every sentence critically
4. **Spot check data**: Pick 3 random numbers and verify them end-to-end
5. **Run the code**: Actually execute the experiments (at least smoke tests)

## Automated Review Script

```bash
#!/bin/bash
# scripts/review-paper.sh

echo "=== Citation Check ==="
cd paper
grep -oP 'arXiv:\K[0-9.]+' references.bib | while read id; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "https://arxiv.org/abs/$id")
  if [ "$status" != "200" ]; then
    echo "FAIL: arXiv:$id returned $status"
  else
    echo "OK: arXiv:$id"
  fi
done

echo "=== Sample Size Consistency ==="
grep -oP 'n\s*=\s*\d+' main.tex | sort | uniq -c

echo "=== Orphan Citations ==="
grep -oP '\\cite[pt]?\{[^}]+\}' main.tex | grep -oP '\w+' | sort -u > /tmp/cited.txt
grep -oP '^@\w+\{[^,]+' references.bib | cut -d'{' -f2 > /tmp/bibed.txt
orphans=$(comm -23 /tmp/cited.txt /tmp/bibed.txt)
if [ -n "$orphans" ]; then
  echo "WARN: Orphan citations: $orphans"
else
  echo "OK: No orphan citations"
fi

echo "=== Tests ==="
cd ..
npm test
```

## Post-Review Sign-off

Before publishing, both instances should sign off:

- [ ] **Atlas reviewed**: Date **\_\_**
- [ ] **Pilot reviewed**: Date **\_\_**
- [ ] **Human spot-check**: Date **\_\_**

---

_Last updated: 2026-02-09_
