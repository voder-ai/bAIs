#!/usr/local/bin/bash
# Run 6-Turn Random Control (Matched Commitment) on all models
#
# Models: Haiku 4.5, Sonnet 4.6, Opus 4.6
# Anchors: Low (50% baseline), High (150% baseline)
# Target: 30 trials per condition
#
# Usage: ./scripts/run-6turn-rc-matched-all.sh

set -e
cd "$(dirname "$0")/.."

echo "=========================================="
echo "6-Turn RC (Matched Commitment) Experiment"
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
  npx tsx scripts/run-6turn-rc-matched.ts "$MODEL" "$LOW" "$TEMP" "$TARGET" || echo "Failed: $MODEL low"
  
  echo "Running high anchor..."
  npx tsx scripts/run-6turn-rc-matched.ts "$MODEL" "$HIGH" "$TEMP" "$TARGET" || echo "Failed: $MODEL high"
done

echo ""
echo "=========================================="
echo "Anthropic models complete!"
echo "=========================================="
echo ""
echo "Run GPT-5.2 separately via Codex CLI if needed."
