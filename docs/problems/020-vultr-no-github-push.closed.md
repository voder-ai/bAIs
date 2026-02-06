# P-020: Vultr Cannot Push to GitHub

**Status:** Closed (2026-02-06)
**Reported:** 2026-02-06
**Reporter:** Tom
**Priority:** 3 (Medium) — Impact: Medium (2) × Likelihood: Certain (1.5) = 3

## Description

Vultr instance has no GitHub Personal Access Token (PAT) configured, so it cannot push commits to remote repositories. This blocks CI/CD workflow triggering and code sharing.

## Impact

- CI/CD pipeline code is written but cannot be pushed to trigger workflows
- Workspace changes stay local until Mac syncs and pushes
- Creates dependency on Mac for any GitHub operations

## Current Workaround

Mac pulls changes via rsync, then pushes to GitHub from local machine.

## Root Cause

No GitHub credentials configured on Vultr. The workspace git remote has no authentication.

## Potential Fixes

1. **Generate GitHub PAT for Vultr** — Store in 1Password, configure git credentials ✅ PREFERRED
2. **Use deploy keys** — SSH key per-repo, more secure but less flexible
3. **GitHub App** — Most secure, but more complex setup

## Resolution Plan (2026-02-06)

**Selected approach:** Fine-grained PAT scoped to `voder-ai/*` repos

**Steps (Tom):**
1. GitHub → Settings → Developer settings → Fine-grained Personal Access Tokens
2. Generate new token:
   - Name: `voder-vultr-push`
   - Expiration: 90 days (or custom)
   - Repository access: `voder-ai/*` (all repos in org)
   - Permissions: Contents (Read and Write)
3. Store in 1Password "Voder" vault as "GitHub PAT - Vultr"

**Steps (Vultr, after Tom completes above):**
```bash
export OP_SERVICE_ACCOUNT_TOKEN=$(cat ~/.config/op/service-account-token)
PAT=$(op item get "GitHub PAT - Vultr" --vault=Voder --fields=credential --reveal)
git config --global credential.helper store
echo "https://tompahoward:${PAT}@github.com" > ~/.git-credentials
```

## Resolution (2026-02-06 09:59 AEDT)

Mac extracted the existing `gh auth token` and stored it in 1Password Voder vault as "GitHub PAT".

Vultr retrieved the token and configured git credentials:
```bash
git config --global credential.helper store
echo "https://tompahoward:<token>@github.com" > ~/.git-credentials
```

Verified with `git ls-remote` — auth working.

## Notes

- Tom flagged this as needing a problem ticket on 2026-02-06
- Related to CI/CD deployment pipeline work
- Discussion in Discord #general on 2026-02-06 ~09:53 AEDT

## Lessons Learned
1. **Credential sharing via 1Password works well** — Mac extracted token, stored in vault, Vultr retrieved it. Secure and auditable.
2. **Check auth before assuming CI/CD will work** — We wrote the whole pipeline before realizing Vultr couldn't push. Should have verified early.
3. **Fine-grained PATs are preferred** — Scope to specific repos/permissions rather than full account access.
4. **`git config --global credential.helper store` is simple but stores plaintext** — Acceptable for server, but note the tradeoff vs credential managers.
