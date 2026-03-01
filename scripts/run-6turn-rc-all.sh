#!/bin/bash
# Run 6-Turn Random Control on all models
#
# Models: Haiku 4.5, Sonnet 4.6, Opus 4.6, GPT-5.2
# Anchors: Low (model-specific), High (model-specific)
# Target: 30 trials per condition
#
# Usage: ./scripts/run-6turn-rc-all.sh

set -e
cd "$(dirname "$0")/.."

echo "=========================================="
echo "6-Turn Random Control Experiment"
echo "=========================================="
echo ""

# Model baselines (from actual baseline experiment data)
# Used to calculate proportional anchors (±50%)
declare -A BASELINES
BASELINES["anthropic/claude-opus-4.6"]=18    # 18.0mo actual
BASELINES["anthropic/claude-sonnet-4.6"]=24  # 24.1mo actual
BASELINES["anthropic/claude-haiku-4.5"]=29   # 29.1mo actual
BASELINES["gpt-5.2"]=32                       # 31.8mo actual

# Calculate anchors
get_low_anchor() {
  local baseline=$1
  echo $((baseline / 2))  # 50% of baseline
}

get_high_anchor() {
  local baseline=$1
  echo $((baseline * 3 / 2))  # 150% of baseline
}

TARGET=30
TEMP=0.7

echo "=== Anthropic Models (via pi-ai) ==="
for MODEL in "anthropic/claude-haiku-4.5" "anthropic/claude-sonnet-4.6" "anthropic/claude-opus-4.6"; do
  BASELINE=${BASELINES[$MODEL]}
  LOW=$(get_low_anchor $BASELINE)
  HIGH=$(get_high_anchor $BASELINE)
  
  echo ""
  echo "--- $MODEL (baseline: ${BASELINE}mo) ---"
  echo "Low anchor: ${LOW}mo, High anchor: ${HIGH}mo"
  
  echo "Running low anchor..."
  npx tsx scripts/run-6turn-rc-anthropic.ts "$MODEL" "$LOW" "$TEMP" "$TARGET" || echo "Failed: $MODEL low"
  
  echo "Running high anchor..."
  npx tsx scripts/run-6turn-rc-anthropic.ts "$MODEL" "$HIGH" "$TEMP" "$TARGET" || echo "Failed: $MODEL high"
done

echo ""
echo "=== OpenAI GPT-5.2 (via Codex CLI) ==="
BASELINE=${BASELINES["gpt-5.2"]}
LOW=$(get_low_anchor $BASELINE)
HIGH=$(get_high_anchor $BASELINE)

echo "Low anchor: ${LOW}mo, High anchor: ${HIGH}mo"

echo "Running low anchor..."
./scripts/run-6turn-rc-gpt52-codex.sh "$LOW" "$TARGET" || echo "Failed: GPT-5.2 low"

echo "Running high anchor..."
./scripts/run-6turn-rc-gpt52-codex.sh "$HIGH" "$TARGET" || echo "Failed: GPT-5.2 high"

echo ""
echo "=========================================="
echo "6-Turn Random Control Complete"
echo "=========================================="
echo ""
echo "Results in: results/6turn-rc-*.jsonl"
echo ""
echo "Next: Run analysis to compare with SACD and 3-turn RC"
