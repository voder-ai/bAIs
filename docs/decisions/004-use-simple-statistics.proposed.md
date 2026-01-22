---
status: proposed
date: 2026-01-22
decision-makers: [voder]
consulted: [researcher-story.map.md, user preferences]
informed: []
---

# Use simple-statistics for Statistical Analysis

## Context and Problem Statement

The bAIs toolkit requires statistical analysis capabilities to validate cognitive biases in LLMs. The system must compute descriptive summaries and hypothesis tests for experiment results.

What we learned while implementing the first end-to-end experiment runner:

- We need to compute not just a t-statistic, but also degrees of freedom and a two-sided p-value.
- For the anchoring experiment, Welch’s t-test (unequal variances) is a better default than the pooled-variance t-test.
- Computing a p-value requires a Student-t CDF (or equivalent), which is not provided by simple-statistics.
- Some otherwise-useful JS stats libraries do not ship TypeScript types; with strict lint/type rules, that matters.

Required statistical capabilities:

- Story 006.0-RES-STATS-TTEST: Independent samples t-test (Welch by default)
- Story 006.1-RES-STATS-EFFECT-SIZE: Cohen's d effect size
- Story 006.2-RES-STATS-PVALUE: Two-sided p-values and degrees of freedom for the test
- Story 017.0-CON-STATS-CHI-SQUARE: Chi-square test for categorical outcomes
- Story 017.1-CON-STATS-ANOVA: ANOVA for multi-group comparisons
- Story 024.0-RES-STATS-POWER-ANALYSIS: Statistical power analysis
- Story 024.1-RES-STATS-CONFIDENCE-INT: Confidence intervals
- Descriptive statistics (mean, median, standard deviation, variance)

User response: "use a library" (preferred over custom implementation), then "don't care" for specific library choice.

## Decision Drivers

- Coverage of required statistical tests (t-test, chi-square, ANOVA, effect sizes)
- TypeScript support and type definitions
- Accuracy and correctness of statistical computations
- Ability to compute p-values and degrees of freedom for reported tests
- Ease of use and clear API
- Active maintenance and community support
- Bundle size and performance
- Documentation quality

## Considered Options

- simple-statistics + small distribution helper (chosen)
- mathjs (broad math library including statistics)
- @stdlib/stdlib (large “standard library” with many stats modules)

## Decision Outcome

Chosen option (updated): Use **simple-statistics** as the primary statistics library, and use **jstat** only for distribution functions needed to compute p-values (Student-t CDF).

Rationale:

- `simple-statistics` is TypeScript-friendly (`types: index.d.ts`) and provides clean building blocks for descriptive statistics.
- Computing p-values requires a Student-t CDF. `simple-statistics` does not provide distribution CDFs.
- `jstat` provides the needed distribution CDFs, but does not ship official TypeScript types, so we isolate it behind a tiny, local `.d.ts` shim.

### Consequences

- Good, because `simple-statistics` provides a clean, functional API for common stats primitives
- Good, because we can compute Welch’s t-test (t + df) and derive two-sided p-values via Student-t CDF
- Good, because TypeScript strictness is preserved (untyped `jstat` usage is constrained behind a minimal local `.d.ts`)
- Good, because well-tested and actively maintained
- Good, because good documentation with examples
- Good, because reasonable bundle size (focused on statistics only)
- Good, because pure JavaScript (no native bindings to manage)
- Bad, because we still have two dependencies for stats
- Bad, because `jstat` does not ship official TypeScript types, so we must maintain a minimal local `.d.ts`
- Bad, because not as extensive as Python's scipy (acceptable for our needs)
- Neutral, because may need to implement power analysis separately (not commonly available in JS)

### Confirmation

- [x] `simple-statistics` package installed as dependency
- [x] Welch t-test + effect size implemented with unit tests
- [x] Two-sided p-values computed using Student-t CDF
- [x] TypeScript strictness preserved via a minimal local `.d.ts` for `jstat`

## Pros and Cons of the Options

### simple-statistics

- Good, because comprehensive coverage of common statistical tests
- Good, because excellent TypeScript support
- Good, because clean, functional API
- Good, because actively maintained
- Good, because focused specifically on statistics
- Good, because well-documented with clear examples
- Bad, because does not provide distribution CDFs / p-values, so needs a supplementary approach
- Bad, because power analysis might need separate implementation

### jstat

- Good, because comprehensive statistical library
- Good, because R-like API familiar to statisticians
- Bad, because less active maintenance recently
- Bad, because API more complex and less JavaScript-idiomatic
- Bad, because TypeScript types are not provided out of the box
- Bad, because larger bundle size

### stdlib

- Good, because extremely comprehensive coverage
- Good, because modular (import only what you need)
- Good, because high-quality implementation
- Bad, because very large overall library
- Bad, because API can be verbose
- Bad, because TypeScript support not as mature
- Bad, because more complex to use for simple cases

### mathjs

- Good, because broad mathematical capabilities beyond statistics
- Good, because expression parsing (could be useful for formulas)
- Bad, because overkill for statistics-only needs
- Bad, because larger bundle size
- Bad, because statistical functions not the primary focus
- Bad, because API more complex than needed

## More Information

- simple-statistics documentation: https://simplestatistics.org/
- simple-statistics GitHub: https://github.com/simple-statistics/simple-statistics
- jstat documentation: https://github.com/jstat/jstat
- Current implementation:
  - Statistical helpers: [src/analysis/stats.ts](src/analysis/stats.ts)
  - Minimal `jstat` types: [src/types/jstat.d.ts](src/types/jstat.d.ts)
- Related stories:
  - 006.0-RES-STATS-TTEST (t-test implementation)
  - 006.1-RES-STATS-EFFECT-SIZE (Cohen's d)
  - 017.0-CON-STATS-CHI-SQUARE (chi-square test)
  - 017.1-CON-STATS-ANOVA (ANOVA)
  - 024.0-RES-STATS-POWER-ANALYSIS (may need custom implementation)
  - 024.1-RES-STATS-CONFIDENCE-INT (confidence intervals)
- Related decisions:
  - [001-use-typescript-with-esm.proposed.md](001-use-typescript-with-esm.proposed.md)
