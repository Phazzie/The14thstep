# Changelog

All notable changes to this repository are documented in this file.

## [2026-02-16]

### Added
- `CHANGELOG.md` for milestone-level change tracking across agent handoffs.
- `LESSONS_LEARNED.md` for operational and technical learnings.
- Nested agent guides: `app/AGENTS.md` and `plans/AGENTS.md`.
- Seam fixtures, mocks, and contract tests for `grok-ai`, `database`, `auth`, `uuid`, and `clock` under `app/src/lib/seams/**`.
- Domain meeting workflow module `app/src/lib/core/meeting.ts` with lifecycle functions and pure significance scoring.
- Domain unit tests in `app/src/lib/core/meeting.spec.ts`.
- Domain core modules and tests:
  - `app/src/lib/core/character-selector.ts`
  - `app/src/lib/core/prompt-templates.ts`
  - `app/src/lib/core/memory-builder.ts`
  - `app/src/lib/core/callback-scanner.ts`
  - `app/src/lib/core/types.ts`
  - `app/src/lib/core/characters.ts`
  - `app/src/lib/core/therapy-blocklist.ts`
- Live xAI seam tooling and artifacts:
  - `app/src/lib/seams/grok-ai/probe.ts`
  - `app/src/lib/seams/grok-ai/quality-cycle.ts`
  - `app/src/lib/seams/grok-ai/fixtures/probe.sample.json`
  - `app/src/lib/seams/grok-ai/fixtures/probe.fault.json`
  - `app/src/lib/seams/grok-ai/fixtures/voice-quality-report.json`

### Changed
- `AGENTS.md` now explicitly requires agents to keep `CHANGELOG.md` and `LESSONS_LEARNED.md` current.
- Root `AGENTS.md` slimmed to global guidance, with a Seam-Driven Development summary pointer to `app/AGENTS.md`.
- Seam contract files now export runtime validation helpers used by tests and mocks.
- Probe scripts in `app/package.json` now load `.env.local` automatically using `--env-file-if-exists`.
- `seam-registry.json` now points Grok live probe metadata to seam-local probe/quality-cycle scripts.
- `app/README.md` now documents Milestone 3 contract/quality probe commands and output paths.

### Verified
- `npm run test:unit -- --run` passes with seam contract tests included.
- `npm run check` passes with zero diagnostics.
- Total unit suite now passes with 51 tests including expanded domain-core coverage.
- Live quality-cycle run met target for all six core characters (5/5 pass each in captured run).

## [2026-02-15]

### Added
- Seam governance scaffolding: `seam-registry.json`, `decision-log.md`, and root `.gitignore`.
- Shared seam result envelope and error taxonomy in `app/src/lib/core/seam.ts` with unit tests.
- Seam contracts for `grok-ai`, `database`, `auth`, `uuid`, and `clock` in `app/src/lib/seams/**/contract.ts`.
- Probe endpoints and scripts:
  - SSE endpoint and page (`app/src/routes/api/probes/sse/+server.ts`, `app/src/routes/probes/sse/+page.svelte`)
  - CLI probes (`app/probes/sseProbe.mjs`, `app/probes/grokVoiceProbe.mjs`, `app/probes/supabaseMemoryProbe.mjs`)
- Initial Supabase schema migration at `app/supabase/migrations/20260215_000001_init_schema.sql`.
- Environment template `app/.env.example`.

### Changed
- App landing page rebranded to "The 14th Step" and linked to probe surface.
- `app/README.md` rewritten with local run and probe instructions.
- `app/package.json` updated with probe scripts and `@supabase/supabase-js`.
- ExecPlan expanded with explicit environment prerequisites and `npx` CLI strategy.

### Fixed
- xAI Responses parsing in Grok probe to correctly read `output[].content[]` text.
- Sentence counting in Grok probe to avoid false negatives (for example, `a.m.`).
- Supabase memory probe timeout made configurable (`SUPABASE_MEMORY_PROBE_MAX_MS`, default `800`) to handle realistic network latency.

### Verified
- Unit tests and type checks pass after dependency repair in the Linux environment.
- Supabase schema successfully pushed to remote database.
