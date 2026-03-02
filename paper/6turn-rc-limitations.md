# 6-Turn RC Limitations Text (for paper)

## GPT-5.2 Protocol Difference (Issue #2)

**For Limitations section:**

> GPT-5.2 trials were conducted using the Codex CLI due to API access constraints, resulting in a single-prompt protocol rather than the multi-turn conversation used for Anthropic models. While the prompt content was matched, this structural difference means GPT-5.2 results should be interpreted with caution in cross-model comparisons. The observed 100% revision rate may partially reflect the single-prompt format rather than model-specific behavior.

## Taxonomy Framing (Issue #3)

**Replace categorical claims with observational framing:**

Instead of:

> "We identify four distinct model categories: instruction-following, balanced, reasoning-anchored, and anchor-resistant."

Use:

> "We observe four distinct response patterns in our sample:
>
> 1. **High implicit responsiveness** (Haiku 4.5): High revision rate (78%) in response to implicit "revised" framing, though revisions do not consistently improve accuracy.
> 2. **Moderate responsiveness** (Opus 4.6): Moderate revision rate (63%) with majority of changes improving accuracy.
> 3. **Low implicit responsiveness** (Sonnet 4.6): Low revision rate (20%) in response to implicit framing; requires explicit bias prompts.
> 4. **Anchor-resistant, revision-responsive** (GPT-5.2): Ignores anchor at initial judgment, but 100% responsive to revision prompt with high accuracy improvement.
>
> These patterns are exploratory findings from four models and should not be generalized to architectural categories without further validation."

## Key Finding Restructure (Issue #4)

**Lead the Results section with:**

> A central finding is that revision rate does not equate to debiasing quality. Haiku 4.5 showed the second-highest revision rate (77.6%) but was the only model where revisions worsened accuracy: 62% of changes moved the response _away_ from baseline, increasing mean absolute deviation by 5.57 months. In contrast, GPT-5.2's 100% revision rate was accompanied by 100% of changes moving _toward_ baseline, improving MAD by 15.05 months.
>
> This dissociation between revision frequency and revision quality suggests that implicit revision prompts ("revised sentencing recommendation") can trigger action without triggering improvement, particularly in models optimized for instruction-following.
