---
status: proposed
date: 2026-01-22
decision-makers: [user]
consulted: [researcher-story.map.md]
informed: []
---

# Use Prettier for Code Formatting

## Context and Problem Statement

The bAIs toolkit needs consistent code formatting to improve readability, reduce cognitive load, and eliminate formatting debates in code reviews. Automated formatting allows developers to focus on logic rather than style.

## Decision Drivers

- Consistent code formatting across entire codebase
- Zero-configuration, opinionated approach
- Integration with ESLint (no conflicts)
- IDE integration (format on save)
- Support for TypeScript, JSON, Markdown, and other formats
- Active maintenance and wide adoption

## Considered Options

- Prettier (opinionated, widely adopted)
- Biome (fast, all-in-one with linting)
- ESLint with formatting rules only
- No formatter (manual formatting)

## Decision Outcome

Chosen option: "Prettier" because it's the industry-standard formatter with strong TypeScript support and excellent IDE integration. Its opinionated approach eliminates formatting debates, and it integrates well with ESLint through eslint-config-prettier (which disables conflicting ESLint formatting rules).

### Consequences

- Good, because consistent formatting across entire codebase
- Good, because zero configuration needed (sensible defaults)
- Good, because eliminates formatting discussions in reviews
- Good, because excellent IDE integration (format on save)
- Good, because works with TypeScript, JSON, Markdown, YAML, etc.
- Good, because widely adopted (familiar to most developers)
- Good, because integrates with ESLint via eslint-config-prettier
- Bad, because opinionated (limited customization)
- Bad, because some style choices may not match personal preference
- Neutral, because slight performance overhead vs. no formatting

### Confirmation

- [ ] `prettier` package installed as dev dependency
- [ ] `eslint-config-prettier` installed (disables ESLint formatting rules)
- [ ] `.prettierrc` or `prettier.config.js` configured (if custom settings needed)
- [ ] `.prettierignore` configured for files to skip
- [ ] npm script `format` runs Prettier
- [ ] npm script `format:check` validates formatting
- [ ] IDE configured for format-on-save
- [ ] Pre-commit hook runs Prettier (if using git hooks)

## Pros and Cons of the Options

### Prettier

- Good, because opinionated (no decisions needed)
- Good, because excellent IDE support
- Good, because wide adoption and familiarity
- Good, because supports many file types
- Good, because integrates well with ESLint
- Good, because consistent output (same code always formats same way)
- Bad, because limited customization
- Bad, because some opinionated choices may not suit everyone

### Biome

- Good, because very fast (Rust-based)
- Good, because combines linting and formatting
- Good, because compatible with Prettier format
- Bad, because cannot use alongside ESLint with Unicorn/JSDoc (would duplicate linting)
- Bad, because less mature ecosystem
- Bad, because fewer format options and file type support
- Bad, because doesn't align with decision to use ESLint

### ESLint with formatting rules only

- Good, because single tool for linting and formatting
- Good, because highly configurable
- Bad, because much slower than dedicated formatters
- Bad, because conflicts between ESLint rules common
- Bad, because requires extensive configuration
- Bad, because ESLint team recommends using Prettier instead
- Bad, because harder to maintain rule consistency

### No formatter

- Good, because no tooling overhead
- Good, because developers format as they prefer
- Bad, because inconsistent code style
- Bad, because formatting debates in code reviews
- Bad, because manual formatting is error-prone
- Bad, because wastes time on formatting decisions
- Bad, because poor developer experience

## More Information

- Prettier documentation: https://prettier.io/docs/en/
- Prettier playground: https://prettier.io/playground/
- eslint-config-prettier: https://github.com/prettier/eslint-config-prettier
- Prettier with ESLint: https://prettier.io/docs/en/integrating-with-linters.html
- Related decisions:
  - [007-use-eslint-with-plugins.proposed.md](007-use-eslint-with-plugins.proposed.md)
  - [001-use-typescript-with-esm.proposed.md](001-use-typescript-with-esm.proposed.md)
- Configuration recommendation:
  ```json
  {
    "semi": true,
    "singleQuote": true,
    "tabWidth": 2,
    "trailingComma": "es5",
    "printWidth": 100
  }
  ```
