# P-021: bAIs CI Tests Require API Keys

## Status
Closed (2026-02-06 02:36 UTC)

## Severity
High — Blocks CI, every push fails

## Symptom
bAIs GitHub Actions CI/CD pipeline failing on every push since at least 2026-02-06 00:22 UTC.

```
Error: No API key found for provider: openai-codex. Check ~/.openclaw/agents/main/agent/auth-profiles.json
```

## Root Cause
Test `test/llm/provider.test.ts` → `creates PiAiProvider for codex provider` calls `createProvider()` which instantiates the actual PiAiProvider class. The constructor calls `loadApiKey()` which fails in CI because there are no credentials.

Unit tests should not require real API credentials.

## Impact
- Every push to bAIs fails CI
- Can't verify code changes before merge
- Breaks confidence in the codebase

## Workaround
None currently — tests fail.

## Fix Options
1. **Mock the API key loading** in tests (preferred)
2. **Skip provider instantiation tests** that require credentials
3. **Add dummy credentials to CI** (not recommended — leaky)

## Timeline
- 2026-02-06 00:22 UTC: First observed failure
- 2026-02-06 02:34 UTC: Tom flagged, problem ticket created

## Resolution
Fixed by Pilot (commit 49083a1) — added `isCI` check to skip API-dependent tests in GitHub Actions.

CI now passing.

