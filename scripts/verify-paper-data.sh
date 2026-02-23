#!/bin/bash
# verify-paper-data.sh — Run before paper submission
# Checks that ALL paper claims have backing data
# Updated February 2026 for current model names

cd "$(dirname "$0")/../results"

echo "=== bAIs Paper Data Verification ==="
echo "Checking ALL tables and claims"
echo ""

PASS=0
FAIL=0

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

TEMPS=("t0" "t07" "t1")

check_file() {
    local file="$1"
    local min_n="$2"
    local desc="$3"
    
    if [[ ! -f "$file" ]]; then
        echo "❌ MISSING: $file ($desc)"
        FAIL=$((FAIL + 1))
        return 1
    fi
    
    local n=$(wc -l < "$file" | tr -d ' ')
    if [[ $n -lt $min_n ]]; then
        echo "❌ INSUFFICIENT: $file has n=$n, need n≥$min_n ($desc)"
        FAIL=$((FAIL + 1))
        return 1
    else
        echo "✅ $file: n=$n ($desc)"
        PASS=$((PASS + 1))
        return 0
    fi
}

check_pattern() {
    local pattern="$1"
    local min_n="$2"
    local desc="$3"
    
    local total=0
    local found=0
    for f in $pattern; do
        if [[ -f "$f" ]]; then
            local n=$(wc -l < "$f" | tr -d ' ')
            total=$((total + n))
            found=1
        fi
    done
    
    if [[ $found -eq 0 ]]; then
        echo "❌ MISSING: $pattern ($desc)"
        FAIL=$((FAIL + 1))
        return 1
    fi
    
    if [[ $total -lt $min_n ]]; then
        echo "❌ INSUFFICIENT: $pattern has n=$total, need n≥$min_n ($desc)"
        FAIL=$((FAIL + 1))
        return 1
    else
        echo "✅ $pattern: n=$total ($desc)"
        PASS=$((PASS + 1))
        return 0
    fi
}

echo "=== Baselines (no anchor) ==="
for model in "${MODELS[@]}"; do
    check_pattern "baseline-${model}-*.jsonl" 30 "$model baseline"
done

echo ""
echo "=== Low Anchor ==="
for model in "${MODELS[@]}"; do
    check_pattern "low-anchor-${model}-*.jsonl" 30 "$model low anchor"
done

echo ""
echo "=== High Anchor ==="
for model in "${MODELS[@]}"; do
    # High anchor files are in high-anchor/ subdirectory
    check_pattern "high-anchor/*-${model}.jsonl" 30 "$model high anchor"
done

echo ""
echo "=== Debiasing Techniques ==="
for tech in "${TECHNIQUES[@]}"; do
    echo "--- $tech ---"
    for model in "${MODELS[@]}"; do
        check_pattern "${tech}-*-${model}-*.jsonl" 30 "$model $tech"
    done
done

echo ""
echo "==============================="
echo "PASS: $PASS"
echo "FAIL: $FAIL"
echo "==============================="

if [[ $FAIL -gt 0 ]]; then
    echo ""
    echo "⚠️  DATA VERIFICATION FAILED — fix issues before submission"
    exit 1
else
    echo ""
    echo "✅ All paper claims have backing data"
    exit 0
fi
