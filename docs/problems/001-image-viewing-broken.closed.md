# Problem 001: Image/Media Viewing Broken on Both Instances

**Status:** Closed ✅
**Reported:** 2026-02-05
**Closed:** 2026-02-05
**Reporter:** Tom / Mac-Voder
**Priority:** 6 (High) — Impact: High (3) × Likelihood: High (3) = 9 → Critical

## Description

Neither Voder instance could view images sent via Discord or other channels.

- **Mac:** `sharp` module failed with wrong architecture (darwin-x64 vs darwin-arm64)
- **Vultr:** Broken sharp install (directory existed but no package.json)

## Business Impact

- Could not view screenshots, photos, or visual content shared by Tom
- Both instances affected — no fallback

## Root Cause

**Mac:** sharp optional dependency `@img/sharp-darwin-arm64` missing. Fixed by reinstalling with correct architecture.

**Vultr:** Previous sharp install was incomplete (directory with no package.json). NPM install in the openclaw module directory hung. Fixed by installing to /tmp then copying modules.

## Resolution

**Mac (2026-02-05):** `npm install --os=darwin --cpu=arm64 sharp` in OpenClaw directory + gateway restart.

**Vultr (2026-02-05):**
1. `npm install sharp` in /tmp (clean environment)
2. Copied sharp + @img bindings to `/usr/lib/node_modules/openclaw/node_modules/`
3. Full gateway restart via `systemctl restart openclaw-gateway`
4. Verified: both `image` tool and `Read` tool work on images

## Lessons Learned

1. sharp architecture must match Node binary platform
2. NPM install can hang in directories with complex dependency trees — install in clean dir then copy
3. SIGUSR1 gateway restart doesn't reload Node modules — need full stop/start
4. Both instances should be self-sufficient — Mac isn't always on the network
