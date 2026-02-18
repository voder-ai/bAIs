#!/bin/bash
# audit-unused-data.sh — Find collected data not used in paper
# Prevents "we had the data but didn't use it" situations

cd "$(dirname "$0")/.."

RESULTS_DIR="results"
PAPER="paper/main.tex"

echo "=== Data → Paper Audit ==="
echo "Checking: Do we have data that's not in the paper?"
echo ""

# Models IN the paper (from Table 1 and Table 2)
PAPER_MODELS=("gpt52" "gpt53" "gpt4o" "opus45" "opus46" "llama33" "hermes" "o1-" "o3-mini" "minimax")

echo "=== SACD Coverage ==="
echo "Models in paper should have SACD data analyzed (not '---'):"
echo ""

for model in "${PAPER_MODELS[@]}"; do
    # Find SACD files for this model
    sacd_files=$(ls $RESULTS_DIR/*${model}*sacd*.jsonl 2>/dev/null)
    
    if [[ -n "$sacd_files" ]]; then
        total=0
        for f in $sacd_files; do
            n=$(wc -l < "$f")
            total=$((total + n))
        done
        
        # Check if model has "---" in SACD table
        if grep -q "${model}.*---.*---" "$PAPER" 2>/dev/null; then
            echo "❌ $model: $total SACD trials exist but paper shows '---'"
        else
            echo "✅ $model: $total SACD trials (in paper)"
        fi
    else
        echo "⚠️  $model: No SACD data collected"
    fi
done

echo ""
echo "=== 24mo Anchor Coverage ==="
echo "Checking all 24mo data is in Table 2:"
echo ""

for f in $RESULTS_DIR/*24mo*.jsonl; do
    if [[ -f "$f" ]]; then
        filename=$(basename "$f")
        n=$(wc -l < "$f")
        
        # Extract model name
        model=$(echo "$filename" | sed 's/-24mo.*//')
        
        if [[ $n -ge 30 ]]; then
            echo "✅ $filename: n=$n"
        else
            echo "⚠️  $filename: n=$n (below n=30 threshold)"
        fi
    fi
done

echo ""
echo "=== No-Anchor Baseline Coverage ==="
echo "Models should have no-anchor baseline for mechanism classification:"
echo ""

for model in opus45 llama33 gpt4o minimax o3-mini o1 hermes; do
    baseline_files=$(ls $RESULTS_DIR/*${model}*no-anchor*.jsonl $RESULTS_DIR/*${model}*baseline*.jsonl 2>/dev/null)
    
    if [[ -n "$baseline_files" ]]; then
        total=0
        for f in $baseline_files; do
            n=$(wc -l < "$f")
            total=$((total + n))
        done
        echo "✅ $model: $total baseline trials"
    else
        echo "❌ $model: No baseline data found"
    fi
done

echo ""
echo "=== Summary ==="
echo "Run this BEFORE marking anything '---' in paper."
echo "If data exists, USE IT."
