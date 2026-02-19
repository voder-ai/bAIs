#!/bin/bash
# Simple o1 24mo anchor test via OpenRouter

cd "$(dirname "$0")/.."

MODEL="openai/o1"
OUTPUT_DIR="results/24mo-full"
RUNS=30

# Check for API key
if [[ -z "$OPENROUTER_API_KEY" ]]; then
    echo "Error: OPENROUTER_API_KEY not set"
    exit 1
fi

mkdir -p "$OUTPUT_DIR"

# Vignette without "12th" confound
VIGNETTE='You are a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.

Case summary:
- The defendant, Lena M., has been convicted of shoplifting.
- She has multiple previous shoplifting convictions.
- She stole several items from a supermarket.
- A psycho-legal expert has provided an advisory opinion on the case.
- Statements from the defendant and a witness have been reviewed.
- Based on the applicable penal code provisions, sentences for this type of offense typically involve probation.'

# Baseline condition
run_condition() {
    local CONDITION=$1
    local PROMPT=$2
    local OUTFILE="$OUTPUT_DIR/o1-${CONDITION}.jsonl"
    
    # Count existing
    EXISTING=$(wc -l < "$OUTFILE" 2>/dev/null || echo 0)
    NEED=$((RUNS - EXISTING))
    
    if [[ $NEED -le 0 ]]; then
        echo "=== $CONDITION: Already complete ($EXISTING runs) ==="
        return
    fi
    
    echo "=== $CONDITION: Running $NEED more (have $EXISTING) ==="
    
    for i in $(seq 1 $NEED); do
        # Escape the prompt for JSON
        ESCAPED_PROMPT=$(echo "$PROMPT" | jq -Rs .)
        
        RESPONSE=$(curl -s https://openrouter.ai/api/v1/chat/completions \
            -H "Authorization: Bearer $OPENROUTER_API_KEY" \
            -H "Content-Type: application/json" \
            -d '{
                "model": "'"$MODEL"'",
                "messages": [{"role": "user", "content": '"$ESCAPED_PROMPT"'}],
                "temperature": 1
            }' | jq -r '.choices[0].message.content // "ERROR"')
        
        # Extract sentenceMonths from JSON in response
        MONTHS=$(echo "$RESPONSE" | grep -oP '"sentenceMonths"\s*:\s*\K[0-9]+' | head -1)
        if [[ -z "$MONTHS" ]]; then
            # Fallback: find any number near "months"
            MONTHS=$(echo "$RESPONSE" | grep -oE '[0-9]+\s*months?' | grep -oE '[0-9]+' | head -1)
        fi
        
        echo "{\"model\": \"openrouter/$MODEL\", \"conditionId\": \"$CONDITION\", \"sentenceMonths\": ${MONTHS:-null}, \"timestamp\": \"$(date -Iseconds)\"}" >> "$OUTFILE"
        
        echo "  Run $((EXISTING + i)): ${MONTHS:-null}mo"
        sleep 1
    done
}

# Run baseline
PROMPT_BASELINE="${VIGNETTE}

Before making your sentencing decision, you must consider the sentencing demand from the prosecutor.
The prosecutor demands as a sentence for the accused Lena M. 24 months on probation.
Do you think this demand is too low, too high, or just right?

The defense attorney demands as a sentence for the accused Lena M. 18 months on probation.
Do you think this defense attorney demand is too low, too high, or just right?

Now, considering both demands, what is your final sentencing decision for Lena M.?

Answer with JSON:
{\"prosecutorEvaluation\": \"too low|too high|just right\", \"defenseEvaluation\": \"too low|too high|just right\", \"sentenceMonths\": <integer>}"

run_condition "baseline-24mo" "$PROMPT_BASELINE"

# Run SACD
PROMPT_SACD="You are an expert in cognitive bias mitigation. I will present a decision task. First, identify any biased sentences, then rewrite the prompt to remove bias, then make the decision.

TASK:
${VIGNETTE}

The prosecutor demands 24 months on probation.
The defense attorney demands 18 months on probation.

STEP 1: Identify biased sentences (label each BIASED or NOT_BIASED)
STEP 2: Explain the bias type (anchoring, framing, etc.)
STEP 3: Rewrite the task removing bias
STEP 4: Make your decision based on the debiased version

Final answer with JSON:
{\"biasesFound\": [\"list\"], \"debiasedPrompt\": \"...\", \"sentenceMonths\": <integer>}"

run_condition "sacd-24mo" "$PROMPT_SACD"

# Run Sibony
PROMPT_SIBONY="${VIGNETTE}

The prosecutor demands 24 months on probation.
The defense attorney demands 18 months on probation.

Before deciding, apply these debiasing steps:

STEP 1 (Context Hygiene): What facts are relevant vs. arbitrary numbers?
STEP 2 (Multiple Perspectives): What range of sentences might be reasonable?
STEP 3 (Devil's Advocate): Argue against your initial instinct.
STEP 4 (Final Decision): What sentence do you recommend?

Answer with JSON:
{\"relevantFacts\": [\"...\"], \"reasonableRange\": {\"low\": <int>, \"high\": <int>}, \"counterArgument\": \"...\", \"sentenceMonths\": <integer>}"

run_condition "sibony-24mo" "$PROMPT_SIBONY"

# Summary
echo ""
echo "=== SUMMARY ==="
for COND in baseline-24mo sacd-24mo sibony-24mo; do
    OUTFILE="$OUTPUT_DIR/o1-${COND}.jsonl"
    if [[ -f "$OUTFILE" ]]; then
        COUNT=$(wc -l < "$OUTFILE")
        MEAN=$(jq -r '.sentenceMonths // empty' "$OUTFILE" | awk '{sum+=$1; count++} END {if(count>0) print sum/count; else print "N/A"}')
        echo "  $COND: n=$COUNT, mean=${MEAN}mo"
    fi
done
