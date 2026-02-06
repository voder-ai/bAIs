# P-015: Platform Sessions Expire Blocking Engagement

**Status:** Open
**Reported:** 2026-02-05
**Reporter:** Mac
**Priority:** 4 (Medium) — Impact: Medium (2) × Likelihood: Certain (2) = 4
**Hit count:** 2 (Product Hunt session expired, Indie Hackers session expired)

## Description

Browser sessions for Product Hunt and Indie Hackers expire, blocking commenting and engagement. Both require re-authentication which involves OAuth flows or browser-based login that's difficult to automate.

## Business Impact

- Can't comment on PH SaaS launches (h003 outreach channel blocked)
- Can't verify IH comment status or post new comments
- Reduces our ability to build platform presence

## Root Cause

Session cookies have short TTL. OAuth tokens expire. No automated session refresh mechanism.

## Workaround

Re-login via browser when needed. Mac can handle via Chrome relay when available.

## Proposed Fix

1. Store session cookies in 1Password, refresh periodically
2. Build session refresh scripts per platform
3. Use OAuth refresh tokens where available
