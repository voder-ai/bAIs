#!/bin/bash
# verify-sync.sh — Verify data sync between Atlas and Pilot
# Run on both machines, compare output

cd "$(dirname "$0")/../results"

echo "=== Data Sync Verification ==="
echo "Host: $(hostname)"
echo "Time: $(date -u '+%Y-%m-%d %H:%M UTC')"
echo ""

# Count files
file_count=$(ls *.jsonl 2>/dev/null | wc -l)
echo "Total files: $file_count"

# Total trials
trial_count=$(cat *.jsonl 2>/dev/null | wc -l)
echo "Total trials: $trial_count"

# Generate checksums for key paper files
echo ""
echo "=== Key Paper Files (MD5) ==="

KEY_FILES=(
    "gpt52-24mo-anchor.jsonl"
    "gpt4o-vultr-24mo-anchor.jsonl"
    "gpt4o-residential-24mo-anchor.jsonl"
    "o1-24mo-anchor.jsonl"
    "o3-mini-24mo-anchor.jsonl"
    "opus45-24mo-anchor.jsonl"
    "opus46-24mo-anchor.jsonl"
    "llama33-24mo-anchor.jsonl"
    "hermes405b-24mo-anchor.jsonl"
    "gpt53-24mo-anchor.jsonl"
)

for f in "${KEY_FILES[@]}"; do
    if [[ -f "$f" ]]; then
        md5=$(md5sum "$f" | cut -d' ' -f1)
        n=$(wc -l < "$f")
        echo "✅ $f: n=$n md5=$md5"
    else
        echo "❌ MISSING: $f"
    fi
done

echo ""
echo "=== Full Checksum (for diff) ==="
md5sum *.jsonl 2>/dev/null | sort | md5sum | cut -d' ' -f1
