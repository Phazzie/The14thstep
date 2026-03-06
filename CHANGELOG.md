# Changelog

All notable changes to this repository are documented in this file.

## [2026-03-05]

### Changed

- Replaced the member auth runtime path with Clerk-backed session handling in `app/src/lib/server/seams/auth/adapter.ts` and shifted landing auth UI to hosted Clerk entry in `app/src/routes/+page.svelte` and `app/src/routes/+page.server.ts`.
- Simplified callback completion behavior for hosted auth in `app/src/routes/auth/callback/+server.ts`.
- Refactored seam bootstrapping in `app/src/hooks.server.ts` to reuse module-level adapter singletons.
- Redesigned landing and meeting interfaces (`app/src/routes/+page.svelte`, `app/src/routes/meeting/[id]/+page.svelte`, `app/src/lib/components/*.svelte`, `app/src/app.css`) to ship the new visual direction.

### Added

- Clerk dependency surface in `app/package.json` (`@clerk/backend`, `@clerk/clerk-js`).
- Database migration `app/supabase/migrations/20260305_000002_decouple_users_from_supabase_auth.sql` to remove direct FK coupling from `public.users` to Supabase `auth.users`.
- Clerk environment variable documentation in `app/.env.example` and runbook updates in `app/README.md`.

### Fixed

- Hardened guest auth against cookie forgery by signing guest access tokens server-side and validating signatures before resolving `locals.userId` in `app/src/lib/server/seams/auth/adapter.ts`.
- Tightened sign-out token handling to reject bare UUIDs and accept only validated signed guest tokens or verified Clerk member tokens in `app/src/lib/server/seams/auth/adapter.ts`.
- Callback success path now normalizes auth state by clearing stale guest Supabase cookies and forcing `app-session-kind=member` in `app/src/routes/auth/callback/+server.ts`.
- Improved accessibility with live region semantics and expansion state metadata in `app/src/lib/components/SystemMessage.svelte` and `app/src/lib/components/ShareMessage.svelte`.
- Corrected landing heading hierarchy by promoting the primary title to an `<h1>` in `app/src/routes/+page.svelte`.

### Verified

- `npm run check`
- `npm run test:unit -- --run`
- `npm run verify`

## [2026-03-06]

### Fixed

- Removed a redundant boolean cast in `app/src/lib/server/seams/auth/adapter.ts` (`if (Boolean(guestUserId))` -> `if (guestUserId)`) to satisfy the `no-extra-boolean-cast` lint rule and unblock full verification.
- Rebuilt `app/package-lock.json` with npm 10 compatibility so GitHub Actions `npm ci` no longer fails on missing optional websocket dependencies (`bufferutil`, `utf-8-validate`).
- Replaced runtime `Math.random()` defaults with hardened shared random utilities in `app/src/lib/core/random-utils.ts`, `app/src/lib/core/callback-engine.ts`, `app/src/lib/core/character-selector.ts`, and `app/src/lib/content/startup-sayings.ts`.
- Added UUID guardrails in `resolveDbCharacterId` to reject non-UUID mapped character IDs before DB writes in `app/src/lib/server/seams/database/adapter.ts`.
- Added regression coverage for startup saying selection and non-UUID character mapping in `app/src/lib/content/startup-sayings.spec.ts` and `app/src/lib/server/seams/database/adapter.spec.ts`.
- Expanded composition seam failure coverage for SSE append-share failures and phase update retries in `app/tests/composition/seam-failure.spec.ts`.
- Upgraded `@sveltejs/kit` to `2.53.4` in `app/package.json` and pinned `cookie` to `^0.7.0` via npm overrides to resolve the open Dependabot advisory on `cookie@<0.7.0`.
- Refreshed `app/package-lock.json` to install `cookie@0.7.2` under SvelteKit and clear low-severity dependency alert debt.
- Hardened callback success criteria in `app/src/routes/auth/callback/+server.ts` so `/?auth=signed-in` is only emitted when `seams.auth.getSession(cookieHeader)` resolves a valid session; invalid/missing callback sessions now redirect to `/?auth=auth-failed`.
- Added callback regression coverage in `app/src/lib/server/routes/auth-callback.spec.ts` for invalid-session callback redirects.
- Removed top-level `optionalDependencies` (`bufferutil`, `utf-8-validate`) from `app/package.json` and regenerated `app/package-lock.json` to fix GitHub Actions `npm ci` sync failures under npm 11.
- Pinned GitHub Actions verify jobs to `npm@11.6.2` in `.github/workflows/verify.yml` and added toolchain echo steps to stabilize and diagnose CI install behavior on Node 24 runners.
- Clarified landing-page auth readiness in `app/src/routes/+page.svelte` so Clerk bootstrap shows an explicit loading state instead of inert-looking member auth buttons during first paint.
- Added browser coverage in `app/src/routes/page.svelte.spec.ts` for the member sign-in loading state.

