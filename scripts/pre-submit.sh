#!/bin/bash
# pre-submit.sh — Run ALL pre-publication checks before arXiv submission
# Exit non-zero if any check fails

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

echo "=========================================="
echo "🔬 bAIs Pre-Submission Check Suite"
echo "=========================================="
echo ""

FAILED=0

# 1. Citation verification
echo "📚 [1/3] Verifying citations..."
if ./scripts/verify-citations.sh; then
    echo "✅ Citations verified"
else
    echo "❌ Citation check FAILED"
    FAILED=1
fi
echo ""

# 2. LLM paper review
echo "🤖 [2/3] Running LLM paper review..."
if node scripts/review-paper-llm.mjs; then
    echo "✅ LLM review passed"
else
    echo "❌ LLM review FAILED"
    FAILED=1
fi
echo ""

# 3. "Why Didn't They" adversarial check
echo "🔍 [3/3] Running 'Why Didn't They' adversarial check..."
if node scripts/why-didnt-they-check.mjs; then
    echo "✅ Adversarial check passed"
else
    echo "❌ Adversarial check FAILED"
    FAILED=1
fi
echo ""

echo "=========================================="
if [ $FAILED -eq 0 ]; then
    echo "🎉 ALL CHECKS PASSED — Ready for submission"
    exit 0
else
    echo "🚨 CHECKS FAILED — Do NOT submit until fixed"
    exit 1
fi
