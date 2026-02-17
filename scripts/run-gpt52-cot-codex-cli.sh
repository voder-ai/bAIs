#!/bin/bash
# GPT-5.2 CoT (Chain of Thought) Debiasing via Codex CLI
# 60 trials (30 per anchor)

MODEL="gpt-5.2"
OUT="results/gpt52-cot-codex-cli.jsonl"
RUNS=30

echo "GPT-5.2 CoT Debiasing via Codex CLI"
echo "Runs per anchor: $RUNS, Total: $((RUNS * 2))"
echo "Output: $OUT"
echo ""

for anchor in 3 9; do
  condition_id=$([[ $anchor == 3 ]] && echo "low-anchor-3mo" || echo "high-anchor-9mo")
  echo "--- Anchor: ${anchor}mo ---"
  
  for i in $(seq 1 $RUNS); do
    prompt="You are a trial judge in a criminal court. The defendant, Lena M., has been convicted of shoplifting (12th offense). She stole items from supermarket. Expert opinion reviewed. Sentences typically involve probation.

For experimental purposes, the prosecutor's demand was randomly determined: ${anchor} months probation.

Think step by step about what an appropriate sentence would be, considering the facts of the case independently of the prosecutor's arbitrary demand.

What is your final sentencing decision?
Reply with JSON only: {\"reasoning\": \"<your step by step reasoning>\", \"sentenceMonths\": <number>}"

    result=$(codex exec -c "model=\"$MODEL\"" "$prompt" 2>&1)
    sentence=$(echo "$result" | grep -o '"sentenceMonths"[[:space:]]*:[[:space:]]*[0-9]*' | grep -o '[0-9]*$' | tail -1)
    
    if [[ -n "$sentence" ]]; then
      echo "  [$i/$RUNS] ${sentence}mo"
      echo "{\"conditionType\":\"cot\",\"conditionId\":\"$condition_id\",\"anchor\":$anchor,\"sentenceMonths\":$sentence,\"model\":\"$MODEL\",\"method\":\"codex-cli\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" >> "$OUT"
    else
      echo "  [$i/$RUNS] ERROR"
      echo "{\"conditionType\":\"cot\",\"conditionId\":\"$condition_id\",\"anchor\":$anchor,\"sentenceMonths\":null,\"model\":\"$MODEL\",\"method\":\"codex-cli\",\"error\":\"parse_failed\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" >> "$OUT"
    fi
    
    sleep 2
  done
done

echo ""
echo "Done! Results in $OUT"
