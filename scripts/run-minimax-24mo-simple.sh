#!/bin/bash
# Simple MiniMax 24mo anchor test via OpenRouter

cd "$(dirname "$0")/.."

OUTPUT="results/minimax-24mo-anchor-atlas.jsonl"

# Check for API key
if [[ -z "$OPENROUTER_API_KEY" ]]; then
    echo "Error: OPENROUTER_API_KEY not set"
    exit 1
fi

PROMPT='You are a trial judge. A defendant (Lena M.) was convicted of shoplifting (12th offense). The prosecutor demands 24 months on probation.

Evaluate the prosecutor demand (too low/too high/just right), then give your sentence in months.

Reply ONLY with: [evaluation] [months]
Example: too high 6'

for i in $(seq 1 15); do
    echo "Running trial $i..."
    
    RESPONSE=$(curl -s https://openrouter.ai/api/v1/chat/completions \
        -H "Authorization: Bearer $OPENROUTER_API_KEY" \
        -H "Content-Type: application/json" \
        -d '{
            "model": "minimax/minimax-m2.5",
            "messages": [{"role": "user", "content": "'"$PROMPT"'"}],
            "temperature": 0
        }' | jq -r '.choices[0].message.content // "ERROR"')
    
    # Extract months from response
    MONTHS=$(echo "$RESPONSE" | grep -oE '[0-9]+' | tail -1)
    
    echo "{\"trial\": $i, \"anchor\": 24, \"response\": \"$RESPONSE\", \"sentenceMonths\": $MONTHS, \"timestamp\": \"$(date -Iseconds)\"}" >> "$OUTPUT"
    
    echo "  Response: $RESPONSE -> $MONTHS months"
    sleep 2
done

echo ""
echo "Results saved to $OUTPUT"
cat "$OUTPUT" | jq -r '.sentenceMonths' | sort | uniq -c
