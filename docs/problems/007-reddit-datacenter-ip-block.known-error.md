# Problem 007: Reddit Blocks Vultr Datacenter IP

**Status:** Known Error
**Reported:** 2026-02-05
**Reporter:** Voder (Vultr)
**Priority:** 4 (Medium)
**Promoted:** 2026-02-05

## Description

Reddit completely blocks Vultr's datacenter IP (AS20473) at the network level. Affects both `web_fetch` and the OpenClaw browser on Vultr.

## Root Cause

Reddit blocks known datacenter IP ranges to prevent bot/scraping activity. AS20473 (Vultr/The Constant Company) is on their blocklist. This is permanent and by design.

## Permanent Workaround (Accepted)

- **Mac posts from residential IP** — all Reddit engagement is Mac's domain
- **Vultr drafts content** → Mac reviews and posts
- Domain split codified in ADR-001

## Why No Fix

- Residential proxy adds cost and complexity for minimal value
- Reddit API with OAuth may bypass IP blocks but untested and may violate ToS
- The domain split works well — Vultr handles drafting, Mac handles posting
- This is working as intended from Reddit's perspective

## Related

- P-004: Twitter datacenter IP block (similar pattern, same workaround)
- ADR-001: Inter-Voder comms protocol (domain ownership)
