# bAIs Experiment Manifest

## CRITICAL: Symmetric Anchor Formula

**High anchor = baseline + (baseline - low_anchor) = 2×baseline - 3**

Where low_anchor = 3mo (standard)

## Verified Baselines & Symmetric Anchors (2026-02-19)

| Model | Baseline | Low Anchor | High Anchor |
|-------|----------|------------|-------------|
| **Anthropic** | | | |
| Opus 4.5 | 22.8mo | 3mo | **43mo** |
| Opus 4.6 | 18.0mo | 3mo | **33mo** |
| Sonnet 4.5 | 23.2mo | 3mo | **43mo** |
| Haiku 4.5 | 35.2mo | 3mo | **67mo** |
| Haiku 3.5 | 32.4mo | 3mo | **62mo** |
| **OpenAI** | | | |
| GPT-5.2 | 24.0mo | 3mo | **45mo** |
| GPT-4o | 24.0mo | 3mo | **45mo** |
| o1 | 12.0mo | 3mo | **21mo** |
| o3-mini | 12.0mo | 3mo | **21mo** |
| **OpenRouter** | | | |
| Hermes 405B | 12.0mo | 3mo | **21mo** |
| Llama 3.3 | 12.0mo | 3mo | **21mo** |
| MiniMax | 12.0mo | 3mo | **21mo** |

## Important: API Access for Bias Tests

**For bias experiments, ONLY use OAuth/direct APIs:**
- OpenAI models → Codex CLI or OpenAI direct API
- Anthropic models → pi-ai OAuth (NOT direct SDK with OAuth tokens)
- OpenRouter → Atlas has paid credits (NOT free tier)

## Model Access Methods

| Model | API/Method | Notes |
|-------|-----------|-------|
| GPT-4o | OpenRouter | Atlas has access |
| GPT-5.2 | Codex CLI | Mac has access |
| Claude Opus 4.5/4.6 | pi-ai OAuth | Mac has access |
| Claude Sonnet 4.5 | pi-ai OAuth | Mac has access |
| Claude Haiku 4.5/3.5 | pi-ai OAuth | Mac has access |
| Hermes 405B | OpenRouter | Atlas has paid credits |
| Llama 3.3 70B | OpenRouter | Atlas has paid credits |
| o1 | OpenRouter | Reasoning model |
| o3-mini | OpenRouter | Reasoning model |

## Required Conditions Per Model

For each model, we need:
- [ ] No-anchor baseline (n≥30)
- [ ] Low anchor (3mo) - simplified prompt (n≥30)
- [ ] Low anchor (3mo) - Englich prompt with disclosure (n≥30)
- [ ] Symmetric high anchor - simplified prompt (n≥30)
- [ ] Symmetric high anchor - Englich prompt with disclosure (n≥30)
- [ ] SACD on low anchor (n≥30)
- [ ] SACD on high anchor (n≥30)

## Disclosure Experiment Status (2026-02-19)

| Model | Correct High | Simplified | Englich | Status |
|-------|-------------|------------|---------|--------|
| Opus 4.5 | 43mo | ✅ | ✅ | Complete |
| Opus 4.6 | 33mo | ❌ Need rerun | ❌ Need rerun | Used 43mo |
| Sonnet 4.5 | 43mo | ✅ | ✅ | Complete |
| Haiku 4.5 | 67mo | ❌ Need rerun | ❌ Need rerun | Used 55mo |
| Haiku 3.5 | 62mo | ❌ Need rerun | ❌ Need rerun | Used 52mo |
| GPT-5.2 | 45mo | ❌ Need rerun | ❌ Need rerun | Used 61mo |
| GPT-4o | 45mo | ❌ Need rerun | ❌ Need rerun | Used 33mo |
| o1 | 21mo | ❌ Need | ❌ Need | - |
| o3-mini | 21mo | ❌ Need | ❌ Need | - |
| Hermes | 21mo | ❌ Need rerun | ✅ | Used 38mo |
| Llama | 21mo | ✅ | ✅ | Complete |

## SACD Experiment Status

| Model | Low Anchor SACD | High Anchor SACD |
|-------|----------------|------------------|
| All models | Mostly done | Need to run at correct symmetric anchors |
