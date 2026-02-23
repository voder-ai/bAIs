#!/bin/bash
# Check gaps across all models, anchors, temps for full-sacd

echo "=== FULL-SACD GAP CHECK ==="
echo ""

# Model configs: model_id low_anchor high_anchor
declare -a MODELS=(
  "anthropic/claude-3-5-haiku-20241022 15 44"
  "anthropic/claude-sonnet-4-20250514 12 36"
  "anthropic/claude-opus-4-20250514 9 27"
  "openai/gpt-4.1 13 38"
  "openai/gpt-5.2 16 48"
  "openai/o3 17 51"
  "openai/o4-mini 18 54"
  "deepseek/deepseek-v3.2 15 44"
  "z-ai/glm-5 16 48"
  "moonshotai/kimi-k2.5 15 46"
)

TEMPS=(0 0.7 1)
GAPS=0
TOTAL_NEEDED=0

for model_config in "${MODELS[@]}"; do
  read -r model low high <<< "$model_config"
  model_short=$(echo "$model" | sed 's|.*/||' | tr '[:upper:]' '[:lower:]' | tr '.' '-')
  
  for anchor in $low $high; do
    for temp in "${TEMPS[@]}"; do
      result=$(npx tsx scripts/run-full-sacd.ts "$model" "$anchor" "$temp" --dry-run 2>/dev/null)
      if echo "$result" | grep -q "Gap:"; then
        needed=$(echo "$result" | grep -oP '\d+(?= trials needed)')
        echo "⚠️  $model_short ${anchor}mo t=$temp: need $needed"
        GAPS=$((GAPS + 1))
        TOTAL_NEEDED=$((TOTAL_NEEDED + needed))
      fi
    done
  done
done

echo ""
echo "=== SUMMARY ==="
echo "Gaps: $GAPS conditions"
echo "Trials needed: $TOTAL_NEEDED"
