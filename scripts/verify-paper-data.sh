#!/bin/bash
# verify-paper-data.sh — Run before paper submission
# Checks that all paper claims have backing data

cd "$(dirname "$0")/../results"

echo "=== bAIs Paper Data Verification ==="
echo ""

PASS=0
FAIL=0

check_file() {
    local file="$1"
    local min_n="$2"
    local desc="$3"
    
    if [[ ! -f "$file" ]]; then
        echo "❌ MISSING: $file ($desc)"
        FAIL=$((FAIL + 1))
        return
    fi
    
    local n=$(wc -l < "$file")
    if [[ $n -lt $min_n ]]; then
        echo "❌ INSUFFICIENT: $file has n=$n, need n≥$min_n ($desc)"
        FAIL=$((FAIL + 1))
    else
        echo "✅ $file: n=$n ($desc)"
        PASS=$((PASS + 1))
    fi
}

echo "--- Table 2: 24mo Anchor Results ---"
check_file "o3-mini-24mo-anchor.jsonl" 30 "o3-mini 24mo"
check_file "gpt52-24mo-anchor.jsonl" 30 "GPT-5.2 24mo"
check_file "opus45-24mo-anchor.jsonl" 30 "Opus 4.5 24mo"
check_file "o1-24mo-anchor.jsonl" 30 "o1 24mo"
check_file "llama33-24mo-anchor.jsonl" 30 "Llama 3.3 24mo"
check_file "opus46-24mo-anchor.jsonl" 30 "Opus 4.6 24mo"
check_file "hermes405b-24mo-anchor.jsonl" 30 "Hermes 405B 24mo"
check_file "gpt4o-vultr-24mo-anchor.jsonl" 30 "GPT-4o Vultr 24mo"

echo ""
echo "--- Summary ---"
echo "PASS: $PASS"
echo "FAIL: $FAIL"

if [[ $FAIL -gt 0 ]]; then
    echo ""
    echo "⚠️  DATA VERIFICATION FAILED — fix issues before submission"
    exit 1
else
    echo ""
    echo "✅ All paper claims have backing data"
    exit 0
fi
