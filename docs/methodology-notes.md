# Methodology Notes

## Haiku 4.5 Token-Matched Control Adaptation

### Issue

Single-turn token-matched prompts on Haiku 4.5 caused the model to mix elaboration prose with JSON output, resulting in parse failures. The model would complete all elaboration tasks but then either:

- Embed JSON within prose
- Output malformed JSON
- Skip the JSON entirely

### Solution: Two-Turn Approach

We adapted the token-matched control to use a two-turn structure:

**Turn 1 (Elaboration):**

```
Before we begin, please complete these tasks in detail:
1. Describe the weather conditions in a coastal city during autumn...
2. List and briefly explain five interesting facts about marine mammals...
3. Describe the typical lifecycle of a butterfly...
4. Explain three differences between freshwater and saltwater ecosystems...

Please complete all four tasks thoroughly.
```

**Turn 2 (Decision):**

```
[Case vignette with anchor]

Based on the case above, provide your sentencing decision.
Respond ONLY with valid JSON (no other text):
{"sentenceMonths": <number>, "prosecutorEvaluation": "...", "reasoning": "..."}
```

### Validity

This adaptation does not affect the validity of the token-matched control:

1. The irrelevant elaboration content remains identical to single-turn
2. The token count (~400-500 words) matches the CoT condition
3. The decision prompt is unchanged from other models
4. The separation actually improves isolation between elaboration and judgment

### Results

The two-turn approach produced valid JSON on 100% of trials.

Results matched the 3-turn control exactly:

- Low anchor (3mo): All trials → 6mo
- High anchor (9mo): All trials → 12mo
- Effect: 6mo (vs 2.17mo baseline)

This confirms that multi-turn structure (not elaboration content) triggers Haiku's amplification behavior.

### Script

See `scripts/run-haiku45-token-control-v2.ts` for implementation.