### Verified

- `npm run verify` (full lint/check/fixtures/contracts/core/composition/e2e chain passing)
- `npx vitest --run src/lib/content/startup-sayings.spec.ts src/lib/server/seams/database/adapter.spec.ts tests/composition/seam-failure.spec.ts`
- `npm run verify:core`
- `npm run verify:contracts`
- `npm run verify:composition`
- `npm run lint:verify`
- `npm run check`
- `npm ls cookie` (`@sveltejs/kit@2.53.4 -> cookie@0.7.2`)
- `npx vitest --run src/lib/server/routes/auth-callback.spec.ts`
- `npm ci` (local clean install check)

## [2026-02-23]

### Changed

- `app/src/routes/meeting/[id]/share/+server.ts` now preserves upstream seam errors (for example `RATE_LIMITED`) when no candidate can be generated at all, instead of collapsing that path into a quiet fallback share.
- `app/src/routes/meeting/[id]/share/+server.ts` test helper export renamed to `_generateValidatedShare` so the endpoint remains valid under SvelteKit route-export rules.
- `app/playwright.config.ts` `webServer.timeout` increased from `180000` to `300000` after measuring local `npm run build` runtime (~2m12s) and seeing false e2e startup timeouts.
- `app/src/routes/meeting/[id]/+page.svelte` ritual phase snapshot initialization now uses an effect-based sync to avoid Svelte's `state_referenced_locally` warning.

### Added

- End-to-end route-handler ritual phase integration proof in `app/src/lib/server/routes/meeting-ritual-phase.integration.spec.ts` (share/user-share/close progression + reload restore).
- M19 release evidence dossier: `M19_RELEASE_EVIDENCE.md`
- M11-19 final review dossier: `M11-19_FINAL_REVIEW.md`

### Fixed

- Composition seam-failure test stubs now include M18 phase seam methods (`getMeetingPhase`, `updateMeetingPhase`) so `npm run verify:composition` covers current route behavior correctly.
- Playwright browser flow startup no longer fails on SvelteKit endpoint export validation caused by non-route export in `share/+server.ts`.

### Verified

- `npx tsc --noEmit -p tsconfig.json`
- `npm run verify:contracts`
- `npm run verify:core`
- `npm run verify:composition`
- `npx vitest run --project server src/lib/server/routes/meeting-ritual-phase.integration.spec.ts`
- `time npm run build` (`~2m12s` local workspace)
- `npm run test:e2e` (2 Playwright browser flows passing)
- `npm run check` remains a documented local silent-stall issue and was bounded-stopped per hang guardrails

## [2026-02-21]

### Discovered

- **M11-17 Implementation Already Complete**: Comprehensive codebase audit revealed that Milestones 11-17 from the Writing Engine & Narrative Context System specification were already implemented:
  - M11: All 6 character narrative fields (`lie`, `voiceExamples`, `discomfortRegister`, `programRelationship`, `lostThing`, `cleanTimeStart`) implemented and populated
  - M12: `style-constitution.ts` exists and injected into generation + validation prompts
  - M14: Narrative context generation with caching, in-flight deduplication, and fallback complete
  - M15: Quality validator with 4-axis scoring, thresholds (>=6), and 3-attempt retry loop complete
  - M16: Crisis detection engine, AI triage, precedence checking, crisis endpoint all wired
  - M17: Post-meeting memory extraction, character summaries, heavy memory retrieval, prompt reinjection complete

