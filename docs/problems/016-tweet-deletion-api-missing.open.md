# P-016: Tweet Deletion API Endpoint Not Found

**Status:** Open
**Reported:** 2026-02-05
**Reporter:** Vultr
**Priority:** 2 (Low) — Impact: Low (1) × Likelihood: Probable (2) = 2
**Hit count:** 1 (test tweet deletion attempt)

## Description

The GraphQL DeleteTweet endpoint (query ID `VaenaVgh5q5ih7kvyVjgtg`) returns 404. CreateTweet works fine with the same auth cookies. Cannot delete tweets programmatically.

## Business Impact

- Accidental tweets can't be cleaned up without browser or human
- Low priority since we have few followers and accidental tweets have no reach

## Root Cause

Twitter/X frequently rotates GraphQL query IDs. The DeleteTweet query ID may have changed since it was last captured.

## Workaround

Delete via browser (Mac) or ask Tom. With 1 follower, urgency is zero.

## Proposed Fix

1. Capture current DeleteTweet query ID from browser Network tab during manual deletion
2. Update scripts/tweet.sh to support `--delete TWEET_ID`
