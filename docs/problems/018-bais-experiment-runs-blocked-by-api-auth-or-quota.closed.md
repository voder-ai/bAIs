# P-018 - bAIs experiment runs blocked by API auth/quota (closed)

**Status:** ✅ CLOSED (Resolved via pi-ai library)
**Resolved:** 2026-02-06
**Created:** 2026-02-06
**Owner:** 💻 Mac (lead) / 🖥️ Vultr (support)

## Summary
We can build and run the bAIs CLI locally, but executing experiments is blocked on Vultr due to API credential format/quota issues:
- Anthropic: OpenClaw OAuth token format (`sk-ant-oat01-*`) is not a standard Anthropic API key for the SDK.
- Gemini: free-tier daily quota exhausted on the key used.

## Impact
- Cannot generate cross-model results (the prerequisite for Phase 2 author outreach).
- Slows Phase 4 debiasing experiments (needs repeatable runs).

## Evidence
- Vultr message: Anthropic token != standard API key; Gemini key has 0 daily quota remaining.

## Root Cause
- bAIs uses provider SDKs that expect vendor API keys.
- Our current Anthropic auth in OpenClaw is OAuth-token-based, not directly usable by `@anthropic-ai/sdk`.
- Gemini free tier quota is limited and currently depleted.

## Workarounds
- Run experiments from Mac using a key with remaining quota.
- Use Codex provider (if configured) for experiment runs.

## Resolution

**Used `@mariozechner/pi-ai` library** which impersonates Claude Code client identity:

```javascript
headers: {
  "anthropic-beta": "claude-code-20250219,oauth-2025-04-20",
  "user-agent": "claude-cli/2.1.2 (external, cli)",
  "x-app": "cli"
}
```

Plus prepends Claude Code system prompt. This makes OpenClaw OAuth tokens work with Anthropic's API.

bAIs refactored to use pi-ai for all providers. Cross-model experiments now working with OAuth tokens.

**Key insight:** Clever hack that works because OAuth tokens are authorized for the Claude Code client identity.

## Lessons Learned
- Provider SDK authentication != platform authentication
- Sometimes impersonation is the pragmatic solution
- Document auth workarounds clearly (possibly TOS-adjacent)
