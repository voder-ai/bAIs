# bAIs Experiment Manifest

## Important: API Access for Bias Tests

**For bias experiments, ONLY use OAuth/direct APIs:**
- OpenAI models → Codex CLI or OpenAI direct API
- Anthropic models → Anthropic direct API
- **Avoid OpenRouter** — endpoint behavior varies, affects experimental validity

## Model Access Methods

| Model | API/Method | Endpoint | Notes |
|-------|-----------|----------|-------|
| GPT-4o | OpenRouter | openrouter.ai | Atlas has access |
| GPT-4o | GitHub Copilot | api.githubcopilot.com | Needs GITHUB_TOKEN |
| GPT-4o | OpenAI Direct | api.openai.com | Needs OPENAI_API_KEY |
| GPT-5.2 | Codex CLI | `codex exec -c 'model="gpt-5.2"'` | Mac has access |
| GPT-5.2 | GitHub Copilot | api.githubcopilot.com | Needs GITHUB_TOKEN |
| GPT-5.3 | Codex CLI | `codex exec -c 'model="gpt-5.3"'` | Mac has access |
| Claude Opus 4.5 | Anthropic | api.anthropic.com | Direct API |
| Claude Sonnet 4.5 | Anthropic | api.anthropic.com | Direct API |
| Claude Haiku 4.5 | Anthropic | api.anthropic.com | Direct API |
| Hermes 405B | OpenRouter | openrouter.ai | Atlas has access |
| Llama 3.3 70B | OpenRouter | openrouter.ai | Atlas has access |
| MiniMax M2.5 | OpenRouter | openrouter.ai | Atlas has access |
| o1 | OpenRouter | openrouter.ai | Reasoning model, needs special prompt |
| o3-mini | OpenRouter | openrouter.ai | Reasoning model, needs special prompt |

## Required Conditions Per Model

For each model, we need:
- [ ] No-anchor baseline (n≥30)
- [ ] Low anchor (3mo, n≥30)
- [ ] Symmetric high anchor (baseline + gap, n≥30)
- [ ] SACD on low anchor (n≥30)
- [ ] SACD on high anchor (n≥30)

## Current Coverage

| Model | No-Anchor | Low (3mo) | High (sym) | SACD-Low | SACD-High |
|-------|-----------|-----------|------------|----------|-----------|
| GPT-5.2 | ✅ 32.1mo | ✅ | ✅ 61mo (38.3mo mean) | ✅ | ❌ |
| GPT-4o | ✅ 24.5mo | ✅ | ✅ 46mo | ✅ | ❌ |
| Hermes 405B | ✅ 20.7mo | ✅ | ✅ 38mo | ✅ | ❌ |
| Llama 3.3 | ✅ 12.0mo | ✅ | ⏳ | ✅ | ❌ |
| Haiku 4.5 | ✅ 12.0mo | ✅ | ❌ | ✅ | ❌ |
| Haiku 3.5 | ✅ 11.4mo | ✅ | ❌ | ❌ | ❌ |
| Opus 4.5 | ✅ 24.0mo (12th) / 18.0mo (no-12th) | ✅ 5.1mo | ✅ 33mo (33.3mo) / 43mo (24.0mo) | ✅ | ❌ |
| Sonnet 4.5 | ❌ | ✅ | ❌ | ✅ | ❌ |
| MiniMax | ❌ | ✅ | ❌ | ✅ | ❌ |
| o1 | ❌ | ✅ | ❌ | ✅ | ❌ |
| o3-mini | ❌ | ✅ | ❌ | ✅ | ❌ |

## Key Findings

### "12th Offense" Implicit Anchor Effect (2026-02-19)

| Model | Without "12th" | With "12th" | Effect |
|-------|----------------|-------------|--------|
| Opus 4.5 | 18.0mo | 24.0mo | +6mo (33%) |

### Anchor Threshold Effect (2026-02-19)

Opus 4.5 compliance varies by anchor magnitude:
- 33mo anchor → 33.3mo response (compliance)
- 43mo anchor → 24.0mo response (resistance)

**Hypothesis:** Models have implicit "reasonableness bounds" on anchors.

## Last Updated
2026-02-19 08:35 UTC
