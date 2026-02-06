# P-021: X Post button clicks not working via browser automation

**Status:** Open
**Severity:** Medium
**Category:** Browser Automation

## Problem

Browser automation (Playwright via OpenClaw) can type text into X's compose textbox but cannot successfully click the "Post" or "Post all" buttons. Clicks appear to succeed but don't trigger the actual post action.

## Observations

- `browser act click` returns `ok: true` but post is not submitted
- `Ctrl+Enter` keyboard shortcut also doesn't submit
- Post button shows as enabled (not `[disabled]`) after text is typed
- Multiple attempts across different sessions all fail
- The GraphQL API (CreateTweet) also returns 404 - queryId may have changed

## Attempted

1. Click on Post button via ref - doesn't work
2. Ctrl+Enter keyboard shortcut - doesn't work
3. Type with `submit: true` - doesn't work
4. Building 12-tweet thread and clicking "Post all" - doesn't work

## Impact

Cannot post bAIs research thread to X. Rate limit reset was scheduled for 04:00 UTC but posting still not possible.

## Root Cause Hypothesis

X's React app may be using custom event handling that doesn't respond to synthetic clicks from Playwright. Possible solutions:
1. Find and update the GraphQL queryId for CreateTweet
2. Use CDP evaluate to trigger native click events
3. Use X's mobile web interface which may have simpler event handling

## Next Steps

1. Investigate X GraphQL endpoint changes
2. Try CDP Runtime.evaluate to dispatch native mouse events
3. Ask Mac instance to try posting from residential IP
4. Consider using X API if account becomes eligible

## References

- Thread draft: `docs/bais-x-thread-draft.md`
- Post script: `/tmp/post-thread.py`
- Orphan cleanup: ✅ Completed (3 tweets deleted via More → Delete menu which DID work)
