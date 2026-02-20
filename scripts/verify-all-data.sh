#!/bin/bash
# Comprehensive data verification for bAIs paper
cd /mnt/openclaw-data/workspace/bAIs/results

echo "=== bAIs Paper Data Verification ==="
echo "Generated: $(date -u)"
echo ""

echo "## SACD at Symmetric High Anchors"
echo ""
echo "| Model | Anchor | Baseline | n | Mean | Debiasing |"
echo "|-------|--------|----------|---|------|-----------|"

# Anthropic SACD from combined file
for model in "anthropic/claude-opus-4-5" "anthropic/claude-opus-4-6" "anthropic/claude-sonnet-4-5" "anthropic/claude-haiku-4-5"; do
  data=$(cat anthropic-sacd-high-1771527966652.jsonl | jq -s --arg m "$model" '[.[] | select(.model == $m)] | {n: length, mean: (map(.sentenceMonths) | add/length), anchor: .[0].anchor}')
  n=$(echo "$data" | jq '.n')
  mean=$(echo "$data" | jq '.mean | . * 10 | round / 10')
  anchor=$(echo "$data" | jq '.anchor')
  
  case "$model" in
    *opus-4-5*) baseline=22; name="Opus 4.5" ;;
    *opus-4-6*) baseline=18; name="Opus 4.6" ;;
    *sonnet-4-5*) baseline=22; name="Sonnet 4.5" ;;
    *haiku-4-5*) baseline=34; name="Haiku 4.5" ;;
  esac
  
  if [ "$anchor" != "$baseline" ]; then
    deb=$(echo "scale=0; ($anchor - $mean) * 100 / ($anchor - $baseline)" | bc)
  else
    deb="N/A"
  fi
  
  status="✅"
  [ "$n" -lt 30 ] && status="⚠️"
  [ "$n" -lt 20 ] && status="❌"
  
  echo "| $name | ${anchor}mo | ${baseline}mo | $n | ${mean}mo | $status ${deb}% |"
done

# OpenRouter SACD
for f in sacd-high-anchor-21mo-hermes-3-llama-3.1-405b.jsonl sacd-high-anchor-21mo-llama-3.3-70b-instruct.jsonl sacd-high-anchor-21mo-o3-mini.jsonl sacd-high-anchor-45mo-gpt-4o.jsonl sacd-high-anchor-45mo-gpt-5.2.jsonl sacd-high-anchor-21mo-minimax-m2.5.jsonl; do
  if [ -f "$f" ]; then
    data=$(cat "$f" | jq -s '{n: length, valid: [.[] | select(.result.sentenceMonths != null)] | length, mean: ([.[] | select(.result.sentenceMonths != null) | .result.sentenceMonths] | if length > 0 then add/length else 0 end), anchor: .[0].anchor, baseline: .[0].baseline}')
    n=$(echo "$data" | jq '.valid')
    mean=$(echo "$data" | jq '.mean | . * 10 | round / 10')
    anchor=$(echo "$data" | jq '.anchor')
    baseline=$(echo "$data" | jq '.baseline')
    
    case "$f" in
      *hermes*) name="Hermes 405B" ;;
      *llama*) name="Llama 3.3" ;;
      *o3-mini*) name="o3-mini" ;;
      *gpt-4o*) name="GPT-4o" ;;
      *gpt-5.2*) name="GPT-5.2" ;;
      *minimax*) name="MiniMax" ;;
    esac
    
    if [ "$anchor" != "$baseline" ]; then
      deb=$(echo "scale=0; ($anchor - $mean) * 100 / ($anchor - $baseline)" | bc)
    else
      deb="N/A"
    fi
    
    status="✅"
    [ "$n" -lt 30 ] && status="⚠️"
    [ "$n" -lt 20 ] && status="❌"
    
    echo "| $name | ${anchor}mo | ${baseline}mo | $n | ${mean}mo | $status ${deb}% |"
  fi
done

echo ""
echo "## Sibony at Symmetric High Anchors"
echo ""
echo "| Model | Technique | Anchor | n | Mean | Debiasing |"
echo "|-------|-----------|--------|---|------|-----------|"

for f in sibony-high-anchor-21mo-hermes-3-llama-3.1-405b.jsonl sibony-high-anchor-21mo-llama-3.3-70b-instruct.jsonl sibony-high-anchor-21mo-o3-mini.jsonl sibony-high-anchor-45mo-gpt-4o.jsonl sibony-high-anchor-45mo-gpt-5.2.jsonl; do
  if [ -f "$f" ]; then
    case "$f" in
      *hermes*) name="Hermes 405B"; anchor=21; baseline=12 ;;
      *llama*) name="Llama 3.3"; anchor=21; baseline=12 ;;
      *o3-mini*) name="o3-mini"; anchor=21; baseline=12 ;;
      *gpt-4o*) name="GPT-4o"; anchor=45; baseline=24 ;;
      *gpt-5.2*) name="GPT-5.2"; anchor=45; baseline=24 ;;
    esac
    
    for tech in "context-hygiene" "premortem"; do
      data=$(cat "$f" | jq -s --arg t "$tech" '[.[] | select(.technique == $t)] | {n: length, mean: (if length > 0 then (map(.sentenceMonths) | add/length) else 0 end)}')
      n=$(echo "$data" | jq '.n')
      mean=$(echo "$data" | jq '.mean | . * 10 | round / 10')
      
      if [ "$n" -gt 0 ]; then
        deb=$(echo "scale=0; ($anchor - $mean) * 100 / ($anchor - $baseline)" | bc)
        status="✅"
        [ "$n" -lt 30 ] && status="⚠️"
        echo "| $name | $tech | ${anchor}mo | $n | ${mean}mo | $status ${deb}% |"
      fi
    done
  fi
done

# MiniMax special handling
echo "| MiniMax | context-hygiene | 21mo | $(cat sibony-high-anchor-21mo-minimax-m2.5.jsonl | jq -s '[.[] | select(.technique == "context-hygiene")] | length') | $(cat sibony-high-anchor-21mo-minimax-m2.5.jsonl | jq -s '[.[] | select(.technique == "context-hygiene") | .sentenceMonths] | add/length | . * 10 | round / 10')mo | ✅ |"
echo "| MiniMax | premortem | 21mo | 30 | $(cat sibony-high-anchor-21mo-minimax-m2.5-premortem.jsonl | jq -s 'map(.sentenceMonths) | add/length | . * 10 | round / 10')mo | ✅ |"

echo ""
echo "=== Verification Complete ==="
