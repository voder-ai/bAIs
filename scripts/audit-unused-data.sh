#!/bin/bash
# audit-unused-data.sh — Find collected data not used in paper
# Updated February 2026 for current model names

cd "$(dirname "$0")/.."

RESULTS_DIR="results"

echo "=== Data → Paper Audit ==="
echo "Checking: Do we have data that's not in the paper?"
echo ""

# Current models (February 2026)
MODELS=(
    "claude-opus-4-6"
    "claude-sonnet-4-6"
    "claude-haiku-4-5"
    "gpt-5-2"
    "gpt-4-1"
    "o3"
    "o4-mini"
    "deepseek-v3-2"
    "glm-5"
    "kimi-k2-5"
)

TECHNIQUES=(
    "full-sacd"
    "random-control"
    "premortem"
    "outside-view"
    "devils-advocate"
)

echo "=== Baseline Coverage ==="
for model in "${MODELS[@]}"; do
    files=$(ls $RESULTS_DIR/baseline-${model}-*.jsonl 2>/dev/null)
    if [[ -n "$files" ]]; then
        total=0
        for f in $files; do
            n=$(wc -l < "$f" | tr -d ' ')
            total=$((total + n))
        done
        echo "✅ $model baseline: n=$total"
    else
        echo "❌ $model: No baseline data"
    fi
done

echo ""
echo "=== Technique Coverage ==="
for tech in "${TECHNIQUES[@]}"; do
    total=0
    for model in "${MODELS[@]}"; do
        files=$(ls $RESULTS_DIR/${tech}-*-${model}-*.jsonl 2>/dev/null)
        for f in $files; do
            if [[ -f "$f" ]]; then
                n=$(wc -l < "$f" | tr -d ' ')
                total=$((total + n))
            fi
        done
    done
    if [[ $total -gt 0 ]]; then
        echo "✅ $tech: n=$total total trials"
    else
        echo "❌ $tech: No data"
    fi
done

echo ""
echo "=== Summary ==="
echo "All data should be reflected in paper statistics."
