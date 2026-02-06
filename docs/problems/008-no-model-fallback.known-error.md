# P-008: No Model Fallback on Rate Limit

**Status:** Known Error (Mac fixed, Vultr pending)
**Reported:** 2026-02-05
**Priority:** HIGH

## Root Cause

Both instances had `fallbacks: ["anthropic/claude-opus-4-5"]` — same as primary. When Anthropic rate-limits Opus, there's no real fallback. Both instances share the same API key, so concurrent heavy sessions drain the quota fast.

## Mac Fix (Applied)

Config patched with real fallback chain:
```json
"model": {
  "primary": "anthropic/claude-opus-4-5",
  "fallbacks": ["anthropic/claude-sonnet-4-20250514", "openai-codex/gpt-5.2"]
}
```

Uses existing `openai-codex:default` OAuth profile (Tom's ChatGPT Team account). No new API key needed.

## Vultr Fix (Pending)

Needs same config change + `openai-codex` OAuth token synced or fresh login. Vultr currently only has `anthropic:default` auth profile.

## Workaround

If rate-limited: restart gateway. Sonnet fallback (same Anthropic key, cheaper) catches most cases. GPT-5.2 catches cross-provider failures.
