# P-004: Twitter Datacenter IP Block

**Status:** Closed
**Reported:** 2026-02-05
**Closed:** 2026-02-05
**Priority:** Previously High

## Resolution

The "IP block" only affects browser rendering — Twitter's GraphQL API endpoints (CreateTweet, DeleteTweet) work perfectly from Vultr with cookie auth from 1Password.

**Result:** Vultr can post to X independently. Tweeting now takes <1s instead of ~5min via browser automation.

## Root Cause (Revised)

Not a full IP block. Twitter serves a "suspicious activity" interstitial to datacenter IPs in the *browser*, but API calls with valid session cookies bypass this entirely. The original diagnosis (headless browser fingerprinting) was partially right — browser-level detection, not network-level blocking.

## What Changed

- Vultr uses GraphQL API + cookie auth for all X interactions
- No browser automation needed for posting
- Mac no longer sole X poster — both instances can tweet
