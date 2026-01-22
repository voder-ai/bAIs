# OpenAI Codex User Guide

## Overview

OpenAI Codex is an AI-powered coding agent that integrates into your development workflow to help you ship code faster and more confidently. It operates across three environments:

- **CLI** - Work directly in your terminal
- **IDE Extensions** - Partner with Codex in VSCode, Cursor, and other editors
- **Cloud** - Delegate tasks to Codex in a secure sandbox

Codex is available with ChatGPT Plus, Pro, Business, Edu, and Enterprise plans.

## Architecture

The Codex CLI is a Node.js wrapper around platform-specific native binaries. It:

- Detects your platform and architecture (Linux/macOS/Windows, x64/ARM64)
- Spawns the appropriate native binary from the vendor directory
- Forwards signals (SIGINT, SIGTERM, SIGHUP) for graceful shutdown
- Detects the package manager used for installation (npm/bun) to provide appropriate update hints
- Extends the PATH with additional directories for binary dependencies

### Supported Platforms

| Platform | Architectures | Target Triple                                             |
| -------- | ------------- | --------------------------------------------------------- |
| Linux    | x64, ARM64    | `x86_64-unknown-linux-musl`, `aarch64-unknown-linux-musl` |
| macOS    | x64, ARM64    | `x86_64-apple-darwin`, `aarch64-apple-darwin`             |
| Windows  | x64, ARM64    | `x86_64-pc-windows-msvc`, `aarch64-pc-windows-msvc`       |

## Installation

### Prerequisites

- Node.js or Homebrew installed
- A ChatGPT Plus, Pro, Business, Edu, or Enterprise account

### Option 1: npm (Global)

```bash
npm install -g @openai/codex
```

### Option 2: npm (Project Dev Dependency)

```bash
npm install --save-dev @openai/codex
```

Then access via:

```bash
npx codex
```

### Option 3: Bun

```bash
bun install -g @openai/codex
```

### Option 4: Homebrew

```bash
brew install codex
```

### IDE Extension Installation

For VSCode, Cursor, or other compatible IDEs:

