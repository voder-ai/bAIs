---
status: proposed
date: 2026-01-22
decision-makers: [user]
consulted: [codex-user-guide.md, researcher-story.map.md, 001.0-RES-ANCHORING-EXP.story.md]
informed: []
---

# Use Codex CLI with Output Schema for LLM Interaction

## Context and Problem Statement

The bAIs toolkit needs a method for interacting with LLMs to execute cognitive bias experiments. Story 001.0-RES-ANCHORING-EXP requires sending experiment prompts to LLMs and receiving structured responses (numerical estimates) that can be parsed and analyzed statistically.

Key requirements:
- Send two-question anchoring experiment prompts to LLMs
- Receive structured numeric responses (percentage estimates)
- Handle multiple runs per condition for statistical power
- Parse responses reliably for statistical analysis
- Support error handling and retries (story 004.1-RES-EXEC-RETRIES)
- Eventually support multiple LLM providers (stories 008.0, 008.1, 008.2)

The choice of LLM interaction method affects cost, development complexity, reliability, and extensibility to other providers.

## Decision Drivers

- **Cost**: Budget for running multiple experiment iterations with LLM API calls
- **Ease of Integration**: Development speed and complexity of integration
- **Reliability/Error Handling**: Robust handling of API failures and retries
- **Output Structure Control**: Ability to enforce structured response format (JSON schema)
- **Response Consistency**: Predictable response format for parsing numeric values
- **Future Extensibility**: Ability to add other LLM providers (Anthropic, Ollama) later

## Considered Options

- Codex CLI with output schema
- Direct OpenAI SDK calls
- OpenRouter API
- Direct Anthropic API calls
- Copilot CLI
- Claude Code CLI

## Decision Outcome

Chosen option: "Codex CLI with output schema" because it provides the lowest cost for LLM access while offering built-in JSON schema support for structured outputs, which is critical for reliable numeric response parsing. The CLI interface simplifies integration via subprocess calls, and the `--output-schema` flag ensures consistent response format for statistical analysis.

### Consequences

- Good, because Codex CLI is cost-effective (ChatGPT Plus $20/month vs. direct API costs)
- Good, because `--output-schema` flag enforces JSON response structure for reliable parsing
- Good, because CLI integration via subprocess is simple (no SDK dependencies)
- Good, because `--json` output mode provides structured JSONL for event tracking
- Good, because error handling is straightforward via exit codes and stderr
- Good, because `codex exec` non-interactive mode fits batch experiment execution
- Good, because built-in retry logic and error handling (can be supplemented in story 004.1)
- Bad, because requires ChatGPT Plus subscription ($20/month per researcher)
- Bad, because subprocess calls have overhead vs. direct SDK calls
- Bad, because limited to models available through Codex (initially OpenAI models)
- Bad, because adding other providers (Anthropic, Ollama) will require abstraction layer
- Neutral, because CLI requires Node.js (already part of tech stack)
- Neutral, because future multi-provider support (story 008.2) will need adapter pattern

### Confirmation

- [ ] Codex CLI installed and authenticated (`codex login status` succeeds)
- [ ] JSON schema defined for experiment response format (percentage estimate)
- [ ] Experiment execution uses `codex exec --output-schema schema.json --json`
- [ ] Response parsing extracts numeric estimates from JSON output
- [ ] Error handling captures exit codes and stderr messages
- [ ] Multiple runs execute successfully with consistent output format
- [ ] Integration abstracted to allow future provider implementations

## Pros and Cons of the Options

### Codex CLI with output schema

- Good, because very cost-effective ($20/month flat rate vs. pay-per-token)
- Good, because `--output-schema` enforces structured JSON responses
- Good, because `--json` mode provides JSONL event stream for detailed tracking
- Good, because CLI integration is simple (subprocess spawn)
- Good, because works with ChatGPT Plus (likely already available to researchers)
- Good, because built-in error handling and retry capabilities
- Bad, because requires ChatGPT Plus subscription
- Bad, because subprocess overhead (100-200ms per call)
- Bad, because initially limited to OpenAI models
- Bad, because adding other providers requires abstraction layer
- Bad, because CLI versioning may introduce breaking changes

### Direct OpenAI SDK calls

- Good, because fastest integration (direct API calls, no subprocess)
- Good, because full control over API parameters
- Good, because TypeScript types for API requests/responses
- Good, because structured outputs supported via function calling
- Bad, because pay-per-token pricing (expensive for multiple runs)
- Bad, because requires manual retry/error handling implementation
- Bad, because API key management complexity
- Bad, because no cost advantage over Codex CLI
- Bad, because tightly coupled to OpenAI (harder to add other providers)

### OpenRouter API

