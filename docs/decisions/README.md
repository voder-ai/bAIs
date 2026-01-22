# Architectural Decision Records

This directory contains Architectural Decision Records (ADRs) for the bAIs (Bias AI Studies) project. These decisions document significant technical and architectural choices, their context, alternatives considered, and rationale.

## Decision Management

We follow the MADR 4.0 (Markdown Any Decision Records) format with status-based lifecycle management. See [DECISION-MANAGEMENT.md](../../.github/prompts/processes/DECISION-MANAGEMENT.md) for the full process.

### Decision Statuses

- **proposed**: New decision awaiting production validation
- **accepted**: Decision validated through production use (must be followed)
- **rejected**: Decision evaluated and determined not suitable
- **deprecated**: Decision no longer recommended but not yet superseded
- **superseded**: Decision replaced by a newer decision

## Current Decisions

### Proposed Decisions

| ID                                                       | Decision                                             | Date       | Status   |
| -------------------------------------------------------- | ---------------------------------------------------- | ---------- | -------- |
| [001](001-use-typescript-with-esm.proposed.md)           | Use TypeScript with ESM Modules                      | 2026-01-22 | proposed |
| [002](002-use-npm-package-manager.proposed.md)           | Use npm as Package Manager                           | 2026-01-22 | proposed |
| [003](003-use-commander-cli-framework.proposed.md)       | Use Commander.js for CLI Framework                   | 2026-01-22 | proposed |
| [004](004-use-simple-statistics.proposed.md)             | Use simple-statistics for Statistical Analysis       | 2026-01-22 | proposed |
| [005](005-use-sqlite-for-data-storage.proposed.md)       | Use SQLite for Incremental Experiment Data Storage   | 2026-01-22 | proposed |
| [006](006-use-vitest-testing-framework.proposed.md)      | Use Vitest for Testing Framework                     | 2026-01-22 | proposed |
| [007](007-use-eslint-with-plugins.proposed.md)           | Use ESLint with Unicorn and JSDoc Plugins            | 2026-01-22 | proposed |
| [008](008-use-prettier-formatting.proposed.md)           | Use Prettier for Code Formatting                     | 2026-01-22 | proposed |
| [009](009-use-typescript-strict-mode.proposed.md)        | Use TypeScript Strict Mode                           | 2026-01-22 | proposed |
| [010](010-use-plotly-for-charts.proposed.md)             | Use Plotly.js for Publication-Quality Charts         | 2026-01-22 | proposed |
| [011](011-use-codex-cli-for-llm-interaction.proposed.md) | Use Codex CLI with Output Schema for LLM Interaction | 2026-01-22 | proposed |

### Accepted Decisions

None yet. Decisions move to accepted status after successful production validation.

### Deprecated Decisions

None.

### Superseded Decisions

None.

### Rejected Decisions

None.

## Decision Categories

### Language and Runtime

- [001: TypeScript with ESM](001-use-typescript-with-esm.proposed.md)
- [002: npm Package Manager](002-use-npm-package-manager.proposed.md)
- [009: TypeScript Strict Mode](009-use-typescript-strict-mode.proposed.md)

### Application Framework

- [003: Commander.js CLI Framework](003-use-commander-cli-framework.proposed.md)

### Libraries and Tools

- [004: simple-statistics for Statistical Analysis](004-use-simple-statistics.proposed.md)
- [010: Plotly.js for Charts](010-use-plotly-for-charts.proposed.md)
- [011: Codex CLI for LLM Interaction](011-use-codex-cli-for-llm-interaction.proposed.md)

### Data and Storage

- [005: SQLite for Data Storage](005-use-sqlite-for-data-storage.proposed.md)

### Code Quality

- [006: Vitest Testing Framework](006-use-vitest-testing-framework.proposed.md)
- [007: ESLint with Plugins](007-use-eslint-with-plugins.proposed.md)
- [008: Prettier Formatting](008-use-prettier-formatting.proposed.md)

## Creating New Decisions

To create a new decision:

1. Use the template at `.github/prompts/templates/adr-template.md`
2. Number sequentially (011, 012, etc.)
3. Start with `proposed` status
4. Follow MADR 4.0 format
5. Document at least 2 alternatives considered
6. Update this README with the new decision

## Production Validation

Proposed decisions should be validated through production implementation with positive track record before moving to accepted status. This ensures decisions are proven effective in practice, not just in theory.

## Related Documentation

- [Story Map](../stories/researcher-story.map.md): User stories and requirements that inform these decisions
- [Decision Management Process](../../.github/prompts/processes/DECISION-MANAGEMENT.md): Full process documentation
- [ADR Template](../../.github/prompts/templates/adr-template.md): Template for new decisions
