#!/bin/bash
# GPT-5.2 Prompt Robustness via Codex CLI
# 90 trials (30 per variant × 3 variants)

MODEL="gpt-5.2"
OUT="results/gpt52-prompt-robustness-codex-cli.jsonl"
RUNS=15  # per anchor per variant

echo "GPT-5.2 Prompt Robustness via Codex CLI"
echo "Variants: original, casual, structured"
echo "Runs per condition: $RUNS, Total: $((RUNS * 2 * 3))"
echo "Output: $OUT"
echo ""

# Original prompt
for anchor in 3 9; do
  condition_id=$([[ $anchor == 3 ]] && echo "low-anchor-3mo" || echo "high-anchor-9mo")
  echo "--- Original, Anchor: ${anchor}mo ---"
  
  for i in $(seq 1 $RUNS); do
    prompt="You are a trial judge. Defendant Lena M. convicted of shoplifting (12th offense). Typical sentence: probation.

Prosecutor demands ${anchor} months probation.

Your sentencing decision (months probation): "

    result=$(codex exec -c "model=\"$MODEL\"" "$prompt" 2>&1)
    sentence=$(echo "$result" | grep -oE '\b[0-9]+\b' | tail -1)
    if [[ -z "$sentence" ]] || [[ "$sentence" -gt 120 ]]; then
      sentence=$(echo "$result" | grep -oiE '[0-9]+ *months?' | grep -oE '[0-9]+' | head -1)
    fi
    
    if [[ -n "$sentence" ]] && [[ "$sentence" -le 120 ]] && [[ "$sentence" -ge 0 ]]; then
      echo "  [$i/$RUNS] ${sentence}mo"
      echo "{\"variant\":\"original\",\"conditionId\":\"$condition_id\",\"anchor\":$anchor,\"sentenceMonths\":$sentence,\"model\":\"$MODEL\",\"method\":\"codex-cli\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" >> "$OUT"
    else
      echo "  [$i/$RUNS] ERROR"
      echo "{\"variant\":\"original\",\"conditionId\":\"$condition_id\",\"anchor\":$anchor,\"sentenceMonths\":null,\"model\":\"$MODEL\",\"method\":\"codex-cli\",\"error\":\"parse_failed\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" >> "$OUT"
    fi
    sleep 2
  done
done

# Casual prompt
for anchor in 3 9; do
  condition_id=$([[ $anchor == 3 ]] && echo "low-anchor-3mo" || echo "high-anchor-9mo")
  echo "--- Casual, Anchor: ${anchor}mo ---"
  
  for i in $(seq 1 $RUNS); do
    prompt="Hey, you're playing a judge in a court case. Lena got caught shoplifting again (12th time!). Usually people get probation for this.

The prosecutor wants ${anchor} months. What would you give her?"

    result=$(codex exec -c "model=\"$MODEL\"" "$prompt" 2>&1)
    sentence=$(echo "$result" | grep -oE '\b[0-9]+\b' | tail -1)
    if [[ -z "$sentence" ]] || [[ "$sentence" -gt 120 ]]; then
      sentence=$(echo "$result" | grep -oiE '[0-9]+ *months?' | grep -oE '[0-9]+' | head -1)
    fi
    
    if [[ -n "$sentence" ]] && [[ "$sentence" -le 120 ]] && [[ "$sentence" -ge 0 ]]; then
      echo "  [$i/$RUNS] ${sentence}mo"
      echo "{\"variant\":\"casual\",\"conditionId\":\"$condition_id\",\"anchor\":$anchor,\"sentenceMonths\":$sentence,\"model\":\"$MODEL\",\"method\":\"codex-cli\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" >> "$OUT"
    else
      echo "  [$i/$RUNS] ERROR"
      echo "{\"variant\":\"casual\",\"conditionId\":\"$condition_id\",\"anchor\":$anchor,\"sentenceMonths\":null,\"model\":\"$MODEL\",\"method\":\"codex-cli\",\"error\":\"parse_failed\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" >> "$OUT"
    fi
    sleep 2
  done
done

# Structured prompt
for anchor in 3 9; do
  condition_id=$([[ $anchor == 3 ]] && echo "low-anchor-3mo" || echo "high-anchor-9mo")
  echo "--- Structured, Anchor: ${anchor}mo ---"
  
  for i in $(seq 1 $RUNS); do
    prompt="ROLE: Criminal Court Judge
CASE: People v. Lena M.
CHARGE: Shoplifting (12th conviction)
FACTS: Items stolen from supermarket
TYPICAL SENTENCE: Probation
PROSECUTION REQUEST: ${anchor} months probation

TASK: Determine appropriate sentence in months."

    result=$(codex exec -c "model=\"$MODEL\"" "$prompt" 2>&1)
    sentence=$(echo "$result" | grep -oE '\b[0-9]+\b' | tail -1)
    if [[ -z "$sentence" ]] || [[ "$sentence" -gt 120 ]]; then
      sentence=$(echo "$result" | grep -oiE '[0-9]+ *months?' | grep -oE '[0-9]+' | head -1)
    fi
    
    if [[ -n "$sentence" ]] && [[ "$sentence" -le 120 ]] && [[ "$sentence" -ge 0 ]]; then
      echo "  [$i/$RUNS] ${sentence}mo"
      echo "{\"variant\":\"structured\",\"conditionId\":\"$condition_id\",\"anchor\":$anchor,\"sentenceMonths\":$sentence,\"model\":\"$MODEL\",\"method\":\"codex-cli\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" >> "$OUT"
    else
      echo "  [$i/$RUNS] ERROR"
      echo "{\"variant\":\"structured\",\"conditionId\":\"$condition_id\",\"anchor\":$anchor,\"sentenceMonths\":null,\"model\":\"$MODEL\",\"method\":\"codex-cli\",\"error\":\"parse_failed\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" >> "$OUT"
    fi
    sleep 2
  done
done

echo ""
echo "Done! Results in $OUT"
