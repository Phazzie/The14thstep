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
- Milestone 4 server adapter implementations:
  - `app/src/lib/server/seams/grok-ai/adapter.ts`
  - `app/src/lib/server/seams/database/adapter.ts`
  - `app/src/lib/server/seams/auth/adapter.ts`
  - `app/src/lib/server/supabase.ts`
  - `app/src/hooks.server.ts`
  - Adapter tests under `app/src/lib/server/seams/**/adapter.spec.ts`
- Milestone 5 meeting-flow endpoints and UI wiring:
  - `app/src/routes/+page.server.ts`
  - `app/src/routes/meeting/[id]/+page.svelte`
  - `app/src/routes/meeting/[id]/+page.server.ts`
  - `app/src/routes/meeting/[id]/expand/+server.ts`
  - `app/src/routes/meeting/[id]/crisis/+server.ts`
- Milestone 7 callback-engine core and tests:
  - `app/src/lib/core/callback-engine.ts`
  - `app/src/lib/core/callback-engine.spec.ts`
- Database seam callback fixtures:
  - `app/src/lib/seams/database/fixtures/getShareById.sample.json`
- Milestone status tracker for incomplete milestones:
  - `plans/milestone-status.md`
- Verify scaffolding scripts:
  - `app/scripts/verify-fixtures.mjs`
  - `app/scripts/verify-composition.mjs`
- Compact handoff block for context compaction:
  - `plans/context-compact-handoff.md`
- Minimal CI verify workflow:
  - `.github/workflows/verify.yml`
- Crisis-mode regression test:
  - `app/src/lib/server/routes/meeting-share.spec.ts`
- New meeting UI component set for Milestone 5 flow:
  - `app/src/lib/components/SetupFlow.svelte`
  - `app/src/lib/components/MeetingCircle.svelte`
  - `app/src/lib/components/ShareMessage.svelte`
  - `app/src/lib/components/SystemMessage.svelte`
  - `app/src/lib/components/UserInput.svelte`
  - `app/src/lib/components/MeetingReflection.svelte`
- App stylesheet bootstrap:
  - `app/src/app.css`
- Milestone 5/6 closeout checklist tracker:
  - `plans/m5-m6-closeout-checklists.md`
  - `app/src/lib/seams/database/fixtures/createCallback.sample.json`
  - `app/src/lib/seams/database/fixtures/getActiveCallbacks.sample.json`

### Changed
- `AGENTS.md` now explicitly requires agents to keep `CHANGELOG.md` and `LESSONS_LEARNED.md` current.
- Root `AGENTS.md` slimmed to global guidance, with a Seam-Driven Development summary pointer to `app/AGENTS.md`.
- Seam contract files now export runtime validation helpers used by tests and mocks.
- Probe scripts in `app/package.json` now load `.env.local` automatically using `--env-file-if-exists`.
- `seam-registry.json` now points Grok live probe metadata to seam-local probe/quality-cycle scripts.
- `app/README.md` now documents Milestone 3 contract/quality probe commands and output paths.
- `app/src/app.d.ts` now types `locals.seams` for `auth`, `database`, and `grokAi`.
- `app/src/lib/seams/database/contract.ts` now includes callback/share lifecycle methods and validators.
- `app/src/lib/seams/database/mock.ts` and `contract.test.ts` now cover callback and share-lookup behaviors.
- `app/src/lib/server/seams/database/adapter.ts` now implements callback persistence/retrieval and meeting-share lookup operations.
- `app/src/routes/meeting/[id]/share/+server.ts` now uses memory-builder context, callback-engine selection, quality-validation retries, and callback reference marking.
- `app/src/routes/meeting/[id]/close/+server.ts` now scans completed shares for callbacks and persists scanner results.
- `app/src/routes/meeting/[id]/user-share/+server.ts` now returns `crisis` and `heavy` flags with saved user-share payloads.
- `app/src/routes/meeting/[id]/+page.svelte` now auto-triggers crisis-support responses and pauses normal character-share generation during crisis mode.
- `app/src/routes/meeting/[id]/share/+server.ts` now rejects normal character-share generation when crisis mode is active.
- `app/package.json` now includes `verify` scaffolding commands (`verify:fixtures`, `verify:contracts`, `verify:core`, `verify:composition`).
- Added `TODO(M7/M8/M9)` anchors in active route and verify scaffold files to pinpoint unfinished milestone logic.
- `app/src/routes/+layout.svelte` now imports global app stylesheet.
- `app/src/routes/+page.svelte` now delegates setup UX to `SetupFlow` multi-step flow.
- `app/src/routes/+page.server.ts` now handles setup-phase fields (`userName`, `cleanTime`, `mood`, `mind`) and redirects with meeting-context query params.
- `app/src/routes/meeting/[id]/+page.server.ts` now loads setup context (`initialUserName`, `initialCleanTime`, `initialMood`, `listeningOnly`).
- `app/src/routes/meeting/[id]/+page.svelte` now uses componentized meeting UI, EventSource SSE consumption, phase-aware input behavior, pass action, and transcript auto-scroll.
- `app/src/routes/meeting/[id]/share/+server.ts` now supports both POST and GET request modes for SSE generation (GET used by EventSource client path).
- `app/src/routes/meeting/[id]/close/+server.ts` now generates character memory summaries and persists meeting completion metadata.
- `app/src/lib/seams/database/contract.ts` / `mock.ts` / adapter now include `completeMeeting` operation for meeting close persistence.
- `app/src/lib/core/meeting.ts` now exports reusable crisis/heavy/breakthrough detectors.
- `app/src/lib/core/prompt-templates.ts` now includes `buildExpandSharePrompt`.

### Verified
- `npm run test:unit -- --run` passes with seam contract tests included.
- `npm run check` passes with zero diagnostics.
- Total unit suite now passes with 51 tests including expanded domain-core coverage.
- Live quality-cycle run met target for all six core characters (5/5 pass each in captured run).
- Full integrated adapter + domain suite passes with 64 unit tests and clean `svelte-check`.
- Post-integration validation passes with clean `svelte-check` and `75` passing unit tests (`npm run test:unit -- --run`).
- After Milestone 5 closeout refactor, `npm run check` passes clean and unit suite passes with `77` tests.

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