1. **VS Code Marketplace**: Search for "Codex – OpenAI's coding agent" or visit the [marketplace link](https://marketplace.visualstudio.com/items?itemName=openai.chatgpt)
2. **Direct Links**:
   - VSCode: `vscode:extension/openai.chatgpt`
   - Cursor: `cursor:extension/openai.chatgpt`

## Getting Started

### Authentication

When you first run Codex, you'll need to authenticate. There are two methods:

#### Method 1: ChatGPT Account (Default)

```bash
codex login
```

Follow the browser-based authentication flow to sign in with your ChatGPT account.

Check your login status:

```bash
codex login status
```

#### Method 2: API Key

Provide an OpenAI API key via stdin:

```bash
echo "your-api-key" | codex login --with-api-key
# or
printenv OPENAI_API_KEY | codex login --with-api-key
```

### Starting Your First Session

Navigate to your code repository and start Codex:

```bash
cd /path/to/your/repo
codex
```

Or start with a prompt:

```bash
codex "explain the authentication flow in this codebase"
```

**Note**: Codex expects to run in a Git repository. Use `--skip-git-repo-check` to override this requirement.

## CLI Commands

### Interactive Mode

Start an interactive Codex session:

```bash
codex [OPTIONS] [PROMPT]
```

Example:

```bash
codex "implement dark mode"
codex -m o3 "refactor authentication"
```

### Non-Interactive Commands

| Command      | Description                              | Aliases |
| ------------ | ---------------------------------------- | ------- |
| `exec`       | Run Codex non-interactively              | `e`     |
| `review`     | Run a code review non-interactively      | -       |
| `login`      | Manage login and authentication          | -       |
| `logout`     | Remove stored authentication credentials | -       |
| `apply`      | Apply the latest diff as a git patch     | `a`     |
| `resume`     | Resume a previous interactive session    | -       |
| `cloud`      | Browse and apply Codex Cloud tasks       | -       |
| `mcp`        | Run/manage MCP servers (experimental)    | -       |
| `sandbox`    | Run commands in Codex sandbox            | `debug` |
| `completion` | Generate shell completion scripts        | -       |
| `features`   | Inspect feature flags                    | -       |

### Core Command Details

#### `codex exec`

Run Codex non-interactively with a one-time prompt:

```bash
codex exec "implement pagination for user list"
codex exec --json --output-last-message result.txt "analyze performance"
codex exec --full-auto "add error handling"
```

**Resume a session non-interactively:**

```bash
codex exec resume <SESSION_ID> "continue with this new prompt"
```

This allows programmatic session resumption without requiring an interactive terminal, useful for automation and error recovery workflows.

Options:

- `--json` - Output events as JSONL
- `--output-last-message <FILE>` - Save agent's final response
- `--output-schema <FILE>` - Specify JSON Schema for structured output
- `--skip-git-repo-check` - Allow running outside Git repos

**Performance Note**: Complex assessment or analysis tasks can take 8+ minutes (500+ seconds) as Codex thoroughly explores the codebase, reads multiple files, and reasons about requirements. Simple queries may complete in under a minute, but comprehensive story assessments with multiple requirements typically require several minutes. This is normal behavior for thorough code analysis. The response will include both the agent's reasoning process (in stderr) and the final output (in stdout).

#### `codex review`

Request code review on changes:

```bash
codex review                           # Review working directory changes
codex review --uncommitted             # Review staged/unstaged/untracked
codex review --base main               # Review against specific branch
codex review --commit abc123           # Review specific commit
codex review "focus on security"       # Custom review instructions
```

#### `codex apply`

Apply diffs generated by Codex:

```bash
codex apply <TASK_ID>
```

#### `codex resume`

Resume a previous session:

```bash
codex resume                           # Pick from list
codex resume --last                    # Resume most recent
codex resume <SESSION_ID>              # Resume specific session
codex resume --all                     # Show all sessions (not just current dir)
```

#### `codex cloud`

Interact with Codex Cloud tasks:

```bash
codex cloud                            # Browse cloud tasks (TUI)
codex cloud exec --env <ENV_ID> "task" # Submit new cloud task
codex cloud status <TASK_ID>           # Check task status
codex cloud apply <TASK_ID>            # Apply cloud task locally
codex cloud diff <TASK_ID>             # Show diff for cloud task
```

#### `codex login`

Manage authentication:

```bash
codex login                            # Sign in with ChatGPT
codex login --with-api-key             # Use API key from stdin
codex login status                     # Show login status
codex logout                           # Remove credentials
```

#### `codex features`

Inspect and manage feature flags:

```bash
codex features list                    # List all features and their state
```

#### `codex completion`

Generate shell completions:

```bash
codex completion bash > ~/.codex-completion.bash
codex completion zsh > ~/.zsh/completions/_codex
codex completion fish > ~/.config/fish/completions/codex.fish
```

### Common Options

These options work across most commands:

| Option                        | Description                                       |
| ----------------------------- | ------------------------------------------------- |
| `-c, --config <key=value>`    | Override config value from `~/.codex/config.toml` |
| `-m, --model <MODEL>`         | Specify AI model (e.g., `o3`)                     |
| `-p, --profile <PROFILE>`     | Use named config profile                          |
| `-C, --cd <DIR>`              | Use specified directory as working root           |
| `-i, --image <FILE>`          | Attach image(s) to prompt                         |
| `--enable <FEATURE>`          | Enable a feature flag                             |
| `--disable <FEATURE>`         | Disable a feature flag                            |
| `--oss`                       | Use local open-source model (LM Studio/Ollama)    |
| `--local-provider <PROVIDER>` | Specify local provider (lmstudio/ollama)          |

### Sandbox Options

Control how Codex executes commands:

| Option                                       | Description                                                          |
| -------------------------------------------- | -------------------------------------------------------------------- |
| `-s, --sandbox <MODE>`                       | Sandbox policy: `read-only`, `workspace-write`, `danger-full-access` |
| `-a, --ask-for-approval <POLICY>`            | Approval policy: `untrusted`, `on-failure`, `on-request`, `never`    |
| `--full-auto`                                | Alias for `-a on-request --sandbox workspace-write`                  |
| `--dangerously-bypass-approvals-and-sandbox` | **DANGEROUS** Skip all confirmations                                 |
| `--add-dir <DIR>`                            | Additional writable directories                                      |

### Approval Policies

| Policy       | Behavior                                                  |
| ------------ | --------------------------------------------------------- |
| `untrusted`  | Only run trusted commands (ls, cat, sed) without approval |
| `on-failure` | Run all commands; ask only if execution fails             |
| `on-request` | Model decides when to ask for approval                    |
| `never`      | Never ask for approval; failures returned to model        |

### Sandbox Modes

| Mode                 | Description                     |
| -------------------- | ------------------------------- |
| `read-only`          | Only read operations allowed    |
| `workspace-write`    | Write within workspace only     |
| `danger-full-access` | Unrestricted access (dangerous) |

**Important for Running Tests:**

When running test suites (e.g., `npm test`, `vitest`, `jest`), sandbox mode restrictions can impact test execution:

- **`read-only`**: Tests will fail if they require building/compiling code, as the build step typically writes to output directories (e.g., `dist/`, `build/`)

- **`workspace-write`**: Allows building and most test execution, but tests that spawn subprocesses using tools like `tsx` (TypeScript execution) may fail with `EPERM` errors. This is because `tsx` creates Unix domain sockets (IPC pipes) for inter-process communication, and the `workspace-write` sandbox blocks the `listen` syscall on sockets even in allowed directories like `/tmp`. In practice, this affects approximately 3-5% of test suites (e.g., tests that spawn TypeScript scripts as separate processes for CLI testing)

- **`danger-full-access`**: Allows complete test execution including tests that use IPC pipes, Unix sockets, and other advanced features. Required for full test suite execution when tests spawn subprocesses or use inter-process communication

**Recommendation for Test Execution:**

- Use `--sandbox danger-full-access` when running test suites to ensure all tests can execute
- Consider running Codex in a containerized environment (Docker, VM) when using `danger-full-access` mode
- For read-only analysis (code review, coverage analysis without execution), use `--sandbox read-only`

### Feature Flags

Current stable features (always enabled):

- `undo` - Undo previous operations
- `parallel` - Parallel operation support
- `view_image_tool` - Image viewing capabilities
- `shell_tool` - Shell command execution
- `warnings` - Display warnings

Experimental features (opt-in):

- `exec_policy` - Execution policy controls
- `remote_compaction` - Remote data compaction
- `skills` - Skills framework
- `apply_patch_freeform` - Freeform patch application
- `unified_exec` - Unified execution mode (beta)
- `shell_snapshot` - Shell state snapshotting (beta)

### Configuration

Config file location: `~/.codex/config.toml`

Override values with `-c` flag:

```bash
codex -c model="o3"
codex -c 'sandbox_permissions=["disk-full-read-access"]'
codex -c shell_environment_policy.inherit=all
```

## IDE Extension Usage

### Opening Codex Panel

1. Open VSCode/Cursor
2. Open the Codex panel from the sidebar
3. Open a repository folder

### Task Management

The Codex panel displays:

- Current tasks in progress
- Task list (e.g., "Investigate Plus CTA text", "Implement dark mode")
- Code preview and diff views
- Approval buttons for suggested changes

### Making Targeted Edits

1. Describe what you want to change
2. Review the proposed changes in the diff view
3. Accept, reject, or request modifications
4. Changes are applied directly to your files

## Cloud Workflows

### Delegating Tasks

Use Codex Cloud to work on tasks asynchronously:

1. Open Codex in your browser: [https://chatgpt.com/codex](https://chatgpt.com/codex)
2. Connect your GitHub repository
3. Describe the task (e.g., "Add user authentication", "Fix performance issue in search")
4. Codex loads your repo in a secure sandbox
5. Review generated code online
6. Merge or continue working locally

### Code Review Integration

#### Setup

1. Navigate to [https://chatgpt.com/codex/code-review](https://chatgpt.com/codex/code-review)
2. Click "Connect GitHub"
3. Authorize Codex to access your repositories
4. Configure which repositories should have automatic reviews

#### Automatic PR Reviews

Once configured, Codex will:

- Automatically review new pull requests
- Provide feedback on code quality, potential bugs, and best practices
- Suggest improvements
- Comment directly on the PR

#### Manual Reviews

Request a review from the CLI:

```bash
codex /review
```

Or tag Codex in a PR comment:

```
@codex please review this change
```

## Common Workflows

### Implementing a New Feature

**Interactive mode:**

```bash
codex "implement pagination for the user list on the admin dashboard"
```

**Non-interactive mode:**

```bash
codex exec "implement pagination for the user list" --json
```

**With full automation:**

```bash
codex exec --full-auto "add dark mode support"
```

Codex will:

1. Explore relevant files (user controller, admin views, etc.)
2. Review the current architecture
3. Generate pagination logic
4. Update views and controllers
5. Add tests
6. Present changes for approval

### Fixing a Bug

```bash
codex "fix the bug where users can't update their profile picture"
```

Codex will:

1. Investigate the profile update flow
2. Identify the issue
3. Propose a fix
4. Update related tests
5. Present the fix for review

### Code Review Workflows

**Review uncommitted changes:**

```bash
codex review --uncommitted
```

**Review against a base branch:**

```bash
codex review --base main
```

**Review a specific commit:**

```bash
codex review --commit abc123 --title "Feature: User authentication"
```

**Custom review focus:**

```bash
codex review "focus on security vulnerabilities and performance"
```

### Refactoring Code

```bash
codex "refactor the authentication middleware to use async/await instead of callbacks"
```

Codex will:

1. Analyze the current middleware
2. Plan the refactoring strategy
3. Update all affected code
4. Ensure tests still pass
5. Present the refactored code

### Brainstorming Solutions

```bash
codex "what's the best way to implement real-time notifications in this app?"
```

Codex will:

1. Analyze your tech stack
2. Suggest multiple approaches (WebSockets, SSE, polling, etc.)
3. Discuss trade-offs
4. Recommend an approach based on your requirements
5. Offer to implement the chosen solution

### Working with Images

Attach images to provide visual context:

```bash
codex -i screenshot.png "implement this UI design"
codex -i diagram1.png -i diagram2.png "explain these architecture diagrams"
```

### Using Local Models

Use local LLM providers like Ollama or LM Studio:

```bash
codex --oss                              # Auto-detect local provider
codex --oss --local-provider ollama      # Specify Ollama
codex --oss --local-provider lmstudio    # Specify LM Studio
```

### Web Search Integration

Enable web search for the model:

```bash
codex --search "implement OAuth2 using best practices from 2024"
```

### Session Management

Resume your last session:

```bash
codex resume --last
```

Pick from recent sessions:

```bash
codex resume
```

Resume with a new prompt:

```bash
codex resume --last "now add error handling"
```

### Cloud Workflows

Submit a task to Codex Cloud:

```bash
codex cloud exec --env <ENV_ID> "refactor the user authentication system"
```

Check task status:

```bash
codex cloud status <TASK_ID>
```

Apply cloud changes locally:

```bash
codex cloud apply <TASK_ID>
```

### Advanced: Structured Output

Request structured JSON output:

```bash
codex exec --output-schema schema.json --json "analyze code quality" > output.jsonl
```

### Advanced: MCP Server Mode

Run Codex as an MCP (Model Context Protocol) server:

```bash
codex mcp list        # List MCP servers
codex mcp add <url>   # Add MCP server
codex mcp remove <id> # Remove MCP server
codex mcp login       # Login to MCP
```

## Best Practices

### 1. Be Specific and Provide Context

Instead of:

```bash
codex "fix the search feature"
```

Try:

```bash
codex "fix the search feature - it's not returning results when searching by partial email address"
```

With context:

```bash
codex "implement OAuth2 authentication using the existing user model in src/models/User.ts and follow the pattern used in src/auth/LocalStrategy.ts"
```

### 2. Choose the Right Mode

**Interactive** - For exploratory work, learning, and iterative development:

```bash
codex "explain the payment flow and suggest improvements"
```

**Non-interactive** - For automated workflows and scripting:

```bash
codex exec --json "analyze test coverage" > coverage-report.jsonl
```

**Full-auto** - For trusted environments with sandboxed execution:

```bash
codex exec --full-auto "add logging to all API endpoints"
```

### 3. Use Appropriate Sandbox Settings

**Read-only** - Safe exploration:

```bash
codex -s read-only "analyze the codebase structure"
```

**Workspace-write** - Typical development:

```bash
codex -s workspace-write "implement new feature"
```

**Never use `danger-full-access` or `--dangerously-bypass-approvals-and-sandbox`** unless in an externally sandboxed environment (like a container or VM).

### 4. Review Before Merging

Always review Codex's suggestions:

- Check for security implications
- Verify alignment with your coding standards
- Test the changes in your local environment
- Ensure tests are adequate
- Use `codex review` to get AI feedback on changes

### 5. Leverage Code Review Features

Get automated reviews:

```bash
codex review --uncommitted "focus on security and performance"
```

Review before pushing:

```bash
codex review --base origin/main
```

### 6. Use Codex for Code Understanding

Explore unfamiliar code:

```bash
codex "explore the codebase and explain how the payment processing flow works"
```

Generate documentation:

```bash
codex "generate API documentation for the user service"
```

### 7. Iterative Refinement

If the first solution isn't perfect:

```bash
codex resume --last "that's close, but can you move the validation logic into a separate middleware?"
```

### 8. Work with Visual Context

Attach screenshots and diagrams:

```bash
codex -i mockup.png "implement this dashboard design"
codex -i architecture.png "refactor the code to match this architecture"
```

### 9. Configure for Your Workflow

Create profiles in `~/.codex/config.toml`:

```toml
[profiles.safe]
sandbox = "read-only"
ask_for_approval = "untrusted"

[profiles.dev]
sandbox = "workspace-write"
ask_for_approval = "on-request"
model = "o3"
```

Use with:

```bash
codex -p safe "analyze security issues"
codex -p dev "implement new feature"
```

### 10. Use Shell Completions

Enable tab completion for better UX:

```bash
# For zsh
codex completion zsh > ~/.zsh/completions/_codex

# For bash
codex completion bash > ~/.codex-completion.bash
source ~/.codex-completion.bash

# For fish
codex completion fish > ~/.config/fish/completions/codex.fish
```

### 11. Session Management

Resume previous work efficiently:

```bash
codex resume --last           # Continue most recent
codex resume --all            # Browse all sessions
```

### 12. Cloud Delegation

Use cloud for long-running tasks:

```bash
codex cloud exec --env <ENV_ID> "comprehensive refactoring of authentication system"
```

Then check back later:

```bash
codex cloud status <TASK_ID>
codex cloud diff <TASK_ID>
codex cloud apply <TASK_ID>
```

## Pricing Plans

### Plus - $20/month

- Includes Codex usage for focused coding sessions each week
- Suitable for individual developers working on smaller projects

### Pro - $200/month

- Higher usage limits to power full workdays
- Multiple projects support
- Suitable for professional developers

### Business - $30/user/month

- Secure, shared workspace
- Admin controls
- Flexible pricing for teams
- Team collaboration across repositories

### Enterprise & Edu

- Codex is included in ChatGPT Enterprise and Edu plans
- Contact sales for custom pricing and features

## Troubleshooting

### Binary Not Found

If you see "Error: spawn ENOENT", the native binary may be missing:

1. Reinstall Codex:

   ```bash
   npm install -g @openai/codex --force
   # or for Bun
   bun install -g @openai/codex --force
   ```

2. Verify installation:
   ```bash
   which codex
   npx codex --version
   ```

### Authentication Issues

If you can't sign in:

1. Check login status:

   ```bash
   codex login status
   ```

2. Ensure you have an active ChatGPT Plus/Pro/Business subscription

3. Try re-authenticating:

   ```bash
   codex logout
   codex login
   ```

4. For API key issues:
   ```bash
   printenv OPENAI_API_KEY | codex login --with-api-key
   ```

### Platform Not Supported

If you see "Unsupported platform", your OS/architecture combination may not have a prebuilt binary. Supported combinations:

- **Linux**: x64, ARM64 (musl-based)
- **macOS**: x64, ARM64 (Apple Silicon)
- **Windows**: x64, ARM64 (MSVC)

### Git Repository Required

By default, Codex expects to run in a Git repository:

```bash
fatal error: not a git repository
```

Solutions:

1. Initialize a Git repo: `git init`
2. Use the bypass flag: `codex --skip-git-repo-check`

### IDE Extension Not Working

1. Verify the extension is installed and enabled
2. Check you're signed in to your ChatGPT account in VSCode
3. Reload the window: `Cmd/Ctrl + Shift + P` → "Reload Window"
4. Check the extension logs for errors
5. Try reinstalling the extension

### Sandbox Permission Errors

If commands fail due to sandbox restrictions:

1. Check your sandbox mode:

   ```bash
   codex -s workspace-write "your task"
   ```

2. Add additional writable directories:

   ```bash
   codex --add-dir /path/to/other/dir "your task"
   ```

3. For debugging, use read-only mode:
   ```bash
   codex -s read-only "analyze only"
   ```

### Local Model Provider Issues

If `--oss` flag fails:

1. Verify Ollama or LM Studio is running:

   ```bash
   curl http://localhost:11434/api/tags  # Ollama
   # or check LM Studio is running
   ```

2. Specify the provider explicitly:

   ```bash
   codex --oss --local-provider ollama
   ```

3. Check the model is available:
   ```bash
   ollama list  # For Ollama
   ```

### Session Resume Issues

If `codex resume` doesn't show sessions:

1. Check current directory - sessions are filtered by working directory
2. Use `--all` to see all sessions:

   ```bash
   codex resume --all
   ```

3. Session files are stored in `~/.codex/` (check if writable)

### Cloud Task Failures

If cloud tasks fail:

1. Check task status:

   ```bash
   codex cloud status <TASK_ID>
   ```

2. Verify environment ID is correct
3. Ensure repository is accessible by Codex Cloud
4. Check GitHub integration is connected

### Feature Flag Issues

Check available features and their state:

```bash
codex features list
```

Enable experimental features:

```bash
codex --enable <feature_name> "your task"
```

### Configuration Issues

Check config file: `~/.codex/config.toml`

Override specific values:

```bash
codex -c model="o3" -c sandbox="read-only" "your task"
```

Clear and reset config:

```bash
mv ~/.codex/config.toml ~/.codex/config.toml.backup
```

### Performance Issues

1. Use `--json` mode for batch processing:

   ```bash
   codex exec --json "task" > output.jsonl
   ```

2. Disable unnecessary features:

   ```bash
   codex --disable web_search_request "task"
   ```

3. Use simpler models for faster responses:
   ```bash
   codex -m gpt-4o-mini "task"
   ```

## Environment Variables

### `CODEX_MANAGED_BY_NPM` / `CODEX_MANAGED_BY_BUN`

Automatically set by the wrapper to indicate how Codex was installed. Used to provide appropriate update instructions to users.

### `PATH`

The wrapper extends PATH to include the vendor binary directory for your platform, ensuring dependencies are accessible.

### `OPENAI_API_KEY`

OpenAI API key for authentication (alternative to ChatGPT login):

```bash
export OPENAI_API_KEY="your-key-here"
echo "$OPENAI_API_KEY" | codex login --with-api-key
```

## Security Considerations

### Code Access

- **CLI/IDE modes**: Codex accesses your local files in the current working directory
- **Git requirement**: By default, Codex runs only in Git repositories for safety
- **Cloud mode**: Uses a secure sandbox environment isolated from your local machine
- **Code processing**: Handled according to OpenAI's data usage policies

### Sandbox Protections

Codex implements multiple layers of sandboxing:

- **macOS**: Seatbelt sandbox restricts file system and network access
- **Linux**: Landlock + seccomp restrict system calls and file access
- **Windows**: Restricted token limits privileges

Sandbox modes (in order of safety):

1. `read-only` - Safest, no writes allowed
2. `workspace-write` - Writes limited to workspace
3. `danger-full-access` - Unrestricted (use only in containerized environments)

### Approval Policies

Control AI autonomy with approval policies:

- `untrusted` - Highest safety, only trusted commands auto-execute
- `on-request` - Balanced, AI requests approval when needed
- `on-failure` - Permissive, only blocks on failures
- `never` - Fully autonomous (combine with sandboxing)

**Never use** `--dangerously-bypass-approvals-and-sandbox` outside containerized environments.

### GitHub Integration

- Requires GitHub OAuth authorization
- Only accesses repositories you explicitly configure
- Follows GitHub's permission model (read/write access as granted)
- Can be revoked at any time from GitHub settings

### API Keys

- Store API keys securely using environment variables
- Never commit API keys to version control
- Use `codex login --with-api-key` with stdin (prevents shell history)
- Rotate keys regularly
- Use environment-specific keys for CI/CD

```bash
# Good: API key from secure environment
printenv OPENAI_API_KEY | codex login --with-api-key

# Bad: API key in command line (visible in shell history)
echo "sk-..." | codex login --with-api-key
```

### Configuration File Security

Config file location: `~/.codex/config.toml`

Ensure proper permissions:

```bash
chmod 600 ~/.codex/config.toml
```

### Network Security

- All communication with OpenAI uses HTTPS
- Local model providers (Ollama, LM Studio) may use HTTP on localhost
- Cloud mode requires internet connectivity
- MCP servers may have their own network requirements

### Data Privacy

- **Training**: OpenAI's data usage policies apply (check current terms)
- **Local models**: Data stays on your machine when using `--oss`
- **Sessions**: Stored locally in `~/.codex/`
- **Cloud tasks**: Processed in OpenAI's infrastructure

### Best Security Practices

1. **Use read-only mode for exploration**:

   ```bash
   codex -s read-only "analyze codebase"
   ```

2. **Review changes before applying**:

   ```bash
   codex review --uncommitted
   ```

3. **Use sandboxing in CI/CD**:

   ```bash
   codex -s workspace-write -a on-request "task"
   ```

4. **Limit writable directories**:

   ```bash
   codex -C /specific/dir --sandbox workspace-write "task"
   ```

5. **Use API keys for automation, ChatGPT auth for development**

6. **Run in containers for untrusted tasks**:
   ```bash
   docker run -v $(pwd):/workspace -w /workspace node:18 \
     bash -c "npm install -g @openai/codex && codex --dangerously-bypass-approvals-and-sandbox 'task'"
   ```

### Audit and Monitoring

Session history is stored in `~/.codex/`:

```bash
ls -la ~/.codex/
```

Review recent sessions:

```bash
codex resume --all
```

### Compliance Considerations

- Ensure Codex usage complies with your organization's security policies
- Review OpenAI's terms of service and data processing agreements
- Consider data residency requirements for cloud mode
- Maintain audit logs for sensitive operations

## Advanced Usage

### Custom Models

Switch between different AI models:

```bash
codex -m o3 "complex reasoning task"
codex -m gpt-4o "general purpose task"
codex -m gpt-4o-mini "simple task"
```

Check available models based on your subscription tier.

### Configuration Profiles

Create named profiles in `~/.codex/config.toml`:

```toml
# Safe exploration profile
[profiles.safe]
sandbox = "read-only"
ask_for_approval = "untrusted"

# Development profile
[profiles.dev]
sandbox = "workspace-write"
ask_for_approval = "on-request"
model = "o3"

# Automated profile for CI/CD
[profiles.ci]
sandbox = "workspace-write"
ask_for_approval = "never"
model = "gpt-4o"
```

Use profiles:

```bash
codex -p safe "analyze security vulnerabilities"
codex -p dev "implement new feature"
codex -p ci "run automated tests"
```

### Complex Config Overrides

Override nested config values:

```bash
codex -c model="o3"
codex -c 'sandbox_permissions=["disk-full-read-access"]'
codex -c shell_environment_policy.inherit=all
codex -c features.web_search_request=true
```

### Structured Output with JSON Schema

Define output schema:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "analysis": { "type": "string" },
    "recommendations": {
      "type": "array",
      "items": { "type": "string" }
    },
    "confidence": { "type": "number" }
  }
}
```

Use with Codex:

```bash
codex exec --output-schema schema.json --json "analyze code quality" > output.jsonl
```

#### JSON Schema Restrictions

When using `--output-schema` with OpenAI's Codex API, the JSON Schema must follow strict validation rules:

**Critical Limitations:**

1. **No `$ref` with `$defs` support**: OpenAI's structured output API does **NOT** support JSON Schema `$ref` references to `$defs`. All schema definitions must be inlined directly in the schema. Using `$ref` will result in the error: `"Invalid schema for response_format 'codex_output_schema'. Please ensure it is a valid JSON Schema."`

   ```json
   // ❌ This will FAIL - $ref to $defs is not supported
   {
     "$defs": {
       "StringArray": {
         "type": "array",
         "items": { "type": "string" }
       }
     },
     "properties": {
       "items": { "$ref": "#/$defs/StringArray" }
     }
   }

   // ✅ This will WORK - inline the definition
   {
     "properties": {
       "items": {
         "type": "array",
         "items": { "type": "string" }
       }
     }
   }
   ```

**Required Rules:**

2. **additionalProperties must be false**: Every object in the schema MUST have `"additionalProperties": false` to prevent unexpected properties

3. **All properties must be required or nullable**: When `additionalProperties: false` is set, ALL properties defined in `properties` MUST either:
   - Be listed in the `required` array, OR
   - Have nullable types (e.g., `"type": ["string", "null"]`)

4. **No partially optional properties**: You cannot have a property in `properties` that is neither required nor nullable

**Handling Optional Fields:**

For fields that may not always be available (e.g., coverage metrics that depend on test execution):

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["runAttempted", "exitCode", "summary"],
  "properties": {
    "runAttempted": { "type": "boolean" },
    "exitCode": { "type": ["integer", "null"] },
    "summary": {
      "type": ["object", "null"],
      "additionalProperties": false,
      "required": ["linesPct", "branchesPct"],
      "properties": {
        "linesPct": { "type": ["number", "null"] },
        "branchesPct": { "type": ["number", "null"] }
      }
    }
  }
}
```

In this example:

- `summary` is required but can be `null` when coverage metrics aren't available
- Individual metrics within `summary` are required but can be `null`
- This allows Codex to return `null` for fields it cannot discover

**Dynamic Property Maps:**

For objects with dynamic keys (e.g., `Record<string, T>` in TypeScript), use `additionalProperties` as a schema validator instead of a boolean, and use an empty `properties` object:

```json
{
  "byStory": {
    "type": "object",
    "properties": {},
    "additionalProperties": {
      "type": "object",
      "additionalProperties": false,
      "required": ["count", "items"],
      "properties": {
        "count": { "type": "integer" },
        "items": { "type": "array", "items": { "type": "string" } }
      }
    }
  }
}
```

**Common Errors:**

- `'required' is required to be supplied and to be an array including every key in properties`: Some property in `properties` is not in `required` and is not nullable
- `Extra required key 'X' supplied`: Property `X` is in `required` but uses `additionalProperties` as a schema (dynamic map pattern)
- `'additionalProperties' is required to be supplied and to be false`: Missing `additionalProperties: false` on an object

### Integration with CI/CD

#### GitHub Actions Example

```yaml
name: Codex Code Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  codex-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install Codex
        run: npm install -g @openai/codex

      - name: Authenticate Codex
        run: echo "${{ secrets.OPENAI_API_KEY }}" | codex login --with-api-key

      - name: Run Code Review
        run: |
          codex review --base ${{ github.base_ref }} \
            --json \
            --output-last-message review.json \
            "focus on security, performance, and best practices"

      - name: Post Review Comment
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const review = JSON.parse(fs.readFileSync('review.json', 'utf8'));
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## Codex Code Review\n\n${review}`
            });
