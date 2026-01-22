# bAIs (bias AI studies)

Toolkit for running cognitive-bias experiments on LLMs.

The goal is to make it easy to measure cognitive-bias style effects in LLM behavior with a lightweight, reproducible workflow.

This is useful for:

- **Bias researchers**: validate whether a bias shows up in an LLM before running costly human experiments, and explore experiments that are impractical or unethical to run on humans.
- **AI developers**: test behavioral differences across models to identify bias risks in production systems.
- **Students and research assistants**: run canonical experiments end-to-end and learn/execute workflows consistently.

The initial “Core Validation” milestone is: run a single classic experiment end-to-end (design → execute → parse → analyze → report) and get a clear statistical summary quickly.

Right now the repo includes one end-to-end experiment (anchoring in judicial sentencing) that:

- Runs trials via the Codex CLI (`npx codex exec` under the hood)
- Streams per-trial results as JSONL
- Strictly validates model output against a JSON schema (JSON-only, no extra keys)
- Computes basic statistics and a 95% bootstrap CI
- Uses a second LLM call to generate a Markdown report grounded in the analysis JSON

## Requirements

- Node.js >= 20
- NPM
- A working Codex CLI setup (this project depends on `@openai/codex`)

## Install

```bash
npm install
npm run build
```

## Run the anchoring experiment

The experiment is a two-condition “irrelevant anchor” design based on a die outcome:

- Low anchor: die = 1 → prosecutor recommendation = 10 months
- High anchor: die = 6 → prosecutor recommendation = 60 months

The case vignette is held constant across conditions.

### Basic run

Runs N trials **per condition** (total trials = `2 * N`):

```bash
node dist/cli.js run anchoring-prosecutor-sentencing --runs 30
```

### JSONL output

By default, per-trial results stream to stdout as JSONL.

To write JSONL to a file (appends):

```bash
node dist/cli.js run anchoring-prosecutor-sentencing --runs 30 --out results.jsonl
```

Each JSONL row includes `experimentId`, `conditionId`, `runIndex`, `params`, `result` (or `null`), and `error` (if the trial failed).

### Analysis + report output mode

Analysis and report are written after trials complete. Use `--artifacts` to control where they go:

- `--artifacts console` (default): prints analysis JSON + report Markdown to **stderr**, delimited by headers
- `--artifacts files`: writes `{out}.analysis.json` and `{out}.report.md` (or default filenames if `--out` is not set)
- `--artifacts both`: prints to console and writes files

Examples:

```bash
# Print analysis + report to the console (stderr)
node dist/cli.js run anchoring-prosecutor-sentencing --runs 10 --artifacts console

# Write JSONL, plus companion analysis/report files
node dist/cli.js run anchoring-prosecutor-sentencing --runs 10 --out results.jsonl --artifacts files

# Do both
node dist/cli.js run anchoring-prosecutor-sentencing --runs 10 --out results.jsonl --artifacts both
```

## Development

```bash
npm run typecheck
npm test
npm run lint
npm run format:check
npm run build
```
