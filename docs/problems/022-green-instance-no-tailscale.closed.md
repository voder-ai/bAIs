# P-022: Green Instance Not Joining Tailscale

## Status
**CLOSED** — Resolved 2026-02-06

## Severity
High — Blocked CI/CD verification

## Symptom
Green instances created via Terraform failed to:
1. Join Tailscale network
2. Fetch secrets from 1Password
3. Start OpenClaw gateway

## Root Cause Chain
1. **1Password CLI permission check** — CLI refuses to read tokens from directories with permissions > 700
2. **Startup script created `/root/.config/op` with default permissions** (755 via `mkdir -p`)
3. **Secrets fetch returned empty strings** — Commands failed silently
4. **Config generated with empty API keys** — Anthropic/Discord tokens = ""
5. **Gateway failed validation** — Invalid auth profile format

Earlier instances also hit:
- dpkg lock race (unattended-upgrades holding lock during cloud-init)
- Chromium snap/cups connection failure

## Resolution
Added `chmod 700 /root/.config/op` after mkdir in startup.sh.

Commit: `voder-ai/terraform-vultr-deployment@1e41be8` (Atlas) and `@941f6a3` (Pilot, rebased)

## Verification
- Run #33: Instance `45.76.121.174` successfully:
  - Joined Tailscale as `openclaw-green` (100.96.231.73)
  - Fetched all secrets from 1Password
  - Started OpenClaw gateway
  - Reachable via `wss://100.96.231.73:18789`

## Timeline
- 2026-02-06 02:45 UTC: First green instance (Run #24) failed
- 2026-02-06 03:16 UTC: Run #29 failed — Tailscale skip, 1Password silent failure
- 2026-02-06 08:05 UTC: Run #33 — SSH in, identified permission issue
- 2026-02-06 08:09 UTC: Manual fix applied, gateway operational
- 2026-02-06 08:10 UTC: Fix committed to startup.sh

## Lessons Learned

1. **Security tools fail silently** — 1Password CLI returned empty strings rather than errors when permissions were wrong. Always validate outputs from secret managers.

2. **chmod 700 for secrets** — Any directory containing API keys or tokens must have 700 permissions. Add explicit `chmod 700` immediately after `mkdir -p` for config directories.

3. **Startup scripts need validation steps** — Add explicit checks: `test -n "$API_KEY" || exit 1` after fetching secrets, rather than assuming success.

4. **Cloud-init has races** — dpkg locks from unattended-upgrades can block apt operations. Consider disabling unattended-upgrades in startup or adding retry logic with lock checks.
