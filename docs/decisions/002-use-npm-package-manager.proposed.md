---
status: proposed
date: 2026-01-22
decision-makers: [user]
consulted: [researcher-story.map.md]
informed: []
---

# Use npm as Package Manager

## Context and Problem Statement

The bAIs toolkit requires a package manager for dependency management, script execution, and development workflow. The choice affects how developers install dependencies, run scripts, and manage the project workspace.

## Decision Drivers

- Simplicity and ubiquity in Node.js ecosystem
- Workspace and script management capabilities
- Lock file reliability for reproducible builds
- Performance and disk space considerations
- Team familiarity and onboarding ease

## Considered Options

- npm (default Node.js package manager)
- pnpm (efficient disk usage, strict dependencies)
- yarn (alternative with workspaces)
- bun (fast, modern package manager)

## Decision Outcome

Chosen option: "npm" because it's the default package manager that comes with Node.js, providing universal compatibility and requiring no additional installation. For this project's scale (single toolkit package), the performance differences between package managers are negligible, and npm's ubiquity ensures lowest friction for contributors.

### Consequences

- Good, because no additional tool installation required
- Good, because universal compatibility with all Node.js documentation
- Good, because simplest onboarding for new contributors
- Good, because `package-lock.json` provides reproducible builds
- Good, because built-in npm workspaces support if needed for monorepo
- Bad, because slower than pnpm/bun for large dependency trees
- Bad, because uses more disk space than pnpm
- Neutral, because performance difference minimal for single-package projects

### Confirmation

- [ ] `package-lock.json` exists in repository
- [ ] No `pnpm-lock.yaml`, `yarn.lock`, or `bun.lockb` files
- [ ] README uses `npm install` and `npm run` commands
- [ ] CI/CD uses `npm ci` for installations
- [ ] `.npmrc` configured if needed for registry settings

## Pros and Cons of the Options

### npm

- Good, because comes with Node.js (no extra installation)
- Good, because universally known and documented
- Good, because adequate performance for most projects
- Good, because built-in workspace support for monorepos
- Bad, because slower than newer alternatives
- Bad, because uses more disk space with node_modules duplication

### pnpm

- Good, because efficient disk usage via content-addressable store
- Good, because strict by default (catches dependency issues)
- Good, because faster installation than npm
- Bad, because requires separate installation
- Bad, because less familiar to contributors
- Bad, because can have compatibility issues with some packages

### yarn

- Good, because good workspace support
- Good, because alternative to npm with similar usage
- Bad, because requires separate installation
- Bad, because adds another tool to learn
- Bad, because performance not significantly better than npm

### bun

- Good, because very fast package installation
- Good, because also provides runtime benefits
- Bad, because relatively new and less mature
- Bad, because requires separate installation
- Bad, because smaller ecosystem and community

## More Information

- npm documentation: https://docs.npmjs.com/
- npm workspaces: https://docs.npmjs.com/cli/v8/using-npm/workspaces
- Related decision: [001-use-typescript-with-esm.proposed.md](001-use-typescript-with-esm.proposed.md)