```

#### GitLab CI Example

```yaml
codex-review:
  stage: review
  image: node:18
  script:
    - npm install -g @openai/codex
    - echo "$OPENAI_API_KEY" | codex login --with-api-key
    - codex review --base $CI_MERGE_REQUEST_TARGET_BRANCH_NAME --json
  only:
    - merge_requests
```

### Approval Workflows

Configure approval requirements for team environments:

**Strict approval (manual confirmation for everything):**

```bash
codex -a untrusted "implement feature"
```

**Relaxed approval (only on failures):**

```bash
codex -a on-failure "implement feature"
```

**AI-driven approval (model decides):**

```bash
codex -a on-request "implement feature"
```

**No approval (fully automated, use with caution):**

```bash
codex -a never --sandbox workspace-write "implement feature"
```

### Platform-Specific Sandboxing

Test sandbox behavior for your platform:

**macOS (Seatbelt):**

```bash
codex sandbox macos ls /tmp
```

**Linux (Landlock + seccomp):**

```bash
codex sandbox linux ls /tmp
```

**Windows (Restricted token):**

```bash
codex sandbox windows dir C:\Temp
```

### Multi-Directory Workflows

Work with multiple directories:

```bash
codex -C /path/to/main/repo \
  --add-dir /path/to/shared/lib \
  --add-dir /path/to/config \
  "implement feature using shared library"
