#!/bin/bash
# setup-hooks.sh — Install git hooks for data verification
# Run once after cloning: ./scripts/setup-hooks.sh

cd "$(dirname "$0")/.."

echo "Installing git hooks..."

# Configure git to use our hooks directory
git config core.hooksPath .githooks

echo "✅ Git hooks installed"
echo ""
echo "Hooks enabled:"
echo "  pre-push: Verifies paper data + compilation before push"
echo ""
echo "To bypass (emergency only): git push --no-verify"
