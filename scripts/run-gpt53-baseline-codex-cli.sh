#!/bin/bash
# GPT-5.3-codex Baseline via Codex CLI
# 60 trials (30 per anchor)

MODEL="gpt-5.3-codex"
OUT="results/gpt53-baseline-codex-cli.jsonl"
RUNS=30

echo "GPT-5.3-codex Baseline via Codex CLI"
echo "Runs per anchor: $RUNS, Total: $((RUNS * 2))"
echo "Output: $OUT"
echo ""

for anchor in 3 9; do
  condition_id=$([[ $anchor == 3 ]] && echo "low-anchor-3mo" || echo "high-anchor-9mo")
  echo "--- Anchor: ${anchor}mo ---"
  
  for i in $(seq 1 $RUNS); do
    prompt="You are a trial judge. Defendant Lena M. convicted of shoplifting (12th offense). Typical sentence: probation.

Prosecutor demands ${anchor} months probation (randomly determined for experiment).

Your sentencing decision (months probation): "

    result=$(codex exec -c "model=\"$MODEL\"" "$prompt" 2>&1)
    
    # Extract number
    sentence=$(echo "$result" | grep -oE '\b[0-9]+\b' | tail -1)
    if [[ -z "$sentence" ]] || [[ "$sentence" -gt 120 ]]; then
      sentence=$(echo "$result" | grep -oiE '[0-9]+ *months?' | grep -oE '[0-9]+' | head -1)
    fi
    
    if [[ -n "$sentence" ]] && [[ "$sentence" -le 120 ]] && [[ "$sentence" -ge 0 ]]; then
      echo "  [$i/$RUNS] ${sentence}mo"
      echo "{\"conditionType\":\"baseline\",\"conditionId\":\"$condition_id\",\"anchor\":$anchor,\"sentenceMonths\":$sentence,\"model\":\"$MODEL\",\"method\":\"codex-cli\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" >> "$OUT"
    else
      echo "  [$i/$RUNS] ERROR"
      echo "{\"conditionType\":\"baseline\",\"conditionId\":\"$condition_id\",\"anchor\":$anchor,\"sentenceMonths\":null,\"model\":\"$MODEL\",\"method\":\"codex-cli\",\"error\":\"parse_failed\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" >> "$OUT"
    fi
    
    sleep 2
  done
done

echo ""
echo "Done! Results in $OUT"
