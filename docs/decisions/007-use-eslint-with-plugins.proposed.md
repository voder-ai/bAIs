---
status: proposed
date: 2026-01-22
decision-makers: [user]
consulted: [researcher-story.map.md]
informed: []
---

# Use ESLint with Unicorn and JSDoc Plugins

## Context and Problem Statement

The bAIs toolkit needs code linting to maintain code quality, catch potential bugs, enforce coding standards, and ensure consistent style across the codebase. Given the research-critical nature of this toolkit, code quality is especially important for correctness.

## Decision Drivers

- TypeScript-aware linting
- Catch common bugs and anti-patterns
- Enforce best practices for modern JavaScript/TypeScript
- JSDoc validation for documentation quality
- ESM module support
- Integration with IDE (VS Code)
- Extensibility through plugins

## Considered Options

- ESLint with Unicorn and JSDoc plugins
- Biome (fast, all-in-one linter and formatter)
- TypeScript compiler strict mode only
- No linting (rely on TypeScript)

## Decision Outcome

Chosen option: "ESLint with Unicorn and JSDoc plugins" because it provides comprehensive linting with strong community support and the specific plugins requested. The Unicorn plugin enforces modern best practices and catches subtle issues, while the JSDoc plugin ensures documentation quality - important for a research toolkit where clear documentation helps reproducibility.

### Consequences

- Good, because comprehensive linting coverage
- Good, because Unicorn plugin enforces modern JavaScript best practices
- Good, because JSDoc plugin validates documentation completeness and correctness
- Good, because large ecosystem of additional plugins if needed
- Good, because excellent IDE integration (especially VS Code)
- Good, because configurable rules for project-specific needs
- Good, because can be integrated with pre-commit hooks
- Bad, because requires configuration and rule selection
- Bad, because can be slower than newer alternatives like Biome
- Bad, because requires multiple packages (ESLint + plugins)
- Neutral, because some Unicorn rules may be opinionated (but configurable)

### Confirmation

- [ ] `eslint` package installed as dev dependency
- [ ] `eslint-plugin-unicorn` installed
- [ ] `eslint-plugin-jsdoc` installed
- [ ] `@typescript-eslint/parser` and `@typescript-eslint/eslint-plugin` installed
- [ ] `eslint.config.js` (flat config) configured with TypeScript, Unicorn, and JSDoc
- [ ] npm script `lint` runs ESLint
- [ ] npm script `lint:fix` runs ESLint with auto-fix
- [ ] IDE integration working (ESLint extension)

## Pros and Cons of the Options

### ESLint with Unicorn and JSDoc plugins

- Good, because comprehensive and mature linting
- Good, because Unicorn enforces modern best practices
- Good, because JSDoc ensures documentation quality
- Good, because extensive plugin ecosystem
- Good, because excellent IDE support
- Good, because highly configurable
- Bad, because requires multiple packages and configuration
- Bad, because slower than newer alternatives
- Bad, because flat config is relatively new (migration from old config)

### Biome

- Good, because very fast (Rust-based)
- Good, because combines linting and formatting
- Good, because zero configuration to start
- Good, because TypeScript and JSX support out of the box
- Bad, because no Unicorn plugin equivalent
- Bad, because no JSDoc plugin (does not match user requirement)
- Bad, because smaller ecosystem than ESLint
- Bad, because less mature and fewer rules than ESLint

### TypeScript compiler strict mode only

- Good, because no additional tools needed
- Good, because fast (part of compilation)
- Good, because strong type checking
- Bad, because no style enforcement
- Bad, because no best practice checks
- Bad, because no JSDoc validation
- Bad, because misses many runtime issues TypeScript doesn't catch
- Bad, because does not meet user requirement for linting

### No linting

- Good, because no tooling overhead
- Good, because faster development (no lint errors)
- Bad, because no code quality enforcement
- Bad, because inconsistent code style
- Bad, because misses common bugs
- Bad, because poor developer experience
- Bad, because does not meet user requirement

## More Information

- ESLint documentation: https://eslint.org/docs/latest/
- eslint-plugin-unicorn: https://github.com/sindresorhus/eslint-plugin-unicorn
- eslint-plugin-jsdoc: https://github.com/gajus/eslint-plugin-jsdoc
- TypeScript ESLint: https://typescript-eslint.io/
- Flat config migration: https://eslint.org/docs/latest/use/configure/configuration-files-new
- Related decisions:
  - [001-use-typescript-with-esm.proposed.md](001-use-typescript-with-esm.proposed.md)
  - [008-use-prettier-formatting.proposed.md](008-use-prettier-formatting.proposed.md) (formatting complement)
