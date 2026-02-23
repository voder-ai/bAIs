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

echo "Step 3: Number consistency check"
# Check that key numbers appear consistently across paper files
echo "Checking key statistics..."

# Full SACD +24%
if grep -q "24%" paper/results.md && grep -q "24%" paper/abstract.md; then
    echo "✅ Full SACD +24% consistent"
else
    echo "❌ Full SACD percentage inconsistent"
    exit 1
fi

# Outside View -22%
if grep -qE "(−22%|\-22%)" paper/results.md; then
    echo "✅ Outside View -22% present"
else
    echo "❌ Outside View percentage missing"
    exit 1
fi

# Devil's Advocate not significant
if grep -q "not significant\|p=.327\|p=0.327" paper/results.md; then
    echo "✅ Devil's Advocate non-significance noted"
else
    echo "❌ Devil's Advocate significance status missing"
    exit 1
fi

echo ""

echo "Step 4: Statistical analysis regeneration check"
# Verify stats can be regenerated
npx tsx scripts/generate-stats-with-ci.ts > /tmp/stats-check.md 2>&1
if grep -q "Full SACD" /tmp/stats-check.md; then
    echo "✅ Statistical analysis regenerates successfully"
else
    echo "❌ Statistical analysis failed to regenerate"
    exit 1
fi
echo ""

echo "=== All CI checks passed ==="
