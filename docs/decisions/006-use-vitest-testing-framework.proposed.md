---
status: proposed
date: 2026-01-22
decision-makers: [user]
consulted: [researcher-story.map.md]
informed: []
---

# Use Vitest for Testing Framework

## Context and Problem Statement

The bAIs toolkit requires a testing framework to ensure correctness of statistical computations, experiment execution, data parsing, and LLM API integrations. Given the critical nature of research tools, comprehensive testing is essential for validating that bias detection works correctly.

Testing requirements from story map:
- Unit tests for statistical functions (t-test, chi-square, effect sizes, etc.)
- Integration tests for LLM API clients
- Tests for experiment execution engine
- Tests for data parsing and validation
- Mock/stub capabilities for LLM responses
- TypeScript support
- Fast test execution for developer workflow

## Decision Drivers

- TypeScript support and type safety in tests
- Fast execution speed for quick feedback
- ESM module support (matches project module system)
- Good mocking capabilities for LLM API calls
- Code coverage reporting
- Modern API and developer experience
- Active maintenance and ecosystem

## Considered Options

- Vitest (modern, Vite-based, fast)
- Jest (popular, comprehensive)
- Mocha (flexible, minimal)
- Node.js built-in test runner

## Decision Outcome

Chosen option: "Vitest" because it's designed from the ground up for TypeScript and ESM, providing excellent developer experience with fast execution and built-in TypeScript support. It has Jest-compatible APIs (making it familiar) while being more modern and performant, especially with ESM modules.

### Consequences

- Good, because native TypeScript and ESM support (no configuration hassles)
- Good, because very fast test execution with smart watch mode
- Good, because Jest-compatible API (familiar to most developers)
- Good, because built-in code coverage via c8/v8
- Good, because excellent mocking capabilities for API calls
- Good, because integrated with Vite ecosystem (if we need build tooling later)
- Good, because active development and modern best practices
- Bad, because relatively newer than Jest (smaller community)
- Bad, because some edge-case Jest plugins may not work
- Neutral, because learning curve minimal for Jest users

### Confirmation

- [ ] `vitest` package installed as dev dependency
- [ ] Test files use `.test.ts` or `.spec.ts` extension
- [ ] `vitest.config.ts` configured for project
- [ ] npm script `test` runs vitest
- [ ] Coverage reporting configured
- [ ] Tests use Vitest APIs (`describe`, `it`, `expect`, `vi.mock()`)

## Pros and Cons of the Options

### Vitest

- Good, because designed for TypeScript + ESM from the start
- Good, because very fast execution (especially watch mode)
- Good, because Jest-compatible API (familiar syntax)
- Good, because built-in coverage without extra config
- Good, because excellent mocking for API calls
- Good, because actively developed with modern features
- Bad, because newer ecosystem (less mature than Jest)
- Bad, because smaller community and fewer resources

### Jest

- Good, because most popular testing framework
- Good, because comprehensive feature set
- Good, because large ecosystem of plugins and resources
- Good, because excellent mocking capabilities
- Bad, because ESM support still experimental and problematic
- Bad, because slower than Vitest for TypeScript + ESM
- Bad, because requires more configuration for TypeScript + ESM
- Bad, because some configuration complexity with modules

### Mocha

- Good, because very flexible and minimal
- Good, because can choose assertion library
- Good, because long-standing and stable
- Bad, because requires separate assertion library
- Bad, because requires separate mocking library
- Bad, because more configuration needed
- Bad, because less integrated developer experience
- Bad, because manual setup for TypeScript and coverage

### Node.js built-in test runner

- Good, because no external dependencies
- Good, because built into Node.js (Node 18+)
- Good, because improving rapidly
- Bad, because still relatively new and feature-limited
- Bad, because basic mocking capabilities
- Bad, because less mature ecosystem
- Bad, because fewer features than dedicated frameworks
- Bad, because less polished developer experience

## More Information

- Vitest documentation: https://vitest.dev/
- Vitest GitHub: https://github.com/vitest-dev/vitest
- Related stories:
  - All stories require testing, especially:
  - 006.0-RES-STATS-TTEST (statistical test accuracy critical)
  - 004.0-RES-EXEC-ENGINE (execution engine reliability)
  - 005.0-RES-PARSE-NUMERIC (parsing correctness)
- Related decisions:
  - [001-use-typescript-with-esm.proposed.md](001-use-typescript-with-esm.proposed.md)
  - [004-use-simple-statistics.proposed.md](004-use-simple-statistics.proposed.md)
