# P-010: Dashboards Not Auto-Updating

**Status:** Closed
**Reported:** 2026-02-06
**Reporter:** Tom (via Discord)
**Priority:** 4 (Medium) — Impact: Medium (2) × Likelihood: Certain (2) = 4

## Description

The kanban board (`kanban.html`) and problems dashboard (`problems.html`) served from Vultr at `http://100.89.107.119:8080/` are static HTML files. They don't auto-generate from the source-of-truth problem `.md` files in `docs/problems/`. Every time a problem is opened, closed, or promoted, someone must manually update the HTML.

## Business Impact

- Dashboards show stale data (currently: 3 open, 2 known-error, 0 closed vs actual 1 open, 2 known-error, 6 closed)
- Kanban has stale backlog items (old Reddit threads from days ago)
- Tom can't trust the dashboards without asking us to verify
- Manual updates get forgotten during fast OODA loops

## Root Cause

Dashboards were built as static HTML with hardcoded content. No build step or runtime that reads from the `.md` files.

## Proposed Fix

Option A: **Build script** — A script that reads `docs/problems/*.md` files, parses status/priority/description, and regenerates the HTML. Run on sync or cron.

Option B: **Client-side dynamic** — Serve the `.md` files via the HTTP server and have the HTML fetch + parse them on load using JavaScript.

Option C: **Server-side dynamic** — Small Node.js server that reads `.md` files and renders the dashboard dynamically.

**Recommendation:** Option A (build script) — simplest, no runtime dependencies, can run as part of `sync-workspace.sh` or a post-sync hook.

## Workaround

Manually update HTML files after problem status changes. Current state is stale.
