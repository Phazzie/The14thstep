# Decision Log

## 2026-03-19

- The virtual-meeting restore will use a meeting-scoped persisted participant roster as the source of truth, not client-only fake `random1` / `random2` speakers.
- The roster restore needs a real persistence story: database-created visitor character ids plus `seat_order` on `meeting_participants`, not synthetic selector ids pretending to be database ids.
- Opening, reading, and introduction beats remain phase-driven in the share route; `crosstalk`, `hard_question`, and `farewell` are the interaction-type additions that must be wired and persisted truthfully.
- Listening-only remains a supported mode in the restore: the user still joins, introduces themself, and chooses a topic, but later share gates and the hard question are skipped.

## 2026-02-15

- Repository execution will follow `plans/the-14th-step-execplan.md` as the canonical working plan.
- Milestone 0 is being implemented inside `app/` (SvelteKit workspace) while root-level governance files (`seam-registry.json`, this log) remain at repo root.
- External probes are scaffolded now and treated as credential-gated until `XAI_API_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` are available.

## 2026-02-16

- Created nested agent guidance (`app/AGENTS.md`, `plans/AGENTS.md`) and kept root `AGENTS.md` minimal with pointers.
- Added dedicated governance artifacts `CHANGELOG.md` and `LESSONS_LEARNED.md` and made them mandatory in agent instructions.
- Standardized seam contracts to export runtime validators and reused them in fixture-backed mocks and contract tests for Milestone 1.
- Implemented Milestone 2 incrementally by shipping `app/src/lib/core/meeting.ts` (create/add/close workflow + pure significance scoring) before broader core modules.
- Completed remaining Milestone 2 core modules with tests: `character-selector`, `prompt-templates`, `memory-builder`, and `callback-scanner`.
- Added live Grok probe tooling at `app/src/lib/seams/grok-ai/probe.ts` and `quality-cycle.ts`, and captured live pass-rate evidence in seam fixtures.
- Separated deterministic contract fixtures from live probe captures (`probe.sample.json`, `probe.fault.json`) to avoid test-fixture drift.
- Updated probe commands to load `.env.local` automatically via `node --env-file-if-exists=.env.local`.
- Completed Milestone 4 using a parallel subagent pattern, then integrated centrally with full check/unit verification.
- Expanded the `database` seam contract/adapter to include callback and share-lookup methods (`getShareById`, `getMeetingShares`, `createCallback`, `getActiveCallbacks`, `markCallbackReferenced`) to unblock Milestone 6 integration.
- Integrated callback-aware memory prompts in `meeting/[id]/share/+server.ts` via `buildPromptContext` and a new pure `callback-engine.ts` probability matrix.
- Added close-route callback scanning/persistence and a new expand-share endpoint (`meeting/[id]/expand/+server.ts`) to complete Milestone 5/6 functional flow and advance Milestone 7.
- Added a dedicated crisis endpoint (`meeting/[id]/crisis/+server.ts`) and client-side crisis-mode gating so normal character shares pause once crisis is detected.
- Added a milestone status snapshot file (`plans/milestone-status.md`) to make incomplete-milestone execution resumable with explicit next-task queues.
- Introduced a practical Milestone 9 `verify` scaffold in `app/package.json` and `app/scripts/*` to standardize local pre-handoff checks while full CI pipeline work is pending.
- Added a minimal GitHub Actions `verify` workflow to run `check`, `verify:contracts`, and `verify:core` on push/PR so regressions surface before deeper Milestone 9 automation lands.
- Completed Milestone 5 closeout by explicitly favoring componentized route composition and EventSource GET streaming consumption, while keeping POST share endpoint compatibility for non-EventSource callers/tests.
- Added a dedicated `database.completeMeeting` seam operation to persist close-state metadata through the adapter boundary instead of writing close updates directly inside route handlers.
- Enforced Milestone 6 retrieval logic in the pure memory-builder core (rather than adapter-only filtering) so memory rules remain deterministic and testable with fixture/mocked seam inputs.
- Retained `getHeavyMemory` seam name but shifted semantics to return ordered user meeting-share history; rule selection now occurs in `memory-builder` to support last-3-meetings continuity and prompt composition.
- Treated the meeting restore as a backend-truth problem first: interaction types, roster persistence, and phase ownership were wired through the seam before trusting the page rewrite.
- Split `topic_selection` into two durable beats without inventing a new phase: `standard` now keeps Marcus in the topic-setting beat, while `respond_to` acknowledges the chosen topic and advances the room.
- Accepted a bounded stop rule on refresh recovery: pending user gates and fresh post-user transitions resume truthfully, while fully replay-free mid-beat auto-resume is deferred until the ritual state model can encode more substep detail.
- Kept the remaining Svelte 5 rune warnings explicit instead of pretending they were harmless noise; they are logged as deferred cleanup, not hidden under a green test run.

## 2026-02-19

