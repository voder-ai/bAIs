---
status: proposed
date: 2026-01-22
decision-makers: [user]
consulted: [researcher-story.map.md]
informed: []
---

# Use TypeScript with ESM Modules

## Context and Problem Statement

The bAIs toolkit needs a programming language and module system for implementing LLM cognitive bias experiments. The toolkit must support API integrations with multiple LLM providers (OpenAI, Anthropic, Ollama), statistical analysis, data parsing, CLI interactions, and report generation.

Key requirements from the story map:

- API client implementations for multiple LLM providers
- Statistical computing (t-tests, chi-square, ANOVA, effect sizes)
- CLI interface for researcher interactions
- Data parsing and validation
- Experiment execution engine with retry logic
- Report and visualization generation

## Decision Drivers

- Type safety for complex data structures (experiment configurations, statistical results)
- Strong ecosystem for API clients and statistical libraries
- Modern module system for better code organization
- Developer experience and tooling support
- Compatibility with modern Node.js features
- Future-proofing for ES standards

## Considered Options

- TypeScript with ESM
- TypeScript with CommonJS
- JavaScript with ESM
- Python (research/statistics focused)

## Decision Outcome

Chosen option: "TypeScript with ESM" because it provides strong type safety for experiment configurations and statistical computations while using the modern JavaScript module system that is now standard in Node.js and supported across the ecosystem.

### Consequences

- Good, because TypeScript catches configuration and data structure errors at compile time
- Good, because ESM is the modern standard with better tree-shaking and module resolution
- Good, because strong typing helps with complex statistical data types and experiment definitions
- Good, because excellent IDE support for TypeScript improves developer experience
- Good, because ESM enables top-level await which is useful for API calls
- Bad, because requires TypeScript compilation step in development workflow
- Bad, because some older libraries may not have good ESM support
- Neutral, because team needs familiarity with TypeScript (but tooling helps)

### Confirmation

- [ ] `package.json` includes `"type": "module"`
- [ ] `tsconfig.json` configured with `"module": "ESNext"` and `"moduleResolution": "bundler"`
- [ ] All source files use `.ts` extension
- [ ] Import statements use ESM syntax (`import`/`export`)
- [ ] No `require()` calls in codebase

## Pros and Cons of the Options

### TypeScript with ESM

- Good, because type safety prevents errors in experiment configurations
- Good, because ESM is the future of JavaScript modules
- Good, because excellent tooling and IDE support
- Good, because top-level await simplifies async API calls
- Bad, because compilation step adds complexity
- Bad, because some legacy libraries may not have ESM support

### TypeScript with CommonJS

- Good, because type safety benefits
- Good, because broad library compatibility
- Bad, because CommonJS is legacy module system
- Bad, because no top-level await support
- Bad, because going against ecosystem direction

### JavaScript with ESM

- Good, because no compilation step needed
- Good, because ESM is modern standard
- Bad, because no compile-time type checking
- Bad, because higher risk of runtime errors with complex configurations
- Bad, because weaker IDE support compared to TypeScript

### Python

- Good, because strong statistical libraries (scipy, numpy, pandas)
- Good, because common in research community
- Bad, because user specifically chose TypeScript/Node.js
- Bad, because different ecosystem for LLM API clients
- Bad, because async model different from Node.js

## More Information

- Related to experiment execution engine design (story 004.0-RES-EXEC-ENGINE)
- Related to statistical analysis implementation (stories 006.x)
- Node.js ESM documentation: https://nodejs.org/api/esm.html
- TypeScript handbook: https://www.typescriptlang.org/docs/handbook/
