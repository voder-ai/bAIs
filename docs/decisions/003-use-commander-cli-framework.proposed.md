---
status: proposed
date: 2026-01-22
decision-makers: [voder]
consulted: [researcher-story.map.md, user preferences]
informed: []
---

# Use Commander.js for CLI Framework

## Context and Problem Statement

The bAIs toolkit needs a CLI framework to provide a command-line interface for researchers to design experiments, configure parameters, execute tests, and generate reports. The CLI must support subcommands (e.g., `bais run`, `bais report`, `bais config`), flags, options, and potentially interactive prompts.

Key CLI requirements from story map:

- Story 020.0-RES-DESIGN-UI: Visual experiment designer interface
- Story 021.0-RES-CONFIG-PRESETS: Save and load parameter presets
- Story 019.0-CON-ITERATE-EXP-SELECT: Select which experiments to run from library
- Interactive configuration for experiment parameters
- Command structure for different workflows (run, analyze, report)

User response: "don't care" - selected Commander.js as sensible default based on project needs.

## Decision Drivers

- Clean API for defining commands and options
- Support for subcommands and command hierarchies
- TypeScript support and type definitions
- Good documentation and community support
- Flexibility for future interactive features
- Lightweight and focused on command parsing

## Considered Options

- Commander.js (focused, popular command framework)
- Yargs (feature-rich with builder pattern)
- oclif (full-featured framework by Heroku)
- Inquirer.js (interactive prompts focus)

## Decision Outcome

Chosen option: "Commander.js" because it provides a clean, intuitive API for building command-line interfaces with excellent TypeScript support. It handles the core CLI needs (commands, options, flags) while remaining lightweight and allowing integration with other tools like Inquirer.js for interactive prompts when needed.

### Consequences

- Good, because simple, declarative API for defining commands
- Good, because excellent TypeScript types and IntelliSense support
- Good, because widely used and well-documented
- Good, because lightweight (focuses on command parsing)
- Good, because can combine with Inquirer.js for interactive prompts
- Good, because automatic help generation from command definitions
- Bad, because less opinionated than oclif (more setup needed)
- Neutral, because interactive features require additional library (acceptable trade-off)

### Confirmation

- [ ] `commander` package installed as dependency
- [ ] CLI entry point imports from `commander`
- [ ] Commands defined using `.command()` API
- [ ] Help text automatically generated from command definitions
- [ ] TypeScript types working for command options and arguments

## Pros and Cons of the Options

### Commander.js

- Good, because clean, simple API
- Good, because excellent TypeScript support
- Good, because focused on core CLI needs
- Good, because allows mixing with other libraries (Inquirer, etc.)
- Good, because automatic help generation
- Bad, because less structured than oclif
- Bad, because interactive prompts require additional library

### Yargs

- Good, because feature-rich with many built-in utilities
- Good, because builder pattern for complex CLIs
- Bad, because heavier and more complex API
- Bad, because builder pattern can be verbose
- Bad, because slightly dated API design

### oclif

- Good, because full-featured framework with plugins
- Good, because built-in testing utilities
- Good, because great for large CLI applications
- Bad, because heavyweight for simple CLIs
- Bad, because more opinionated and structured
- Bad, because steeper learning curve
- Bad, because overkill for this project's CLI needs

### Inquirer.js

- Good, because excellent interactive prompts
- Good, because various prompt types (list, confirm, input, etc.)
- Bad, because only handles prompts, not command structure
- Bad, because would need another library for commands
- Neutral, because can be combined with Commander.js

## More Information

- Commander.js documentation: https://github.com/tj/commander.js
- Related stories:
  - 020.0-RES-DESIGN-UI (visual experiment designer)
  - 019.0-CON-ITERATE-EXP-SELECT (experiment selection)
  - 021.0-RES-CONFIG-PRESETS (configuration management)
- Related decisions:
  - [001-use-typescript-with-esm.proposed.md](001-use-typescript-with-esm.proposed.md)
- Note: Can add Inquirer.js later for interactive prompts if needed (story 020.0)