- Completed Milestone 7 by adding callback lifecycle core/workflow modules and wiring lifecycle persistence in both share-time and close-time meeting flows.
- Completed Milestone 8 per ExecPlan safety policy by adding crisis-engine core logic, setup/load crisis detection, deterministic Marcus-then-Heather crisis sequencing, and server-side crisis enforcement in normal share generation paths.
- Deferred product-tone refinements for crisis-mode humor/callback behavior; current baseline remains strict no-callback/no-crosstalk while in crisis mode until a dedicated policy revision milestone.
- Completed Milestone 9 by replacing verify scaffolds with enforceable freshness/composition/e2e lanes and wiring CI to run full `npm run verify`.
- Kept `verify` lint gate on `eslint` (`lint:verify`) while leaving full Prettier checks in `npm run lint` to avoid forcing unrelated repository-wide formatting churn during milestone verification.
- Deferred Milestone 10 live deploy execution in this environment due missing `VERCEL_TOKEN`/`VERCEL_ORG_ID`/`VERCEL_PROJECT_ID`, plus runtime drift to unsupported Node 25 for Vercel CLI.
- Reverted local adapter experiment back to `@sveltejs/adapter-auto` after `@sveltejs/adapter-vercel` builds failed on mounted-filesystem symlink permissions (`EPERM`), preserving a green local build path while deploy is moved to CI/native environment.
- Resumed Milestone 10 deploy using a non-git temp deploy directory (`/tmp/the14thstep-deploy`) to avoid team git-author gating while preserving linked Vercel project settings.
- Treated production setup failures as data bootstrap defects first: `auth.users` probe identity existed, but `public.users` lacked the matching profile row required by `meetings.user_id` foreign key.
- Repaired production env drift by fingerprint-comparing `XAI_API_KEY` between local and Vercel production, then rotating the Vercel key and redeploying before re-running smoke checks.

## 2026-02-20

- Closed Milestone 10 only after evidence-gated production verification across auth/session, auth-bound join persistence, crisis-path behavior, callback lifecycle persistence, and schema readiness checks.
- Standardized compact-handoff storage in-repo (`plans/context-compact-handoff.md`, `HANDOFF_TO_OTHER_CODEX.md`) so context compaction does not lose production troubleshooting history.
- Treated character slug-to-UUID mapping readiness as an operational requirement: production checks must confirm six core `public.characters` rows exist before declaring deploy health.
- Hardened trust boundaries by using persisted meeting shares (not client-provided transcript snippets) for share-context and close-summary generation paths.
- Scoped callback retrieval to the current meeting via `callbacks.origin_share_id -> shares.meeting_id` to prevent cross-meeting callback leakage.

## 2026-02-22

- Adopted a server/DB-first ritual phase source-of-truth strategy for M18 route integration; routes persist and reload `MeetingPhaseState`, while the client consumes phase snapshots for visibility/sync without becoming authoritative.
- Added command/test hang guardrails to active execution workflow: stop silent runs early, log the stall, and switch to narrower fallback verification instead of waiting indefinitely.
- Chose a practical close-route phase behavior: force `CLOSING` on explicit close requests, then persist `POST_MEETING` on successful completion (with tests), rather than blocking close based on current ritual phase.
- Kept intro-order enforcement as warning-first during integration completion; strict blocking remains a follow-up decision pending broader ritual progression validation.
- Added runtime narrative-field validation for character profiles with fail-fast enforcement for core characters and warning-level logging for sparse runtime-selected characters.

## 2026-02-23

- Kept the M18 intro progression route semantics on the simplified speaker-count threshold for this ship and documented the mismatch with core `areIntroductionsComplete(...)` as follow-up hardening, rather than changing behavior late in release closeout.
- Restored upstream error semantics in share generation: when no candidate can be generated at all (for example, repeated rate limits), the route now emits the upstream seam error instead of falling back to a quiet placeholder share.
- Retained fallback share behavior only for repeated low-quality/validator-rejected candidates, with explicit client-facing `fallbackUsed` signaling and regression coverage.
- Renamed route-test helper export in `app/src/routes/meeting/[id]/share/+server.ts` to `_generateValidatedShare` to comply with SvelteKit endpoint export validation rules while preserving direct route-module test coverage.
- Increased Playwright `webServer.timeout` from `180000` to `300000` after measuring local `npm run build` wall time (~2m12s) and confirming the previous timeout created false e2e startup failures in this workspace.
- Accepted a local closeout exception for `npm run check` root-cause diagnosis (silent `svelte-check` stall) while still requiring fallback verification lanes (`tsc`, contracts/core/composition tests, build, and Playwright e2e) to pass and be documented.
- Moved the room-restoration work into the seam/persistence layers before touching the meeting page: persisted roster bootstrap in `+page.server.ts`, preserved `interactionType` end-to-end, and corrected the share route so introductions complete on the full roster and sharing rounds advance on the user turn instead of the second character share.

## 2026-03-04

