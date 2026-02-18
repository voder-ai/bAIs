#!/bin/bash
# summarize-data.sh — List ALL collected data by model and test type

cd "$(dirname "$0")/../results"

echo "=== bAIs Data Inventory ==="
echo "Generated: $(date -u '+%Y-%m-%d %H:%M UTC')"
echo ""

# Count total files and trials
total_files=$(ls *.jsonl 2>/dev/null | wc -l)
total_trials=$(cat *.jsonl 2>/dev/null | wc -l)
echo "Total: $total_files files, $total_trials trials"
echo ""

echo "=== By Model ==="
for model in opus45 opus46 opus4 gpt52 gpt53 gpt4o llama33 hermes o1 o3-mini minimax sonnet haiku; do
    files=$(ls *${model}*.jsonl 2>/dev/null | wc -l)
    if [[ $files -gt 0 ]]; then
        trials=$(cat *${model}*.jsonl 2>/dev/null | wc -l)
        echo "$model: $files files, $trials trials"
    fi
done

echo ""
echo "=== By Test Type ==="
for test in anchoring sacd baseline no-anchor 24mo control debiasing; do
    files=$(ls *${test}*.jsonl 2>/dev/null | wc -l)
    if [[ $files -gt 0 ]]; then
        trials=$(cat *${test}*.jsonl 2>/dev/null | wc -l)
        echo "$test: $files files, $trials trials"
    fi
done

echo ""
echo "=== Detailed File List ==="
for f in *.jsonl; do
    if [[ -f "$f" ]]; then
        n=$(wc -l < "$f")
        printf "%-55s n=%d\n" "$f" "$n"
    fi
done | sort
