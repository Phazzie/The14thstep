# Let The Server Run The Meeting One Beat At A Time

This ExecPlan is a living document. Keep `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` current as work proceeds. Maintain this document in accordance with [`PLANS.md`](../PLANS.md).

This plan governs GitHub epic [#77](https://github.com/Phazzie/The14thstep/issues/77) and its ordered issues [#81](https://github.com/Phazzie/The14thstep/issues/81), [#82](https://github.com/Phazzie/The14thstep/issues/82), and [#83](https://github.com/Phazzie/The14thstep/issues/83). Begin only after `plans/private-meeting-access-execplan.md` has established the common ownership gate for `/meeting/[id]` and its children.

## Purpose / Big Picture

After this work, the server decides the next observable moment in a meeting: who speaks, what kind of share they give, when the room displays a ritual cue, and when the room waits for the user. The browser asks for one beat, renders it, reports completion, and asks again. Refreshing in the middle of a round resumes from the saved beat instead of replaying the round and appending duplicate shares.

The meeting should still feel like a room, not a stepper. The visible opening, introductions, topic choice, three rounds, hard question, crisis interruption, closing, reflection, and farewell remain. The implementation proof is that two clients given the same saved meeting state receive the same next beat, that a repeated request returns the same beat, and that refresh never increases the transcript count by replaying completed work.

The empty chair also becomes a fresh generated room moment. It is persisted as part of the transcript, survives refresh, and follows the current prompt rules instead of repeating the literal sentence now embedded in the Svelte component.

## Progress

- [x] (2026-09-12 14:10Z) Read the current phase state machine, meeting page orchestration, share and user-share routes, database phase persistence, prompt builders, tests, and issues #81 through #83.
- [x] (2026-09-12 14:10Z) Confirmed that the March plan's frontend-owned speaking order conflicts with the current server-owned epic and archived that plan as historical evidence.
- [x] (2026-09-12 14:10Z) Chose a persisted active-beat contract, stable beat ids, and compare-and-set phase writes so retries and competing requests converge on one answer.
- [ ] Milestone 1: define the pure beat engine and repair the ritual prompt constraints it will use.
- [ ] Milestone 2: add versioned beat and share persistence with idempotent database behavior.
- [ ] Milestone 3: expose the protected next-beat protocol and prove stable retries.
- [ ] Milestone 4: make character, user, crisis, topic, and close routes complete only the active beat.
- [ ] Milestone 5: replace the page's hand-written meeting script with one generic renderer loop.
- [ ] Milestone 6: prove replay-free refresh through every meeting phase.
- [ ] Milestone 7: generate, persist, and quality-check the empty-chair moment.

## Surprises & Discoveries

- Observation: the browser, not the phase machine, owns the meaningful sequence inside every phase.
  Evidence: `app/src/routes/meeting/[id]/+page.svelte` contains `runFreshMeeting`, `runRoundOne`, `runRoundTwo`, `runRoundThree`, `runClosing`, speaker selection, optional crosstalk, hard-question selection, and all phase-specific waits.

- Observation: refresh explicitly restarts a whole round.
  Evidence: `continueFromPersistedPhase` dispatches `sharing_round_1` to `runRoundOne`, `sharing_round_2` to `runRoundTwo`, and so on. `MeetingPhaseState` records the phase and who spoke, but it has no active beat or substep cursor.

- Observation: existing server routes can advance a coarse phase but cannot identify one retryable generated result.
  Evidence: `shares` has `sequence_order` but no stable beat id, while `meetings.phase_state` is updated as an unversioned JSON value. A refreshed client can therefore request new text for work that already ran.

- Observation: the existing meeting plan cannot govern this epic.
  Evidence: the archived `archive/plans/restore-virtual-recovery-meeting-execplan-2026-03-19.md` explicitly requires frontend-owned speaking order, forbids a new orchestration endpoint, and says the page is allowed to orchestrate. Issue #81 requires the opposite boundary.

- Observation: the empty-chair prompt exists but is unused, while the visible moment is hardcoded locally.
  Evidence: `buildEmptyChairPrompt` in `app/src/lib/core/prompt-templates.ts` has no imports outside its test. `runFreshMeeting` pushes `This chair stays empty for everyone who couldn't make it tonight.` on every new meeting.

- Observation: the prompt named by #83 violates the repository's current hard rule against sentence counts, and nearby ritual prompts contain the same conflict.
  Evidence: `buildEmptyChairPrompt` says `Target 2-4 spoken sentences`; the ritual opening, introduction, reading, topic, and closing builders also contain exact sentence ranges. Root `AGENTS.md` says never add `exactly N sentences` to a generation prompt. The issue's old wording is historical context, not authority over the current rule.

- Observation: the selected meeting topic is currently browser state and is sent back as generation input without being persisted through a meeting-topic seam.
  Evidence: `TOPIC_OPTIONS`, `selectedTopic`, and `chooseTopic` live in `+page.svelte`; `DatabasePort` has no operation for recording the choice. A server-owned sequence needs the chosen topic to survive refresh.

## Decision Log

- Decision: define a beat as one stable, persisted instruction to the renderer rather than another phase.
  Rationale: phases remain useful broad states, but replay recovery needs to know the exact moment within a phase. A beat provides that resume point without replacing the established phase enum.
  Date/Author: 2026-09-12 / Codex

- Decision: keep beat selection pure in `app/src/lib/core/meeting-beats.ts` and keep all persistence in the database seam and server routes.
  Rationale: the repository requires core logic to be deterministic and free of fetch or database access. Pure selection can be exhaustively tested from saved state and roster fixtures.
  Date/Author: 2026-09-12 / Codex

- Decision: persist one `activeBeat` and an integer `beatCursor` inside `MeetingPhaseState`, and add a separate database phase version for compare-and-set writes.
  Rationale: returning an existing active beat makes retries stable. A version filter prevents two server instances from overwriting each other's state; the loser reloads the winner's state instead of inventing a second beat.
  Date/Author: 2026-09-12 / Codex

- Decision: derive every optional choice from the meeting id, phase, cursor, and roster, then persist the resulting beat before returning it.
  Rationale: production behavior needs variety across meetings and repeatability within one meeting. `Math.random()` and browser-local seeded choices do not provide a durable answer after refresh.
  Date/Author: 2026-09-12 / Codex

- Decision: give persisted generated entries a nullable stable `beatId` and enforce uniqueness on `(meeting_id, beat_id)` when a beat id exists.
  Rationale: sequence order says where an entry appears but not why it exists. The unique beat id lets a retry return the canonical stored entry instead of appending another generation.
  Date/Author: 2026-09-12 / Codex

- Decision: use one `/meeting/[id]/next` protocol to claim a beat, acknowledge non-generation beats, and persist topic choices; generated-share, user-share, crisis, and close routes complete their own active beats.
  Rationale: the client needs one way to ask what happens next, while existing specialized routes still own generation and their side effects. The protocol avoids a second page-level phase machine.
  Date/Author: 2026-09-12 / Codex

- Decision: persist a selected topic and completion of its active topic beat in the same version-checked meeting-row update.
  Rationale: two separate writes allow concurrent submissions to leave one request's topic paired with the other request's phase transition. One compare-and-set update makes the winning version authoritative for both values.
  Date/Author: 2026-09-13 / Codex

- Decision: regenerate the orchestration portion of `+page.svelte` as a small generic beat loop after the server path is proven.
  Rationale: debugging the nested `runRound*` chain would preserve the duplicate source of truth. Transcript rendering, SSE display, crisis presentation, and input components remain valuable; the hand-written sequence functions are the replaceable part.
  Date/Author: 2026-09-12 / Codex

- Decision: persist the generated empty-chair text as a non-user share with null `characterId` and interaction type `empty_chair`, and render that type as a ritual entry with no speaker label.
  Rationale: it is a room moment rather than a character performance. Reusing the shares table gives it ordering, refresh, and beat-id idempotence without adding a second transcript store.
  Date/Author: 2026-09-12 / Codex

- Decision: replace exact sentence ranges in every ritual prompt used by the beat engine with plain guidance such as `brief`, `concise`, and `naturally complete`.
  Rationale: the new engine must not spread a known prompt-rule violation. This is a narrow constraint repair, not a general rewrite of character voice or the style constitution.
  Date/Author: 2026-09-12 / Codex

## Outcomes & Retrospective

Planning is complete; no application code has been implemented. The plan intentionally replaces only the meeting-script portion of the large Svelte page. It preserves the working transcript UI and specialized server seams, creates one durable server answer for each next moment, and makes transcript persistence the authority after a retry or refresh.

The seven milestones are ordered by real dependency. The pure contract comes first. Versioned persistence makes the contract safe under retry. The endpoint proves the server can answer before consumers migrate. Route completion then makes side effects idempotent. Only after those gates pass does the client delete its old sequence. Refresh and empty-chair quality are proven as distinct user-visible outcomes.

## Context and Orientation

The meeting's broad state lives in `MeetingPhaseState` in `app/src/lib/core/types.ts`. `app/src/lib/core/ritual-orchestration.ts` initializes that state, validates phase transitions, and records which characters and whether the user spoke. It does not currently describe the next moment inside a phase.

The meeting page is `app/src/routes/meeting/[id]/+page.svelte`. It renders a transcript, streams generated character text, presents one input control at a time, and handles crisis and closing. It also contains the entire meeting script. The functions `runFreshMeeting`, `runRoundOne`, `runRoundTwo`, `runRoundThree`, `runClosing`, and `continueFromPersistedPhase` call one another, choose speakers, insert local ritual text, and wait between moments. These are the functions this plan replaces.

Character generation runs through `app/src/routes/meeting/[id]/share/+server.ts`; user speech runs through `user-share/+server.ts`; crisis support and closing have their own child routes. The database contract is `app/src/lib/seams/database/contract.ts`, with a mock in `app/src/lib/seams/database/mock.ts` and Supabase adapter in `app/src/lib/server/seams/database/adapter.ts`. `meetings.phase_state` stores the serialized phase JSON. `shares` stores transcript content in `sequence_order`.

A beat is one renderer instruction with a stable id. A character-share beat names a roster character and interaction type. A room-cue beat contains a controlled cue key such as `moment_of_silence`, which the UI maps to existing presentation text. A generated-room-moment beat asks the server to generate the empty-chair entry. A user-gate beat says which input the room awaits: introduction, topic, share or reflection. A close beat invokes the existing close workflow. A finished beat leaves the reflection view visible and stops polling.

Claiming a beat means storing it as the phase state's `activeBeat` before returning it. Completing a beat means validating its id against the active beat, applying its recorded outcome, clearing it, incrementing the cursor, and persisting the next phase state. Compare-and-set means the database update includes the version that was read; if another request changed that row first, the update changes zero rows and the route reloads instead of overwriting the newer state.

The privacy plan adds a hook-level owner check to every `/meeting/[id]` request. All endpoints in this plan are created below that route and must rely on the common gate. They must never weaken it or add a second inconsistent owner rule.

## Requirements

`BEAT-01` requires one pure function to return the existing active beat or deterministically choose the next beat from persisted state, meeting context, roster, and transcript facts. `BEAT-02` requires the chosen beat to be persisted before exposure and protected by a versioned compare-and-set write. `BEAT-03` requires one stored generated entry per beat id. `BEAT-04` requires the client to render server beats without hardcoded round or speaker sequencing. `BEAT-05` requires refresh at every user gate and after every generated share to resume without transcript growth. `BEAT-06` requires crisis interruption and recovery to preserve a truthful resume point. `BEAT-07` requires a fresh persisted empty-chair moment that follows all prompt constraints. `BEAT-08` requires the room's topic choice and completion state to survive refresh.

## Implementation Slices

These are the maximum assignment units for Codex or a subagent. Assign one slice at a time, with exclusive ownership of its files during that turn. A passing slice returns paths, test evidence, and any newly discovered dependency to the main agent; it does not continue into the next label without a new assignment.

- `BEAT-A` adds the beat union, backward-compatible phase-state fields, and validator tests in `core/types.ts` and the narrow contract tests that exercise those types.
- `BEAT-B` implements only the opening, empty-chair, cue, and introduction selection in `core/meeting-beats.ts` with table-driven pure tests.
- `BEAT-C` adds topic, three-round, closing, and finished selection to the same pure engine after `BEAT-B` passes. It does not touch routes.
- `BEAT-D` adds completion, deterministic optional branches, listening-only, and crisis resume behavior to the pure engine. It stops at core tests.
- `BEAT-E` repairs the exact sentence-count instructions in the prompt builders used by this flow after reading `style-constitution.ts`. It owns only `prompt-templates.ts` and its spec.
- `BEAT-F` adds migration `20260912_000005_server_owned_meeting_beats.sql`, the `beatId` and `empty_chair` contract changes, validators, and fixtures. It does not implement adapter queries.
- `BEAT-G` implements the mock's versioned phase, beat lookup, unique-retry, and topic behavior with contract tests.
- `BEAT-H` implements the same behavior in the Supabase adapter with focused version-win, version-conflict, and stored-beat tests.
- `BEAT-I` creates the empty-request claim behavior in `/next` and its route spec. It returns an existing or newly persisted active beat and has no acknowledgment behavior yet.
- `BEAT-J` adds room-cue and topic acknowledgments to `/next`, including server topic persistence and version-conflict recovery.
- `BEAT-K` migrates `share/+server.ts` to derive generation from an active character beat and return an existing beat-owned share on retry.
- `BEAT-L` migrates `user-share/+server.ts` and then `crisis/+server.ts` to active-beat completion. These two routes are paired because the user-share result creates the crisis transition contract; no other route belongs in this slice.
- `BEAT-M` migrates `close/+server.ts` to its active close beat and server-loaded transcript context. `expand/+server.ts` receives only compatibility adjustments required by the shared contract.
- `BEAT-N` replaces the page's named sequence functions with the generic renderer loop after `BEAT-I` through `BEAT-M` pass. It owns `+page.svelte` and its direct component tests; it does not split the file into new components.
- `BEAT-O` builds the refresh matrix in the route integration suite and Playwright, then removes the resolved replay item from `DEFERRED.md` only if every case passes.
- `BEAT-P` wires, persists, renders, and tests the generated empty-chair beat. It may touch the already-established branch points but must not reopen round sequencing.
- `BEAT-Q` runs the full nonfixture verification, performs the final stale-code search, and updates the plan and governance files with actual evidence. It contains no new implementation behavior.

The deliberately narrow slices reflect the risk of this migration. `BEAT-N` is the regenerate-over-debug slice: the old orchestration block is deleted and replaced only after the server contract is proven. The rest are contract, adapter, or single-route outcomes that can be reviewed independently.

## What Not To Do

Do not patch replay guards into `continueFromPersistedPhase` or add more flags to the `runRound*` chain. Do not move those functions into helper files and call that server ownership. They are removed in `BEAT-N`.

Do not let the browser select a speaker, phase, interaction type, sequence order, optional branch, or persisted topic. Do not keep a production switch that allows both the old client script and the server beat engine to advance one meeting.

Do not use `Math.random()`, current time, request order, or unstable database row order to choose a beat or id. Do not update unversioned phase state after the compare-and-set contract lands. Do not store a topic separately from completing its active topic beat. Do not treat a second generated string as equivalent to returning the first persisted result.

Do not follow the archived plan's fixed branch, old checkout paths, frontend-owned ordering, or ban on an orchestration endpoint. Do not split the entire large Svelte page before deleting its obsolete orchestration; issue #90 follows this work.

Do not rewrite character voices, the style constitution, therapy blocklist, or general generation system. Do not add exact sentence counts, forced physical actions, archetype labels, placeholder voice examples, or empty `SECTION: none` blocks. Do not show a candidate below the existing authenticity and voice-consistency thresholds.

Do not add a stock empty-chair fallback, show beat ids or phase machinery in the UI, call live providers in deterministic tests, provision production infrastructure, or fold identity and cleanup epics into this plan.

## Plan of Work

### Milestone 1: define the pure beat engine and compliant ritual prompts

Create `app/src/lib/core/meeting-beats.ts` and `app/src/lib/core/meeting-beats.spec.ts`. Add the beat types to `app/src/lib/core/types.ts`. Use a discriminated union so each kind carries only valid fields. The public contract must express at least these kinds: `character_share`, `room_cue`, `generated_room_moment`, `user_gate`, `close_meeting`, and `finished`. Every variant includes `id`, `ordinal`, `phase`, and `pauseAfterMs`. Character beats require `characterId` and `interactionType`; room cues require a controlled `cue`; user gates require a controlled `gate`; the generated room moment requires `moment: 'empty_chair'`.

Extend `MeetingPhaseState` with `beatCursor: number` and `activeBeat: MeetingBeat | null`. Its validator and serialized form must accept historical state without those fields by reviving it as cursor zero and no active beat. New initialization writes both explicitly.

Export a pure `nextMeetingBeat(input)` function. If `input.phaseState.activeBeat` exists, return that exact value without consuming randomness or changing state. Otherwise choose the next beat from the current phase, cursor, persisted participants, stored topic and mind context, listening choice, and compact transcript facts. A compact fact is a count, last interaction type, or stable id needed for sequencing; never pass the entire database adapter into core. Build beat ids from stable inputs, for example `<phase>:<cursor>:<kind>:<stable-subject>`. Do not use timestamps, array insertion order that is not part of the persisted roster, or `Math.random()`.

Export a pure `completeMeetingBeat(state, beatId, outcome)` function. It rejects a mismatched id, records character or user completion through the existing ritual helpers, applies a legal phase transition where appropriate, clears `activeBeat`, and increments `beatCursor`. A topic outcome must be validated against an exported `TOPIC_OPTIONS` moved from `+page.svelte`; persistence of that valid topic occurs at the server seam in Milestone 4. Crisis completion records `preCrisisPhase` and returns to the saved point without replaying completed work.

Write table-driven tests for the full opening through finished sequence, every user gate, listening-only automatic pass, the three rounds, optional crosstalk and hard-question branches, crisis interruption and recovery, empty roster rejection, stable roster ordering, retry of an active beat, and invalid completion. Test two meeting ids that select different optional branches and repeat each input to prove it is stable.

Before wiring the engine to generation, repair the exact sentence-count instructions in `app/src/lib/core/prompt-templates.ts`, including the meeting opening, topic acknowledgment, ritual opening, ritual introduction, ritual reading, topic introduction, ritual closing, and empty-chair builders used by this flow. Preserve their intent with natural brevity guidance. Update `prompt-templates.spec.ts` to test meaning and forbidden content without asserting a sentence range. Read `style-constitution.ts` before making these edits. Do not change character foundations, require physical actions, pass archetype labels to generation, weaken the three-example voice contract, or fill empty prompt sections with placeholders.

This milestone is complete when the pure suite shows the same input always returns the same next beat, the canonical experience reaches `finished`, and a repository search finds no exact sentence-count instruction in the ritual builders used by this plan. It satisfies `BEAT-01` and prepares `BEAT-06` through `BEAT-08`.

### Milestone 2: make beat state and generated entries retry-safe

Create `app/supabase/migrations/20260912_000005_server_owned_meeting_beats.sql`, following the private-intake migration numbered `000004`. Add `phase_version bigint not null default 0` to `public.meetings`. Add nullable `beat_id text` to `public.shares` and a partial unique index on `(meeting_id, beat_id)` where `beat_id is not null`. Replace the `shares_interaction_type_check` constraint with the existing values plus `empty_chair`. Every statement must be safe to retry; constraint replacement should use the same explicit drop-and-add pattern already used by the March roster migration.

In `app/src/lib/seams/database/contract.ts`, add `beatId: string | null` to `ShareRecord` and add `empty_chair` to `ShareInteractionType` in `app/src/lib/core/types.ts`. Extend validators, fixtures, the mock, the adapter, and test doubles. Historical entries use null. New beat-owned entries use the stable id.

Add a versioned phase read that returns `{ phaseState: MeetingPhaseState | null, version: number }` and a compare-and-set update accepting `meetingId`, `expectedVersion`, `phaseState`, and an optional meeting patch limited to the validated topic. The Supabase update must filter by both meeting id and `phase_version = expectedVersion`, write the new phase state and version `expectedVersion + 1`, and include the topic in that same row update when completing a topic gate. Report `applied: false` when zero rows changed. Keep existing phase methods only while routes are migrated; remove or delegate them at the end so no route can silently bypass versioning.

Add `getShareByBeatId({ meetingId, beatId })`. It returns `NOT_FOUND` for no entry. Make beat-aware append handling converge on the stored row when the unique index reports that another request already wrote the same beat. The server route must also check for an existing beat entry before calling the model, which handles the ordinary retry without spending generation work twice.

Update contract and adapter tests for version wins, version conflicts, stable existing-share lookup, nullable historical beat ids, unique-conflict recovery, and `empty_chair` mapping with null character id. This milestone is complete when a simulated pair of writers using the same version produces one applied update, one conflict, and one canonical stored beat entry. It satisfies `BEAT-02` and `BEAT-03` at the persistence boundary.

### Milestone 3: add the next-beat endpoint

Create `app/src/routes/meeting/[id]/next/+server.ts` and route tests in `app/src/lib/server/routes/meeting-next-beat.spec.ts`. The endpoint is a `POST` because claiming or acknowledging a beat changes persisted state. Its body may be empty when asking for the next beat. For a `room_cue` acknowledgment it accepts `{ completedBeatId }`. For the topic gate it accepts `{ completedBeatId, topic }`. Reject unrelated fields, invalid topic values, mismatched beat ids, and attempts to acknowledge character, generated, share, crisis, close, or finished beats through this generic path.

For an empty request, load the versioned phase state, owned meeting context from `locals.meetingContext`, roster, and the compact transcript facts required by `nextMeetingBeat`. If an active beat exists, return it unchanged. If the core chooses a new beat, compare-and-set the new active state before responding. On a version conflict, reload and retry a small bounded number of times; normally the response becomes the beat stored by the competing request. If contention does not settle, return HTTP 409 with a retryable seam error rather than choosing locally.

For a room cue acknowledgment, complete and compare-and-set it, then return the next claimed beat in the same response. For a valid topic acknowledgment, complete the topic beat and pass the validated topic as the optional patch in that same compare-and-set meeting update. Keep `TOPIC_OPTIONS` in pure shared code so both the page and server validate the same fixed set. If two requests submit different valid topics at the same version, only the winner's topic and completed phase may be stored; the loser reloads that canonical result or receives a stale-beat conflict. Prove this exact race in the route and adapter tests. Do not add a standalone topic update.

The returned JSON is a `SeamResult<{ beat: MeetingBeat; phaseState: MeetingPhaseState }>` or the repository's equivalent existing response envelope. It contains no prompt text, private intake, model context, or arbitrary client instructions. This milestone is complete when repeated empty requests return the same id, two simulated claimers converge on one id, completed room cues advance once, a valid topic survives reload, and the ownership test proves the endpoint is gated before phase or transcript reads. It satisfies `BEAT-01`, `BEAT-02`, and `BEAT-08` at the route boundary.

### Milestone 4: let specialized routes complete the active beat

Migrate `share/+server.ts` first. Normal meeting calls provide only `beatId` plus transport options needed for SSE. The route loads the active beat, requires kind `character_share`, and derives `characterId`, `interactionType`, phase, selected topic, and sequence position from server state. Ignore no client override silently: reject legacy character or interaction values that disagree so drift is visible during migration. Before generation, call `getShareByBeatId`; if found, stream or return the canonical stored content and finish any still-active matching beat. After new generation passes the existing quality checks, append it with the beat id, complete the beat, and compare-and-set the new phase state. A unique conflict reloads the canonical entry rather than appending or regenerating again.

Migrate `user-share/+server.ts` so it requires an active `user_gate` for introduction or share, accepts the beat id and user text, and derives sequence and phase behavior on the server. Preserve pass and listening-only behavior. Crisis detection still runs before ordinary completion: persist the user's beat-owned share once, enter crisis with the interrupted resume point recorded, and let the crisis route operate on that state.

Migrate `crisis/+server.ts` to require the crisis state's active support beat or materialize it through the same server engine. Repeated crisis requests return the stored response for the crisis beat. Completing support resumes from the saved pre-crisis state without resurrecting the interrupted active beat or replaying earlier shares.

Migrate `close/+server.ts` to require the active `close_meeting` beat. Load the topic and recent shares on the server instead of accepting them as client authority. Repeated close calls return the existing completion result and never append a second closing or run completion side effects twice. Keep `expand/+server.ts` outside sequence advancement; it still inherits the ownership gate and must not change the active beat.

Route tests must cover stale ids, wrong beat kinds, retries before and after persistence, unique conflicts, quality-rejected candidates, pass, heavy share, crisis, close, and adapter outages. Keep the rule that a character result with authenticity below 6 or voice consistency below 6 is not shown; skip or retry according to existing quality behavior without completing the beat with rejected text.

This milestone is complete when only the server-selected character and interaction can be generated, every persisted generated or user entry carries one beat id, and repeating any completion returns one canonical entry and one advanced state. It satisfies `BEAT-03`, `BEAT-06`, and the server half of `BEAT-04`.

### Milestone 5: replace the browser script with one renderer loop

In `app/src/routes/meeting/[id]/+page.svelte`, preserve the existing transcript components, SSE preview, input components, crisis display, and reflection. Delete the orchestration functions `runFreshMeeting`, `runRounds`, `runRoundOne`, `runRoundTwo`, `runRoundThree`, `runClosing`, and `continueFromPersistedPhase`. Delete their speaker-picking, hard-question, round-specific random, and phase-replay helpers once tests prove the server supplies those decisions.

Write one small loop that posts to `/next`, switches on the returned discriminated beat kind, and renders it. `room_cue` maps a controlled cue key to the existing system, action, or ritual presentation, waits for `pauseAfterMs`, then acknowledges that id. `character_share` streams the server-selected beat through `/share`. `generated_room_moment` uses the empty-chair path completed in Milestone 7. `user_gate` presents the corresponding existing control and stops the loop until user input completes it. `close_meeting` invokes `/close`. `finished` leaves reflection visible and stops. Every asynchronous continuation checks one cancellation token and is cancelled on unmount, navigation, or crisis.

The page may own animation and waiting mechanics, but it must not own phase-specific delays or decisions. The `pauseAfterMs` value comes from the beat. The client may clamp an unreasonable value to a documented safe presentation range, but must not substitute a different sequence. It may upsert transcript entries by stored share id; it must not invent persisted sequence order or append a second local copy.

Move `TOPIC_OPTIONS` to the shared pure module and import it for rendering. Topic selection acknowledges the active topic gate through `/next`. User introduction and round shares go through `/user-share` with their beat ids. Remove private meeting context from generation query strings where the server can derive it from `locals.meetingContext` and stored state.

Use component tests or route-backed Playwright tests to prove each beat kind renders through the one loop. A source assertion may supplement behavior by rejecting reintroduction of the named `runRound*` and `continueFromPersistedPhase` functions, but behavior tests remain the primary proof. This milestone is complete when the page has no hardcoded speaker order, optional branch selection, round recursion, or phase replay. It satisfies `BEAT-04`.

### Milestone 6: prove replay-free refresh

Expand `app/src/lib/server/routes/meeting-ritual-phase.integration.spec.ts` or create a focused integration suite that drives the next-beat protocol through every phase using the mock database. At each point after a generated share and at each user gate, snapshot the persisted shares and state, reconstruct the route/page inputs as a refresh would, ask for the next beat, and assert that the share count and prior content are unchanged. Then complete the returned beat and continue.

Add Playwright coverage in `app/e2e/meeting-flow.spec.ts` for at least a mid-round refresh, a refresh while waiting for the user, and a refresh immediately after a generated response. Capture the transcript entry ids before refresh and compare after rehydration. No id may disappear, change content, or appear twice. The next new entry must have the next beat id and sequence order.

Exercise crisis during a user gate, refresh during crisis support, complete support, and verify the room resumes from the stored point. Exercise a simulated network retry after the server persisted a share but before the client received the response; the retry must return that stored share and advance once.

Remove the 2026-03-19 replay-free refresh item from `DEFERRED.md` only after these cases pass. If any phase cannot be proven, keep the item and record the exact phase and state rather than declaring #82 solved. This milestone is complete when refresh alone never calls generation and never increases transcript length. It satisfies `BEAT-05` and `BEAT-06`.

### Milestone 7: generate and persist the empty chair

Add `empty_chair` to `ShareInteractionType` and its database constraint in Milestone 2, then implement the `generated_room_moment` branch using `buildEmptyChairPrompt`. Call the existing Grok seam with a stable internal correlation character id such as `empty-chair-room`; persist the result with `characterId: null`, `isUserShare: false`, `interactionType: 'empty_chair'`, and the active beat id. The client renders this interaction type as a ritual or room entry with no character speaker label. Do not treat null character id as the user for this entry.

The prompt must ask for a brief, naturally complete empty-chair moment with no names, therapy language, slogans, forced physical action, explained moral, or exact sentence count. It must omit empty sections rather than render placeholder values. Preserve the style constitution. The hardcoded sentence in `runFreshMeeting` disappears with that function and must not survive as a fallback. A generation failure should show the existing recoverable room error and leave the beat active for retry; it must not store placeholder prose.

Update prompt tests, share-route tests, transcript mapping tests, and the integration sequence. The mock response should be clearly written test content rather than `example line` placeholders. Verify one generation on first completion, zero generation calls when the stored beat is retried, one persisted entry, no speaker label, and the same text after refresh.

This milestone is complete when two newly created meetings may receive different mocked/provider outputs, one meeting always keeps its own first persisted output, and no literal production fallback supplies the old sentence. It satisfies `BEAT-07` and closes #83.

## Concrete Steps

Run all application commands from `C:\Users\shiva\OneDrive\Documents\ChatGPT\14thstep\app` in PowerShell, using `npm.cmd` so PowerShell execution-policy shims do not interfere.

After Milestone 1:

    npm.cmd run test:unit -- --run src/lib/core/meeting-beats.spec.ts src/lib/core/ritual-orchestration.spec.ts src/lib/core/prompt-templates.spec.ts
    npm.cmd run verify:core
    npm.cmd run check

Expect the named suites and core verification to pass and `svelte-check` to report zero errors. Search the prompts used by the beat engine and confirm no exact sentence range remains.

After Milestone 2:

    npm.cmd run test:unit -- --run src/lib/seams/database/contract.test.ts src/lib/server/seams/database/adapter.spec.ts
    npm.cmd run verify:contracts
    npm.cmd run check

Expect the version-conflict and beat-id retry cases to pass. Do not apply the migration to the unavailable production tenant as part of this local gate.

After Milestones 3 and 4:

    npm.cmd run test:unit -- --run src/lib/server/routes/meeting-next-beat.spec.ts src/lib/server/routes/meeting-share.spec.ts src/lib/server/routes/meeting-user-share.spec.ts src/lib/server/routes/meeting-crisis.spec.ts src/lib/server/routes/meeting-close.spec.ts src/lib/server/routes/meeting-ritual-phase.integration.spec.ts
    npm.cmd run verify:composition
    npm.cmd run check

Expect all next, completion, retry, crisis, and close cases to pass. The composition check must continue to prove that database and model I/O stay in server modules.

After Milestones 5 through 7:

    npm.cmd run test:unit -- --run src/lib/core/meeting-beats.spec.ts src/lib/core/prompt-templates.spec.ts src/lib/server/routes/meeting-ritual-phase.integration.spec.ts
    npm.cmd run test:e2e
    npm.cmd run lint:verify
    npm.cmd run check

Expect the full browser flow and the dedicated refresh cases to pass. Check that the page no longer contains the retired sequence functions:

    rg -n "runFreshMeeting|runRoundOne|runRoundTwo|runRoundThree|runClosing|continueFromPersistedPhase" "src/routes/meeting/[id]/+page.svelte"

Expect no matches. Then run every nonfixture repository gate:

    npm.cmd run verify:contracts
    npm.cmd run verify:core
    npm.cmd run verify:composition
    npm.cmd run test:e2e

Finally run `npm.cmd run verify`. Until #71 and #91 are resolved, expect failure only at `verify:fixtures` because the provider fixtures are stale. All earlier checks must pass, and any other failure must be fixed before completion.

From the repository root, inspect the final change:

    git diff --check
    git status --short

Expect no credentials, environment files, generated test output, or unrelated production changes.

## Validation and Acceptance

Start from a new owned meeting created through the clean join flow. Record each returned beat id from opening through post-meeting. A second request made before completing any beat must return the identical id and payload. Completing a beat twice must produce one stored effect and one next state.

During each sharing round, refresh after the first character, while waiting for the user, and immediately after submitting the user share. Before and after refresh, transcript ids and content must match exactly. Refresh must not call the model. The next new beat must follow the saved cursor, not the beginning of the round.

For two different meeting ids with the same roster and intake, optional choices may differ. Repeating either meeting from its saved state must not differ. Every selected character must belong to the persisted roster. Every interaction type must match the active beat. No browser-supplied character, phase, sequence order, topic, or interaction override may control server behavior.

Trigger crisis language during a user gate. The ordinary loop must stop, one crisis response must persist, and refresh must remain in crisis at the same active support beat. Completing support must resume from the pre-crisis point without replaying earlier beats.

At the empty-chair beat, the model receives the pure empty-chair prompt once and the transcript stores one null-character `empty_chair` entry. It displays without a person's name, remains identical after refresh, and contains none of the forbidden placeholder or forced-count instructions. If generation fails, the same active beat remains available for retry and no hardcoded replacement appears.

The final page must feel continuous. The user sees the existing room pacing and one relevant control at a time; no phase label, beat id, cursor, retry status, or orchestration vocabulary is shown in the product UI.

## Idempotence and Recovery

Beat ids are stable functions of persisted inputs. Claiming an already active beat is a read. Completing an already completed generated beat finds the share by beat id and returns the canonical result. The partial unique database index prevents duplicate stored output even if two requests race.

Compare-and-set phase updates never overwrite a newer version. A losing next-beat request reloads and returns the winner's beat. A losing completion request reloads, checks whether its beat already completed, and returns the canonical outcome or a clear stale-beat conflict. Bound retry loops; do not recurse indefinitely under contention.

Apply the migration only after the private-intake migration. Its added columns and index are safe to create twice. If code rollback becomes necessary after a live migration, keep nullable `shares.beat_id`, `meetings.phase_version`, and the expanded interaction constraint in place while reverting application consumers. Removing stored beat ids is destructive and is never the first rollback action.

Build the server path additively while the old client sequence still runs only in tests or behind a temporary local switch. Once route and integration tests prove the new path, replace the page orchestration in one coherent slice and delete the switch before merge. Do not ship two production sequence authorities.

If empty-chair generation is unavailable, leave the active beat pending and expose the existing recoverable failure presentation. Do not write a stock sentence, an empty share, or a placeholder voice line to advance the meeting.

## Artifacts and Notes

The current control flow is:

    page phase switch -> runRound* -> choose speaker locally -> call route
    refresh -> phase switch -> run the entire round again -> append new shares

The target control flow is:

    POST /meeting/<id>/next -> claim or return one persisted active beat
    generic page renderer -> invoke the route appropriate to that beat
    route -> persist one beat-owned result -> complete with version check
    refresh -> load stored transcript and active beat -> continue once

The requirement map is: `BEAT-01` is Milestones 1 and 3; `BEAT-02` is Milestones 2 and 3; `BEAT-03` is Milestones 2 and 4; `BEAT-04` is Milestones 4 and 5; `BEAT-05` and `BEAT-06` are Milestone 6; `BEAT-07` is Milestone 7; `BEAT-08` is Milestones 1, 3, and 5.

The March restore plan remains at `archive/plans/restore-virtual-recovery-meeting-execplan-2026-03-19.md`. Its shipped experience target and historical findings are useful evidence. Its frontend ownership rules, fixed branch instructions, old checkout paths, and prohibition on an orchestration endpoint are superseded and must not guide implementation.

## Interfaces and Dependencies

The implementation must expose a discriminated `MeetingBeat` union from `app/src/lib/core/types.ts` equivalent to:

    type MeetingBeat =
        | BeatBase & { kind: 'character_share'; characterId: string; interactionType: ShareInteractionType }
        | BeatBase & { kind: 'room_cue'; cue: RoomCue }
        | BeatBase & { kind: 'generated_room_moment'; moment: 'empty_chair' }
        | BeatBase & { kind: 'user_gate'; gate: 'introduction' | 'topic' | 'share' | 'reflection' }
        | BeatBase & { kind: 'close_meeting' }
        | BeatBase & { kind: 'finished' };

    interface BeatBase {
        id: string;
        ordinal: number;
        phase: MeetingPhase;
        pauseAfterMs: number;
    }

`MeetingPhaseState` must add `beatCursor: number` and `activeBeat: MeetingBeat | null`, with backward-compatible revival for historical JSON. `nextMeetingBeat` and `completeMeetingBeat` live in `app/src/lib/core/meeting-beats.ts` and perform no I/O.

The database seam must provide a versioned phase read, a compare-and-set meeting-state update that can atomically include a validated topic, and `getShareByBeatId`. Exact interface names may follow existing repository naming, but their semantics and tests are fixed by this plan. `ShareRecord.beatId` is nullable for history and required for new beat-owned generated and user transcript entries.

The next-beat route depends on the ownership gate and `locals.meetingContext` from `plans/private-meeting-access-execplan.md`. The meeting-flow plan does not depend on a live provider for contract, mock, route, or browser work. Applying migrations, refreshing provider fixtures, and production verification remain blocked by #71 and #91.

Issue #90 should follow this plan for `+page.svelte`: deleting the old orchestration will materially shrink the file and reveal the remaining honest component boundaries. Do not split the old sequence into several files before removing it. Issues #86 through #89 are independent except where their code touches a file in the active slice; do not pull them into these milestones.

## Revision Note

2026-09-12: Created this plan to replace the superseded frontend-owned March meeting plan with the server-owned direction in epic #77. The revision introduces persisted beats and idempotency before client cutover, makes replay-free refresh an acceptance condition, and gives the unused empty-chair prompt a compliant generated and persisted path.

2026-09-13: Tightened topic completion so the selected topic and phase transition are committed in one version-checked meeting-row update. This closes the race where separate writes could pair the losing topic with the winning beat state.
