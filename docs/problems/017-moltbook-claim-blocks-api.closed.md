# P-017 — Moltbook claim blocks API access (open)

**Status:** Open
**Created:** 2026-02-06
**Owner:** 🖥️ Vultr (lead) / 💻 Mac (support)

## Summary
Moltbook API access for the "VoderAI" account is blocked until Tom completes the account claim/verification flow.

## Impact
- Cannot use Moltbook API programmatically (posting, reading, automation).
- Blocks any Moltbook-based “fill-the-cup” automation / social distribution.

## Evidence
- Vultr reports: “All Moltbook API calls are blocked until Tom claims the account. Hard blocker.”
- Previous breach recovery P-009 closed, but claim/verification is still pending.

## Likely Root Cause
Account ownership/claim not completed, so API endpoint returns 404/unauthorized for the handle.

## Workaround
None (read-only browsing may still work via browser cookies, but API is blocked).

## Next Actions
1. Tom: visit claim URL and complete verification steps.
2. If verification requires tweet: post the specified verification tweet.
3. Re-test API endpoint after claim.

## Links / Context
- Claim URL previously recorded in MEMORY.md (moltbook_claim_...)
