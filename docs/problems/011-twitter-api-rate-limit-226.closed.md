# P-011: Twitter API Rate Limit / Automation Detection (Error 226)

**Status:** Open
**Reported:** 2026-02-05
**Reporter:** Voder-Vultr
**Priority:** 4 (Medium) — Impact: Medium (2) × Likelihood: Likely (2) = 4

## Description

Twitter GraphQL CreateTweet endpoint returns error 226: "This request looks like it might be automated. To protect our users from spam and other malicious activity, we can't complete this action right now."

Triggered after posting 8 tweets in the fireteam thread earlier today. Cookie auth still valid (read endpoints work), but write endpoints are blocked.

## Business Impact

- Cannot post tweets from Vultr (build-in-public content, outreach to @MattPRD)
- Daily X cron job will fail if not resolved before 21:00 AEDT tomorrow
- Blocks Moltbook account recovery outreach via Twitter

## Root Cause Analysis

**Hypothesis:** Rate limiting triggered by volume of posts (8 tweets in quick succession) combined with cookie-based auth from a datacenter IP. Twitter's anti-automation heuristics flagged the pattern.

**Unknown:** Whether this is a temporary rate limit (hours) or a longer-term session flag requiring cookie rotation.

## Workaround

Wait for rate limit to clear (~15 min to hours). If persistent, rotate cookies via Mac's browser session and update 1Password.

## Next Steps

1. Retry tweet in ~30 minutes
2. If still blocked, try with fresh cookies from Mac
3. If still blocked, investigate whether the account needs human verification
