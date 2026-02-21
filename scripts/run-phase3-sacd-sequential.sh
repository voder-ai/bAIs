#!/bin/bash
# Phase 3 SACD - All models SEQUENTIALLY (to avoid OOM)
# Run this script and let it grind through all conditions

cd "$(dirname "$0")/.."

# Model specs: model:low:high
declare -a MODELS=(
  "anthropic/claude-opus-4.6:9:27"
  "anthropic/claude-sonnet-4.6:12:36"
  "anthropic/claude-haiku-4.5:15:44"
  "openai/gpt-5.2:16:48"
  "openai/gpt-4.1:13:38"
  "openai/o3:17:51"
  "openai/o4-mini:18:54"
  "deepseek/deepseek-v3.2:15:44"
  "moonshotai/kimi-k2.5:15:46"
  "minimax/minimax-m2.5:12:36"
  "z-ai/glm-5:16:48"
)

TEMPS=(0 0.7 1.0)
N=30

total=0
completed=0

# Count total runs
for spec in "${MODELS[@]}"; do
  for temp in "${TEMPS[@]}"; do
    ((total+=2))  # low and high anchor
  done
done

echo "=== Phase 3 SACD Sequential Runner ==="
echo "Total runs: $total"
echo ""

for spec in "${MODELS[@]}"; do
  IFS=':' read -r model low high <<< "$spec"
  # Match the transformation in run-sacd.ts: replace non-alphanumeric with hyphen
  model_short=$(echo "$model" | sed 's|.*/||' | sed 's/[^a-zA-Z0-9-]/-/g')
  
  for temp in "${TEMPS[@]}"; do
    temp_str=$(echo "$temp" | tr -d '.')
    
    # Low anchor
    outfile="results/sacd-${low}mo-${model_short}-t${temp_str}.jsonl"
    if [ -f "$outfile" ] && [ "$(wc -l < "$outfile")" -ge "$N" ]; then
      echo "SKIP: $outfile already has $N+ trials"
      ((completed++))
    else
      echo "RUN: $model | low=$low | temp=$temp"
      npx tsx scripts/run-sacd.ts "$model" "$low" "$temp" "$N"
      ((completed++))
    fi
    echo "Progress: $completed / $total"
    
    # High anchor
    outfile="results/sacd-${high}mo-${model_short}-t${temp_str}.jsonl"
    if [ -f "$outfile" ] && [ "$(wc -l < "$outfile")" -ge "$N" ]; then
      echo "SKIP: $outfile already has $N+ trials"
      ((completed++))
    else
      echo "RUN: $model | high=$high | temp=$temp"
      npx tsx scripts/run-sacd.ts "$model" "$high" "$temp" "$N"
      ((completed++))
    fi
    echo "Progress: $completed / $total"
  done
done

echo ""
echo "=== Phase 3 SACD Complete ==="
