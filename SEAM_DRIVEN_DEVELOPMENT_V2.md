# Continuous Seam-Driven Development (CSDD)

Seam-Driven Development (SDD) is the architectural philosophy that underpins this repository. It enforces a strict separation between pure domain logic (`src/lib/core/`) and side-effecting external I/O (`src/lib/server/seams/`), allowing for rapid, deterministic, and highly parallelized development.

However, traditional SDD relies heavily on developer discipline and manual processes: manually running probes, manually copying output to fixtures, manually writing mocks that match those fixtures, and manually remembering to check if an external API has drifted (freshness).

**Continuous Seam-Driven Development (CSDD)** evolves this methodology by turning discipline into tooling. It treats the seam boundary not just as a software pattern, but as an active, automatable entity managed by CLIs, Linters, CI, and AI Agents.

## The CSDD Lifecycle

The core SDD order remains:
`Contract -> Probe -> Fixtures -> Mock -> Contract Test -> Adapter -> Composition`

CSDD introduces automation and strict enforcement at every stage:

### Definition Of Done Gate
Before advancing to the next seam or lifecycle stage, all seam-relevant probes and tests must pass. Each cycle must also record meaningful outcomes and test results in `plans/the-14th-step-execplan.md`, `decision-log.md`, `CHANGELOG.md`, and `LESSONS_LEARNED.md`.

### 1. Pure Core Enforcement (Linter)
The `src/lib/core/` directory must remain pure. It cannot make network calls, access the database, or read from the file system. In CSDD, this is no longer a gentleman's agreement—it is strictly enforced by a custom AST-aware ESLint plugin (`eslint-plugin-seams`). If a core module imports from `src/lib/server/` or Node's `fs`/`net`, the build fails.

### 2. Automated Fixture Recording (seam-cli)
Instead of developers running a probe script and manually copy-pasting the JSON output into a `fixtures/` folder, the `seam-cli record` command executes the probe defined in `seam-registry.json` and automatically captures the real-world output (both success and failure states) directly into the correct fixture files.

### 3. Automocking (seam-cli)
Writing a mock adapter is often boilerplate: taking the recorded JSON fixture and wrapping it in a function that returns a `SeamResult`. The `seam-cli automock` command generates this mock implementation directly from the recorded fixtures, eliminating the boilerplate and ensuring the mock is always 100% faithful to the last known real-world state.

### 4. Automated Freshness Tracking (CI & MCP)
External APIs (like xAI or Supabase) change. A mock is only as good as the last time the probe was run against the real API.
- **CI Cron:** A GitHub Actions workflow runs `seam-cli freshness` on a schedule. It compares the `freshnessDays` defined in `seam-registry.json` against the file modification times of the fixtures. If a fixture is stale, CI fails, or automatically triggers `seam-cli record` to open a Pull Request with updated fixtures.
- **MCP Server:** AI Agents operating in the repository have access to a Model Context Protocol (MCP) server that exposes `check_seam_freshness` and `automock_seam`. Before an Agent attempts to fix a bug in a seam, it can query the MCP server to see if the fixtures are stale and autonomously update them.

## The Tooling Suite

CSDD is brought to life by the following tools:

1.  **`tools/seam-cli`**: The developer's Swiss Army knife for seam management (`record`, `automock`, `freshness`).
2.  **`tools/eslint-plugin-seams`**: The architectural enforcer.
3.  **`tools/seam-mcp-server`**: The AI Agent interface for seam introspection.
4.  **`.github/workflows/seam-freshness.yml`**: The CI safety net against API drift.

By shifting from manual discipline to automated enforcement, CSDD allows developers (and AI agents) to focus entirely on the contract design and the core business logic, confident that the integration boundaries are continuously verified and accurate.