```

### Batch Processing

Process multiple tasks non-interactively:

```bash
#!/bin/bash

tasks=(
  "add error handling to user service"
  "improve test coverage in auth module"
  "optimize database queries in reporting"
)

for task in "${tasks[@]}"; do
  echo "Processing: $task"
  codex exec --json --output-last-message "output_${task// /_}.json" "$task"
done
```

### Working with Experimental Features

Enable experimental features:

```bash
codex --enable unified_exec "task"
codex --enable shell_snapshot "task"
codex --enable tui2 "task"
```

Disable stable features if needed:

```bash
codex --disable warnings "task"
```

### MCP Server Management

Run Codex as an MCP server:

```bash
codex mcp-server                    # Start MCP server (stdio)
```

Manage external MCP servers:

```bash
codex mcp list                      # List registered MCP servers
codex mcp add <url> <name>          # Add MCP server
codex mcp remove <name>             # Remove MCP server
codex mcp login                     # Login to MCP
codex mcp logout                    # Logout from MCP
```

### GitHub MCP Server Integration

Codex can integrate with GitHub through the GitHub MCP Server to access GitHub repositories, issues, pull requests, and other GitHub resources during code analysis and assessment tasks.

#### Prerequisites

1. A [GitHub Personal Access Token (PAT)](https://github.com/settings/personal-access-tokens/new) with appropriate scopes:
   - `repo` - For repository access
   - `workflow` - For GitHub Actions access (if needed)
   - `read:org` - For organization-level resources (if needed)

#### Configuration

The GitHub MCP Server can be configured in two ways: remote (hosted by GitHub) or local (self-hosted).

**Option 1: Remote Server (Recommended)**

The remote server is hosted by GitHub at `https://api.githubcopilot.com/mcp/` and requires minimal setup.

