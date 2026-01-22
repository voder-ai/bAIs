---
status: proposed
date: 2026-01-22
decision-makers: [user]
consulted: [researcher-story.map.md]
informed: []
---

# Use TypeScript Strict Mode

## Context and Problem Statement

The bAIs toolkit requires a TypeScript configuration that determines the level of type checking rigor. Given that this is a research toolkit where correctness is critical - especially for statistical computations and experiment configurations - the type checking level impacts both development experience and runtime reliability.

## Decision Drivers

- Correctness of statistical computations (critical for research validity)
- Type safety for experiment configurations (prevent invalid setups)
- Prevention of null/undefined errors in data processing
- API client type safety (LLM responses, configurations)
- Developer experience and early error detection
- Code maintainability and refactoring safety

## Considered Options

- Strict mode (all strict checks enabled)
- Moderate strictness (some strict checks)
- Minimal type checking (loose configuration)

## Decision Outcome

Chosen option: "Strict mode" because the research-critical nature of this toolkit demands maximum type safety. Incorrect statistical calculations or experiment configurations could invalidate research findings. Strict mode catches errors at compile time that would otherwise surface as runtime bugs in production research, potentially after expensive LLM API calls.

### Consequences

- Good, because catches null/undefined errors at compile time (critical for data parsing)
- Good, because enforces correct API types (prevents invalid LLM configurations)
- Good, because ensures statistical functions receive correct data types
- Good, because improves code maintainability (explicit types everywhere)
- Good, because better IDE support (more accurate IntelliSense)
- Good, because safer refactoring (type errors caught immediately)
- Good, because reduces runtime errors that waste API costs
- Bad, because requires more explicit type annotations
- Bad, because slightly slower development initially (more type thinking)
- Bad, because some libraries may have incomplete typings (need workarounds)
- Neutral, because stricter than necessary for prototypes (acceptable trade-off for research tool)

### Confirmation

- [ ] `tsconfig.json` includes `"strict": true`
- [ ] All individual strict flags enabled (noImplicitAny, strictNullChecks, etc.)
- [ ] No `@ts-ignore` or `@ts-expect-error` without justification comments
- [ ] No `any` types except where explicitly documented as necessary
- [ ] All function parameters and return types explicitly typed
- [ ] Type errors prevented from compiling (no warnings-only mode)

## Pros and Cons of the Options

### Strict mode

- Good, because maximum type safety and correctness
- Good, because catches null/undefined errors (common source of bugs)
- Good, because prevents implicit any types
- Good, because enforces strict function types
- Good, because safer code overall (critical for research tools)
- Good, because best IDE experience
- Bad, because requires more type annotations
- Bad, because some libraries may need type workarounds
- Bad, because steeper learning curve for TypeScript beginners

### Moderate strictness

- Good, because some type safety benefits
- Good, because easier to get started
- Good, because fewer type annotations required
- Bad, because allows implicit any (source of bugs)
- Bad, because allows null/undefined errors to slip through
- Bad, because less safe than strict mode
- Bad, because inconsistent experience (some checks, not others)
- Bad, because doesn't meet user's "strict mode" requirement

### Minimal type checking

- Good, because fastest development (minimal types)
- Good, because easiest for beginners
- Good, because works with loosely-typed libraries easily
- Bad, because very weak type safety
- Bad, because many errors only caught at runtime
- Bad, because doesn't meet user's requirement
- Bad, because poor fit for research-critical applications
- Bad, because defeats purpose of using TypeScript

## More Information

- TypeScript strict mode: https://www.typescriptlang.org/tsconfig#strict
- TypeScript compiler options: https://www.typescriptlang.org/tsconfig
- Related stories (where type safety is critical):
  - 003.0-RES-CONFIG-CONDITIONS (experiment configuration correctness)
  - 005.0-RES-PARSE-NUMERIC (data parsing type safety)
  - 006.0-RES-STATS-TTEST (statistical function type correctness)
  - 002.0-RES-MODEL-OPENAI (API client type safety)
- Related decisions:
  - [001-use-typescript-with-esm.proposed.md](001-use-typescript-with-esm.proposed.md)
- Recommended tsconfig.json:
  ```json
  {
    "compilerOptions": {
      "strict": true,
      "target": "ES2022",
      "module": "ESNext",
      "moduleResolution": "bundler",
      "esModuleInterop": true,
      "skipLibCheck": true,
      "forceConsistentCasingInFileNames": true,
      "resolveJsonModule": true
    }
  }
  ```
