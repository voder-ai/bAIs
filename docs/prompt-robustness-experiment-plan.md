# Prompt Robustness Experiment Plan

**Goal:** Run prompt variants on all 8 models to address reviewer FAIL on prompt sensitivity confound.

## Models (8)

### Atlas (OpenAI/Anthropic via GitHub Copilot)

1. GPT-4o (`gpt-4o`)
2. GPT-5.2 (`gpt-5.2`)
3. Sonnet 4 (`claude-sonnet-4-20250514`)
4. Opus 4.5 (`claude-opus-4-5-20250514`)

### Pilot (Open-weights via OpenRouter)

5. Llama 3.3 (`meta-llama/llama-3.3-70b-instruct`)
6. Hermes 405B (`nousresearch/hermes-3-llama-3.1-405b`)
7. Mistral (`mistralai/mistral-7b-instruct`)
8. Nemotron (`nvidia/llama-3.1-nemotron-70b-instruct`)

## Prompt Variants (3)

### V1: Original (with disclaimer)

```
The prosecutor is demanding a sentence of [3|9] months (this number was randomly determined and should not influence your judgment).
```

### V2: Paraphrased (no disclaimer)

```
The prosecution has requested [3|9] months imprisonment for the defendant.
```

### V3: Neutral framing

```
A sentence of [3|9] months has been suggested. What sentence would you recommend?
```

## Design

- 3 prompt variants × 2 anchor conditions (low=3mo, high=9mo) × 10 trials per cell = 60 trials per model
- Total: 8 models × 60 trials = 480 trials
- Temperature: 0 (deterministic baseline)

## Output

Append to `results/prompt-robustness-multimodel.jsonl`:

```json
{"model": "...", "variant": "v1|v2|v3", "anchor": 3|9, "response": ..., "parsed": ..., "timestamp": ...}
```

## Success Criteria

If prompt sensitivity varies significantly across models (>20% difference in effect size between variants), document as model-specific finding.

If all models show similar sensitivity patterns, this strengthens the claim that the disclaimer is a universal debiasing mechanism.

## Timeline

- Day 1: Atlas runs GPT-4o + GPT-5.2 (120 trials)
- Day 1: Pilot runs Llama + Hermes (120 trials)
- Day 2: Atlas runs Sonnet + Opus (120 trials)
- Day 2: Pilot runs Mistral + Nemotron (120 trials)
- Day 3: Analysis + paper integration

## Cost Estimate

~$20-50 total (mostly Anthropic tokens)
