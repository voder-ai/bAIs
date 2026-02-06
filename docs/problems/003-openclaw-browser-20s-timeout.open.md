# Problem 003: OpenClaw Browser Hard 20s Timeout

**Status:** Open
**Reported:** 2026-02-05 (documented in MEMORY.md from 2026-02-04)
**Reporter:** Mac-Voder
**Priority:** 4 (Medium) — Impact: Medium (2) × Likelihood: Medium (2) = 4 → Medium

## Description

The OpenClaw managed browser has a hard 20-second timeout for page loads. Pages that take longer (heavy JS apps like Gmail, complex SPAs) fail to load or render incompletely.

## Business Impact

- Cannot use browser for slow-loading pages
- Gmail won't render in headless Chromium (too heavy)
- Limits browser automation for complex web apps
- Forces use of CLI alternatives (gog for Gmail) or Chrome relay

## Reproduction

1. Navigate to a heavy page (e.g., mail.google.com) via OpenClaw browser
2. Page fails to fully render within 20s
3. Timeout error or incomplete content

## Workaround

- Use CDP directly for slow pages
- Use Chrome relay (browser profile="chrome") for complex pages
- Use CLI tools instead of browser (e.g., gog for Gmail)
- Workaround is acceptable — CLI alternatives work for most cases

## Root Cause Analysis

OpenClaw browser configuration `remoteCdpTimeoutMs: 15000` and `remoteCdpHandshakeTimeoutMs: 30000` limit page load time. This is by design to prevent hung sessions, but too aggressive for heavy pages.

## Proposed Fix

- Increase timeout for specific use cases via config
- Or accept current behavior and use CLI tools for heavy pages (preferred)

## Related

- MEMORY.md lesson: "OpenClaw browser has hard 20s timeout"
