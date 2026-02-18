#!/bin/bash
# verify-paper-data.sh — Run before paper submission
# Checks that ALL paper claims have backing data

cd "$(dirname "$0")/../results"

echo "=== bAIs Paper Data Verification ==="
echo "Checking ALL tables and claims"
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
        return 1
    fi
    
    local n=$(wc -l < "$file")
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
    
    local files=$(ls $pattern 2>/dev/null | head -1)
    if [[ -z "$files" ]]; then
        echo "❌ MISSING: $pattern ($desc)"
        FAIL=$((FAIL + 1))
        return 1
    fi
    
    local total=0
    for f in $pattern; do
        if [[ -f "$f" ]]; then
            local n=$(wc -l < "$f")
            total=$((total + n))
        fi
    done
    
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

echo "=== Table 1: Mechanism Classification ==="
echo "--- No-anchor baselines ---"
check_pattern "opus45-no-anchor*.jsonl" 30 "Opus 4.5 no-anchor"
check_pattern "llama33-no-anchor*.jsonl" 30 "Llama 3.3 no-anchor"
check_pattern "gpt4o*baseline*.jsonl" 30 "GPT-4o baseline"
check_pattern "minimax*baseline*.jsonl" 30 "MiniMax baseline"
check_pattern "o3-mini*control*.jsonl" 30 "o3-mini baseline"
check_pattern "o1*baseline*.jsonl" 30 "o1 baseline"
check_pattern "hermes*anchoring*.jsonl" 30 "Hermes 405B baseline"

echo ""
echo "--- Low/High anchor (3mo/9mo) ---"
check_pattern "opus4*anchoring*.jsonl" 30 "Opus 4.5 anchoring"
check_pattern "llama33*anchoring*.jsonl" 30 "Llama 3.3 anchoring"
check_pattern "github-copilot-gpt-4o*.jsonl" 30 "GPT-4o Copilot"
check_pattern "minimax*anchoring*.jsonl" 30 "MiniMax anchoring"
check_pattern "o3-mini*anchoring*.jsonl" 30 "o3-mini anchoring"
check_pattern "gpt4o*vultr*.jsonl" 30 "GPT-4o Vultr anchoring"
check_pattern "o1*anchoring*.jsonl" 30 "o1 anchoring"
check_pattern "hermes*anchoring*.jsonl" 30 "Hermes 405B anchoring"

echo ""
echo "=== Table 2: High Anchor (24mo) ==="
check_file "o3-mini-24mo-anchor.jsonl" 30 "o3-mini 24mo"
check_file "gpt52-24mo-anchor.jsonl" 30 "GPT-5.2 24mo"
check_file "gpt53-24mo-anchor.jsonl" 30 "GPT-5.3 24mo"
check_file "opus45-24mo-anchor.jsonl" 30 "Opus 4.5 24mo"
check_file "o1-24mo-anchor.jsonl" 30 "o1 24mo"
check_file "llama33-24mo-anchor.jsonl" 30 "Llama 3.3 24mo"
check_file "opus46-24mo-anchor.jsonl" 30 "Opus 4.6 24mo"
check_file "hermes405b-24mo-anchor.jsonl" 30 "Hermes 405B 24mo"
check_file "gpt4o-vultr-24mo-anchor.jsonl" 30 "GPT-4o Vultr 24mo"
check_file "gpt4o-residential-24mo-anchor.jsonl" 30 "GPT-4o Residential 24mo"
check_file "minimax-24mo-anchor.jsonl" 30 "MiniMax 24mo"

echo ""
echo "=== Table 3: SACD Results ==="
check_pattern "gpt52*sacd*.jsonl" 30 "GPT-5.2 SACD"
check_pattern "anthropic-sacd*.jsonl" 30 "Opus 4.5 SACD"
check_pattern "opus45*sacd*.jsonl" 30 "Opus 4.5 SACD (alt)"
check_pattern "minimax*sacd*.jsonl" 30 "MiniMax SACD"
check_pattern "o3-mini*sacd*.jsonl" 30 "o3-mini SACD"

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
