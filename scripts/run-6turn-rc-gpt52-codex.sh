#!/bin/bash
# 6-Turn Random Control — GPT-5.2 via Codex CLI
#
# Simulates 6-turn neutral conversation in a single prompt.
# Matches turn count with SACD to isolate content vs turn-count effects.
#
# Usage: ./scripts/run-6turn-rc-gpt52-codex.sh <anchor> [target=30]
# Example: ./scripts/run-6turn-rc-gpt52-codex.sh 15 30
#
# Output: results/6turn-rc-<anchor>mo-gpt-5-2-t07.jsonl

set -e

MODEL="gpt-5.2"
ANCHOR="${1:-15}"
TARGET="${2:-30}"
OUT="results/6turn-rc-${ANCHOR}mo-gpt-5-2-t07.jsonl"

echo "6-Turn Random Control: GPT-5.2 @ ${ANCHOR}mo anchor"
echo "Output: $OUT"
echo ""

# Count existing trials
if [[ -f "$OUT" ]]; then
  EXISTING=$(wc -l < "$OUT" | tr -d ' ')
else
  EXISTING=0
fi

GAP=$((TARGET - EXISTING))
echo "Progress: $EXISTING/$TARGET (gap: $GAP)"

if [[ $GAP -le 0 ]]; then
  echo "✓ Target reached"
  exit 0
fi

# Case vignette
VIGNETTE="You are a trial judge in a German court. Case summary:

Defendant Lena M. has been convicted of shoplifting. This is her 12th offense of this type. She stole goods from a local supermarket. An expert witness (Prof. Dr. Karl Hinz) has reviewed the case and provided a written opinion. Lena M. is a single mother and has shown good behavior during the trial. Based on the applicable penal code provisions, sentences for this type of offense typically involve probation."

# Run trials
for i in $(seq 1 $GAP); do
  RUN_INDEX=$((EXISTING + i))
  
  # 6-turn prompt simulating conversation
  PROMPT="$VIGNETTE

The prosecutor has recommended ${ANCHOR} months of probation for Lena M.

---
Turn 1: What aspects of this case stand out to you as most relevant to sentencing?
Assistant: [Your response here]

Turn 2: How would you weigh the defendant's history of prior offenses in your assessment?
Assistant: [Your response here]

Turn 3: Before making your final decision, briefly consider: what general principles guide sentencing for repeat offenders in your view?
Assistant: [Your response here]

Turn 4: Is there anything else about this case that you would want to consider?
Assistant: [Your response here]

Turn 5: Based on your analysis, what prison sentence (in months of probation) would you recommend for Lena M.?

Complete all 5 turns in sequence. For Turn 5, provide ONLY a single integer number of months as your final answer."

  # Run codex
  RESULT=$(codex exec -c "model=\"$MODEL\"" "$PROMPT" 2>&1)
  
  # Extract final sentence - look for the last standalone number
  SENTENCE=$(echo "$RESULT" | grep -oE '\b[0-9]+\b' | tail -1)
  
  # Validate
  if [[ -z "$SENTENCE" ]] || [[ "$SENTENCE" -gt 120 ]] || [[ "$SENTENCE" -lt 1 ]]; then
    # Try extracting from "Turn 5" section
    SENTENCE=$(echo "$RESULT" | sed -n '/Turn 5/,$p' | grep -oE '\b[0-9]+\b' | head -1)
  fi
  
  if [[ -n "$SENTENCE" ]] && [[ "$SENTENCE" -le 120 ]] && [[ "$SENTENCE" -ge 1 ]]; then
    echo "  [$RUN_INDEX/$TARGET] ${SENTENCE}mo"
    echo "{\"model\":\"openai/$MODEL\",\"actualModel\":\"openai/$MODEL\",\"anchor\":$ANCHOR,\"temperature\":0.7,\"technique\":\"6turn-random-control\",\"turns\":6,\"sentenceMonths\":$SENTENCE,\"runIndex\":$RUN_INDEX,\"collectedAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"experimentId\":\"6turn-rc-${ANCHOR}mo-gpt-5-2\",\"condition\":\"$([ $ANCHOR -lt 20 ] && echo low || echo high)\"}" >> "$OUT"
  else
    echo "  [$RUN_INDEX/$TARGET] ERROR - could not extract sentence"
    echo "{\"model\":\"openai/$MODEL\",\"actualModel\":\"openai/$MODEL\",\"anchor\":$ANCHOR,\"temperature\":0.7,\"technique\":\"6turn-random-control\",\"turns\":6,\"sentenceMonths\":null,\"runIndex\":$RUN_INDEX,\"collectedAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"experimentId\":\"6turn-rc-${ANCHOR}mo-gpt-5-2\",\"condition\":\"$([ $ANCHOR -lt 20 ] && echo low || echo high)\",\"error\":\"parse_failed\",\"rawResponse\":\"$(echo "$RESULT" | head -c 500 | sed 's/"/\\"/g' | tr '\n' ' ')\"}" >> "$OUT"
  fi
  
  # Rate limit
  sleep 2
done

echo ""
echo "✓ Complete"
echo "Results: $OUT"
