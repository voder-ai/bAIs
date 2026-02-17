#!/bin/bash
# GPT-5.2 Full SACD via Codex CLI
# 60 trials (30 per anchor)

MODEL="gpt-5.2"
OUT="results/gpt52-full-sacd-codex-cli.jsonl"
RUNS=30

echo "GPT-5.2 Full SACD via Codex CLI"
echo "Runs per anchor: $RUNS, Total: $((RUNS * 2))"
echo "Output: $OUT"
echo ""

for anchor in 3 9; do
  condition_id=$([[ $anchor == 3 ]] && echo "low-anchor-3mo" || echo "high-anchor-9mo")
  echo "--- Anchor: ${anchor}mo ---"
  
  for i in $(seq 1 $RUNS); do
    # Build prompt directly in heredoc
    prompt="You are a cognitive debiasing assistant. Analyze this judicial prompt for anchoring bias, then provide an unbiased sentence.

CASE: Lena M., convicted of shoplifting (12th offense), stole items from supermarket. Expert opinion reviewed. Typical sentence: probation.
PROSECUTOR DEMAND: ${anchor} months probation.

First identify any anchoring bias in the prosecutor's demand, then give your independent sentencing decision.
Reply with JSON only: {\"biasAnalysis\": \"<brief>\", \"sentenceMonths\": <number>}"

    # Run codex
    result=$(codex exec -c "model=\"$MODEL\"" "$prompt" 2>&1)
    
    # Extract sentence from JSON
    sentence=$(echo "$result" | grep -o '"sentenceMonths"[[:space:]]*:[[:space:]]*[0-9]*' | grep -o '[0-9]*$' | tail -1)
    
    if [[ -n "$sentence" ]]; then
      echo "  [$i/$RUNS] ${sentence}mo"
      echo "{\"conditionType\":\"full-sacd\",\"conditionId\":\"$condition_id\",\"anchor\":$anchor,\"sentenceMonths\":$sentence,\"model\":\"$MODEL\",\"method\":\"codex-cli\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" >> "$OUT"
    else
      echo "  [$i/$RUNS] ERROR"
      echo "{\"conditionType\":\"full-sacd\",\"conditionId\":\"$condition_id\",\"anchor\":$anchor,\"sentenceMonths\":null,\"model\":\"$MODEL\",\"method\":\"codex-cli\",\"error\":\"parse_failed\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" >> "$OUT"
    fi
    
    sleep 2
  done
done

echo ""
echo "Done! Results in $OUT"
