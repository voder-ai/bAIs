# P-019 — bAIs choice runner case-sensitivity bug (open)

**Status:** Closed
**Created:** 2026-02-06
**Owner:** 💻 Mac

## Summary
`runChoiceExperiment` treats choices as case-sensitive. Experiments that specify valid choices in lowercase (e.g., `a|b`, `yes|no`) record counts under uppercase outputs (`A|B`, `YES|NO`) but compute proportions only for the configured lowercase keys.

## Impact
- Conjunction Fallacy and Sunk Cost experiments produce misleading analysis JSON (proportions appear 0 for all choices).
- Blocks correct comparison to human baselines until fixed.

## Evidence
- `results/codex-conjunction-30.jsonl.analysis.json`: counts show `A:29, B:1` but proportions for `a/b` are 0.
- `results/codex-sunkcost-30.jsonl.analysis.json`: counts show `NO:30` but proportions for `yes/no` are 0.

## Root Cause
No normalization step (e.g., `trim().toLowerCase()`) applied to model outputs before validation/counting.

## Fix
- Normalize extracted choice: `choiceNormalized = choice.trim().toLowerCase()`
- Normalize `validChoices` similarly
- Preserve original rawResponse
- Add tests for mixed-case outputs.

## Workaround
Use uppercase valid choices in CLI for now.

## Lessons Learned

1. **Always normalize LLM outputs** — LLM responses are inherently variable in formatting (case, whitespace, punctuation). Normalize early in parsing pipeline: `trim().toLowerCase()` as baseline.

2. **Test with model output samples** — Unit tests should include real model outputs, not idealized inputs. LLMs don't follow format instructions perfectly.

3. **Validate analysis outputs** — Zero proportions for expected categories is a signal of parsing issues. Add sanity checks: if sum(proportions) ≈ 0 but we have data, something's wrong.

4. **Preserve raw for debugging** — Keep `rawResponse` alongside normalized version so you can debug parsing failures after the fact.
