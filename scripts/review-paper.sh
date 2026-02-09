#!/bin/bash
# Paper review automation script
# Run before publishing to catch common errors

set -e

PAPER_DIR="$(dirname "$0")/../paper"
cd "$PAPER_DIR"

echo "=== Citation Check ==="
grep -oP 'arXiv:\K[0-9.]+' references.bib 2>/dev/null | while read id; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "https://arxiv.org/abs/$id")
  if [ "$status" != "200" ]; then
    echo "FAIL: arXiv:$id returned $status"
  else
    echo "OK: arXiv:$id"
  fi
done || echo "No arXiv citations found"

echo ""
echo "=== Sample Size Consistency ==="
grep -oP 'n\s*=\s*\d+|\\$n=\d+\\$' main.tex | sort | uniq -c

echo ""
echo "=== Orphan Citations ==="
grep -oP '\\\\cite[pt]?\\{[^}]+\\}' main.tex | sed 's/.*{//' | sed 's/}//' | tr ',' '\n' | sort -u > /tmp/cited.txt
grep -oP '^@\\w+\\{[^,]+' references.bib | cut -d'{' -f2 > /tmp/bibed.txt
orphans=$(comm -23 /tmp/cited.txt /tmp/bibed.txt 2>/dev/null || true)
if [ -n "$orphans" ]; then
  echo "WARN: Orphan citations:"
  echo "$orphans"
else
  echo "OK: No orphan citations"
fi

echo ""
echo "=== LaTeX Compilation Check ==="
pdflatex -interaction=nonstopmode main.tex > /dev/null 2>&1 && echo "OK: LaTeX compiles" || echo "FAIL: LaTeX errors"

echo ""
echo "=== Tests ==="
cd ..
npm test 2>&1 | tail -5

echo ""
echo "=== Review Complete ==="
echo "Manual checks still needed - see REVIEW_CHECKLIST.md"
