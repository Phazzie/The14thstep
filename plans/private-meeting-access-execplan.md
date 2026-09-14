# Keep Meeting Intake Private And Enforce Ownership

This ExecPlan is a living document. Keep `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` current as work proceeds. Maintain this document in accordance with [`PLANS.md`](../PLANS.md).

This plan governs GitHub epic [#78](https://github.com/Phazzie/The14thstep/issues/78), specifically [#84](https://github.com/Phazzie/The14thstep/issues/84) and [#85](https://github.com/Phazzie/The14thstep/issues/85). It authorizes only the application work described here. Creating or changing live Supabase, Vercel, or other hosted resources still requires the appropriate account access and a separately authorized production step.

## Purpose / Big Picture

After this work, a person can tell the room their name, clean time, mood, and what is on their mind without those answers appearing in the browser address or history. Refreshing `/meeting/<id>` restores the same intake context from the meeting record. A signed-in or guest session can read and change only its own meeting; requests for another meeting receive the same generic not-found response as requests for an id that does not exist.

The behavior is visible in two ways. The join redirect contains only `/meeting/<id>`, and refreshing that clean URL preserves the person's name, clean time, mood, listening choice, crisis detection, and meeting content. A second session cannot load the page or any child endpoint for the first session's meeting.

## Progress

- [x] (2026-09-12 13:45Z) Read the current landing action, meeting loader and child routes, authentication hook, database contract, mock, Supabase adapter, schema, and relevant tests.
- [x] (2026-09-12 13:45Z) Chose one meeting-scoped persistence contract and one centralized route-ownership gate so later meeting endpoints inherit the same protection.
- [x] (2026-09-14 03:14Z) Integrated PR review findings for auth-error preservation, malformed ids, probe identity, cutover order, server-side auth, database, and Grok browser fixtures, fresh-server ownership, configured test paths, and the required real-system probe stage.
- [x] (2026-09-14 09:02Z) Closed the direct-PostgREST bypass by adding a default-deny database privilege boundary and an anonymous-key probe to the migration, seam-order, and acceptance requirements.
- [x] (2026-09-14 09:54Z) Gave the planned migration a distinct fourteen-digit Supabase version prefix so the private, core-identity, and meeting-beat schemas apply in their required order.
- [x] (2026-09-14 19:04Z) Established the local P00 baseline after adding only the two optional package records missing from the lockfile: the existing database contract suite passes 5/5 and `svelte-check` reports 0 errors with 8 pre-existing warnings.
- [x] (2026-09-14 19:06Z) P01a complete as an isolated contract checkpoint: 4/4 direct validator tests pass; the old captured meeting fixture/mock now fail 2 existing assertions and `svelte-check` reports 4 expected missing-field producers plus the unchanged 8 warnings.
- [x] (2026-09-14 19:08Z) P02 complete as an isolated contract checkpoint: 3/3 owner-lookup contract tests pass, including typed port shape, two required nonempty ids, shared `NOT_FOUND`, and the declared error taxonomy.
- [x] (2026-09-14 19:09Z) P03 complete: the existing core meeting suite passes 14/14 and a focused spy proves optional `userMind`, `userDisplayName`, and `userCleanTime` cross the pure core/database boundary unchanged while old callers remain valid.
- [x] (2026-09-14 19:10Z) P04 complete as migration text: one uniquely versioned file adds retry-safe nullable `user_display_name` and `user_clean_time`, preserves the historical nullable `user_mind`, and invents no backfill; no database execution is claimed.
- [x] (2026-09-14 19:11Z) P05 complete as migration text: static checks find all six RLS enables and all current/default table, sequence, and function revokes, with no client policy and no `service_role` revoke; SQL execution and access outcomes remain unproved.
- [x] (2026-09-14 19:14Z) P06 tooling complete with a startup blocker: exact local CLI `2.117.0` and credential-free config are present, but both Supabase status and Docker server inspection fail because the Docker Desktop Linux engine pipe does not exist.
- [x] (2026-09-14 19:14Z) Milestone 1: completed the nullable output/compatible input contract, owner-lookup contract, optional pure-core passthrough, nullable migration columns, and default-deny migration text; this remains an unintegrated local checkpoint.
- [ ] Milestone 2 blocked at the real-probe gate: start the Docker Desktop Linux engine (or provide a separately authorized real test tenant), then run the migration and capture real service-role, anonymous-denial, and authenticated-denial outcomes before any fixture, mock, contract-fidelity, adapter, or composition work.
- [ ] Milestone 3: preserve authentication failures and enforce ownership before meeting-specific I/O.
- [ ] Milestone 4: make the loader prefer persisted intake while preserving a temporary compatibility read.
- [ ] Milestone 5: atomically cut over join and loader behavior to clean URLs only.
- [ ] Milestone 6: provide an explicit local server composition for browser tests.
- [ ] Milestone 7: prove the complete local user story and update the governing artifacts.

## Surprises & Discoveries

- Observation: all five intake values are deliberately placed in the meeting URL today.
  Evidence: `app/src/routes/+page.server.ts` builds `URLSearchParams` containing `name`, `cleanTime`, `mood`, `mind`, and `listen`, then redirects to that query string. `app/src/routes/meeting/[id]/+page.server.ts` reads those values back from `url.searchParams`.

- Observation: the initial database schema already has `meetings.user_mind`, but the application never writes or reads it.
  Evidence: `app/supabase/migrations/20260215_000001_init_schema.sql` declares `user_mind text`; `app/src/lib/server/seams/database/adapter.ts` currently inserts and selects `topic`, `user_mood`, and `listening_only` without `user_mind`.

- Observation: a profile lookup is not a sufficient replacement for the URL values.
  Evidence: `users.display_name` and `users.clean_time` can change between meetings, while the meeting experience needs the answers supplied for this meeting. Guest and probe users also pass intake values through the same join action.

- Observation: no database operation proves that the current session owns a meeting before other meeting data is read.
  Evidence: `DatabasePort.getMeetingShares`, `getMeetingPhase`, and `getMeetingParticipants` accept only `meetingId`. The meeting page loader invokes them directly. The Supabase service-role client bypasses row-level security, so route code must establish ownership before those calls.

- Observation: the common SvelteKit server hook already resolves `event.locals.userId` before route handlers run.
  Evidence: `app/src/hooks.server.ts` builds the seam bundle, calls the auth seam, sets `event.locals.userId`, and then calls `resolve(event)`. This is the narrowest existing place to protect the meeting page and every route nested beneath it.

- Observation: the hook currently collapses every authentication seam failure to `userId = null`, but only `UNAUTHORIZED` means there is no usable session.
  Evidence: the auth seam also returns infrastructure and contract failures such as `UPSTREAM_UNAVAILABLE` and `CONTRACT_VIOLATION`. Treating those as an anonymous request would turn an outage into the same 404 used to hide meeting existence.

- Observation: the landing action's nonproduction `PROBE_USER_ID` fallback can create a meeting owned by an identity that the redirected GET cannot recover.
  Evidence: `actions.join` may write the probe id when `locals.userId` is absent, while the following `/meeting/<id>` request resolves authentication again and has no durable probe session. An ownership gate would correctly reject that redirect.

- Observation: Playwright starts a built preview server, so browser request interception cannot supply the server-side owner lookup used by the hook.
  Evidence: `app/playwright.config.ts` points Playwright at `tests/e2e`; the SvelteKit preview process constructs real server adapters before browser `page.route` handlers can affect them.

- Observation: the same preview process also constructs the real Grok adapter.
  Evidence: later refresh coverage exercises `/share`, `/crisis`, `/close`, and `/room-moment`; intercepting browser requests cannot replace those routes' outbound server-side model calls without also bypassing the persistence behavior under test.

- Observation: this repository has database fixtures and migrations but no local Supabase configuration or pinned Supabase CLI.
  Evidence: `app/supabase/` contains only `migrations/`; `app/supabase/config.toml` is absent. The production tenant is unavailable, so a real-system probe must use a disposable local Supabase stack or remain explicitly blocked before fixture and mock work.

- Observation: the server ownership gate does not protect a table that Supabase exposes directly to `anon` or `authenticated` through PostgREST.
  Evidence: the application uses a service-role client in `app/src/lib/server/supabase.ts`, but the initial migration neither enables row-level security nor revokes client-role privileges on `meetings`, `shares`, `meeting_participants`, `callbacks`, and `users`. Anyone holding the public project URL and anon key could bypass SvelteKit routes if the database roles retain their default grants.

- Observation: Supabase treats the leading numeric text before the first underscore as the migration version.
  Evidence: any two names beginning `20260912_` both have version `20260912`; descriptive counters after that underscore do not make them distinct or order them.

- Observation: npm 11 could not install this checkout from its existing lockfile until two optional websocket-native package records were restored.
  Evidence: the first `npm.cmd ci` reported missing `bufferutil@4.1.0` and `utf-8-validate@6.0.6`. Adding only those resolved records allowed the existing database contract suite to pass 5/5 and `svelte-check` to reach its normal 0-error baseline before privacy contract changes.

- Observation: the pinned local Supabase CLI is runnable, but this machine's Docker Desktop Linux engine is not.
  Evidence: `npm.cmd exec supabase -- --version` returns `2.117.0`; both `supabase status` and Docker server inspection fail on the missing `dockerDesktopLinuxEngine` named pipe, so no migration or real access probe has run.

## Decision Log

- Decision: store meeting-specific display name, clean time, mood, mind text, and listening choice on the meeting record.
  Rationale: these values must survive refresh without a URL, browser storage, or dependence on a later profile edit. The existing meeting row already owns mood, mind, and listening choice.
  Date/Author: 2026-09-12 / Codex

- Decision: add nullable `user_display_name` and `user_clean_time` columns and use the existing nullable `user_mind` column.
  Rationale: additive nullable columns preserve old meeting rows and make the migration safe to apply before all readers are switched. The names distinguish a meeting snapshot from the mutable user profile.
  Date/Author: 2026-09-12 / Codex

- Decision: keep writing `topic` during this slice and persist `user_mind` separately.
  Rationale: current share and close flows depend on `topic`. Removing or redefining it would mix a meeting-flow migration into the privacy fix. The loader can use the meeting's own stored values without broadening this scope.
  Date/Author: 2026-09-12 / Codex

- Decision: add one owner-filtered database read and make the server hook place its result in `event.locals.meetingContext` for every `/meeting/[id]` request.
  Rationale: checking ownership once, before route-specific reads, prevents page and child endpoints from drifting into different authorization rules. The service-role adapter must filter by both meeting id and user id in the database query rather than fetch by id and compare later.
  Date/Author: 2026-09-12 / Codex

- Decision: reject a malformed meeting id as the same generic 404 before calling the UUID database column.
  Rationale: PostgreSQL reports invalid UUID syntax as an error, which would otherwise turn a guessed malformed path into a 5xx while a missing valid id returns 404. Early format validation preserves indistinguishable outward behavior and avoids unnecessary I/O.
  Date/Author: 2026-09-13 / Codex

- Decision: return a generic HTTP 404 for no session, nonexistent meeting, and wrong owner.
  Rationale: identical outward behavior does not reveal whether a guessed meeting id exists or who owns it. Authentication still runs normally on the landing page where a session can be established.
  Date/Author: 2026-09-12 / Codex

- Decision: preserve the full auth seam result until the hook knows whether the request is meeting-scoped.
  Rationale: `UNAUTHORIZED` represents an absent or invalid session and maps to the generic meeting 404. Infrastructure, provider, contract, and unexpected auth failures retain the repository's existing 5xx service-error mapping and stop before owner lookup.
  Date/Author: 2026-09-13 / Codex

- Decision: remove `PROBE_USER_ID` as a route-level identity fallback.
  Rationale: browser navigation needs one durable session identity from join through every meeting request. Dedicated seam probes may keep an explicit probe id, but interactive routes must authenticate or fail normally.
  Date/Author: 2026-09-13 / Codex

- Decision: stage the clean-URL cutover through backward-compatible contract and loader changes, then remove the URL fallback in the same slice that changes the join redirect.
  Rationale: this keeps every intermediate commit deployable. The loader can prefer stored fields while old joins still send query values; once new joins persist the full snapshot, one coherent cutover removes both the query write and compatibility read.
  Date/Author: 2026-09-13 / Codex

- Decision: add a server-only, fixture-backed composition selected explicitly by Playwright's local web server.
  Rationale: the ownership read and model calls run inside SvelteKit and cannot be mocked from the browser. A dedicated composition uses the existing auth, database, and Grok seam mocks so browser stories execute real application routes without depending on unavailable tenants or exposing a runtime toggle endpoint. Playwright must start that server itself rather than reuse whichever process happens to occupy the port.
  Date/Author: 2026-09-13 / Codex

- Decision: add a pinned local Supabase CLI and capture new database fixtures from its real Postgres/PostgREST stack before implementing the mock or adapter.
  Rationale: repository seam order requires contract, probe, captured fixtures, mock, contract test, adapter, then composition. A disposable local stack produces representative wire behavior without creating a hosted resource or depending on the lost production tenant.
  Date/Author: 2026-09-13 / Codex

- Decision: make direct public database access default-deny for all application tables and executable functions, while keeping the server service role as the only database caller.
  Rationale: route ownership checks are ineffective if an anonymous or authenticated client can query PostgREST directly. Enabling row-level security with no client policies and revoking table, sequence, and function privileges from `PUBLIC`, `anon`, and `authenticated`, including default privileges for future objects, closes that second access path without moving private context into the browser.
  Date/Author: 2026-09-14 / Codex

- Decision: finish this plan before adding the server-owned next-beat endpoint in epic #77.
  Rationale: a new endpoint under `/meeting/[id]` should inherit the common protection immediately. Building it first would create another route that has to be secured separately and then migrated.
  Date/Author: 2026-09-12 / Codex

- Decision: name this plan's migration `20260912000100_private_meeting_intake.sql`.
  Rationale: the fourteen-digit timestamp prefix is a unique Supabase migration version and reserves clear dependency order before `20260912000200_durable_core_character_identity.sql` and `20260912000300_server_owned_meeting_beats.sql`.
  Date/Author: 2026-09-14 / Codex

## Outcomes & Retrospective

Planning is complete, and Milestone 1 now exists as partial uncommitted local work on `codex/privacy-intake-contract`: the persistence/core contracts, nullable migration columns, and default-deny SQL are written and their direct tests/static checks pass. The application is intentionally not type-green or privacy-complete because fixtures, mock, real adapter, route ownership, and clean-URL behavior have not changed. CLI `2.117.0` and local config are ready, but the Docker engine is unavailable, so Milestone 2 is blocked before any real migration, capture, fixture, mock, adapter, or composition claim. Production deployment and a hosted Supabase migration remain blocked by epic #71.

## Context and Orientation

The landing action is `actions.join` in `app/src/routes/+page.server.ts`. It validates form fields, ensures a user profile, calls the pure workflow `createMeeting` in `app/src/lib/core/meeting.ts`, and redirects to the new meeting. At present that redirect copies private intake into the query string.

The database boundary is called a seam: a typed interface whose mock and real adapter must behave the same way. Its contract is `app/src/lib/seams/database/contract.ts`, its in-memory implementation is `app/src/lib/seams/database/mock.ts`, and its Supabase implementation is `app/src/lib/server/seams/database/adapter.ts`. Contract fixtures live under `app/src/lib/seams/database/fixtures/`. The initial schema is in `app/supabase/migrations/20260215_000001_init_schema.sql`; new schema work must be a later migration rather than an edit to that historical file.

`app/src/hooks.server.ts` runs for every server request. It creates the seam implementations, resolves the current auth result, and stores the successful user id plus the seams in `event.locals`. The shape of those locals is declared in `app/src/app.d.ts`. A meeting route means the page at `app/src/routes/meeting/[id]/+page.server.ts` or any endpoint below the same directory: `share`, `user-share`, `crisis`, `close`, and `expand`. Only an auth `UNAUTHORIZED` result represents an anonymous meeting request; other auth errors must keep their service-error semantics.

The meeting page loader currently reads query parameters, detects crisis language from `mind`, then separately loads shares, phase state, and participants by meeting id. The ownership gate must run before any of those meeting-specific reads. Once the hook accepts a meeting request, the already-loaded meeting context is available in `locals` and the page loader does not need a second meeting lookup.

For this plan, an owner-filtered read means one database query with both `id = meetingId` and `user_id = userId`. A generic 404 means the response status and body do not say whether a meeting was missing, belonged to someone else, or could not be opened because there was no current user.

A server composition is the bundle of seam implementations placed in `event.locals`: real auth and Supabase adapters for ordinary execution, or in-memory implementations for the local browser test. Browser request interception cannot replace that bundle because the server hook runs outside the page. The test composition is therefore selected when Playwright starts its child preview process, before the first request arrives.

## Requirements

`PRIV-01` requires the join redirect to contain no intake query values. `PRIV-02` requires every intake value needed by the room to survive a refresh of the clean URL. `PRIV-03` requires one owner-filtered lookup before any meeting page or child endpoint reads or mutates that meeting. `PRIV-04` requires missing-session, malformed-id, missing-meeting, and wrong-owner requests to receive the same generic 404. `PRIV-05` requires existing rows and retry behavior to remain safe. `PRIV-06` requires tests to cover normal, listening-only, crisis-language, refresh, and cross-session access. `PRIV-07` requires the public Supabase roles to have no direct read, write, sequence, or RPC path to private application data; an anon-key PostgREST request must be denied even when it supplies a valid meeting id.

## Implementation Slices

These are the assignment units for Codex or a subagent, not automatic merge units. Give one agent one slice, its listed files, and its acceptance command. Files that appear in more than one slice are owned sequentially; never assign two writers to them at once. The main agent integrates `PRIV-A` through `PRIV-D` before promoting the persistence foundation. Later milestone boundaries stay deployable; the final clean-URL transition in `PRIV-G` deliberately joins the two dependent edits that must land together.

- `PRIV-A` extends `MeetingRecord` and validators, gives `CreateMeetingInput` optional compatibility fields, and adds migration `20260912000100_private_meeting_intake.sql`. That migration also enables row-level security without client policies and revokes current and default table, sequence, and function privileges from `PUBLIC`, `anon`, and `authenticated`. It stops at the written contract and probe schema; it does not author fixtures, edit a mock, adapter, or route.
- `PRIV-B` adds the pinned local Supabase CLI/configuration and `probes/privateMeetingAccessProbe.mjs`, runs the migration against that stack, proves service-role access still works, proves anon-key direct table and RPC access is denied, and writes redacted success and failure captures under the database fixtures directory. It stops if no real probe can run and does not hand-author substitute fixture payloads.
- `PRIV-C` updates only the fixture-backed database mock and adds contract expectations for create and owner lookup from the captured records. It stops when `contract.test.ts` proves schema conformance and mock fidelity.
- `PRIV-D` implements the Supabase insert, select, and two-filter owned lookup in `adapter.ts` with focused adapter tests. It stops when the adapter suite proves both filters and indistinguishable not-found results against the probed shapes.
- `PRIV-E` adds `meeting-access.ts`, preserves non-authorization auth errors in the hook, adds `App.Locals.meetingContext`, removes route-level `PROBE_USER_ID` fallbacks, and adds focused access tests. It stops when the page and every current child route are proven to pass through the gate with one durable session identity.
- `PRIV-F` changes the meeting loader and its tests to prefer an already-authorized meeting context, including historical null fallback, listening-only, crisis, and clean refresh cases. It retains URL reads only as an explicitly tested compatibility fallback for meetings created by the old join action.
- `PRIV-G` makes the three new `CreateMeetingInput` strings required, changes the landing join action to persist them and emit the exact clean redirect, and deletes the loader's compatibility query reads in the same diff. It stops when both normal and listening-only joins survive refresh with no private URL data.
- `PRIV-H` adds the server-only in-memory auth/database composition selected by Playwright's local web server and its production-disable guard. It stops when server composition tests prove the fixture state is shared across join and meeting requests and cannot activate on Vercel.
- `PRIV-I` updates the Playwright user story, runs the full nonfixture checks, and updates the plan and governance records with actual results. It contains no new privacy architecture.

Each slice should be reviewable in one focused diff. If a slice uncovers a new contract decision, return that finding to the main agent instead of silently changing later slices.

## What Not To Do

Do not move the intake to another browser-controlled storage mechanism. Cookies, `localStorage`, `sessionStorage`, fragments, encrypted query strings, and obfuscated parameters still make the browser the source of private meeting context.

Do not assume row-level security protects service-role queries. The server adapter must still filter by both meeting id and owner because the service role bypasses row-level security. Do not assume the SvelteKit gate protects direct PostgREST requests either: leave no client policy or grant that can read or mutate application tables. Do not fetch a meeting by id and compare its owner in application code after the row has already been returned.

Do not copy authorization checks into every child route. Do not turn a wrong-owner result into a login redirect or a distinct forbidden page that confirms the meeting exists. Do not add private intake values to logs, analytics, error messages, cache keys, or generated route names.

Do not translate an auth provider outage, malformed auth response, or other non-`UNAUTHORIZED` auth error into a generic meeting 404. Do not let an interactive route invent `PROBE_USER_ID`; explicit probe scripts may use that id, but a browser meeting must use the same resolved session identity from join through refresh.

Do not rely on Playwright browser routing to mock server-side auth or database calls. Do not add a public route, query parameter, cookie, or header that switches production into mock mode. The test composition is selected only by the local preview process, must fail closed when `VERCEL=1`, and must not be enabled by application input.

Do not leave `reuseExistingServer` enabled for the mock-backed browser suite. Port availability does not prove that an existing preview was started with the required server composition, so the suite must own and stop its process.

Do not redesign the landing page or meeting UI, alter prompts, implement server-owned beats, provision a hosted database, rotate credentials, or refresh unrelated xAI and legacy provider fixtures in this plan. The new private-meeting database captures from the disposable local stack are required. Do not backfill historical meetings with invented names, clean time, or mind text.

## Plan of Work

### Milestone 1: define and migrate the meeting intake contract

Start with the contract because both the mock and real adapter must agree before routes depend on the new data. In `app/src/lib/seams/database/contract.ts`, extend `MeetingRecord` with `userDisplayName: string | null`, `userCleanTime: string | null`, and `userMind: string | null`. Add an exported `GetOwnedMeetingInput` with `meetingId` and `userId`, then add this method to `DatabasePort`:

    getOwnedMeeting(input: GetOwnedMeetingInput): Promise<SeamResult<MeetingRecord>>;

Extend `CreateMeetingInput` in `app/src/lib/core/meeting.ts` with optional `userDisplayName`, `userCleanTime`, and `userMind` compatibility fields, then pass them to `database.createMeeting`. The temporary optional shape lets the contract, mock, and adapter land without breaking the old join action. `PRIV-G` makes all three nonempty and required in the same slice that updates that caller. Preserve the required mood and the boolean listening choice. Keep `topic` unchanged in this slice.

Create `app/supabase/migrations/20260912000100_private_meeting_intake.sql`. It adds nullable text columns `user_display_name` and `user_clean_time` to `public.meetings`. The fourteen-digit prefix is the unique Supabase migration version; the later `_private_meeting_intake` text is only the descriptive name. Do not alter the historical migration. Use `add column if not exists` so a retry is harmless. Do not make the columns `not null`: old rows cannot supply truthful snapshots, and fake backfill values would violate the purpose of the plan.

In the same migration, enable row-level security on every current application table in `public`: `characters`, `users`, `meetings`, `meeting_participants`, `shares`, and `callbacks`. Add no `anon` or `authenticated` policies because browser clients do not own database access in this architecture. Explicitly revoke all privileges on current public tables and sequences, and execute on current public functions, from `PUBLIC`, `anon`, and `authenticated`. Set equivalent default-privilege revokes for future tables, sequences, and functions created by the migration owner so later RPCs and tables do not reopen the bypass. The service-role path in `app/src/lib/server/supabase.ts` must retain the access needed by the adapter; prove that behavior rather than weakening the deny boundary with a public policy.

Update only the runtime validators so a `MeetingRecord` accepts null for the two new snapshot fields and for `userMind`. Define the exact success, missing, wrong-owner, malformed-output, and upstream-failure shapes that the next milestone's probe must capture. Do not create or edit a database fixture yet.

This milestone is complete when the contract and probe schema are reviewable and the expected old mock/adapter gaps are recorded for Milestone 2. `PRIV-A` is not promoted by itself; the first green promotion boundary is the completed seam at the end of Milestone 2. This milestone satisfies the contract part of `PRIV-02` and `PRIV-05`.

### Milestone 2: probe, capture, mock, test, and adapt the database seam in order

Pin `supabase@2.117.0` as an exact development dependency and commit the lockfile change. Initialize `app/supabase/config.toml` without hosted project identifiers or credentials. This local stack is disposable infrastructure on the developer machine; it is not a Vercel or hosted Supabase change. Add the `20260912000100_private_meeting_intake.sql` migration from Milestone 1 to that stack with `npm.cmd exec supabase db reset`.

Before editing the mock or real adapter, create `app/probes/privateMeetingAccessProbe.mjs` and the npm script `probe:supabase-private-meeting`. The probe obtains local service-role and anon credentials from `npm.cmd exec supabase status -o json`, creates deterministic owner A, owner B, and one meeting through the real service-role Supabase client, then captures the raw insert/select success, missing valid id, wrong owner, and representative PostgREST failure shapes. With the anon key and no user session, directly request each current application table, attempt a meeting insert/update/delete using known valid ids, and invoke every public RPC introduced by the current migration set. Every request must fail without returning a row or applying a mutation. Repeat the read and write denial with an `authenticated` JWT for owner A; database ownership alone must not create a direct-client path. Finally, repeat the owner-filtered read through the service-role client and prove the server path still succeeds. The probe must delete or reset its rows on repeat, redact credentials and JWTs, and write the capture plus `probedAt`, `environment: 'local-supabase'`, and probe name under `app/src/lib/seams/database/fixtures/`. Do not copy expected JSON into the capture path by hand.

Run the probe and inspect the captured rows before continuing. If Docker, the local Supabase CLI, or the real probe cannot run and no restored hosted test tenant is available, record Milestone 2 as blocked in `Progress` and stop before fixture, mock, contract-test, adapter, or composition claims. Synthetic examples may remain in the plan, but they are not seam fixtures and cannot satisfy this gate.

After a successful capture, update `app/src/lib/seams/database/mock.ts` so `createMeeting` preserves the new fields and `getOwnedMeeting` validates both ids using the captured fixture shapes. A nonmatching user id and an unknown meeting id must return the same `NOT_FOUND` seam error. Add contract assertions showing fixture schema conformance, mock fidelity, all five stored intake values, owner-only lookup, malformed output rejection, and captured failure mapping.

Only after those contract tests pass, update `app/src/lib/server/seams/database/adapter.ts` so inserts and meeting-row selects map `user_display_name`, `user_clean_time`, and `user_mind`. Implement `getOwnedMeeting` as a Supabase query on `meetings` filtered by `.eq('id', input.meetingId)` and `.eq('user_id', input.userId)`. Return `NOT_FOUND` for an empty result and avoid a second unfiltered fetch. Extend `app/src/lib/server/seams/database/adapter.spec.ts` to assert the selected columns, both equality filters, the mapped result, input rejection, upstream failure mapping, and indistinguishable not-found behavior against the captured shapes.

Many test doubles implement `DatabasePort` as object literals. Update them mechanically to include `getOwnedMeeting` with a result appropriate to each test. Do not change their unrelated behavior. The milestone is complete only when the real probe, captured fixtures, database seam contract, mock-fidelity tests, and adapter suites pass in that order and no TypeScript error reports a stale `DatabasePort` implementation. It satisfies the adapter part of `PRIV-02`, `PRIV-03`, and `PRIV-05`.

### Milestone 3: protect the complete meeting route family without hiding auth outages

Preserve the complete auth seam result in `app/src/hooks.server.ts` until the request path is known. For a meeting route, a successful result supplies `userId`; `UNAUTHORIZED` proceeds as an absent session and receives the generic meeting 404; every other auth error is translated through the existing server error convention before any owner lookup. Unrelated routes keep their current authentication behavior. Do not log the private intake while reporting auth failures.

Create `app/src/lib/server/meeting-access.ts` with a small pure path predicate plus an async access function. The predicate recognizes the page and every current or future child of `/meeting/[id]`, extracts the `id` already parsed by SvelteKit, and leaves unrelated routes alone. Before database I/O, validate that id with the existing UUID contract in `app/src/lib/seams/uuid/contract.ts`; a malformed value throws the same generic 404 and never reaches Supabase. The async function then requires the successful session identity, calls `locals.seams.database.getOwnedMeeting({ meetingId, userId })`, and either returns the meeting or throws that 404 for no user and `NOT_FOUND`. The service-role adapter must already have applied both filters.

Call the access function before `resolve(event)` and store the returned value as `event.locals.meetingContext`. Extend `App.Locals` in `app/src/app.d.ts` with `meetingContext: MeetingRecord | null`; initialize it to null for nonmeeting routes. Do not duplicate owner checks across `+page.server.ts`, `share`, `user-share`, `crisis`, `close`, and `expand`. Remove `PROBE_USER_ID` fallbacks from the interactive landing, share, and close route code so one authenticated or guest session owns the complete browser flow. Explicit CLI seam probes may continue to supply their own probe id outside the request path.

Create `app/src/lib/server/routes/meeting-access.spec.ts`. Prove that unrelated routes do not query a meeting; a valid owner reaches `resolve`; no user, a malformed id, a missing valid id, and a wrong owner all return the same status and generic body; malformed ids make zero database calls; `UPSTREAM_UNAVAILABLE`, `CONTRACT_VIOLATION`, and unexpected auth failures retain their service-error behavior without calling owner lookup; and a child route such as `/meeting/<id>/share` is checked before its handler runs. Add or adjust route tests so their test locals include the already-authorized meeting context. Add a landing-action case proving that a request without a durable session cannot create a probe-owned meeting and redirect into a guaranteed 404.

This milestone is complete when every current meeting route is covered by the path-level test, no meeting-specific adapter call occurs before `getOwnedMeeting`, and the gate distinguishes absent authentication from broken authentication. It satisfies `PRIV-03` and `PRIV-04`.

### Milestone 4: make the loader prefer persisted intake without breaking old joins

In `app/src/routes/meeting/[id]/+page.server.ts`, read the owner-checked `locals.meetingContext` established in Milestone 3 and map its stored snapshot fields into the existing page-data names so `+page.svelte` does not need an unrelated rewrite. During this compatibility milestone only, a null stored snapshot field may fall back to the matching legacy query value so a meeting created by the old join action still opens. Stored values always win. Profile display name may supply a missing historical `userDisplayName`, absent clean time remains null after the compatibility fallback is removed, stored `userMood` remains authoritative, and stored `userMind` may ultimately fall back to the existing meeting topic. Do not write fallbacks back to the database.

Run crisis detection against the effective server-selected `userMind` and keep listening-only behavior based on the stored boolean. Update `app/src/lib/server/routes/meeting-page-load.spec.ts` to cover complete stored intake, an old join represented by nullable fields plus legacy query values, a historical row with neither, listening-only state, and crisis language. Add a refresh-shaped test by invoking the loader with the same authorized context twice; both calls must return the same user-facing intake and must not append data. Mark every query fallback assertion with the `PRIV-G` deletion target so it cannot become permanent.

This milestone is complete when persisted values are authoritative, old links remain temporarily usable, and access denial remains independently tested. It satisfies the compatibility portion of `PRIV-02` and the crisis portion of `PRIV-06`.

### Milestone 5: cut over join and loader behavior together

Make `userDisplayName`, `userCleanTime`, and `userMind` required nonempty fields in `CreateMeetingInput`. In `app/src/routes/+page.server.ts`, pass `userName`, `cleanTime`, `mood`, `mind`, and `listeningOnly` through `createMeeting`. After success, redirect to `/meeting/${result.value.id}` with no query string and delete the intake `URLSearchParams` construction.

In the same slice, delete every legacy intake read from `app/src/routes/meeting/[id]/+page.server.ts` and remove the compatibility-only route tests from Milestone 4. The loader now derives name, clean time, mood, mind text, listening choice, and crisis input only from the authorized meeting record and truthful historical fallbacks. This combined deletion is the release boundary: do not promote the clean redirect without the persisted loader, and do not remove the legacy read before new joins write the snapshot.

Update `app/src/lib/server/routes/landing-page-actions.spec.ts` so it proves the workflow receives the private intake and the thrown 303 location is exactly the clean path. Cover a normal join and a listening-only join. Retain existing missing-field, auth, and database-failure cases. Re-run the loader tests with clean URLs only, including two identical loads of the same stored context.

This milestone is complete when the redirect and loader contain no `name`, `cleanTime`, `mood`, `mind`, or `listen` query handling and both join variants survive refresh. It satisfies `PRIV-01` and completes `PRIV-02`.

### Milestone 6: provide an honest server composition for browser tests

Add a server-only composition factory under `app/src/lib/server/testing/` that combines the existing auth, database, and `createGrokAiMock` seam mocks with shared in-memory meeting state. The Grok mock is the instance placed in `event.locals.grokAi`; no route in the suite may construct the real adapter separately. Let the factory accept only code-selected, fixture-backed Grok scenarios so later meeting-flow tests can supply deterministic generation and quality results without request-controlled switching. `app/src/hooks.server.ts` may load this composition only when the preview process starts with `E2E_MOCK_SEAMS=1`; fail startup if that flag appears with `VERCEL=1`. Do not add an HTTP endpoint or application-controlled value that can switch compositions. The default branch of the factory must continue to construct the real adapters.

Set `E2E_MOCK_SEAMS=1` through the `webServer.env` option in `app/playwright.config.ts`, so the flag belongs to the local child process on every supported shell. Set `reuseExistingServer: false` for this mock-backed suite so a process already listening on port 4173 cannot bypass that environment or supply arbitrary state. The mock auth seam must use the existing guest-session bootstrap and cookie path rather than a magic browser header. Keep state by session and meeting id across the landing action, redirect, page load, refresh, and child requests; isolate tests with unique session and meeting data.

Add a focused server-composition test proving the flag selects the shared auth, database, and Grok fixture bundle locally, every route receives those exact mock instances, the default selects real composition, and `VERCEL=1` plus the flag fails closed. Add a Playwright configuration assertion that server reuse is false. This milestone is complete when a freshly started preview-server test can create an owned meeting through the real join action without Supabase or Grok and a second browser session resolves to a different owner.

### Milestone 7: prove the complete local story and record the outcome

Update `app/tests/e2e/meeting-flow.spec.ts` so the server-side mocked database/session state creates an owned meeting through the join action and follows the returned clean location. Add assertions that the browser URL contains no intake names or values, refresh preserves the displayed meeting state, and a second browser context cannot open the first context's meeting page or one child endpoint. Keep network providers mocked; this is a privacy and ownership test, not a live Grok or Supabase probe.

Run the targeted commands below, then the nonfixture repository gates. Inspect the diff for any newly logged private values, query-string reconstruction, route-local authorization copies, or mock-composition inputs reachable from an application request. Update this plan's living sections, `CHANGELOG.md`, and `decision-log.md` with what actually shipped. Update `LESSONS_LEARNED.md` only if implementation produces a reusable lesson, and `DEFERRED.md` only for a real discovered issue that remains outside this plan.

This milestone satisfies `PRIV-06`. The plan is complete when all six requirements are demonstrated locally and the only expected full-verification failure is the already-tracked stale-fixture gate from #91.

## Concrete Steps

Run all commands from `C:\Users\shiva\OneDrive\Documents\ChatGPT\14thstep\app` in PowerShell. Use the repository's installed Node and npm versions and do not install a different package manager. The only intended dependency change is the exact Supabase CLI development dependency, whose normal npm install updates the lockfile.

After Milestones 1 and 2:

    npm.cmd install --save-dev --save-exact supabase@2.117.0
    if (-not (Test-Path -LiteralPath supabase/config.toml)) { npm.cmd exec supabase init }
    npm.cmd exec supabase start
    npm.cmd exec supabase db reset
    npm.cmd run probe:supabase-private-meeting
    npm.cmd run test:unit -- --run src/lib/seams/database/contract.test.ts src/lib/server/seams/database/adapter.spec.ts src/lib/core/meeting.spec.ts
    npm.cmd run check

Expect the probe to report one service-role owner hit, indistinguishable wrong-owner and missing results, denied anon and authenticated direct reads and writes for every current application table and RPC, no changed row after each denied mutation, and fresh redacted captures before the named suites pass. Expect `svelte-check` to report zero errors. If the local stack cannot start, record the blocker and stop this dependency chain rather than skipping to authored fixtures. Existing warnings must be reported honestly; do not silence them as part of this privacy slice.

After Milestones 3 through 5:

    npm.cmd run test:unit -- --run src/lib/server/routes/landing-page-actions.spec.ts src/lib/server/routes/meeting-page-load.spec.ts src/lib/server/routes/meeting-access.spec.ts
    npm.cmd run verify:composition
    npm.cmd run check

Expect every named privacy and ownership case to pass. The composition verifier must still confirm that real I/O remains under `app/src/lib/server/` and core modules remain pure.

After Milestone 6:

    npm.cmd run test:unit -- --run src/lib/server/server-composition.spec.ts
    npm.cmd run test:e2e -- --list
    npm.cmd run verify:composition

Expect the local fixture composition, production-disable guard, and Playwright discovery under `tests/e2e` to pass without contacting Supabase or Grok. The composition test must prove the local branch installs all three seam mocks and the production-default branch still selects real adapters when `E2E_MOCK_SEAMS` is absent.

At completion:

    npm.cmd run lint:verify
    npm.cmd run check
    npm.cmd run verify:contracts
    npm.cmd run verify:core
    npm.cmd run verify:composition
    npm.cmd run test:e2e

Each command above must exit zero. Then run:

    npm.cmd run verify

Until #71 and #91 are resolved, the expected result is failure only in `verify:fixtures` because the xAI and Supabase probe fixtures are older than 30 days. Confirm every step before that gate passes and record the exact fixture-only failure in this plan. Any other failure belongs to this work and must be fixed before completion.

Review the repository diff from the root:

    git diff --check
    git status --short

Expect no whitespace errors, no environment files or credentials, and only files needed for this plan plus current governance updates.

When the real-system checks are complete, `npm.cmd exec supabase stop` may stop the disposable local stack without deleting committed migrations or captures.

## Validation and Acceptance

Acceptance is behavioral. Submit the intake with a recognizable alias, clean-time phrase, mood, mind text containing no crisis language, and listening disabled. The 303 location must be `/meeting/<uuid>` with no question mark. Loading and refreshing that URL must show the same alias and use the same stored context without creating another meeting or transcript entry.

Repeat with listening enabled. The clean URL must remain the same shape and the room must preserve listening-only behavior after refresh. Repeat with a known crisis phrase accepted by the existing crisis engine. Crisis behavior must be derived from the stored meeting mind text after a clean-URL refresh.

Using two separate mocked sessions, create a meeting as user A. User A must load the page and child endpoints normally. User B, a request with an auth `UNAUTHORIZED` result, a malformed id such as `not-a-uuid`, and a random valid missing id must each receive the same generic 404 response before shares, phase state, participants, generation, or mutation are invoked. The malformed id must make no database call. Auth infrastructure and contract failures must retain their 5xx service-error mapping and must not invoke the owner lookup. A request without a durable session must never create a meeting under `PROBE_USER_ID`.

Against the disposable local Supabase stack, use its published anon key to call PostgREST directly with user A's known meeting id. Reads of `meetings`, `shares`, `meeting_participants`, `callbacks`, and `users`, mutations against those tables, and every public RPC must be denied and return no private row. Repeat with an authenticated user JWT and require the same result. Then call the same owner lookup through the server service-role adapter and require success. Re-read the seeded rows with the service role to prove each denied mutation changed nothing.

Inspect browser history and captured redirect headers. No intake answer may appear in a URL. Inspect server logging added or changed by this work. It may log error codes and meeting ids where existing conventions require them, but it must not add name, clean time, mood, or mind text to logs.

The migration text must be additive and retry-safe. Contract and adapter tests must demonstrate nullable historical rows. Applying the migration to a live project and validating production are explicitly outside local acceptance while #71 is blocked.

## Idempotence and Recovery

The schema migration uses `add column if not exists`, repeated `enable row level security`, and repeat-safe `revoke` and `alter default privileges` statements, so applying it twice does not add duplicate columns or reopen access. New writes populate the snapshot fields in the same meeting insert; there is no second partial write to repair. Historical rows remain readable through nullable fields and conservative loader fallbacks.

The ownership read is side-effect free. Retrying a denied or successful request cannot change the meeting. The join action may still create a new meeting when a user submits twice, which is existing behavior and outside this slice; a browser refresh of the resulting GET must never create another meeting.

If a milestone fails, keep the additive database contract and adapter changes together until their tests pass. The temporary legacy query read exists only between Milestones 4 and 5 and must be deleted before the privacy work is complete; never reintroduce it after the clean-URL cutover. Before the live migration is ever applied, rollback is a normal code revert. After a live migration, leave the nullable columns and default-deny database privileges in place because removing columns can destroy meeting data and restoring public access would recreate the privacy bug; revert readers and writers first, then decide on schema cleanup separately.

## Artifacts and Notes

The core before-state is:

    join action -> /meeting/<id>?name=...&cleanTime=...&mood=...&mind=...&listen=...
    meeting loader -> reads intake from URL -> loads meeting data by id

The target state is:

    join action -> one meeting insert containing intake -> /meeting/<id>
    server hook -> owner-filtered meeting read -> locals.meetingContext
    meeting loader and child routes -> run only after that common check
    anon/authenticated PostgREST -> no table or RPC privileges -> denied before row access

The requirement-to-milestone map is intentionally short: `PRIV-01` is Milestone 5; `PRIV-02` is Milestones 1, 2, 4, and 5; `PRIV-03` and `PRIV-04` are Milestone 3; `PRIV-05` is Milestones 1, 2, and the recovery rules; `PRIV-06` is Milestones 4 through 7; `PRIV-07` is Milestones 1, 2, and 7.

## Interfaces and Dependencies

The implementation must leave these public shapes available in `app/src/lib/seams/database/contract.ts`:

    export interface MeetingRecord {
        id: string;
        userId: string;
        topic: string;
        userMood: string;
        userMind: string | null;
        userDisplayName: string | null;
        userCleanTime: string | null;
        listeningOnly: boolean;
        startedAt: string;
        endedAt: string | null;
    }

    export interface GetOwnedMeetingInput {
        meetingId: string;
        userId: string;
    }

    getOwnedMeeting(input: GetOwnedMeetingInput): Promise<SeamResult<MeetingRecord>>;

`CreateMeetingInput` in `app/src/lib/core/meeting.ts` accepts the three new strings as optional only during the additive compatibility slices and must require them for all new meetings in the final state. The meeting-access module may choose its internal function names, but the hook must expose one nullable `MeetingRecord` as `App.Locals.meetingContext` and must perform exactly one owner-filtered meeting lookup before route-specific meeting I/O. The hook must keep `UNAUTHORIZED` distinct from all other auth seam errors until it has either returned the generic meeting 404 or preserved the existing service-error response.

No new runtime dependency is needed. Pin `supabase@2.117.0` as a development-only local probe tool. Use SvelteKit's existing request hook and HTTP error mechanism, the existing seam result and error codes, Vitest for unit and route tests, and Playwright's configured `app/tests/e2e` directory for the browser story. The browser has no Supabase data role; `anon` and `authenticated` retain no direct application-table or public-function privilege. The server test composition uses the existing fixture-backed auth, database, and Grok mocks plus a dedicated process environment value passed through `playwright.config.ts`; it is never selected by request data and refuses to run when `VERCEL=1`. Do not use cookies, `localStorage`, `sessionStorage`, encrypted query parameters, or client-side obfuscation to hold the private intake.

The only true cross-plan dependency is this plan before `plans/server-owned-meeting-beats-execplan.md`: the later plan adds another child endpoint that must inherit this ownership gate. The production database restoration in #71 blocks applying the migration and verifying the live site, but it does not block writing the migration or completing the local contract, adapter, route, and browser tests.

## Revision Note

2026-09-12: Created this plan after the repository organization pass exposed privacy epic #78 as a distinct application track. The plan separates locally implementable privacy and ownership work from the blocked production-recovery plan and establishes the access boundary needed by the later server-owned meeting-flow work.

2026-09-13: Revised the plan after PR review to preserve non-authorization auth failures, return the generic 404 for malformed ids, retire route-level probe identity, stage the clean-URL cutover in a deployable order, use Playwright's configured test directory, require Playwright to start a fresh non-reused server, include the auth, database, and Grok seam mocks in that preview composition, and restore contract-probe-fixture-mock-test-adapter ordering through a disposable local Supabase stack.

2026-09-14: Closed the direct-database bypass left by a route-only ownership gate. The privacy migration now enables row-level security with no browser policies, revokes current and default table, sequence, and function privileges from public client roles, and requires real anon-key and authenticated-JWT PostgREST denial probes alongside a passing service-role adapter path.

2026-09-14: Renamed the planned privacy migration to `20260912000100_private_meeting_intake.sql`. Supabase uses the leading numeric segment as the migration version, so the earlier date-plus-counter shape would have collided with later same-day plans instead of enforcing dependency order.

2026-09-14 / PR promotion: the user requested publication of accumulated local work. This clean promotion branch contains only the privacy foundation and its local dependency prerequisites. The draft remains blocked before real database probes and is not merge-ready. The original session's 694-line lockfile diff is historical; this promotion preserves existing package records and adds the 15 required records without unrelated peer-metadata churn. The privacy session branch remains preserved separately. No Docker or hosted verification was performed for this promotion.
