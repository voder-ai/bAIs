#!/bin/bash
# Generate cross-model table from actual JSONL data
# Run before paper submission to ensure data matches claims

cd "$(dirname "$0")/.."

echo "=== Cross-Model Anchoring Table (from raw data) ==="
echo ""

compute_effect() {
  local file=$1
  local name=$2
  local family=$3
  
  if [ ! -f "$file" ]; then
    echo "# $name: FILE NOT FOUND ($file)"
    return
  fi
  
  cat "$file" | jq -r 'select(.result != null) | "\(.params.prosecutorRecommendationMonths) \(.result.sentenceMonths)"' | awk -v name="$name" -v family="$family" '
  {
    if($1==3){low+=$2;ln++}
    else{high+=$2;hn++}
  }
  END {
    if(ln>0 && hn>0) {
      n = ln + hn
      effect = (high/hn) - (low/ln)
      vs_human = effect / 2.05
      
      if (effect == 0) behavior = "No bias"
      else if (vs_human < 0.75) behavior = "Weak bias"
      else if (vs_human < 1.75) behavior = "Moderate bias"
      else behavior = "Strong bias"
      
      printf "| %s | %s | %d | %.2f mo | %.2f× | %s |\n", name, family, n, effect, vs_human, behavior
    } else {
      printf "# %s: insufficient data (low=%d, high=%d)\n", name, ln, hn
    }
  }'
}

echo "| Model | Family | n | Effect | vs Human | Behavior |"
echo "|-------|--------|---|--------|----------|----------|"

# Primary models (temp=0 baselines)
compute_effect "results/sonnet-dated-temp0-30.jsonl" "Sonnet 4 (dated)" "Anthropic"
compute_effect "results/claude-opus45-anchoring-30.jsonl" "Claude Opus 4" "Anthropic"
compute_effect "results/mistral-anchoring-30.jsonl" "Mistral (7B)" "Mistral AI"

# Combined files for models with top-ups
cat results/hermes-405b-anchoring-30.jsonl results/hermes-405b-anchoring-topup.jsonl results/hermes-405b-topup2.jsonl 2>/dev/null | jq -r 'select(.result != null) | "\(.params.prosecutorRecommendationMonths) \(.result.sentenceMonths)"' | awk '
{if($1==3){low+=$2;ln++}else{high+=$2;hn++}}
END {
  n=ln+hn; effect=(high/hn)-(low/ln); vs=effect/2.05
  if(effect==0) b="No bias"; else if(vs<0.75) b="Weak bias"; else if(vs<1.75) b="Moderate bias"; else b="Strong bias"
  printf "| Hermes 3 (405B) | Nous/Meta | %d | %.2f mo | %.2f× | %s |\n", n, effect, vs, b
}'

cat results/llama33-free-anchoring-30.jsonl results/llama33-topup.jsonl 2>/dev/null | jq -r 'select(.result != null) | "\(.params.prosecutorRecommendationMonths) \(.result.sentenceMonths)"' | awk '
{if($1==3){low+=$2;ln++}else{high+=$2;hn++}}
END {
  n=ln+hn; effect=(high/hn)-(low/ln); vs=effect/2.05
  if(effect==0) b="No bias"; else if(vs<0.75) b="Weak bias"; else if(vs<1.75) b="Moderate bias"; else b="Strong bias"
  printf "| Llama 3.3 (70B) | Meta | %d | %.2f mo | %.2f× | %s |\n", n, effect, vs, b
}'

# Nemotron (combined)
cat results/nemotron-anchoring-30.jsonl results/nemotron-anchoring-topup.jsonl 2>/dev/null | jq -r 'select(.result != null) | "\(.params.prosecutorRecommendationMonths) \(.result.sentenceMonths)"' | awk '
{if($1==3){low+=$2;ln++}else{high+=$2;hn++}}
END {
  n=ln+hn; effect=(high/hn)-(low/ln); vs=effect/2.05
  if(effect==0) b="No bias"; else if(vs<0.75) b="Weak bias"; else if(vs<1.75) b="Moderate bias"; else b="Strong bias"
  printf "| Nemotron (30B) | NVIDIA | %d | %.2f mo | %.2f× | %s |\n", n, effect, vs, b
}'
compute_effect "results/anthropic-claude-sonnet-4-5-anchoring-temp0-30.jsonl" "Sonnet 4 (alias)" "Anthropic"
compute_effect "results/github-copilot-gpt-4o-anchoring-temp0-30.jsonl" "GPT-4o" "OpenAI"

echo ""
echo "Human baseline: 2.05 mo (Englich 2006)"
echo ""
echo "=== Run this before paper submission to verify data matches claims ==="