- Completed immediate post-ship hardening for seam-driven auth and phase semantics (guest/magic-link auth through `AuthPort`, explicit meeting-not-found handling, crisis transition recovery state, and explicit Marcus responder lookup) and merged through PR #51.
- Reworked prompt style system into layered guidance (`BASE_STYLE_GUARDRAILS` + `EDITORIAL_REALITY_CHECKS`) and wired those checks explicitly into share and validator prompts; merged through PR #52.
- Hardened quality-gate editorial enforcement by adding explicit anti-pattern flags (`moralizingEnding`, `overexplainsImage`, `genericAcrossCharacters`, `emotionLabelingWithoutScene`) and using shared threshold logic for expansion flow parity; merged through PR #53.
- Updated narrative-context generation and fallback wording to use the same room-specific style/taste constraints as runtime share prompts; merged through PR #54.
- Adopted an explicit crisis-triage parse policy: normalize common boolean/confidence token drift, but treat malformed/ambiguous parse results as fail-conservative (`crisis=true`) and cover confidence-token edge cases with tests.

## 2026-03-16

- Adopted decision-gated slice promotion as the preferred way to move valuable local work onto `main`, rather than reconciling large dirty branches wholesale.
- Added nested agent guidance for `app/src/` and `.github/` so source-level implementation rules and automation/workflow rules can evolve without bloating the root guide.
- Recorded line-ending churn and clean-main-worktree separation as explicit process lessons so future sync work does not mistake formatting noise for product progress.

## 2026-09-12

- Superseded the 2026-02-15 single-plan rule. `STATUS.md` now maps each active
  epic to one live ExecPlan: #77 uses the meeting-experience restore plan, while
  #71, #78, #79, and #80 use the production-recovery and backlog plan.
  `plans/the-14th-step-execplan.md` remains the cross-track architecture and
  milestone record rather than the automatic execution plan for every task.
  This removes contradictory plan authority while preserving the earlier
  milestone history as evidence.
- Landed the room-led meeting flow through PR #76 rather than merging PR #72 as it stood: #72 would have reverted the Clerk cookie hardening from #69, shipped a build-breaking route export, and left the persisted phase unable to advance past `introductions`.
- Made the user's introduction a persisted share instead of a local-only transcript line. This is what closes the introductions round server-side; the previous local-only line left the phase machine stuck and every later prompt built from the wrong phase. Resolves the route/core mismatch tracked in #7.
- Gave both intro-completion call sites one helper, `visitorSeatCount`, which reports the canonical visitor count for a core-only fallback roster rather than zero. The share route counting seats while the user-share route used the default was the actual drift.
- Chose to degrade rather than fail when `saveMeetingParticipants` errors: the roster is derived deterministically from the meeting id, so the page keeps the room open on the generated seats. Turning someone away from a meeting over a transient write is the worse outcome.
- Replaced the repo's twenty-document planning sprawl with `STATUS.md` plus GitHub epics and sub-issues. Projects boards were rejected because agents working through the GitHub MCP connection cannot read them; issues and repo files are the only planning surfaces an agent can actually see.
- Moved finished history to `archive/` and kept one live execplan per track in `plans/`.
- Superseded the provisional epic mapping created during repository organization: #78 now has `plans/private-meeting-access-execplan.md`, #77 now has `plans/server-owned-meeting-beats-execplan.md`, and #71/#79/#80 remain in the production-recovery and backlog track. Privacy and meeting orchestration have different blockers, acceptance stories, and implementation boundaries, so keeping both inside older broad plans made neither safely executable.
- Archived the March meeting-restoration plan instead of patching it in place. It records shipped room behavior, but its explicit frontend-owned speaking order, fixed old branch instructions, and ban on a new orchestration endpoint directly conflict with #77. The replacement plan treats that document as historical evidence and makes persisted server beats the execution authority.
- Ordered #84 and #85 before #81. The server-owned beat endpoint belongs under `/meeting/[id]` and should inherit a single owner check when it is created rather than becoming another unprotected route that needs later repair.

## 2026-09-13

- Preserved the full auth seam result until the meeting access decision:
  `UNAUTHORIZED` maps to the generic ownership 404, while provider,
  infrastructure, contract, and unexpected auth failures keep their existing
  service-error status. Malformed meeting ids become the same generic 404
  before a UUID database query. Retired `PROBE_USER_ID` as an interactive route
  identity because a redirect cannot recover that process-local fallback.
- Staged the private-intake migration through a persisted-first compatibility
  loader, then one clean-URL cutover that removes URL writes and reads together.
  Playwright uses an explicit local preview-server seam composition because
  browser interception cannot mock hook-level database and auth work.
- Made the canonical beat-owned user share and its stored analysis authoritative
  under competing payloads. Expansion now derives topic and transcript context
  from persisted server state rather than browser input.
- Added a unique, leased close-run claim with checkpoints, idempotent callback
  keys, and a stored close response so concurrent and repeated closes converge
  without repeating completion side effects.
- Required the generated empty-chair moment to pass the existing minimum
  authenticity and voice-consistency thresholds before persistence, and placed
  that server path before the generic renderer cutover that depends on it.
- Restored contract-probe-fixture-mock-test-adapter order for both new database
  tracks. The plans pin a local Supabase CLI and require real local Postgres and
  PostgREST captures; if that probe cannot run, dependent seam and route work is
  blocked rather than supported by invented fixtures.
- Injected phase-transition time from the server clock seam, removed the unused
  reflection gate, assigned `/room-moment` to generated beat completion, and
  persisted the user-share id that crisis support must load on every retry.
