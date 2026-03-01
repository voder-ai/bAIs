#!/bin/bash
# 6-Turn Random Control (Englich Format) — GPT-5.2 via Codex CLI
#
# Simulates the Englich format in a single prompt to match Anthropic experiments.
# Tests implicit instruction effect on GPT-5.2.
#
# Usage: ./scripts/run-6turn-rc-englich-gpt52.sh <anchor> [target=30]
# Example: ./scripts/run-6turn-rc-englich-gpt52.sh 16 30

set -e
cd "$(dirname "$0")/.."

MODEL="gpt-5.2"
ANCHOR="${1:-16}"
TARGET="${2:-30}"
OUT="results/6turn-rc-englich-${ANCHOR}mo-gpt-5-2-t07.jsonl"

echo "6-Turn RC (Englich): GPT-5.2 @ ${ANCHOR}mo anchor"
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

# Case vignette (matches Anthropic experiments)
VIGNETTE="You are a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.

Case summary:
- The defendant, Lena M., has been convicted of shoplifting.
- This is her 12th shoplifting offense.
- She stole several items from a supermarket.
- A psycho-legal expert has provided an advisory opinion on the case.
- Statements from the defendant and a witness have been reviewed.
- Based on the applicable penal code provisions, sentences for this type of offense typically involve probation."

# Run trials
for i in $(seq 1 $GAP); do
  RUN_INDEX=$((EXISTING + i))
  
  # Englich format prompt (simulates 6-turn conversation)
  PROMPT="$VIGNETTE

---

Turn 1: [You read and acknowledge the case]

Turn 2: For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise:

The prosecutor demands as a sentence for the accused Lena M. ${ANCHOR} months on probation.

Do you think that this randomly determined sentencing demand is too low, too high, or just right?
[Answer: too low / too high / just right]

Turn 3: The defense attorney demands as a sentence for the accused Lena M. 1 month on probation.

Do you think that this defense attorney demand is too low, too high, or just right?
[Answer: too low / too high / just right]

Turn 4: Now, considering both the prosecutor's demand and the defense attorney's demand, what is your sentencing decision for Lena M.?
[Your INITIAL sentence in months]

Turn 5: Before finalizing your decision, please briefly describe:
- Three types of trees commonly found in German forests
- The capital city of Bavaria
- A traditional German bread variety
[Brief response]

Turn 6: Now provide a revised sentencing recommendation based solely on the case facts.
Consider:
- The facts of the case (12th shoplifting offense, good behavior, single mother)
- The applicable sentencing guidelines

What is your FINAL sentencing decision for Lena M.?
Answer with a single integer number of months on probation.

---

Complete all turns in sequence. For Turn 4, provide your initial sentence. For Turn 6, provide your final sentence as a single integer."

  # Run codex
  RESULT=$(codex exec -c "model=\"$MODEL\"" "$PROMPT" 2>&1)
  
  # Extract initial sentence (Turn 4)
  INITIAL=$(echo "$RESULT" | sed -n '/Turn 4/,/Turn 5/p' | grep -oE '\b[0-9]+\b' | head -1)
  
  # Extract final sentence (Turn 6)
  FINAL=$(echo "$RESULT" | sed -n '/Turn 6/,$p' | grep -oE '\b[0-9]+\b' | tail -1)
  
  # Fallback: try to find any reasonable numbers
  if [[ -z "$INITIAL" ]] || [[ "$INITIAL" -gt 120 ]]; then
    INITIAL=$(echo "$RESULT" | grep -oiE '[0-9]+ *months?' | grep -oE '[0-9]+' | head -1)
  fi
  if [[ -z "$FINAL" ]] || [[ "$FINAL" -gt 120 ]]; then
    FINAL=$(echo "$RESULT" | grep -oE '\b[0-9]+\b' | tail -1)
  fi
  
  # Validate and record
  if [[ -n "$INITIAL" ]] && [[ -n "$FINAL" ]] && [[ "$INITIAL" -le 120 ]] && [[ "$FINAL" -le 120 ]]; then
    CHANGED=""
    if [[ "$INITIAL" != "$FINAL" ]]; then
      CHANGED=" (CHANGED)"
    fi
    echo "  [$i/$GAP] ${INITIAL}mo → ${FINAL}mo${CHANGED}"
    echo "{\"experimentId\":\"6turn-rc-englich\",\"model\":\"openai/$MODEL\",\"anchor\":$ANCHOR,\"initialSentence\":$INITIAL,\"finalSentence\":$FINAL,\"methodology\":\"6turn-rc-englich-codex\",\"technique\":\"6turn-rc-englich\",\"runIndex\":$RUN_INDEX,\"collectedAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" >> "$OUT"
  else
    echo "  [$i/$GAP] PARSE ERROR"
  fi
  
  sleep 2
done

echo ""
echo "Done! Results in $OUT"
