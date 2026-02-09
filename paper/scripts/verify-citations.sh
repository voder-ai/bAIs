#!/bin/bash
# Verify all citations in references.bib resolve to real papers
# Exit 1 if any fail, 0 if all pass

set -euo pipefail

BIB_FILE="${1:-references.bib}"
FAILED=0

echo "=== Verifying citations in $BIB_FILE ==="
echo

# Check arXiv IDs
echo "Checking arXiv IDs..."
arxiv_ids=$(grep -oP 'eprint\s*=\s*\{?\K[0-9.]+' "$BIB_FILE" 2>/dev/null || true)
for id in $arxiv_ids; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "https://arxiv.org/abs/$id" || echo "000")
  if [ "$code" = "200" ]; then
    echo "  ✓ arXiv:$id"
  else
    echo "  ✗ arXiv:$id (HTTP $code)"
    FAILED=1
  fi
done

echo

# Check DOIs
echo "Checking DOIs..."
dois=$(grep -oP 'doi\s*=\s*\{?\K[^},]+' "$BIB_FILE" 2>/dev/null || true)
for doi in $dois; do
  # Clean up any trailing braces or whitespace
  doi=$(echo "$doi" | sed 's/[{}]//g' | tr -d ' ')
  code=$(curl -s -o /dev/null -w "%{http_code}" -L "https://doi.org/$doi" || echo "000")
  if [ "$code" = "200" ]; then
    echo "  ✓ doi:$doi"
  else
    echo "  ✗ doi:$doi (HTTP $code)"
    FAILED=1
  fi
done

echo

# Check for orphan citations (in .tex but not in .bib)
echo "Checking for orphan citations..."
if [ -f "main.tex" ]; then
  tex_cites=$(grep -oP '\\cite\{?\K[^}]+' main.tex 2>/dev/null | tr ',' '\n' | sort -u || true)
  bib_keys=$(grep -oP '@\w+\{\K[^,]+' "$BIB_FILE" 2>/dev/null | sort -u || true)
  
  for cite in $tex_cites; do
    cite=$(echo "$cite" | tr -d ' ')
    if ! echo "$bib_keys" | grep -q "^${cite}$"; then
      echo "  ✗ Citation '$cite' not found in $BIB_FILE"
      FAILED=1
    fi
  done
  
  if [ "$FAILED" = "0" ]; then
    echo "  ✓ All citations have matching bib entries"
  fi
else
  echo "  (skipped - main.tex not found)"
fi

echo
echo "=== Summary ==="
if [ "$FAILED" = "0" ]; then
  echo "All citations verified ✓"
  exit 0
else
  echo "Some citations failed verification ✗"
  exit 1
fi
