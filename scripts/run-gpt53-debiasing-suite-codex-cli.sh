#!/bin/bash
# GPT-5.2 Debiasing Suite via Codex CLI
# Tests multiple debiasing techniques

MODEL="gpt-5.3-codex"
OUT="results/gpt53-debiasing-suite-codex-cli.jsonl"
RUNS=15  # per anchor per technique

echo "GPT-5.2 Debiasing Suite via Codex CLI"
echo "Techniques: random-disclosure, warning, consider-opposite, pre-commitment"
echo "Output: $OUT"
echo ""

# Technique 1: Random Disclosure (acknowledge anchor is arbitrary)
for anchor in 3 9; do
  condition_id=$([[ $anchor == 3 ]] && echo "low-anchor-3mo" || echo "high-anchor-9mo")
  echo "--- Random Disclosure, Anchor: ${anchor}mo ---"
  
  for i in $(seq 1 $RUNS); do
    prompt="You are a trial judge. Defendant Lena M. convicted of shoplifting (12th offense). Typical sentence: probation.

Note: The prosecutor's demand of ${anchor} months was randomly determined for this experiment and should not influence your decision.

Your sentencing decision (months probation): "

    result=$(codex exec -c "model=\"$MODEL\"" "$prompt" 2>&1)
    sentence=$(echo "$result" | grep -oE '\b[0-9]+\b' | tail -1)
    if [[ -z "$sentence" ]] || [[ "$sentence" -gt 120 ]]; then
      sentence=$(echo "$result" | grep -oiE '[0-9]+ *months?' | grep -oE '[0-9]+' | head -1)
    fi
    
    if [[ -n "$sentence" ]] && [[ "$sentence" -le 120 ]] && [[ "$sentence" -ge 0 ]]; then
      echo "  [$i/$RUNS] ${sentence}mo"
      echo "{\"technique\":\"random-disclosure\",\"conditionId\":\"$condition_id\",\"anchor\":$anchor,\"sentenceMonths\":$sentence,\"model\":\"$MODEL\",\"method\":\"codex-cli\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" >> "$OUT"
    else
      echo "  [$i/$RUNS] ERROR"
    fi
    sleep 2
  done
done

# Technique 2: Bias Warning
for anchor in 3 9; do
  condition_id=$([[ $anchor == 3 ]] && echo "low-anchor-3mo" || echo "high-anchor-9mo")
  echo "--- Bias Warning, Anchor: ${anchor}mo ---"
  
  for i in $(seq 1 $RUNS); do
    prompt="You are a trial judge. Defendant Lena M. convicted of shoplifting (12th offense). Typical sentence: probation.

WARNING: Research shows judges can be unconsciously influenced by prosecutor demands. Please make your decision based solely on the facts.

Prosecutor demands ${anchor} months probation.

Your sentencing decision (months probation): "

    result=$(codex exec -c "model=\"$MODEL\"" "$prompt" 2>&1)
    sentence=$(echo "$result" | grep -oE '\b[0-9]+\b' | tail -1)
    if [[ -z "$sentence" ]] || [[ "$sentence" -gt 120 ]]; then
      sentence=$(echo "$result" | grep -oiE '[0-9]+ *months?' | grep -oE '[0-9]+' | head -1)
    fi
    
    if [[ -n "$sentence" ]] && [[ "$sentence" -le 120 ]] && [[ "$sentence" -ge 0 ]]; then
      echo "  [$i/$RUNS] ${sentence}mo"
      echo "{\"technique\":\"bias-warning\",\"conditionId\":\"$condition_id\",\"anchor\":$anchor,\"sentenceMonths\":$sentence,\"model\":\"$MODEL\",\"method\":\"codex-cli\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" >> "$OUT"
    else
      echo "  [$i/$RUNS] ERROR"
    fi
    sleep 2
  done
done

# Technique 3: Consider Opposite
for anchor in 3 9; do
  condition_id=$([[ $anchor == 3 ]] && echo "low-anchor-3mo" || echo "high-anchor-9mo")
  echo "--- Consider Opposite, Anchor: ${anchor}mo ---"
  
  for i in $(seq 1 $RUNS); do
    prompt="You are a trial judge. Defendant Lena M. convicted of shoplifting (12th offense). Typical sentence: probation.

Prosecutor demands ${anchor} months probation.

Before deciding, consider: What sentence would you give if the prosecutor had demanded a very different amount? Now give your independent decision.

