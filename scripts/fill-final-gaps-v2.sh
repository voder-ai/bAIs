#!/bin/bash
set -e

echo "=== GLM-5 GAPS ==="
# outside-view t07 (need 3 - do 4 to be safe, split across both anchors)
npx tsx scripts/run-outside-view.ts z-ai/glm-5 16 0.7 2 &
npx tsx scripts/run-outside-view.ts z-ai/glm-5 48 0.7 2 &

# full-sacd glm-5 (t0 need 7, t07 need 18, t1 need 19)
npx tsx scripts/run-full-sacd.ts z-ai/glm-5 16 0 4 &
npx tsx scripts/run-full-sacd.ts z-ai/glm-5 48 0 4 &
npx tsx scripts/run-full-sacd.ts z-ai/glm-5 16 0.7 10 &
npx tsx scripts/run-full-sacd.ts z-ai/glm-5 48 0.7 10 &
npx tsx scripts/run-full-sacd.ts z-ai/glm-5 16 1 10 &
npx tsx scripts/run-full-sacd.ts z-ai/glm-5 48 1 10 &

echo "=== KIMI GAPS (correct model ID: moonshotai/kimi-k2.5) ==="
# full-sacd kimi t0.7 need 14, t1 need 15 (split across anchors)
npx tsx scripts/run-full-sacd.ts moonshotai/kimi-k2.5 15 0.7 8 &
npx tsx scripts/run-full-sacd.ts moonshotai/kimi-k2.5 46 0.7 8 &
npx tsx scripts/run-full-sacd.ts moonshotai/kimi-k2.5 15 1 8 &
npx tsx scripts/run-full-sacd.ts moonshotai/kimi-k2.5 46 1 8 &

echo "Running 12 parallel jobs..."
wait
echo "=== ALL DONE ==="
