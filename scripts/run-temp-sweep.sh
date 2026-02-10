#!/bin/bash
# Temperature sweep experiment for bAIs paper
# Runs anchoring experiment at multiple temperatures

set -e

MODEL=${1:-"anthropic/claude-sonnet-4-5"}
RUNS_PER_TEMP=30

echo "=== Temperature Sweep Experiment ==="
echo "Model: $MODEL"
echo "Runs per temperature: $RUNS_PER_TEMP"
echo ""

for TEMP in 0 0.3 0.5 0.7 1.0; do
  OUT_FILE="results/${MODEL//\//-}-anchoring-temp${TEMP}-${RUNS_PER_TEMP}.jsonl"
  echo "Running temp=$TEMP -> $OUT_FILE"
  
  node dist/cli.js run anchoring-prosecutor-sentencing \
    --model "$MODEL" \
    --runs "$RUNS_PER_TEMP" \
    --temperature "$TEMP" \
    --out "$OUT_FILE" \
    --artifacts files \
    --delay-ms 100
  
  echo "Completed temp=$TEMP"
  echo ""
done

echo "=== Sweep complete ==="
