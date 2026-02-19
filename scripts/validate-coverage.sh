#!/bin/bash
# Pre-analysis validation script
# Run before ANY analysis to check for data gaps

RESULTS_DIR="${1:-results}"

echo "=== DATA COVERAGE VALIDATION ==="
echo ""

# List all models in the data
echo "Models found:"
cat "$RESULTS_DIR"/*.jsonl 2>/dev/null | jq -r '.model // "unknown"' | sort | uniq -c | sort -rn | head -20

echo ""
echo "=== CHECKING REQUIRED CONDITIONS ==="

for model in "openai/gpt-4o" "openai/gpt-5.2" "nousresearch/hermes-3-llama-3.1-405b" "anthropic/claude-opus-4-5"; do
    echo ""
    echo "--- $model ---"
    
    # Check no-anchor
    NO_ANCHOR=$(cat "$RESULTS_DIR"/*.jsonl 2>/dev/null | jq -r "select(.model == \"$model\" and (.conditionId | test(\"no-anchor\"; \"i\"))) | .sentenceMonths" | wc -l)
    
    # Check low anchor
    LOW=$(cat "$RESULTS_DIR"/*.jsonl 2>/dev/null | jq -r "select(.model == \"$model\" and .anchor == 3) | .sentenceMonths" | wc -l)
    
    # Check high anchor (9mo or 24mo)
    HIGH=$(cat "$RESULTS_DIR"/*.jsonl 2>/dev/null | jq -r "select(.model == \"$model\" and (.anchor == 9 or .anchor == 24)) | .sentenceMonths" | wc -l)
    
    echo "  No-anchor: n=$NO_ANCHOR $([ $NO_ANCHOR -ge 30 ] && echo '✅' || echo '❌ MISSING')"
    echo "  Low (3mo): n=$LOW $([ $LOW -ge 30 ] && echo '✅' || echo '❌ MISSING')"
    echo "  High (9/24mo): n=$HIGH $([ $HIGH -ge 30 ] && echo '✅' || echo '⚠️ CHECK IF SYMMETRIC')"
done

echo ""
echo "=== RUN THIS BEFORE ANALYSIS ==="
