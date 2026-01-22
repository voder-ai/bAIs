---
status: proposed
date: 2026-01-22
decision-makers: [voder]
consulted: [researcher-story.map.md, user preferences]
informed: []
---

# Use simple-statistics for Statistical Analysis

## Context and Problem Statement

The bAIs toolkit requires statistical analysis capabilities to validate cognitive biases in LLMs. The system must compute various statistical tests and metrics as defined in the story map.

Required statistical capabilities:
- Story 006.0-RES-STATS-TTEST: Independent samples t-test
- Story 006.1-RES-STATS-EFFECT-SIZE: Cohen's d effect size
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
- Ease of use and clear API
- Active maintenance and community support
- Bundle size and performance
- Documentation quality

## Considered Options

- simple-statistics (comprehensive, easy to use)
- jstat (academic focus, R-like API)
- stdlib (modular, extensive coverage)
- mathjs (broad math library including statistics)

## Decision Outcome

Chosen option: "simple-statistics" because it provides comprehensive coverage of the required statistical tests with a clean, intuitive API and excellent TypeScript support. It's specifically designed for JavaScript/TypeScript with a focus on correctness and ease of use, making it ideal for research applications where statistical accuracy is critical.

### Consequences

- Good, because covers all required statistical tests (t-test, chi-square, ANOVA)
- Good, because excellent TypeScript types out of the box
- Good, because clear, functional API (pass arrays, get results)
- Good, because well-tested and actively maintained
- Good, because good documentation with examples
- Good, because reasonable bundle size (focused on statistics only)
- Good, because pure JavaScript (no native bindings to manage)
- Bad, because may need supplementary calculations for some advanced metrics
- Bad, because not as extensive as Python's scipy (acceptable for our needs)
- Neutral, because may need to implement power analysis separately (not commonly available in JS)

### Confirmation

- [ ] `simple-statistics` package installed as dependency
- [ ] T-test implementation uses `simple-statistics` functions
- [ ] Effect size calculations use library functions where available
- [ ] All statistical tests have unit tests verifying correct results
- [ ] TypeScript types working for all statistical function calls

## Pros and Cons of the Options

### simple-statistics

- Good, because comprehensive coverage of common statistical tests
- Good, because excellent TypeScript support
- Good, because clean, functional API
- Good, because actively maintained
- Good, because focused specifically on statistics
- Good, because well-documented with clear examples
- Bad, because may lack some advanced statistical functions
- Bad, because power analysis might need separate implementation

### jstat

- Good, because comprehensive statistical library
- Good, because R-like API familiar to statisticians
- Bad, because less active maintenance recently
- Bad, because API more complex and less JavaScript-idiomatic
- Bad, because TypeScript types not as robust
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
- Related stories:
  - 006.0-RES-STATS-TTEST (t-test implementation)
  - 006.1-RES-STATS-EFFECT-SIZE (Cohen's d)
  - 017.0-CON-STATS-CHI-SQUARE (chi-square test)
  - 017.1-CON-STATS-ANOVA (ANOVA)
  - 024.0-RES-STATS-POWER-ANALYSIS (may need custom implementation)
  - 024.1-RES-STATS-CONFIDENCE-INT (confidence intervals)
- Related decisions:
  - [001-use-typescript-with-esm.proposed.md](001-use-typescript-with-esm.proposed.md)
