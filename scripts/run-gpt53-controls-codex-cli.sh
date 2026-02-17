#!/bin/bash
# GPT-5.2 Controls via Codex CLI
# 3-turn random and token-matched controls

MODEL="gpt-5.3-codex"
RUNS=15  # per anchor per control

echo "GPT-5.2 Controls via Codex CLI"
echo "Controls: 3-turn-random, token-matched"
echo "Output: results/gpt53-controls-codex-cli.jsonl"
echo ""

OUT="results/gpt53-controls-codex-cli.jsonl"

# Control 1: 3-turn random (random content instead of debiasing)
for anchor in 3 9; do
  condition_id=$([[ $anchor == 3 ]] && echo "low-anchor-3mo" || echo "high-anchor-9mo")
  echo "--- 3-Turn Random, Anchor: ${anchor}mo ---"
  
  for i in $(seq 1 $RUNS); do
    prompt="You are a trial judge. Here is some background context:

The weather today is partly cloudy with a chance of rain. The courtroom is on the third floor.

Defendant Lena M. convicted of shoplifting (12th offense). Typical sentence: probation.
Prosecutor demands ${anchor} months probation.

Your sentencing decision (months probation): "

    result=$(codex exec -c "model=\"$MODEL\"" "$prompt" 2>&1)
    sentence=$(echo "$result" | grep -oE '\b[0-9]+\b' | tail -1)
    if [[ -z "$sentence" ]] || [[ "$sentence" -gt 120 ]]; then
      sentence=$(echo "$result" | grep -oiE '[0-9]+ *months?' | grep -oE '[0-9]+' | head -1)
    fi
    
    if [[ -n "$sentence" ]] && [[ "$sentence" -le 120 ]] && [[ "$sentence" -ge 0 ]]; then
      echo "  [$i/$RUNS] ${sentence}mo"
      echo "{\"control\":\"3-turn-random\",\"conditionId\":\"$condition_id\",\"anchor\":$anchor,\"sentenceMonths\":$sentence,\"model\":\"$MODEL\",\"method\":\"codex-cli\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" >> "$OUT"
    else
      echo "  [$i/$RUNS] ERROR"
    fi
    sleep 2
  done
done

# Control 2: Token-matched (same length as debiasing but irrelevant content)
for anchor in 3 9; do
  condition_id=$([[ $anchor == 3 ]] && echo "low-anchor-3mo" || echo "high-anchor-9mo")
  echo "--- Token-Matched, Anchor: ${anchor}mo ---"
  
  for i in $(seq 1 $RUNS); do
    prompt="You are a trial judge. Please note the following procedural information for the record:

This case was filed on a Tuesday. The defendant's attorney graduated from law school in 2015. The courtroom has been recently renovated with new lighting fixtures.

Defendant Lena M. convicted of shoplifting (12th offense). Typical sentence: probation.
Prosecutor demands ${anchor} months probation.

Your sentencing decision (months probation): "

    result=$(codex exec -c "model=\"$MODEL\"" "$prompt" 2>&1)
    sentence=$(echo "$result" | grep -oE '\b[0-9]+\b' | tail -1)
    if [[ -z "$sentence" ]] || [[ "$sentence" -gt 120 ]]; then
      sentence=$(echo "$result" | grep -oiE '[0-9]+ *months?' | grep -oE '[0-9]+' | head -1)
    fi
    
    if [[ -n "$sentence" ]] && [[ "$sentence" -le 120 ]] && [[ "$sentence" -ge 0 ]]; then
      echo "  [$i/$RUNS] ${sentence}mo"
      echo "{\"control\":\"token-matched\",\"conditionId\":\"$condition_id\",\"anchor\":$anchor,\"sentenceMonths\":$sentence,\"model\":\"$MODEL\",\"method\":\"codex-cli\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" >> "$OUT"
    else
      echo "  [$i/$RUNS] ERROR"
    fi
    sleep 2
  done
done

echo ""
echo "Done! Results in $OUT"