Add the server using the Codex CLI:

```bash
codex mcp add github --url https://api.githubcopilot.com/mcp/ --bearer-token-env-var GITHUB_TOKEN
```

This creates the following configuration in `~/.codex/config.toml`:

```toml
[mcp_servers.github]
url = "https://api.githubcopilot.com/mcp/"
bearer_token_env_var = "GITHUB_TOKEN"
```

**Option 2: Local Server (Docker/npx)**

For self-hosted instances, see the [GitHub MCP Server documentation](https://github.com/github/github-mcp-server) for Docker and npx installation options.

#### Providing Authentication

The GitHub MCP Server requires your Personal Access Token to be available as an environment variable. The recommended approach is to store your token securely in a `.env` file:

1. Create a `.env` file in your project root:

```bash
GITHUB_TOKEN=github_pat_YOUR_TOKEN_HERE
```

2. Add `.env` to your `.gitignore` to prevent committing secrets:

```bash
echo ".env" >> .gitignore
```

3. When running Codex, source the `.env` file and export the token:

```bash
source .env && export GITHUB_TOKEN && codex exec "your prompt"
```

**Important**: The environment variable must be **exported** to be available to the Codex process. Simply sourcing the `.env` file is not sufficient.

#### Usage

Once configured, Codex can access GitHub resources during execution:

```bash
# Analyze a GitHub issue
source .env && export GITHUB_TOKEN && codex exec "Get details for issue #5 in voder-ai/eslint-plugin-traceability"

# List repositories
source .env && export GITHUB_TOKEN && codex exec "List my GitHub repositories"

# Check pull request status
source .env && export GITHUB_TOKEN && codex exec "Show me open PRs in owner/repo"
```

#### Verification

Verify the GitHub MCP server is configured:

```bash
codex mcp list
```

You should see `github` listed with status `enabled`.

Test the connection:

```bash
source .env && export GITHUB_TOKEN && codex exec "List my GitHub repositories using the GitHub MCP server"
```

#### Security Best Practices

- **Never commit tokens to version control** - Always use `.env` files and add them to `.gitignore`
- **Use minimal scopes** - Only grant the permissions your tasks require
- **Rotate tokens regularly** - Generate new tokens periodically and revoke old ones
- **Use fine-grained PATs** - Prefer [fine-grained personal access tokens](https://github.com/settings/personal-access-tokens/new) over classic tokens for better security
- **Environment-specific tokens** - Use different tokens for development, CI/CD, and production environments

#### Troubleshooting

**MCP server fails to start with "Environment variable GITHUB_TOKEN is not set":**

- Ensure you're exporting the variable: `source .env && export GITHUB_TOKEN && codex exec "..."`
- Verify the variable name in `~/.codex/config.toml` matches your environment variable
- Check the token is present: `echo $GITHUB_TOKEN` (should show token value)

**Authentication failed / 401 Unauthorized:**

- Verify your PAT is valid and not expired
- Check your PAT has the required scopes (`repo` at minimum)
- Regenerate the PAT if needed

**MCP server shows as "Unsupported" in auth status:**

- This is expected for environment variable-based authentication
- As long as the token is exported correctly, authentication will work

### Environment Inheritance Control

Control shell environment inheritance:

```bash
codex -c shell_environment_policy.inherit=all "task"
codex -c shell_environment_policy.inherit=minimal "task"
```

### Custom Retry Logic

For cloud tasks, specify number of attempts:

```bash
codex cloud exec --env <ENV_ID> --attempts 3 "complex task"
```

### Session Inspection

Get detailed session information:

```bash
codex resume --all                  # See all sessions with CWD
codex resume <SESSION_ID> "continue from here"
```

## Resources

- **Official Website**: [https://chatgpt.com/features/codex/](https://chatgpt.com/features/codex/)
- **VS Code Extension**: [https://marketplace.visualstudio.com/items?itemName=openai.chatgpt](https://marketplace.visualstudio.com/items?itemName=openai.chatgpt)
- **Sign in to Codex Web**: [https://chatgpt.com/codex](https://chatgpt.com/codex)
- **Code Review Setup**: [https://chatgpt.com/codex/code-review](https://chatgpt.com/codex/code-review)
- **npm Package**: [https://www.npmjs.com/package/@openai/codex](https://www.npmjs.com/package/@openai/codex)

## Quick Reference

### Most Common Commands

```bash
# Start interactive session
codex "your prompt"

# Non-interactive execution
codex exec "implement feature" --json

# Code review
codex review --uncommitted
codex review --base main

# Session management
codex resume --last
codex resume

# Cloud workflows
codex cloud
codex cloud exec --env <ENV_ID> "task"

# Authentication
codex login
codex login status
codex logout

# Apply changes
codex apply <TASK_ID>
```

### Essential Options

```bash
# Model selection
-m, --model <MODEL>              # Specify model (o3, gpt-4o, etc.)

# Sandbox control
-s, --sandbox <MODE>             # read-only, workspace-write, danger-full-access
-a, --ask-for-approval <POLICY>  # untrusted, on-request, on-failure, never
--full-auto                      # Convenience: -a on-request -s workspace-write

# Configuration
-c, --config <key=value>         # Override config values
-p, --profile <PROFILE>          # Use named profile
-C, --cd <DIR>                   # Change working directory

# Features
--enable <FEATURE>               # Enable feature flag
--disable <FEATURE>              # Disable feature flag
--oss                            # Use local LLM (Ollama/LM Studio)

# Input/Output
-i, --image <FILE>               # Attach image
--json                           # JSONL output
-o, --output-last-message <FILE> # Save final response
```

### Sandbox Mode Quick Reference

| Mode                 | Use Case              | Safety      |
| -------------------- | --------------------- | ----------- |
| `read-only`          | Analysis, exploration | ⭐⭐⭐ High |
| `workspace-write`    | Development           | ⭐⭐ Medium |
| `danger-full-access` | Containerized only    | ⭐ Low      |

### Approval Policy Quick Reference

| Policy       | Behavior               | Autonomy |
| ------------ | ---------------------- | -------- |
| `untrusted`  | Only trusted commands  | Low      |
| `on-request` | AI decides when to ask | Medium   |
| `on-failure` | Ask only on failures   | High     |
| `never`      | Never ask              | Maximum  |

### Feature Flags Quick Reference

**Stable (always on):**

- `undo`, `parallel`, `view_image_tool`, `shell_tool`, `warnings`

**Beta:**

- `unified_exec`, `shell_snapshot`

**Experimental:**

- `exec_policy`, `remote_compaction`, `skills`, `apply_patch_freeform`, `tui2`

### Configuration File Structure

`~/.codex/config.toml`:

```toml
# Default model
model = "o3"

# Default sandbox settings
sandbox = "workspace-write"
ask_for_approval = "on-request"

# Named profiles
[profiles.safe]
sandbox = "read-only"
ask_for_approval = "untrusted"

[profiles.ci]
sandbox = "workspace-write"
ask_for_approval = "never"

# Feature flags
[features]
web_search_request = false
unified_exec = false

# Shell environment
[shell_environment_policy]
inherit = "minimal"  # or "all"
```

### Shell Completion Setup

```bash
# Zsh
codex completion zsh > ~/.zsh/completions/_codex
# Add to ~/.zshrc: fpath=(~/.zsh/completions $fpath)

# Bash
codex completion bash > ~/.codex-completion.bash
# Add to ~/.bashrc: source ~/.codex-completion.bash

# Fish
codex completion fish > ~/.config/fish/completions/codex.fish
```

## Related Features

### Agent Mode in ChatGPT

Use agent mode for research, planning, and multi-step tasks from start to finish.

### Atlas Browser

AI-powered browser for summarizing pages, comparing products, and analyzing information.

### ChatGPT for Engineering

Complete engineering solution with planning, coding, and deployment capabilities in a shared workspace.

## Support

For issues and questions:

1. Check this guide's Troubleshooting section
2. Visit the OpenAI support page
3. Check your subscription status at [https://chatgpt.com/](https://chatgpt.com/)

---

_Last Updated: December 2024_
_Guide Version: 2.0_
_Based on @openai/codex CLI_

## Changelog

### Version 2.0 (December 2024)

- Comprehensive CLI command documentation based on actual `--help` output
- Added sandbox modes and approval policies
- Added feature flags documentation
- Expanded security considerations
- Added CI/CD integration examples
- Added quick reference section
- Added MCP server documentation
- Added local model provider support
- Added structured output with JSON Schema
- Added troubleshooting section expansion

### Version 1.0 (December 2024)

- Initial guide based on web documentation
