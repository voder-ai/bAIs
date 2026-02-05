# bAIs (bias AI studies)

Toolkit for running cognitive-bias experiments on LLMs — reproducing landmark psychology experiments to understand how AI decision-making differs from human cognition.

## First Results

We ran 4 classic experiments (30 trials per condition) and found LLMs have a **distinct cognitive bias profile** — not uniformly better or worse than humans, but systematically different:

| Experiment                                        | Human Pattern                                   | LLM Result                     | Category              |
| ------------------------------------------------- | ----------------------------------------------- | ------------------------------ | --------------------- |
| **Anchoring** (Englich et al. 2006)               | Diff: 2.05 months                               | Diff: 3.67 months (1.8× human) | **MORE susceptible**  |
| **Conjunction Fallacy** (Tversky & Kahneman 1983) | 85% wrong                                       | 0% wrong (60/60 correct)       | **LESS susceptible**  |
| **Sunk Cost** (Arkes & Blumer 1985)               | 85% continue investing                          | 0% continue (60/60 rational)   | **LESS susceptible**  |
| **Framing Effect** (Tversky & Kahneman 1981)      | Preference reversal (gain→certain, loss→gamble) | 97% certain in both frames     | **DIFFERENT pattern** |

### Emerging Taxonomy

Three categories of AI-human bias divergence:

- **📊 Numeric estimation biases** → LLMs are MORE susceptible (no intuitive calibration against irrelevant anchors)
- **🧠 Logical fallacies** → LLMs are LESS susceptible (pattern-match to known rules from training data)
- **💭 Emotional/motivational biases** → LLMs show a DIFFERENT pattern (no loss aversion or sunk cost attachment, but novel biases like certainty preference)

This means "debiasing AI" isn't a single problem. Some biases need reducing, some are already handled, and some are AI-specific — they don't map to the human literature at all.

### Debiasing Results (Phase 4 — Sibony Decision Architecture)

We tested whether Sibony's organizational decision architecture techniques, designed for humans, can reduce LLM biases:

| Technique                     | Anchoring Diff | vs Baseline | vs Human   |
| ----------------------------- | -------------- | ----------- | ---------- |
| **No debiasing** (baseline)   | 3.67 months    | —           | 1.8× human |
| **Context hygiene**           | 2.67 months    | **−27%**    | 1.3× human |
| **Premortem**                 | 2.80 months    | **−24%**    | 1.4× human |
| Human baseline (Englich 2006) | 2.05 months    | —           | —          |

**Key finding:** Decision architecture techniques partially transfer from humans to LLMs. Context hygiene (stripping irrelevant context) slightly outperforms premortem ("imagine this failed, why?"). Neither eliminates the bias entirely, but 24-27% reduction through prompt design alone is practically significant.

## Features

- **Multi-model support**: Run experiments against OpenAI, Anthropic, Google, or Codex providers via `--model provider/model`
- **4 experiments** built-in: anchoring, conjunction fallacy, framing effect, sunk cost fallacy
- **Reproducible**: JSONL output with full trial metadata, statistical analysis, and Markdown reports
- **Extensible**: Generic runner architecture for adding new bias experiments

## Requirements

- Node.js >= 20
- NPM
- API key for at least one provider (OpenAI, Anthropic, Google, or Codex)

## Install

```bash
npm install
npm run build
```

## Running Experiments

### Anchoring Bias

Replicates Study 2 from Englich et al. (2006) — irrelevant numeric anchors shifting judicial sentencing:

```bash
# Default provider (Codex)
node dist/cli.js run anchoring-prosecutor-sentencing --runs 30

# Specific model
node dist/cli.js run anchoring-prosecutor-sentencing --runs 30 --model openai/gpt-4o

# With file output
node dist/cli.js run anchoring-prosecutor-sentencing --runs 30 --out results.jsonl --artifacts files
```

### Choice Experiments

Conjunction fallacy, framing effect, and sunk cost fallacy use a generic choice experiment runner:

```bash
node dist/cli.js run conjunction-fallacy --runs 30
node dist/cli.js run framing-effect --runs 30
node dist/cli.js run sunk-cost-fallacy --runs 30
```

### Model Selection

Use `--model provider/model` to target specific LLMs:

```bash
# OpenAI
node dist/cli.js run anchoring-prosecutor-sentencing --runs 30 --model openai/gpt-4o

# Anthropic
node dist/cli.js run anchoring-prosecutor-sentencing --runs 30 --model anthropic/claude-sonnet-4-20250514

# Google
node dist/cli.js run anchoring-prosecutor-sentencing --runs 30 --model google/gemini-2.0-flash
```

### Output Options

- `--out results.jsonl` — Write JSONL trial data to file
- `--artifacts console` (default) — Print analysis + report to stderr
- `--artifacts files` — Write `.analysis.json` and `.report.md` companion files
- `--artifacts both` — Both console and files

## What's Next

1. **Cross-model comparison** — Run all 4 experiments across GPT-4, Claude, Gemini to see if the bias profile is universal or model-specific
2. **Sibony experiments** — Test decision architecture techniques (context hygiene, multiple alternatives, premortem) to systematically reduce persistent biases
3. **New experiments** — Expand to more of the 30+ documented cognitive biases (availability heuristic, status quo bias, overconfidence, etc.)
4. **Author outreach** — Share results with original study authors for collaboration

## Development

```bash
npm run typecheck
npm test
npm run lint
npm run format:check
npm run build
```

## References

- Englich, B., Mussweiler, T., & Strack, F. (2006). Playing dice with criminal sentences: The influence of irrelevant anchors on experts' judicial sentencing decisions.
- Tversky, A., & Kahneman, D. (1981). The framing of decisions and the psychology of choice.
- Tversky, A., & Kahneman, D. (1983). Extensional versus intuitive reasoning: The conjunction fallacy in probability judgment.
- Arkes, H. R., & Blumer, C. (1985). The psychology of sunk cost.
- Sibony, O. (2019). You're About to Make a Terrible Mistake!

## License

MIT
