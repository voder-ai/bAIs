#!/usr/local/bin/bash
# Run 6-Turn Random Control (Englich Format) on all models
#
# This design matches SACD's Englich anchoring format exactly,
# only replacing self-reflection content with filler.
#
# Usage: ./scripts/run-6turn-rc-englich-all.sh

set -e
cd "$(dirname "$0")/.."

echo "=========================================="
echo "6-Turn RC (Englich Format) Experiment"
echo "=========================================="
echo ""

# Model baselines
declare -A BASELINES
BASELINES["anthropic/claude-opus-4.6"]=18
BASELINES["anthropic/claude-sonnet-4.6"]=24
BASELINES["anthropic/claude-haiku-4.5"]=29

TARGET=30
TEMP=0.7

for MODEL in "anthropic/claude-haiku-4.5" "anthropic/claude-sonnet-4.6" "anthropic/claude-opus-4.6"; do
  BASELINE=${BASELINES[$MODEL]}
  LOW=$((BASELINE / 2))
  HIGH=$((BASELINE * 3 / 2))
  
  echo ""
  echo "--- $MODEL (baseline: ${BASELINE}mo) ---"
  echo "Low anchor: ${LOW}mo, High anchor: ${HIGH}mo"
  
  echo "Running low anchor..."
  npx tsx scripts/run-6turn-rc-englich.ts "$MODEL" "$LOW" "$TEMP" "$TARGET" || echo "Failed: $MODEL low"
  
  echo "Running high anchor..."
  npx tsx scripts/run-6turn-rc-englich.ts "$MODEL" "$HIGH" "$TEMP" "$TARGET" || echo "Failed: $MODEL high"
done

echo ""
echo "=========================================="
echo "Complete!"
echo "=========================================="
