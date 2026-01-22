---
status: proposed
date: 2026-01-22
decision-makers: [voder]
consulted: [researcher-story.map.md, user preferences]
informed: []
---

# Use SQLite for Incremental Experiment Data Storage

## Context and Problem Statement

The bAIs toolkit needs to store experiment results incrementally as each test is executed, supporting history tracking, result querying, and reproducibility analysis.

Key data storage requirements from story map:

- Story 026.0-RES-ITERATE-HISTORY: Track experiment run history for reproducibility
- Story 026.1-RES-ITERATE-COMPARE: Compare results across experiment runs
- Story 025.1-RES-REPORT-EXPORT-CSV: Export raw data to CSV
- Story 025.2-RES-REPORT-EXPORT-JSON: Export structured results to JSON
- Incremental writes as each LLM response is received (per user requirement)
- Query capabilities for analysis and comparison
- Support for multiple experiment types with different schemas

User response: "don't care" but emphasized "support data being added to it incrementally as each test is executed"

## Decision Drivers

- Incremental write support (append data as tests complete)
- Query capabilities for analysis and comparison
- Schema flexibility for different experiment types
- No external database server required
- Transaction support for data integrity
- Export capabilities (CSV, JSON)
- TypeScript integration
- Reproducibility and auditability

## Considered Options

- SQLite (embedded relational database)
- JSON Lines/JSONL (append-only JSON format)
- CSV files (simple, spreadsheet-compatible)
- PostgreSQL (full database server)

## Decision Outcome

Chosen option: "SQLite" because it provides structured, queryable storage with true incremental write support through transactions, while requiring no external server. It excels at the comparison and history analysis requirements (stories 026.0, 026.1) while still supporting CSV/JSON export. The relational model naturally handles different experiment types through a well-designed schema.

### Consequences

- Good, because true relational database with SQL queries for analysis
- Good, because ACID transactions ensure data integrity during incremental writes
- Good, because single-file database (easy to backup, share, version control)
- Good, because no database server required (embedded)
- Good, because excellent Node.js libraries with TypeScript support (better-sqlite3)
- Good, because supports complex queries for experiment comparison (story 026.1)
- Good, because schema migrations allow evolution of experiment types
- Good, because easy export to CSV/JSON for external analysis
- Good, because fast for the expected data volumes
- Bad, because requires schema design upfront
- Bad, because adds binary file to repository (though small and git-friendly)
- Neutral, because single-writer limitation acceptable for CLI tool

### Confirmation

- [ ] `better-sqlite3` package installed (or alternative like `sql.js`)
- [ ] Database schema includes experiments, runs, responses tables
- [ ] Incremental writes happen after each LLM response
- [ ] Transaction wrapping ensures data integrity
- [ ] Export functions for CSV and JSON implemented
- [ ] Query functions for history and comparison implemented
- [ ] TypeScript types for database entities defined

## Pros and Cons of the Options

### SQLite

- Good, because relational database with full SQL support
- Good, because ACID transactions for data integrity
- Good, because excellent for complex queries (history, comparison)
- Good, because schema enforces data structure
- Good, because single file, no server needed
- Good, because fast and efficient for expected data volumes
- Good, because mature Node.js libraries with TypeScript support
- Bad, because requires schema design
- Bad, because binary file format (not human-readable)
- Bad, because single writer (acceptable for CLI usage)

### JSON Lines/JSONL

- Good, because simple append-only format
- Good, because human-readable text format
- Good, because easy to stream and process
- Good, because flexible schema (no predefined structure)
- Bad, because no built-in querying (must read entire file)
- Bad, because difficult to compare across runs efficiently
- Bad, because no data integrity guarantees
- Bad, because requires custom parsing for analysis
- Bad, because poor fit for complex queries (story 026.1)

### CSV Files

- Good, because simple and widely compatible
- Good, because human-readable
- Good, because direct spreadsheet import
- Bad, because poor for hierarchical data (experiment → runs → responses)
- Bad, because no schema validation
- Bad, because difficult to append incrementally (file locking issues)
- Bad, because no querying support
- Bad, because not suitable for multiple related tables
- Bad, because poor fit for history tracking (story 026.0)

### PostgreSQL

- Good, because full-featured relational database
- Good, because excellent query capabilities
- Good, because strong data integrity
- Good, because supports concurrent access
- Bad, because requires external database server
- Bad, because overkill for single-user CLI tool
- Bad, because complex setup for users
- Bad, because deployment and backup complexity
- Bad, because violates "no external dependencies" principle

## More Information

- better-sqlite3: https://github.com/WiseLibs/better-sqlite3
- SQLite documentation: https://www.sqlite.org/docs.html
- Related stories:
  - 026.0-RES-ITERATE-HISTORY (experiment history tracking)
  - 026.1-RES-ITERATE-COMPARE (cross-run comparison)
  - 025.1-RES-REPORT-EXPORT-CSV (CSV export)
  - 025.2-RES-REPORT-EXPORT-JSON (JSON export)
- Related decisions:
  - [001-use-typescript-with-esm.proposed.md](001-use-typescript-with-esm.proposed.md)
- Schema design considerations:
  - `experiments` table: experiment definitions and configurations
  - `runs` table: individual experiment executions
  - `responses` table: LLM responses (incrementally written)
  - `results` table: analyzed results and statistics
