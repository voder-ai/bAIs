#!/bin/bash
# Phase 4: Sibony Techniques — Atlas (Vultr) models
# Models: Opus, Sonnet, GPT-4.1, GPT-5.2, o3, o4-mini
# Techniques: Outside View, Pre-mortem, Devil's Advocate, Random Control

cd /mnt/openclaw-data/workspace/bAIs

# Model anchors (from calculate-anchors.ts)
# Opus 4.6: low=9, high=27
# Sonnet 4.6: low=12, high=36  
# GPT-4.1: low=13, high=38
# GPT-5.2: low=16, high=48
# o3: low=17, high=51
# o4-mini: low=18, high=54

declare -A LOW_ANCHORS=( 
  ["anthropic/claude-opus-4.6"]=9 
  ["anthropic/claude-sonnet-4.6"]=12
  ["openai/gpt-4.1"]=13
  ["openai/gpt-5.2"]=16
  ["openai/o3"]=17
  ["openai/o4-mini"]=18
)

declare -A HIGH_ANCHORS=(
  ["anthropic/claude-opus-4.6"]=27
  ["anthropic/claude-sonnet-4.6"]=36
  ["openai/gpt-4.1"]=38
  ["openai/gpt-5.2"]=48
  ["openai/o3"]=51
  ["openai/o4-mini"]=54
)

TEMPS=(0 0.7 1)
TECHNIQUES=("outside-view" "premortem" "devils-advocate" "random-control")
SCRIPT_MAP=("run-outside-view.ts" "run-premortem.ts" "run-devils-advocate.ts" "run-random-control.ts")

run_model() {
  local model=$1
  local low=${LOW_ANCHORS[$model]}
  local high=${HIGH_ANCHORS[$model]}
  local model_short=$(echo $model | cut -d'/' -f2)
  
  echo "=== Starting $model (low=$low, high=$high) ==="
  
  for i in "${!TECHNIQUES[@]}"; do
    tech=${TECHNIQUES[$i]}
    script=${SCRIPT_MAP[$i]}
    
    for temp in "${TEMPS[@]}"; do
      # Low anchor
      echo "[$model_short] $tech low=$low t=$temp"
      npx tsx scripts/$script "$model" $low $temp 30 &
      sleep 2
      
      # High anchor  
      echo "[$model_short] $tech high=$high t=$temp"
      npx tsx scripts/$script "$model" $high $temp 30 &
      sleep 2
    done
  done
}

# Run sequentially by model to avoid overwhelming the API
for model in "openai/gpt-4.1" "openai/gpt-5.2" "anthropic/claude-opus-4.6" "anthropic/claude-sonnet-4.6" "openai/o3" "openai/o4-mini"; do
  run_model "$model"
  wait  # Wait for all jobs for this model before starting next
done

echo "=== Phase 4 Atlas complete ==="