### Incomplete (Remaining Work)

- **M13: Voice Pipeline** - Currently uses 3-attempt retry loop; spec requires 7-candidate generation with 4-axis scoring, threshold filtering, and separate persistence pipeline
- **M18: Meeting Ritual Structure** - All prompts exist but not orchestrated into ordered meeting-start phase sequence
- **M19: Release Readiness** - Production deployed but missing M11-18 integration verification, transcript quality review, and final deep review gate

### Status

- ExecPlan Progress checkboxes for M11-19 not updated despite M11-17 completion
- Integration analysis identified 65% merge conflict risk if M13/M18 executed in parallel
- Phased serial execution plan adopted to reduce conflict risk to ~15%

## [2026-02-22]

### Changed

- M18 phase persistence wiring extended beyond the original handoff state:
  - `app/src/routes/meeting/[id]/user-share/+server.ts` now loads/tracks/persists ritual phase state and advances topic/round transitions.
  - `app/src/routes/meeting/[id]/crisis/+server.ts` now persists `CRISIS_MODE` on crisis entry and returns phase snapshots.
  - `app/src/routes/meeting/[id]/close/+server.ts` now persists ritual phase transitions through `CLOSING` to `POST_MEETING` and logs extraction/fallback timing.
  - `app/src/routes/meeting/[id]/+page.svelte` now consumes and displays ritual phase snapshots from server responses (DB-first sync model).
- `app/src/routes/meeting/[id]/share/+server.ts` now emits persisted ritual phase snapshots in SSE `persisted` / `done` events.
- `app/src/lib/core/characters.ts` now exports runtime narrative-field validation, enforces core character narrative completeness at module load, and is used by the share route for warning-level validation on sparse profiles.
- Handoff docs now include dated warnings when their M18 route-completion status is stale:
  - `HANDOFF_CODEX_FINAL_M11-19.md`
  - `HANDOFF_M13-M18_INTEGRATION.md`

### Added

- Route/server regression coverage for new M18 phase wiring:
  - `app/src/lib/server/routes/meeting-close.spec.ts`
  - expanded assertions in `meeting-user-share.spec.ts`, `meeting-crisis.spec.ts`, and `meeting-page-load.spec.ts`
- Adapter seam coverage for M18 phase persistence methods in `app/src/lib/server/seams/database/adapter.spec.ts`
- Character validation tests in `app/src/lib/core/characters.spec.ts`

### Verified

- `npx tsc --noEmit -p tsconfig.json`
- Route server specs for page-load/share/user-share/crisis/close
- `app/src/lib/server/seams/database/adapter.spec.ts`
- `app/src/lib/core/characters.spec.ts`
- `npm run check` remains unreliable in this environment (silent/stalling `svelte-check`); bounded-stop fallback verification path used

## [2026-02-20]

### Added
- Milestone 10 production evidence dossier:
  - `plans/m10-production-evidence-2026-02-20.md`
- Updated compact handoff artifacts for context-safe resume:
  - `plans/context-compact-handoff.md`
  - `HANDOFF_TO_OTHER_CODEX.md`

### Changed
- `plans/milestone-status.md` updated to a 2026-02-20 snapshot with Milestone 10 marked complete.
- `plans/m7-m9-m10-m8-execution-checklist.md` synchronized to final Milestone 10 completion state.
- `plans/the-14th-step-execplan.md` updated so Progress/Outcomes and revision notes reflect full Milestone 10 completion evidence.
- `app/README.md` now includes a production rollback and break-glass runbook section.
- `app/src/routes/meeting/[id]/share/+server.ts` now derives crisis state and recent-share prompt context from persisted meeting shares only (single DB read per request), and no longer trusts client-provided `recentShares`.
- `app/src/routes/meeting/[id]/close/+server.ts` now derives summary/memory transcript inputs from persisted meeting shares instead of client-submitted `lastShares`.
- `app/src/lib/server/seams/database/adapter.ts` now scopes `getActiveCallbacks` to the current meeting via `origin_share_id -> shares.meeting_id` and refreshes character-id maps before failing unknown core ids.
- `app/src/routes/meeting/[id]/+page.svelte` now treats crisis 409 share-stream errors as a state transition into crisis mode instead of repeated transient errors.
- `app/playwright.config.ts` now sets `webServer.timeout` to `180000` to reduce false e2e startup timeouts in slower workspaces.
- Governance logs synchronized with production closeout learnings:
  - `decision-log.md`
  - `LESSONS_LEARNED.md`
