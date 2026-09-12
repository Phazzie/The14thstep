# Keep Meeting Intake Private And Enforce Ownership

This ExecPlan is a living document. Keep `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` current as work proceeds. Maintain this document in accordance with [`PLANS.md`](../PLANS.md).

This plan governs GitHub epic [#78](https://github.com/Phazzie/The14thstep/issues/78), specifically [#84](https://github.com/Phazzie/The14thstep/issues/84) and [#85](https://github.com/Phazzie/The14thstep/issues/85). It authorizes only the application work described here. Creating or changing live Supabase, Vercel, or other hosted resources still requires the appropriate account access and a separately authorized production step.

## Purpose / Big Picture

After this work, a person can tell the room their name, clean time, mood, and what is on their mind without those answers appearing in the browser address or history. Refreshing `/meeting/<id>` restores the same intake context from the meeting record. A signed-in or guest session can read and change only its own meeting; requests for another meeting receive the same generic not-found response as requests for an id that does not exist.

The behavior is visible in two ways. The join redirect contains only `/meeting/<id>`, and refreshing that clean URL preserves the person's name, clean time, mood, listening choice, crisis detection, and meeting content. A second session cannot load the page or any child endpoint for the first session's meeting.

## Progress

- [x] (2026-09-12 13:45Z) Read the current landing action, meeting loader and child routes, authentication hook, database contract, mock, Supabase adapter, schema, and relevant tests.
- [x] (2026-09-12 13:45Z) Chose one meeting-scoped persistence contract and one centralized route-ownership gate so later meeting endpoints inherit the same protection.
- [ ] Milestone 1: extend the meeting persistence contract and migration for private intake snapshots.
- [ ] Milestone 2: implement and verify the mock and Supabase adapter behavior.
- [ ] Milestone 3: persist intake during join and redirect to a clean meeting URL.
- [ ] Milestone 4: load persisted intake and preserve refresh and crisis behavior.
- [ ] Milestone 5: enforce ownership before any meeting page or child endpoint performs meeting-specific I/O.
- [ ] Milestone 6: prove the complete local user story and update the governing artifacts.

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

- Decision: return a generic HTTP 404 for no session, nonexistent meeting, and wrong owner.
  Rationale: identical outward behavior does not reveal whether a guessed meeting id exists or who owns it. Authentication still runs normally on the landing page where a session can be established.
  Date/Author: 2026-09-12 / Codex

- Decision: finish this plan before adding the server-owned next-beat endpoint in epic #77.
  Rationale: a new endpoint under `/meeting/[id]` should inherit the common protection immediately. Building it first would create another route that has to be secured separately and then migrated.
  Date/Author: 2026-09-12 / Codex

## Outcomes & Retrospective

Planning is complete; application behavior has not changed yet. The implementation is divided into six small outcomes. The first two establish and prove the persistence seam, the next two remove private data from navigation and restore it from the server, and the fifth protects the full route family. Production deployment and a live Supabase migration remain blocked by epic #71, but contract, adapter, route, and browser tests can proceed locally with mocks.

## Context and Orientation

The landing action is `actions.join` in `app/src/routes/+page.server.ts`. It validates form fields, ensures a user profile, calls the pure workflow `createMeeting` in `app/src/lib/core/meeting.ts`, and redirects to the new meeting. At present that redirect copies private intake into the query string.

The database boundary is called a seam: a typed interface whose mock and real adapter must behave the same way. Its contract is `app/src/lib/seams/database/contract.ts`, its in-memory implementation is `app/src/lib/seams/database/mock.ts`, and its Supabase implementation is `app/src/lib/server/seams/database/adapter.ts`. Contract fixtures live under `app/src/lib/seams/database/fixtures/`. The initial schema is in `app/supabase/migrations/20260215_000001_init_schema.sql`; new schema work must be a later migration rather than an edit to that historical file.

`app/src/hooks.server.ts` runs for every server request. It creates the real seam implementations, resolves the current user id through the auth seam, and stores both in `event.locals`. The shape of those locals is declared in `app/src/app.d.ts`. A meeting route means the page at `app/src/routes/meeting/[id]/+page.server.ts` or any endpoint below the same directory: `share`, `user-share`, `crisis`, `close`, and `expand`.

The meeting page loader currently reads query parameters, detects crisis language from `mind`, then separately loads shares, phase state, and participants by meeting id. The ownership gate must run before any of those meeting-specific reads. Once the hook accepts a meeting request, the already-loaded meeting context is available in `locals` and the page loader does not need a second meeting lookup.

For this plan, an owner-filtered read means one database query with both `id = meetingId` and `user_id = userId`. A generic 404 means the response status and body do not say whether a meeting was missing, belonged to someone else, or could not be opened because there was no current user.

## Requirements

`PRIV-01` requires the join redirect to contain no intake query values. `PRIV-02` requires every intake value needed by the room to survive a refresh of the clean URL. `PRIV-03` requires one owner-filtered lookup before any meeting page or child endpoint reads or mutates that meeting. `PRIV-04` requires missing-session, missing-meeting, and wrong-owner requests to receive the same generic 404. `PRIV-05` requires existing rows and retry behavior to remain safe. `PRIV-06` requires tests to cover normal, listening-only, crisis-language, refresh, and cross-session access.

## Implementation Slices

These are the assignment units for Codex or a subagent. Give one agent one slice, its listed files, and its acceptance command. Do not combine adjacent slices merely because they are in the same milestone. Files that appear in more than one slice are owned sequentially; never assign two writers to them at once.

- `PRIV-A` extends `MeetingRecord`, `CreateMeetingInput`, validators, and the contract fixtures, and adds migration `20260912_000004_private_meeting_intake.sql`. It stops when the database contract test expresses the new fields; it does not edit an adapter or route.
- `PRIV-B` updates only the fixture-backed database mock and its contract expectations for create and owner lookup. It stops when `contract.test.ts` passes against the mock.
- `PRIV-C` implements the Supabase insert, select, and two-filter owned lookup in `adapter.ts` with focused adapter tests. It stops when the adapter suite proves both filters and indistinguishable not-found results.
- `PRIV-D` changes the landing join action and its tests to persist intake and emit the exact clean redirect. It does not edit the meeting page.
- `PRIV-E` changes the meeting loader and its tests to consume an already-authorized meeting context, including historical null fallback, listening-only, crisis, and clean refresh cases. Use a temporary test-local context if `PRIV-F` has not landed yet; do not restore URL reads.
- `PRIV-F` adds `meeting-access.ts`, the hook wiring, `App.Locals.meetingContext`, and the access tests. It stops when the page and every current child route are proven to pass through the gate.
- `PRIV-G` updates the Playwright user story, runs the full nonfixture checks, and updates the plan and governance records with actual results. It contains no new privacy architecture.

Each slice should be reviewable in one focused diff. If a slice uncovers a new contract decision, return that finding to the main agent instead of silently changing later slices.

## What Not To Do

Do not move the intake to another browser-controlled storage mechanism. Cookies, `localStorage`, `sessionStorage`, fragments, encrypted query strings, and obfuscated parameters still make the browser the source of private meeting context.

Do not assume row-level security protects service-role queries. Do not fetch a meeting by id and compare its owner in application code after the row has already been returned. The adapter query itself must contain both filters.

Do not copy authorization checks into every child route. Do not turn a wrong-owner result into a login redirect or a distinct forbidden page that confirms the meeting exists. Do not add private intake values to logs, analytics, error messages, cache keys, or generated route names.

Do not redesign the landing page or meeting UI, alter prompts, implement server-owned beats, provision a live database, rotate credentials, or refresh provider fixtures in this plan. Do not backfill historical meetings with invented names, clean time, or mind text.

## Plan of Work

### Milestone 1: define and migrate the meeting intake contract

Start with the contract because both the mock and real adapter must agree before routes depend on the new data. In `app/src/lib/seams/database/contract.ts`, extend `MeetingRecord` with `userDisplayName: string | null`, `userCleanTime: string | null`, and `userMind: string | null`. Add an exported `GetOwnedMeetingInput` with `meetingId` and `userId`, then add this method to `DatabasePort`:

    getOwnedMeeting(input: GetOwnedMeetingInput): Promise<SeamResult<MeetingRecord>>;

Extend `CreateMeetingInput` in `app/src/lib/core/meeting.ts` with required nonempty `userDisplayName`, required nonempty `userCleanTime`, and required nonempty `userMind`, then pass them to `database.createMeeting`. They are required for new meetings even though the database columns are nullable for compatibility with historical rows. Preserve the required mood and the boolean listening choice. Keep `topic` unchanged in this slice.

Create `app/supabase/migrations/20260912_000004_private_meeting_intake.sql`. It adds nullable text columns `user_display_name` and `user_clean_time` to `public.meetings`. Do not alter the historical migration. Use `add column if not exists` so a retry is harmless. Do not make the columns `not null`: old rows cannot supply truthful snapshots, and fake backfill values would violate the purpose of the plan.

Update the database contract validators and fixtures so a `MeetingRecord` accepts null for the two new snapshot fields and for `userMind`. Add contract assertions showing that new create input returns all five stored intake values and that `getOwnedMeeting` returns the record only for its owner. Add the smallest new fixture needed for the owner-filtered read; do not copy unrelated meeting state into it.

This milestone is complete when the database contract tests fail against the old mock for the new behavior, then pass after the contract and fixture work. It satisfies the contract part of `PRIV-02` and `PRIV-05`.

### Milestone 2: implement both database sides of the seam

Update `app/src/lib/seams/database/mock.ts` so `createMeeting` preserves the new fields and `getOwnedMeeting` validates both ids. A nonmatching user id and an unknown meeting id must return the same `NOT_FOUND` seam error. Add a named fault scenario for the new method only if the contract pattern requires one; do not add a general authorization framework to the mock.

Update `app/src/lib/server/seams/database/adapter.ts` so inserts and meeting-row selects map `user_display_name`, `user_clean_time`, and `user_mind`. Implement `getOwnedMeeting` as a Supabase query on `meetings` filtered by `.eq('id', input.meetingId)` and `.eq('user_id', input.userId)`. Return `NOT_FOUND` for an empty result and avoid a second unfiltered fetch. Extend `app/src/lib/server/seams/database/adapter.spec.ts` to assert the selected columns, both equality filters, the mapped result, input rejection, upstream failure mapping, and indistinguishable not-found behavior.

Many test doubles implement `DatabasePort` as object literals. Update them mechanically to include `getOwnedMeeting` with a result appropriate to each test. Do not change their unrelated behavior. The milestone is complete when the database seam contract and adapter suites pass and no TypeScript error reports a stale `DatabasePort` implementation. It satisfies the adapter part of `PRIV-02`, `PRIV-03`, and `PRIV-05`.

### Milestone 3: make join persist intake and navigate cleanly

In `app/src/routes/+page.server.ts`, pass `userName`, `cleanTime`, `mood`, `mind`, and `listeningOnly` through `createMeeting`. After success, redirect to `/meeting/${result.value.id}` with no query string. Delete the intake `URLSearchParams` construction entirely.

Update `app/src/lib/server/routes/landing-page-actions.spec.ts` so it proves the workflow receives the private intake and the thrown 303 location is exactly the clean path. Cover a normal join and a listening-only join. Retain existing missing-field, auth, and database-failure cases.

Update the direct meeting navigation used in `app/e2e/meeting-flow.spec.ts` only after Milestone 4 provides server-loaded context; until then, keep the route tests as the milestone gate. This milestone is complete when the join action test sees no `name`, `cleanTime`, `mood`, `mind`, or `listen` in the redirect. It satisfies `PRIV-01`.

### Milestone 4: restore intake from the meeting record

In `app/src/routes/meeting/[id]/+page.server.ts`, remove all reads of intake from `url.searchParams`. Read the owner-checked `locals.meetingContext` established in Milestone 5 and map its stored snapshot fields into the existing page-data names so `+page.svelte` does not need an unrelated rewrite. Use conservative fallbacks only for historical rows: profile display name may supply a missing old `userDisplayName`, absent clean time remains null, stored `userMood` remains authoritative, and stored `userMind` may fall back to the existing meeting topic. Do not invent placeholder private answers and do not write fallbacks back to the database.

Run crisis detection against the persisted `userMind`, not the URL. Keep listening-only behavior based on the stored boolean. Update `app/src/lib/server/routes/meeting-page-load.spec.ts` to cover complete stored intake, a historical row with nullable snapshot fields, listening-only state, and crisis language. Add a refresh-shaped test by invoking the loader with a clean URL and the same `meetingContext` twice; both calls must return the same user-facing intake and must not append data.

Milestones 4 and 5 touch the loader together. It is acceptable to build them in one branch, but keep their assertions separate so a reviewer can see persistence behavior independently from access denial. This milestone satisfies the loader part of `PRIV-02` and the crisis portion of `PRIV-06`.

### Milestone 5: protect the complete meeting route family

Create `app/src/lib/server/meeting-access.ts` with a small pure path predicate plus an async access function. The predicate recognizes the page and every current or future child of `/meeting/[id]`, extracts the `id` already parsed by SvelteKit, and leaves unrelated routes alone. The async function requires `locals.userId`, calls `locals.seams.database.getOwnedMeeting({ meetingId, userId })`, and either returns the meeting or throws the same generic HTTP 404 for no user and `NOT_FOUND`. Translate infrastructure and contract failures through the existing server error convention rather than disguising an outage as missing content.

In `app/src/hooks.server.ts`, call that function after auth resolution and before `resolve(event)` for meeting routes. Store the returned value as `event.locals.meetingContext`. Extend `App.Locals` in `app/src/app.d.ts` with `meetingContext: MeetingRecord | null`; initialize it to null for nonmeeting routes. Do not duplicate owner checks across `+page.server.ts`, `share`, `user-share`, `crisis`, `close`, and `expand`. The hook is the common boundary, so a later `/meeting/[id]/next` route inherits it automatically.

Create `app/src/lib/server/routes/meeting-access.spec.ts`. Prove that unrelated routes do not query a meeting; a valid owner reaches `resolve`; no user, a missing id, and a wrong owner all return the same 404; an adapter outage retains its service-error behavior; and a child route such as `/meeting/<id>/share` is checked before its handler runs. Add or adjust route tests so their test locals include the already-authorized meeting context.

This milestone is complete when every current meeting route is covered by the path-level test and no meeting-specific adapter call occurs before `getOwnedMeeting`. It satisfies `PRIV-03` and `PRIV-04`.

### Milestone 6: prove the complete local story and record the outcome

Update `app/e2e/meeting-flow.spec.ts` so its mocked database/session state creates an owned meeting through the join action and follows the returned clean location. Add assertions that the browser URL contains no intake names or values, refresh preserves the displayed meeting state, and a second browser context cannot open the first context's meeting page or one child endpoint. Keep network providers mocked; this is a privacy and ownership test, not a live Grok or Supabase probe.

Run the targeted commands below, then the nonfixture repository gates. Inspect the diff for any newly logged private values, query-string reconstruction, or route-local authorization copies. Update this plan's living sections, `CHANGELOG.md`, and `decision-log.md` with what actually shipped. Update `LESSONS_LEARNED.md` only if implementation produces a reusable lesson, and `DEFERRED.md` only for a real discovered issue that remains outside this plan.

This milestone satisfies `PRIV-06`. The plan is complete when all six requirements are demonstrated locally and the only expected full-verification failure is the already-tracked stale-fixture gate from #91.

## Concrete Steps

Run all commands from `C:\Users\shiva\OneDrive\Documents\ChatGPT\14thstep\app` in PowerShell. Use the repository's installed Node and npm versions; do not install a different package manager or regenerate the lockfile for this work.

After Milestones 1 and 2:

    npm.cmd run test:unit -- --run src/lib/seams/database/contract.test.ts src/lib/server/seams/database/adapter.spec.ts src/lib/core/meeting.spec.ts
    npm.cmd run check

Expect the named suites to pass and `svelte-check` to report zero errors. Existing warnings must be reported honestly; do not silence them as part of this privacy slice.

After Milestones 3 through 5:

    npm.cmd run test:unit -- --run src/lib/server/routes/landing-page-actions.spec.ts src/lib/server/routes/meeting-page-load.spec.ts src/lib/server/routes/meeting-access.spec.ts
    npm.cmd run verify:composition
    npm.cmd run check

Expect every named privacy and ownership case to pass. The composition verifier must still confirm that real I/O remains under `app/src/lib/server/` and core modules remain pure.

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

## Validation and Acceptance

Acceptance is behavioral. Submit the intake with a recognizable alias, clean-time phrase, mood, mind text containing no crisis language, and listening disabled. The 303 location must be `/meeting/<uuid>` with no question mark. Loading and refreshing that URL must show the same alias and use the same stored context without creating another meeting or transcript entry.

Repeat with listening enabled. The clean URL must remain the same shape and the room must preserve listening-only behavior after refresh. Repeat with a known crisis phrase accepted by the existing crisis engine. Crisis behavior must be derived from the stored meeting mind text after a clean-URL refresh.

Using two separate mocked sessions, create a meeting as user A. User A must load the page and child endpoints normally. User B, a request with no resolved session, and a request for a random meeting id must each receive the same generic 404 response before shares, phase state, participants, generation, or mutation are invoked.

Inspect browser history and captured redirect headers. No intake answer may appear in a URL. Inspect server logging added or changed by this work. It may log error codes and meeting ids where existing conventions require them, but it must not add name, clean time, mood, or mind text to logs.

The migration text must be additive and retry-safe. Contract and adapter tests must demonstrate nullable historical rows. Applying the migration to a live project and validating production are explicitly outside local acceptance while #71 is blocked.

## Idempotence and Recovery

The schema migration uses `add column if not exists`, so applying it twice does not add duplicate columns. New writes populate the snapshot fields in the same meeting insert; there is no second partial write to repair. Historical rows remain readable through nullable fields and conservative loader fallbacks.

The ownership read is side-effect free. Retrying a denied or successful request cannot change the meeting. The join action may still create a new meeting when a user submits twice, which is existing behavior and outside this slice; a browser refresh of the resulting GET must never create another meeting.

If a milestone fails, keep the additive database contract and adapter changes together until their tests pass. Do not temporarily restore private query parameters as a fallback. Before the live migration is ever applied, rollback is a normal code revert. After a live migration, leave the nullable columns in place during rollback because removing columns can destroy meeting data; revert readers and writers first, then decide on schema cleanup separately.

## Artifacts and Notes

The core before-state is:

    join action -> /meeting/<id>?name=...&cleanTime=...&mood=...&mind=...&listen=...
    meeting loader -> reads intake from URL -> loads meeting data by id

The target state is:

    join action -> one meeting insert containing intake -> /meeting/<id>
    server hook -> owner-filtered meeting read -> locals.meetingContext
    meeting loader and child routes -> run only after that common check

The requirement-to-milestone map is intentionally short: `PRIV-01` is Milestone 3; `PRIV-02` is Milestones 1 through 4; `PRIV-03` and `PRIV-04` are Milestone 5; `PRIV-05` is Milestones 1, 2, and the recovery rules; `PRIV-06` is Milestones 4 through 6.

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

`CreateMeetingInput` in `app/src/lib/core/meeting.ts` must require the three new string fields for all new meetings. The meeting-access module may choose its internal function names, but the hook must expose one nullable `MeetingRecord` as `App.Locals.meetingContext` and must perform exactly one owner-filtered meeting lookup before route-specific meeting I/O.

No new runtime dependency is needed. Use SvelteKit's existing request hook and HTTP error mechanism, the existing seam result and error codes, Vitest for unit and route tests, and Playwright for the browser story. Do not use cookies, `localStorage`, `sessionStorage`, encrypted query parameters, or client-side obfuscation to hold the private intake.

The only true cross-plan dependency is this plan before `plans/server-owned-meeting-beats-execplan.md`: the later plan adds another child endpoint that must inherit this ownership gate. The production database restoration in #71 blocks applying the migration and verifying the live site, but it does not block writing the migration or completing the local contract, adapter, route, and browser tests.

## Revision Note

2026-09-12: Created this plan after the repository organization pass exposed privacy epic #78 as a distinct application track. The plan separates locally implementable privacy and ownership work from the blocked production-recovery plan and establishes the access boundary needed by the later server-owned meeting-flow work.
