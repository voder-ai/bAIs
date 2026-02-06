# P-012: Terraform Cloud State Lock Stuck

**Status:** Closed (2026-02-06 — state found unlocked, may have auto-released after failed run)
**Reported:** 2026-02-05
**Reporter:** Voder-Mac (during CI/CD pipeline build)
**Priority:** 3 (Low) — Impact: Low (1) × Likelihood: Certain (3) = 3

## Description

Terraform Cloud workspace `voder-ai/vultr-openclaw` has a stale state lock from a failed GitHub Actions run. The runner died mid-execution (kernel upgrade caused VPS reboot during provisioning), leaving the lock held.

All subsequent `terraform plan` or `terraform apply` operations fail with "Error acquiring the state lock."

## Business Impact

- Blocks all CI/CD deployments via Terraform
- Cannot build green instance for blue-green deployment
- No immediate service impact — current cowboy instance (45.63.30.218) is stable

## Root Cause

GitHub Actions runner failed during a Terraform apply. TFC state locks require explicit release — they don't auto-expire when the client disconnects.

## Resolution Required

**Mac unlocks via browser** at:
https://app.terraform.io/app/voder-ai/workspaces/vultr-openclaw/runs

Mac created the TFC account using the browser tool — Tom doesn't have access. Mac needs to log in via browser and find the stuck/errored run → "Force Unlock" or "Discard Run."

## Workaround

None — cannot run any Terraform operations on this workspace until unlocked. Not urgent since current instance is stable.

## Resolution

State was found unlocked when checked — likely auto-released after the failed run timed out or was manually cleared by TFC.

## Lessons Learned
1. **TFC state locks can auto-release** — After failed runs timeout, TFC may release the lock. Don't assume it's permanently stuck.
2. **Browser access is required for force-unlock** — CLI can't force-unlock. Need UI access to the workspace.
3. **Track who has TFC access** — Mac created the account, which created a dependency. Document credentials/access in TOOLS.md.
4. **Failed runs during provisioning are risky** — If the runner dies mid-apply, you can end up with partial infrastructure and a locked state. Consider checkpoints or smaller apply scopes.