- Added targeted post-milestone audit record:
  - `plans/post-m10-quality-audit-2026-02-20.md`

### Verified
- Production deployment remains healthy at `https://the14thstep.vercel.app`.
- Auth/session smoke verified with sign-in and sign-out action redirects and rendered signed-in/signed-out UI markers.
- Auth-bound join persistence verified by matching `meetings.user_id` to a distinct signed-in smoke user id.
- Crisis mode verified in production:
  - trigger detected and persisted (`significanceScore: 10`),
  - Marcus then Heather response order confirmed,
  - normal share generation blocked during crisis (`409`).
- Callback lifecycle persistence verified in production (`times_referenced` increment + `last_referenced_at` update).
- Schema readiness checks verified for `characters`, `users`, `meetings`, `shares`, and `callbacks`.

## [2026-02-19]

### Added
- Milestone 7 callback lifecycle core and verification:
  - `app/src/lib/core/callback-lifecycle.ts`
  - `app/src/lib/core/callback-lifecycle.spec.ts`
  - `app/src/lib/core/callback-lifecycle-workflow.ts`
  - `app/src/lib/core/callback-lifecycle-workflow.spec.ts`
  - `app/src/lib/core/callback-lifecycle.integration.spec.ts`
- Milestone 8 crisis core and route tests:
  - `app/src/lib/core/crisis-engine.ts`
  - `app/src/lib/core/crisis-engine.spec.ts`
  - `app/src/lib/server/routes/meeting-crisis.spec.ts`
  - `app/src/lib/server/routes/meeting-page-load.spec.ts`
- Milestone 9 composition and e2e coverage:
  - `app/tests/composition/meeting-flow.spec.ts`
  - `app/tests/composition/seam-failure.spec.ts`
  - `app/tests/e2e/meeting-flow.spec.ts`
- Fixture freshness marker files:
  - `app/src/lib/seams/database/fixtures/probe.sample.json`
  - `app/src/lib/seams/auth/fixtures/probe.sample.json`
  - `app/probes/fixtures/sse-probe.sample.json`

### Changed
- `app/src/lib/seams/database/contract.ts`, `mock.ts`, and `contract.test.ts` now include `updateCallback` and `getMeetingCountAfterDate` seam methods/validation.
- `app/src/lib/server/seams/database/adapter.ts` and `adapter.spec.ts` now implement and verify callback updates + post-date meeting counts.
- `app/src/routes/meeting/[id]/share/+server.ts` now:
  - applies callback lifecycle updates when callbacks are referenced,
  - creates evolved child callbacks when lifecycle marks evolution,
  - enforces persisted crisis-mode blocking server-side.
