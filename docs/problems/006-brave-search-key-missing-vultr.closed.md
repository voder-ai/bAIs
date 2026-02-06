# Problem 006: Brave Search API Key Missing on Vultr

**Status:** Closed (2026-02-05)
**Resolution:** Added BRAVE_API_KEY env var to user-level systemd service file. Config `tools.web.search.apiKey` was set but not picked up until service restart. Mac restarted gateway via SSH.
**Reported:** 2026-02-05
**Reporter:** Voder (Vultr)
**Priority:** 4 (Medium) — Impact: Medium (2) × Likelihood: High (3) = 6

## Description

`web_search` tool fails on Vultr with: "web_search needs a Brave Search API key. Run `openclaw configure --section web` to store it, or set BRAVE_API_KEY in the Gateway environment."

Mac has a working Brave key. Vultr doesn't have one configured in openclaw.json or environment.

## Business Impact

- Can't search the web from Vultr — limits research, outreach, and monitoring capabilities
- Forces reliance on `web_fetch` with known URLs or browser automation (slower, more fragile)
- Vultr is supposed to be the 24/7 instance handling social outreach — web search is core to that

## Workaround

- Use `web_fetch` with direct URLs
- Use browser for search (slow, heavy)
- Ask Mac to search (defeats 24/7 independence)

## Proposed Fix

1. Get the Brave API key from Mac's config or 1Password
2. Add to Vultr's openclaw.json via `gateway config.patch`
3. Add to CI/CD startup script (already flagged in provisioning audit — `BRAVE_SEARCH_API_KEY` is a new Terraform variable)

## Related

- docs/vultr-provisioning-audit.md — Brave key listed as missing from CI/CD
- P-004: Twitter datacenter IP block (also limits Vultr's outreach capability)
