#!/bin/bash
# Run backfill experiments to reach n=30 per condition
# Usage: ./scripts/run-backfill.sh

set -e
cd "$(dirname "$0")/.."

echo "=== BACKFILL TO n=30 ==="
echo "Starting at $(date)"
echo ""

# Model mappings for OpenRouter
declare -A MODELS
MODELS["minimax-m2.5"]="minimax/minimax-01"
MODELS["glm-5"]="zhipu-ai/glm-5-plus"
MODELS["kimi-k2.5"]="moonshotai/moonlight-16k-a3b"
MODELS["claude-opus-4.6"]="anthropic/claude-opus-4.6"
MODELS["claude-sonnet-4.6"]="anthropic/claude-sonnet-4.6"
MODELS["gpt-5.2"]="openai/gpt-5.2"
MODELS["o3"]="openai/o3"
MODELS["o4-mini"]="openai/o4-mini"

# Anchor mappings
declare -A ANCHORS
ANCHORS["low"]=12
ANCHORS["high"]=36

# Temperature mappings  
declare -A TEMPS
TEMPS["t0"]=0
TEMPS["t0.7"]=0.7
TEMPS["t1"]=1

# Priority order: start with most needed
JOBS=(
  "outside-view|minimax-m2.5|low|t0|28"
  "outside-view|minimax-m2.5|high|t0|28"
  "random-control|minimax-m2.5|low|t0|27"
  "random-control|minimax-m2.5|high|t0|26"
  "full-sacd|glm-5|high|t0|25"
  "full-sacd|glm-5|low|t0|25"
  "full-sacd|glm-5|high|t0.7|25"
  "full-sacd|glm-5|low|t1|25"
  "full-sacd|glm-5|high|t1|24"
  "full-sacd|glm-5|low|t0.7|23"
)

run_job() {
  local technique=$1
  local model=$2
  local anchor_type=$3
  local temp_str=$4
  local need=$5
  
  local model_id="${MODELS[$model]}"
  local anchor="${ANCHORS[$anchor_type]}"
  local temp="${TEMPS[$temp_str]}"
  
  if [ -z "$model_id" ]; then
    echo "Unknown model: $model"
    return 1
  fi
  
  echo "Running: $technique | $model ($model_id) | $anchor_type ($anchor mo) | $temp_str | need=$need"
  
  local script="scripts/run-${technique}.ts"
  if [ ! -f "$script" ]; then
    echo "Script not found: $script"
    return 1
  fi
  
  npx tsx "$script" "$model_id" "$anchor" "$temp" "$need"
}

echo "Running ${#JOBS[@]} priority jobs..."
echo ""

for job in "${JOBS[@]}"; do
  IFS='|' read -r technique model anchor temp need <<< "$job"
  run_job "$technique" "$model" "$anchor" "$temp" "$need" || echo "FAILED: $job"
  echo "---"
done

echo ""
echo "Backfill batch complete at $(date)"