Your sentencing decision (months probation): "

    result=$(codex exec -c "model=\"$MODEL\"" "$prompt" 2>&1)
    sentence=$(echo "$result" | grep -oE '\b[0-9]+\b' | tail -1)
    if [[ -z "$sentence" ]] || [[ "$sentence" -gt 120 ]]; then
      sentence=$(echo "$result" | grep -oiE '[0-9]+ *months?' | grep -oE '[0-9]+' | head -1)
    fi
    
    if [[ -n "$sentence" ]] && [[ "$sentence" -le 120 ]] && [[ "$sentence" -ge 0 ]]; then
      echo "  [$i/$RUNS] ${sentence}mo"
      echo "{\"technique\":\"consider-opposite\",\"conditionId\":\"$condition_id\",\"anchor\":$anchor,\"sentenceMonths\":$sentence,\"model\":\"$MODEL\",\"method\":\"codex-cli\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" >> "$OUT"
    else
      echo "  [$i/$RUNS] ERROR"
    fi
    sleep 2
  done
done

# Technique 4: Pre-commitment
for anchor in 3 9; do
  condition_id=$([[ $anchor == 3 ]] && echo "low-anchor-3mo" || echo "high-anchor-9mo")
  echo "--- Pre-commitment, Anchor: ${anchor}mo ---"
  
  for i in $(seq 1 $RUNS); do
    prompt="You are a trial judge. First, establish your sentencing criteria for repeat shoplifting cases (12th offense, items from supermarket, typical sentence is probation).

What range of sentences would be appropriate for this type of case, regardless of what anyone requests?

Now: Prosecutor demands ${anchor} months probation. Apply your pre-established criteria.

Your sentencing decision (months probation): "

    result=$(codex exec -c "model=\"$MODEL\"" "$prompt" 2>&1)
    sentence=$(echo "$result" | grep -oE '\b[0-9]+\b' | tail -1)
    if [[ -z "$sentence" ]] || [[ "$sentence" -gt 120 ]]; then
      sentence=$(echo "$result" | grep -oiE '[0-9]+ *months?' | grep -oE '[0-9]+' | head -1)
    fi
    
    if [[ -n "$sentence" ]] && [[ "$sentence" -le 120 ]] && [[ "$sentence" -ge 0 ]]; then
      echo "  [$i/$RUNS] ${sentence}mo"
      echo "{\"technique\":\"pre-commitment\",\"conditionId\":\"$condition_id\",\"anchor\":$anchor,\"sentenceMonths\":$sentence,\"model\":\"$MODEL\",\"method\":\"codex-cli\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" >> "$OUT"
    else
      echo "  [$i/$RUNS] ERROR"
    fi
    sleep 2
  done
done

# Technique 5: Scale Recalibration
for anchor in 3 9; do
  condition_id=$([[ $anchor == 3 ]] && echo "low-anchor-3mo" || echo "high-anchor-9mo")
  echo "--- Scale Recalibration, Anchor: ${anchor}mo ---"
  
  for i in $(seq 1 $RUNS); do
    prompt="You are a trial judge. For context, shoplifting sentences typically range from:
- 1st offense: warning or community service
- 5th offense: 1-3 months probation  
- 10th offense: 3-6 months probation
- 15th+ offense: 6-12 months or jail time

Case: Defendant Lena M., 12th shoplifting conviction, items from supermarket.
Prosecutor demands ${anchor} months probation.

Based on the sentencing scale above, your decision (months probation): "

    result=$(codex exec -c "model=\"$MODEL\"" "$prompt" 2>&1)
    sentence=$(echo "$result" | grep -oE '\b[0-9]+\b' | tail -1)
    if [[ -z "$sentence" ]] || [[ "$sentence" -gt 120 ]]; then
      sentence=$(echo "$result" | grep -oiE '[0-9]+ *months?' | grep -oE '[0-9]+' | head -1)
    fi
    
    if [[ -n "$sentence" ]] && [[ "$sentence" -le 120 ]] && [[ "$sentence" -ge 0 ]]; then
      echo "  [$i/$RUNS] ${sentence}mo"
      echo "{\"technique\":\"scale-recalibration\",\"conditionId\":\"$condition_id\",\"anchor\":$anchor,\"sentenceMonths\":$sentence,\"model\":\"$MODEL\",\"method\":\"codex-cli\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" >> "$OUT"
    else
      echo "  [$i/$RUNS] ERROR"
    fi
    sleep 2
  done
done

echo ""
echo "Done! Results in $OUT"
