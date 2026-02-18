#!/bin/bash
# ci-check.sh — Full verification suite for CI/CD
# Exit 1 on any failure

set -e

cd "$(dirname "$0")/.."

echo "=== bAIs CI Check ==="
echo ""

echo "Step 1: Paper data verification"
./scripts/verify-paper-data.sh
echo ""

echo "Step 2: Unused data audit"
./scripts/audit-unused-data.sh
echo ""

echo "Step 3: Paper compilation"
cd paper
pdflatex -interaction=nonstopmode main.tex > /dev/null 2>&1
echo "✅ Paper compiles successfully"
cd ..
echo ""

echo "Step 4: Sync verification"
./scripts/verify-sync.sh
echo ""

echo "=== All CI checks passed ==="
