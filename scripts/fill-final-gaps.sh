#!/bin/bash
set -e

# glm-5 gaps
echo "=== GLM-5 GAPS ==="

# outside-view t07 (need 3 - do 4 to be safe)
echo "outside-view 16mo glm-5 t0.7..."
npx tsx scripts/run-outside-view.ts z-ai/glm-5 16 0.7 2 &
npx tsx scripts/run-outside-view.ts z-ai/glm-5 48 0.7 2 &

# full-sacd (multiple anchors and temps)
echo "full-sacd glm-5..."
npx tsx scripts/run-full-sacd.ts z-ai/glm-5 16 0 4 &
npx tsx scripts/run-full-sacd.ts z-ai/glm-5 48 0 4 &
npx tsx scripts/run-full-sacd.ts z-ai/glm-5 16 0.7 10 &
npx tsx scripts/run-full-sacd.ts z-ai/glm-5 48 0.7 10 &
npx tsx scripts/run-full-sacd.ts z-ai/glm-5 16 1 10 &
npx tsx scripts/run-full-sacd.ts z-ai/glm-5 48 1 10 &

echo "=== KIMI GAPS ==="
# full-sacd kimi (t0.7 and t1)
npx tsx scripts/run-full-sacd.ts moonshot/kimi-k2.5 15 0.7 8 &
npx tsx scripts/run-full-sacd.ts moonshot/kimi-k2.5 46 0.7 8 &
npx tsx scripts/run-full-sacd.ts moonshot/kimi-k2.5 15 1 8 &
npx tsx scripts/run-full-sacd.ts moonshot/kimi-k2.5 46 1 8 &

echo "Waiting for all jobs..."
wait
echo "=== ALL GAPS FILLED ==="
