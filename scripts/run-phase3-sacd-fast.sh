#!/bin/bash
# Phase 3 SACD - Fast models (Anthropic + OpenAI)
# 7 models × 2 anchors × 3 temps × 30 = 1,260 trials

cd "$(dirname "$0")/.."

MODELS=(
  "anthropic/claude-opus-4.6:9:27"
  "anthropic/claude-sonnet-4.6:12:36"
  "anthropic/claude-haiku-4.5:15:44"
  "openai/gpt-5.2:16:48"
  "openai/gpt-4.1:13:38"
  "openai/o3:17:51"
  "openai/o4-mini:18:54"
)

TEMPS=(0 0.7 1.0)

for spec in "${MODELS[@]}"; do
  IFS=':' read -r model low high <<< "$spec"
  for temp in "${TEMPS[@]}"; do
    echo "=== SACD: $model | low=$low | temp=$temp ==="
    npx tsx scripts/run-sacd.ts "$model" "$low" "$temp" 30
    
    echo "=== SACD: $model | high=$high | temp=$temp ==="
    npx tsx scripts/run-sacd.ts "$model" "$high" "$temp" 30
  done
done

echo "Phase 3 SACD (fast models) complete!"