- Good, because single API for multiple providers
- Good, because competitive pricing
- Good, because built-in provider fallback
- Good, because easier multi-provider support
- Bad, because pay-per-token pricing
- Bad, because additional service dependency
- Bad, because less mature than direct provider APIs
- Bad, because API key management
- Bad, because potential reliability issues with proxy service

### Direct Anthropic API calls

- Good, because direct access to Claude models
- Good, because TypeScript SDK available
- Good, because good structured output support
- Bad, because only supports Anthropic models (not multi-provider)
- Bad, because pay-per-token pricing
- Bad, because requires separate implementation from OpenAI
- Bad, because API key management
- Bad, because doesn't solve initial OpenAI integration need

### Copilot CLI

- Good, because GitHub integration
- Good, because potentially available through GitHub Copilot subscription
- Bad, because not designed for programmatic/batch use
- Bad, because limited structured output support
- Bad, because focused on development assistance, not research experiments
- Bad, because unclear pricing for API-style usage
- Bad, because less mature than Codex for autonomous execution

### Claude Code CLI

- Good, because direct Claude access
- Good, because CLI interface similar to Codex
- Bad, because only Anthropic models (not multi-provider)
- Bad, because less mature than Codex CLI
- Bad, because unclear structured output capabilities
- Bad, because separate authentication and subscription
- Bad, because doesn't address initial OpenAI need

## Reassessment Criteria

This decision should be reassessed when:

1. **Multi-Provider Support**: When implementing stories 008.0 (Anthropic), 008.1 (Ollama), or 008.2 (Model Registry)
   - Trigger: Beginning work on Multi-Model Comparison theme
   - Action: Evaluate whether to create provider abstraction layer or switch to OpenRouter

2. **Cost Analysis**: After collecting cost data from initial experiments
   - Trigger: After completing Core Validation theme (story 007.0)
   - Metric: If per-experiment cost exceeds $X (to be determined)
   - Action: Compare actual costs against direct SDK pricing

3. **Performance Issues**: If CLI subprocess overhead becomes bottleneck
   - Metric: If experiment execution time > 2x the expected duration
   - Action: Consider direct SDK calls for performance-critical paths

4. **Codex Service Changes**: If Codex CLI pricing, availability, or features change significantly
   - Trigger: Major version updates or pricing changes
   - Action: Re-evaluate alternatives based on new constraints

5. **Structured Output Limitations**: If JSON schema enforcement proves unreliable
   - Metric: If parsing errors exceed 5% of requests
   - Action: Consider alternatives with better structured output support

## More Information

- Codex CLI documentation: Included in [codex-user-guide.md](../codex-user-guide.md)
- Related stories:
  - 001.0-RES-ANCHORING-EXP (anchoring experiment implementation)
  - 002.0-RES-MODEL-OPENAI (OpenAI integration - will use this decision)
  - 004.0-RES-EXEC-ENGINE (execution engine implementation)
  - 004.1-RES-EXEC-RETRIES (retry logic)
  - 005.0-RES-PARSE-NUMERIC (response parsing)
  - 008.0-DEV-MODEL-ANTHROPIC (future: add Anthropic support)
  - 008.1-DEV-MODEL-OLLAMA (future: add Ollama support)
  - 008.2-DEV-MODEL-REGISTRY (future: model registry abstraction)
- Related decisions:
  - [001: TypeScript with ESM](001-use-typescript-with-esm.proposed.md) - CLI subprocess integration
  - [003: Commander.js CLI](003-use-commander-cli-framework.proposed.md) - Our CLI wraps Codex CLI
  - [009: TypeScript Strict Mode](009-use-typescript-strict-mode.proposed.md) - Type safety for responses

**Implementation Approach**:
```typescript
// Example: Execute experiment with Codex CLI
import { spawn } from 'child_process';

interface ExperimentResponse {
  estimate: number;  // Percentage estimate (0-100)
  confidence?: string;
}

const schema = {
  type: 'object',
  properties: {
    estimate: { type: 'number', minimum: 0, maximum: 100 },
    confidence: { type: 'string' }
  },
  required: ['estimate']
};

// Write schema to temp file
const schemaPath = '/tmp/experiment-schema.json';
fs.writeFileSync(schemaPath, JSON.stringify(schema));

// Execute experiment prompt
const codex = spawn('codex', [
  'exec',
  '--output-schema', schemaPath,
  '--json',
  '--output-last-message', '/tmp/response.txt',
  experimentPrompt
]);

// Parse JSONL output for structured response
```

**Cost Comparison** (estimated):
- Codex CLI: $20/month flat rate (ChatGPT Plus)
- OpenAI API: ~$0.01-0.03 per experiment run (100+ runs = $1-3 per experiment)
- OpenRouter: Similar to OpenAI API pricing
- Anthropic API: ~$0.015-0.075 per experiment run

For experiments with 100+ runs per condition (story 003.1), Codex CLI provides significant cost savings.
