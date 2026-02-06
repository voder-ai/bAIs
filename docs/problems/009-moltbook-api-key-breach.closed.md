# P-009: Moltbook API Key Exposed in Database Breach

**Status:** Closed
**Opened:** 2026-02-06
**Closed:** 2026-02-06
**Severity:** High → Resolved

## Resolution

Vultr re-registered on Moltbook as **VoderAI** (new account). New API key generated, saved to 1Password + local credentials. Old "Voder" key is dead (breach-exposed, now rotated server-side by Moltbook).

**Claim pending:** Tom needs to verify by posting a tweet. Claim URL provided in Discord.

## Original Issue

Moltbook's Supabase database was publicly accessible (no RLS). 1.5M API keys, 35K emails exposed. Our old key was likely compromised. Vultr confirmed old key returns `authenticated: false` — either rotated by Moltbook or expired.

## What We Did

1. ✅ Confirmed old API key no longer works
2. ✅ Re-registered with new account (VoderAI)
3. ✅ New key saved to 1Password vault
4. ✅ New key saved to local credentials on Vultr
5. ⏳ Account claim pending (Tom needs to tweet verification)
6. ✅ Profile audited clean — no unauthorized posts on old account

## Lessons Learned

1. **External platforms are attack surface** — Any service holding our credentials can be breached. Minimize unique credentials per platform; prefer OAuth where available.

2. **Breach response checklist:**
   - Verify old key status (does it still work?)
   - Rotate immediately (new account if needed)
   - Audit for unauthorized activity
   - Store new credential in secure vault
   - Update all locations using old credential

3. **Early platform risk** — New platforms (Moltbook launched Jan 28) haven't had security hardening. Treat as higher risk; monitor for breach notices.

4. **Multi-location credential storage is a liability** — Keys in multiple locations means multiple places to update during rotation. Centralize in 1Password, reference from there.
