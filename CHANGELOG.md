# Changelog

All notable changes to this repository are documented in this file.

## [2026-02-16]

### Added
- `CHANGELOG.md` for milestone-level change tracking across agent handoffs.
- `LESSONS_LEARNED.md` for operational and technical learnings.

### Changed
- `AGENTS.md` now explicitly requires agents to keep `CHANGELOG.md` and `LESSONS_LEARNED.md` current.

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