- `app/src/routes/meeting/[id]/close/+server.ts` now runs lifecycle aging transitions after callback scanning.
- `app/src/routes/meeting/[id]/+page.server.ts` now returns setup-trigger and persisted crisis flags to support crisis recovery on reload.
- `app/src/routes/meeting/[id]/+page.svelte` now initializes crisis mode from server state and keeps crisis resources sticky in-session.
- `app/src/routes/meeting/[id]/crisis/+server.ts` now includes deterministic pause sequencing and structured crisis-resource payloads.
- `app/src/lib/core/meeting.ts` now delegates crisis detection to `crisis-engine`.
- `app/src/lib/core/callback-engine.ts` and `callback-engine.spec.ts` now include retired-callback behavior in the probability matrix.
- `app/src/hooks.server.ts` and `app/src/lib/core/meeting.spec.ts` now satisfy the expanded database seam contract.
- `seam-registry.json` now defines I/O seam freshness metadata (`io`, `freshnessDays`, `freshnessFixtures`) used by verification scripts.
- `app/scripts/verify-fixtures.mjs` now enforces real freshness checks and fails stale or missing fixture metadata.
- `app/scripts/verify-composition.mjs` now requires composition spec presence and runs the composition Vitest lane.
- `app/package.json` now runs a full verify chain including fixtures/contracts/core/composition/e2e and adds `lint:verify` for deterministic eslint gating.
- `app/vite.config.ts` server project now includes `tests/composition/**/*` specs.
- `app/playwright.config.ts` now runs e2e tests from `tests/e2e` with preview server orchestration.
- `.github/workflows/verify.yml` now installs Playwright Chromium, runs full `npm run verify`, and uploads Playwright artifacts on failures.
- `app/probes/sseProbe.mjs` and `app/probes/supabaseMemoryProbe.mjs` now emit freshness marker fixture outputs on successful probe runs.
- Vercel production environment now uses a valid `XAI_API_KEY` matching the working local key, followed by a fresh production deployment and alias promotion to `https://the14thstep.vercel.app`.
- Supabase production bootstrap data now includes a `public.users` profile row for `PROBE_USER_ID` so setup/meeting creation can satisfy `meetings.user_id` foreign-key requirements.

### Verified
- `npm run check` passes with zero diagnostics.
- Focused M7/M8 suite passes:
  - `npx vitest run src/lib/core/callback-lifecycle.spec.ts src/lib/core/callback-lifecycle-workflow.spec.ts src/lib/core/callback-lifecycle.integration.spec.ts src/lib/core/crisis-engine.spec.ts src/lib/server/routes/meeting-share.spec.ts src/lib/server/routes/meeting-crisis.spec.ts src/lib/server/routes/meeting-page-load.spec.ts`
- Full unit suite passes:
  - `npm run test:unit -- --run` with 25 test files and 104 passing tests.
- Full Milestone 9 verify lane passes end-to-end:
  - `npm run verify` (eslint, svelte-check, fixture freshness, seam contracts, core tests, composition tests, Playwright e2e).
- Updated unit count after composition lane additions:
  - `npm run test:unit -- --run` with 27 test files and 108 passing tests.
- Deployment attempt evidence captured (Milestone 10 blocked):
  - `npx vercel pull --yes --environment=production` cannot proceed without `VERCEL_TOKEN`.
  - Local shell runtime drift to Node `v25.5.0` requires forced engine override for Vercel CLI and is not accepted as production-ready deploy evidence.
- Production deployment + smoke evidence (Milestone 10 execution unblocked):
  - `GET https://the14thstep.vercel.app/` returns `200`.
  - `GET https://the14thstep.vercel.app/probes/sse` returns `200`.
  - `POST https://the14thstep.vercel.app/?/join` returns redirect payload with `status: 303` to `/meeting/{id}`.
  - `GET /meeting/{id}/share?...` streams SSE `meta` + `chunk` events with `content-type: text/event-stream`.
  - `POST /meeting/{id}/close` returns `200` with summary/completion payload.

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
- Milestone 6 continuity verification test:
  - `app/src/lib/core/milestone6-continuity.spec.ts`
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
- `app/src/lib/core/memory-builder.ts` now enforces exact retrieval rules (`>=7`, `>=6` user shares, plus last 3 meetings) and emits continuity lines from user profile + recent user continuity context.
- `app/src/lib/core/prompt-templates.ts` now emits explicit Milestone 6 prompt sections: `YOUR HISTORY`, `CONTINUITY NOTES`, and `CALLBACK OPPORTUNITIES THIS MEETING`.
- `app/src/lib/server/seams/database/adapter.ts` `getHeavyMemory` now returns ordered user meeting-share history for rule evaluation in core memory builder.
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
- After Milestone 6 closeout updates, `npm run check` passes clean and unit suite passes with `78` tests including continuity verification.

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
