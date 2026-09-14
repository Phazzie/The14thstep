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
- [x] (2026-09-14 03:14Z) Integrated PR review findings for atomic topic and close work, canonical user/crisis/expansion inputs, durable generation claims and room cues, meeting-scoped callback effects, summary hydration, one route-and-renderer promotion boundary, generated-moment completion and quality, injected time, milestone order, test paths, and the required real-system probe stage.
- [ ] Milestone 1: define the pure beat engine and repair the ritual prompt constraints it will use.
- [ ] Milestone 2: probe and implement versioned beat, share-analysis, and close persistence in seam order.
- [ ] Milestone 3: expose the protected next-beat protocol and prove stable retries.
- [ ] Milestone 4: make character, user, crisis, topic, and close routes complete only the active beat.
- [ ] Milestone 5: generate, validate, and persist the empty-chair moment.
- [ ] Milestone 6: replace the page's hand-written meeting script with one generic renderer loop.
- [ ] Milestone 7: prove replay-free refresh through every meeting phase.

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

- Observation: user-share analysis currently runs on the request body before the database decides which racing request owns the beat.
  Evidence: `user-share/+server.ts` performs crisis, heavy-disclosure, and significance analysis before `addShare`. If two different payloads race for one beat, the losing request could advance phase state using analysis that does not describe the unique persisted share.

- Observation: the close route has several externally visible side effects before it reaches post-meeting state, but no durable claim or stored close response.
  Evidence: summary generation, memory extraction, `completeMeeting`, callback scanning, callback lifecycle, and phase persistence can all run again on a repeated request. The meeting contract does not expose a canonical close result that a retry can return.

- Observation: ownership does not make the expansion request's topic and recent transcript trustworthy.
  Evidence: `expand/+server.ts` verifies the target share belongs to the meeting but builds generation and quality prompts from browser-supplied `topic` and `recentShares`.

- Observation: the current ritual transition helpers read `new Date()` internally.
  Evidence: a beat completion that calls `transitionToNextPhase` would produce different `phaseStartedAt` values for identical arguments unless the server supplies time explicitly.

- Observation: the existing crisis endpoint accepts the trigger text and display name from the browser.
  Evidence: persisting only a pre-crisis phase cannot prove which user share caused support after refresh, and altered client text could drive a retry for the same support beat.

- Observation: the versioned phase, user-analysis, and close-claim operations are new database seam behavior with no captured provider evidence.
  Evidence: the repository requires a real-system probe before fixtures, mocks, contract tests, and adapter work. Existing database captures predate these columns, indexes, and contention results.

- Observation: the current SSE share route emits generated chunks before the final share row is appended.
  Evidence: two callers can both miss the beat lookup and show different accepted candidates before the unique beat index selects one stored winner. Persistence after streaming cannot retract the losing text.

- Observation: acknowledged room cues exist only in browser transcript state.
  Evidence: clearing a `room_cue` active beat leaves no stored transcript record for the moment of silence, readings, or closing ritual, so refresh cannot rehydrate identical transcript ids and content.

- Observation: a lost close response followed by refresh can reach `finished` without restoring reflection text.
  Evidence: the proposed `finished` beat stops the renderer, while the page loader does not yet map the meeting's stored summary into initial page data.

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

- Decision: validate every generated empty-chair candidate before persistence with the same minimum authenticity and voice-consistency scores used for character shares.
  Rationale: a room moment is still generated text shown to a vulnerable user. A dedicated room-voice validation prompt can return the existing quality schema; a rejected candidate leaves the beat active and cannot enter the transcript.
  Date/Author: 2026-09-13 / Codex

- Decision: after a user-share insert wins or loses its unique beat id, derive crisis, heavy-disclosure, significance, and phase outcome from the canonical stored share.
  Rationale: this makes a race converge on one content value and one interpretation. The losing request must never advance the meeting using text that the transcript did not keep.
  Date/Author: 2026-09-13 / Codex

- Decision: make close a durably claimed, beat-keyed workflow with a stored canonical response.
  Rationale: the active beat alone does not prevent two requests from running summary, memory, callback, and lifecycle work before either advances phase state. A unique close-run claim lets only its holder run side effects, and a completed record gives all retries the same response.
  Date/Author: 2026-09-13 / Codex

- Decision: expansion accepts only the target share id and derives topic and recent transcript from owned server state.
  Rationale: prompt and quality context affect generated output and must follow the same server-authority rule as character shares and close.
  Date/Author: 2026-09-13 / Codex

- Decision: inject one server-clock timestamp into pure beat initialization and completion.
  Rationale: a function that calls `new Date()` is not deterministic even if its other inputs match. The clock seam supplies the value once; core transition helpers receive it as data and tests use a fixed timestamp.
  Date/Author: 2026-09-13 / Codex

- Decision: model crisis support as an explicit beat carrying the canonical triggering share id, and remove the unused reflection user gate.
  Rationale: crisis generation must reload the exact stored user text and owner identity. Reflection is the presentation reached after close; it requires no user submission, so `finished` can render it without an uncompletable gate.
  Date/Author: 2026-09-13 / Codex

- Decision: probe the migration against the real local Supabase stack and capture contention results before implementing its mock or adapter.
  Rationale: phase compare-and-set, first-analysis-wins, partial unique indexes, and leased close claims depend on actual Postgres/PostgREST behavior. The privacy plan establishes the pinned local tool and configuration, so this plan can preserve seam order without creating hosted infrastructure.
  Date/Author: 2026-09-13 / Codex

- Decision: promote specialized route migration and the generic renderer as one cutover, while keeping their implementation assignments separate.
  Rationale: the current page sends legacy bodies and no beat ids. Requiring active beats in those routes before the renderer changes would stop the shipped room. Small subagent slices remain useful, but `BEAT-L` through `BEAT-Q` cannot land on `main` independently.
  Date/Author: 2026-09-13 / Codex

- Decision: persist every acknowledged room cue as a beat-owned, non-user transcript row.
  Rationale: cue text is controlled rather than generated, but it is observable meeting history. A stored cue key, rendered text, and beat id let refresh restore the same entry and let duplicate acknowledgments converge through the existing unique index.
  Date/Author: 2026-09-13 / Codex

- Decision: claim generated character and room-moment beats before any model stream reaches a client.
  Rationale: a unique row written after SSE output is too late to keep competing clients canonical. A leased generation claim allows one stream producer, makes competitors wait, and points completed retries to the stored share.
  Date/Author: 2026-09-13 / Codex

- Decision: namespace close callback effect keys with the meeting id and hydrate reflection from the stored meeting summary.
  Rationale: beat ids can repeat across meetings, so a globally unique callback key needs meeting scope. The summary must enter page data so refresh after a lost close response still renders the completed reflection.
  Date/Author: 2026-09-13 / Codex

- Decision: replace exact sentence ranges in every ritual prompt used by the beat engine with plain guidance such as `brief`, `concise`, and `naturally complete`.
  Rationale: the new engine must not spread a known prompt-rule violation. This is a narrow constraint repair, not a general rewrite of character voice or the style constitution.
  Date/Author: 2026-09-12 / Codex

## Outcomes & Retrospective

Planning is complete; no application code has been implemented. The plan intentionally replaces only the meeting-script portion of the large Svelte page. It preserves the working transcript UI and specialized server seams, creates one durable server answer for each next moment, and makes transcript persistence the authority after a retry or refresh.

The seven milestones are ordered by real dependency. The pure contract comes first. Versioned persistence makes the contract safe under retry. The endpoint proves the server can answer before consumers migrate. Route completion then makes side effects idempotent. The generated empty-chair path lands before the renderer depends on it. Only after those gates pass does the client delete its old sequence, and the final milestone proves replay-free refresh across the completed flow.

## Context and Orientation

The meeting's broad state lives in `MeetingPhaseState` in `app/src/lib/core/types.ts`. `app/src/lib/core/ritual-orchestration.ts` initializes that state, validates phase transitions, and records which characters and whether the user spoke. It does not currently describe the next moment inside a phase.

The meeting page is `app/src/routes/meeting/[id]/+page.svelte`. It renders a transcript, streams generated character text, presents one input control at a time, and handles crisis and closing. It also contains the entire meeting script. The functions `runFreshMeeting`, `runRoundOne`, `runRoundTwo`, `runRoundThree`, `runClosing`, and `continueFromPersistedPhase` call one another, choose speakers, insert local ritual text, and wait between moments. These are the functions this plan replaces.

Character generation runs through `app/src/routes/meeting/[id]/share/+server.ts`; user speech runs through `user-share/+server.ts`; crisis support and closing have their own child routes. The database contract is `app/src/lib/seams/database/contract.ts`, with a mock in `app/src/lib/seams/database/mock.ts` and Supabase adapter in `app/src/lib/server/seams/database/adapter.ts`. `meetings.phase_state` stores the serialized phase JSON. `shares` stores transcript content in `sequence_order`.

A beat is one renderer instruction with a stable id. A character-share beat names a roster character and interaction type. A room-cue beat contains a controlled cue key such as `moment_of_silence`, which the UI maps to existing presentation text. A generated-room-moment beat asks the server to generate the empty-chair entry. A user-gate beat says which input the room awaits: introduction, topic, or share. A crisis-support beat names the canonical triggering user share and server-selected responder. A close beat invokes the existing close workflow. A finished beat leaves the post-meeting reflection visible and stops polling; there is no separate reflection gate because the current product asks for no reflection input.

Claiming a beat means storing it as the phase state's `activeBeat` before returning it. Completing a beat means validating its id against the active beat, applying its recorded outcome, clearing it, incrementing the cursor, and persisting the next phase state. Compare-and-set means the database update includes the version that was read; if another request changed that row first, the update changes zero rows and the route reloads instead of overwriting the newer state.

A user-share analysis is the stored interpretation of one canonical user entry: whether it indicates crisis, whether it is a heavy disclosure, and its significance score. The first valid analysis written for a beat wins. Requests that raced with different text or model output reload that stored interpretation before they can advance the phase.

A generation run is a short leased claim keyed by meeting and beat for character or generated-room text. The holder is the only request allowed to call and stream the model. Competing requests return a retryable in-progress response or the completed stored share. The holder renews its lease while generation and validation continue so a slow valid stream is not mistaken for a crashed worker.

A room cue is controlled text selected by a cue key in the pure beat engine rather than prose returned by a model. Acknowledgment persists that key, rendered text, beat id, and non-user status in the shares transcript before phase completion. This gives refresh the same stable record used for generated and user entries.

Closing needs a stronger claim because it performs several effects before the active beat can clear. A close run is one durable row keyed by meeting and beat. Its claim token is an unguessable value held by the worker allowed to proceed. Its lease is a bounded time during which competing requests wait instead of repeating work. A checkpoint is the validated generated output stored before database mutations; if the worker crashes and the lease expires, a new worker resumes from that checkpoint. The completed row stores the exact response returned to all later retries.

The privacy plan adds a hook-level owner check to every `/meeting/[id]` request. All endpoints in this plan are created below that route and must rely on the common gate. They must never weaken it or add a second inconsistent owner rule.

## Requirements

`BEAT-01` requires one pure function to return the existing active beat or deterministically choose the next beat from persisted state, meeting context, roster, and transcript facts. `BEAT-02` requires the chosen beat to be persisted before exposure and protected by a versioned compare-and-set write. `BEAT-03` requires one canonical stored effect per beat id, including generated entries, acknowledged room cues, user-share interpretation, and the complete close response. `BEAT-04` requires the client to render server beats without hardcoded round or speaker sequencing. `BEAT-05` requires refresh at every user gate, after every generated or cue entry, and after close to restore transcript and reflection without growth or loss. `BEAT-06` requires crisis interruption and recovery to preserve a truthful resume point. `BEAT-07` requires a fresh persisted empty-chair moment that follows all prompt and quality constraints. `BEAT-08` requires the room's topic choice and completion state to survive refresh.

## Implementation Slices

These are the maximum assignment units for Codex or a subagent. Assign one slice at a time, with exclusive ownership of its files during that turn. A passing slice returns paths, test evidence, and any newly discovered dependency to the main agent; it does not continue into the next label without a new assignment.

- `BEAT-A` adds the beat union, including `crisis_support`, backward-compatible phase-state fields, and validator tests in `core/types.ts` and the narrow contract tests that exercise those types.
- `BEAT-B` implements only the opening, empty-chair, cue, and introduction selection in `core/meeting-beats.ts` with table-driven pure tests.
- `BEAT-C` adds topic, three-round, closing, and finished selection to the same pure engine after `BEAT-B` passes. It does not touch routes.
- `BEAT-D` injects the server-supplied transition time and adds completion, deterministic optional branches, listening-only, canonical crisis-trigger resume behavior, and the direct close-to-finished path to the pure engine. It stops at core tests.
- `BEAT-E` repairs the exact sentence-count instructions in the prompt builders used by this flow after reading `style-constitution.ts`. It owns only `prompt-templates.ts` and its spec.
- `BEAT-F` adds the database contract and migration `20260912_000005_server_owned_meeting_beats.sql`, including canonical user-share analysis, durable room-cue fields, the generation-run ledger, and the unique close-run ledger. It updates validators but does not author fixtures, mock behavior, contract tests, or adapter queries.
- `BEAT-G` adds `probes/serverOwnedMeetingBeatsProbe.mjs`, runs it against the real local Supabase stack established by the privacy plan, and writes redacted version, beat, cue, generation-claim, analysis, and close-claim captures. It stops if a real probe cannot run and never hand-authors substitute fixtures.
- `BEAT-H` implements the fixture-backed mock's versioned phase, beat lookup, cue persistence, generation claims, unique-retry, first-analysis-wins, atomic topic, and close-claim behavior, then adds contract tests for schema conformance and mock fidelity.
- `BEAT-I` implements the captured behavior in the Supabase adapter with focused version-win, version-conflict, stored-cue, generation-claim, stored-beat, user-analysis race, close-claim winner, in-progress, and completed-result tests.
- `BEAT-J` creates the empty-request claim behavior in `/next` and its route spec. It returns an existing or newly persisted active beat and has no acknowledgment behavior yet.
- `BEAT-K` adds room-cue and topic acknowledgments to `/next`, including durable cue transcript rows, server topic persistence, and version-conflict recovery.
- `BEAT-L` migrates `share/+server.ts` to derive generation from an active character beat, acquire its generation claim before streaming, and return an existing beat-owned share on retry.
- `BEAT-M` migrates `user-share/+server.ts` and then `crisis/+server.ts` to active-beat completion, including canonical-share analysis and a persisted triggering-share id. These two routes are paired because the user-share result creates the crisis-support beat consumed by the second route; no other route belongs in this slice.
- `BEAT-N` migrates only `close/+server.ts` to the close-run claim and server-loaded transcript context. It stops when concurrent, completed-retry, and expired-lease recovery tests pass.
- `BEAT-O` makes only `expand/+server.ts` derive its topic and recent shares on the server. It stops when forged client context is rejected and both generated prompts receive canonical context.
- `BEAT-P` adds the `/room-moment` completion endpoint, acquires a generation claim, quality-validates, persists, and tests the generated empty-chair beat before any renderer depends on it. It may touch the already-established route branch points but must not reopen round sequencing.
- `BEAT-Q` makes the page loader expose the stored summary, then replaces the page's named sequence functions with the generic renderer loop after `BEAT-J` through `BEAT-P` pass. It owns the loader's summary mapping, `+page.svelte`, and direct tests; it does not split the component into new files.
- `BEAT-R` builds the refresh matrix in the route integration suite and `app/tests/e2e`, then removes the resolved replay item from `DEFERRED.md` only if every case passes.
- `BEAT-S` runs the full nonfixture verification, performs the final stale-code search, and updates the plan and governance files with actual evidence. It contains no new implementation behavior.

The deliberately narrow slices reflect the risk of this migration. `BEAT-Q` is the regenerate-over-debug slice: the old orchestration block is deleted and replaced only after the server contract and every beat kind are proven. `BEAT-L` through `BEAT-Q` are separate assignment and review units on one integration branch, but together form one decision-gated promotion because the legacy page cannot call the migrated routes. Do not merge any of those six slices to `main` alone. The earlier slices are additive contract, probe, fixture-backed mock, adapter, or endpoint outcomes.

## What Not To Do

Do not patch replay guards into `continueFromPersistedPhase` or add more flags to the `runRound*` chain. Do not move those functions into helper files and call that server ownership. They are removed in `BEAT-Q`.

Do not let the browser select a speaker, phase, interaction type, sequence order, optional branch, or persisted topic. Do not keep a production switch that allows both the old client script and the server beat engine to advance one meeting.

Do not promote active-beat-only versions of `share`, `user-share`, `crisis`, or `close` while the production page still sends legacy requests. Do not preserve a second legacy authority as a long-lived compatibility path. Implement the route slices separately, integrate them with the renderer on one branch, and promote the complete cutover together.

Do not use `Math.random()`, current time, request order, or unstable database row order to choose a beat or id. Do not update unversioned phase state after the compare-and-set contract lands. Do not store a topic separately from completing its active topic beat. Do not analyze a losing user-share payload after another payload has become canonical. Do not treat a second generated string as equivalent to returning the first persisted result.

Do not run summary generation, memory extraction, callback scanning, lifecycle mutation, or phase completion before acquiring the unique close claim. Do not return an invented close response while another claim is active, and do not rerun close side effects after a completed result exists.

Do not emit character or room-moment SSE content before acquiring that beat's generation claim. Do not clear an acknowledged room cue without first persisting its controlled cue key, text, and beat id. Do not construct a globally unique callback effect key from a beat id that omits meeting scope.

Do not accept topic, recent transcript, speaker, or other prompt context from the browser for expansion. The request identifies the owned share; the server loads every other input from persisted meeting state.

Do not follow the archived plan's fixed branch, old checkout paths, frontend-owned ordering, or ban on an orchestration endpoint. Do not split the entire large Svelte page before deleting its obsolete orchestration; issue #90 follows this work.

Do not rewrite character voices, the style constitution, therapy blocklist, or general generation system. Do not add exact sentence counts, forced physical actions, archetype labels, placeholder voice examples, or empty `SECTION: none` blocks. Do not show a candidate below the existing authenticity and voice-consistency thresholds.

Do not add a stock empty-chair fallback, show beat ids or phase machinery in the UI, call live providers in deterministic tests, provision production infrastructure, or fold identity and cleanup epics into this plan.

## Plan of Work

### Milestone 1: define the pure beat engine and compliant ritual prompts

Create `app/src/lib/core/meeting-beats.ts` and `app/src/lib/core/meeting-beats.spec.ts`. Add the beat types to `app/src/lib/core/types.ts`. Use a discriminated union so each kind carries only valid fields. The public contract must express at least these kinds: `character_share`, `room_cue`, `generated_room_moment`, `user_gate`, `crisis_support`, `close_meeting`, and `finished`. Every variant includes `id`, `ordinal`, `phase`, and `pauseAfterMs`. Character beats require `characterId` and `interactionType`; room cues require a controlled `cue`; user gates accept only `introduction`, `topic`, or `share`; a generated room moment requires `moment: 'empty_chair'`; and a crisis-support beat requires `triggerShareId` plus the server-selected `responderCharacterId`. Do not emit a reflection gate: post-meeting reflection is the UI for `finished`.

Extend `MeetingPhaseState` with `beatCursor: number`, `activeBeat: MeetingBeat | null`, and `crisisTriggerShareId: string | null`. Its validator and serialized form must accept historical state without those fields by reviving it as cursor zero, no active beat, and no trigger. New initialization writes all three explicitly.

Export a pure `nextMeetingBeat(input)` function. If `input.phaseState.activeBeat` exists, return that exact value without consuming randomness or changing state. Otherwise choose the next beat from the current phase, cursor, persisted participants, stored topic and mind context, listening choice, and compact transcript facts. A compact fact is a count, last interaction type, or stable id needed for sequencing; never pass the entire database adapter into core. Build beat ids from stable inputs, for example `<phase>:<cursor>:<kind>:<stable-subject>`. Do not use timestamps, array insertion order that is not part of the persisted roster, or `Math.random()`.

Export a pure `completeMeetingBeat(state, beatId, outcome, now)` function. The `now` value is a required `Date` supplied by the server clock seam. Refactor the ritual initialization and transition helpers used by this path to accept that same value instead of calling `new Date()` internally. The function rejects a mismatched id, records character or user completion through the existing ritual helpers, applies a legal phase transition where appropriate, clears `activeBeat`, and increments `beatCursor`. A topic outcome must be validated against an exported `TOPIC_OPTIONS` moved from `+page.svelte`; persistence of that valid topic occurs at the server seam in Milestone 4. A crisis outcome stores the canonical `triggerShareId` while recording `preCrisisPhase`; crisis completion returns to that saved point and clears the trigger without replaying completed work. Completing close makes the next pure result `finished`, which the UI renders as reflection.

Write table-driven tests for the full opening through finished sequence, every user gate, listening-only automatic pass, the three rounds, optional crosstalk and hard-question branches, crisis interruption and recovery tied to one trigger share, empty roster rejection, stable roster ordering, retry of an active beat, and invalid completion. Test two meeting ids that select different optional branches and repeat each input with one fixed timestamp to prove it is stable. Then vary only the supplied timestamp and prove only the intended phase-time field changes. A source search must find no `new Date()` or `Date.now()` in the new beat engine or the transition helpers it calls.

Before wiring the engine to generation, repair the exact sentence-count instructions in `app/src/lib/core/prompt-templates.ts`, including the meeting opening, topic acknowledgment, ritual opening, ritual introduction, ritual reading, topic introduction, ritual closing, and empty-chair builders used by this flow. Preserve their intent with natural brevity guidance. Update `prompt-templates.spec.ts` to test meaning and forbidden content without asserting a sentence range. Read `style-constitution.ts` before making these edits. Do not change character foundations, require physical actions, pass archetype labels to generation, weaken the three-example voice contract, or fill empty prompt sections with placeholders.

This milestone is complete when the pure suite shows the same input always returns the same next beat, the canonical experience reaches `finished`, and a repository search finds no exact sentence-count instruction in the ritual builders used by this plan. It satisfies `BEAT-01` and prepares `BEAT-06` through `BEAT-08`.

### Milestone 2: make beat state and generated entries retry-safe

Create `app/supabase/migrations/20260912_000005_server_owned_meeting_beats.sql`, following the private-intake migration numbered `000004`. Add `phase_version bigint not null default 0` to `public.meetings`. Add nullable `beat_id text`, nullable `user_analysis jsonb`, and nullable `room_cue text` to `public.shares`, plus a partial unique index on `(meeting_id, beat_id)` where `beat_id is not null`. `user_analysis` is valid only for user shares and contains canonical `crisis`, `heavy`, and `significanceScore` values. `room_cue` is valid only for a non-user row with interaction type `room_cue` and stores a controlled `RoomCue` key; the row's content stores the exact rendered cue text. Replace the `shares_interaction_type_check` constraint with the existing values plus `room_cue` and `empty_chair`.

Create `public.meeting_generation_runs` with `meeting_id`, `beat_id`, generation kind, `status`, `claim_token`, `lease_expires_at`, nullable completed `share_id`, timestamps, and primary key `(meeting_id, beat_id)`. Its controlled statuses are `running`, `completed`, and `failed`. Atomic RPCs claim a run, renew the current token's lease, complete it with the canonical stored share id, or fail it. A completed claim resolves and returns that share; an unexpired running claim returns `in_progress`; a failed or expired claim can be acquired again.

The same migration creates `public.meeting_close_runs` with `meeting_id`, `beat_id`, `status`, a random `claim_token`, `lease_expires_at`, nullable validated `checkpoint`, nullable validated `result`, timestamps, and primary key `(meeting_id, beat_id)`. The checkpoint holds canonical generated outputs, callback candidates, and one `completedAt` value before database mutations begin. Add nullable `close_effect_key` to `callbacks` with a partial unique index for non-null values so a checkpointed candidate is inserted at most once. The controlled close statuses are `running`, `completed`, and `failed`. A first claim inserts `running`; an unexpired running row reports `in_progress`; a completed row returns its stored result; and a failed or expired row may be claimed with a new token. Only the current claim token may checkpoint, complete, or fail the run.

Implement generation and close transitions as narrowly scoped Postgres functions exposed through Supabase RPC so claim insert/conflict inspection, lease renewal or takeover, token validation, and status update are atomic. The functions operate only on their named run table, qualify table names explicitly, validate all controlled values, and are executable by the service role rather than public callers. Every migration statement and function replacement must be safe to retry; constraint replacement should use the same explicit drop-and-add pattern already used by the March roster migration.

In `app/src/lib/seams/database/contract.ts`, add `beatId: string | null`, `userAnalysis: UserShareAnalysis | null`, and `roomCue: RoomCue | null` to `ShareRecord`; add nullable `summary` and `notableMoments` to `MeetingRecord`; and add `room_cue` and `empty_chair` to `ShareInteractionType` in `app/src/lib/core/types.ts`. Define the `UserShareAnalysis` shape, a validated `MeetingCloseResult` matching the close endpoint's complete response, and discriminated generation-claim and close-claim results with `acquired`, `in_progress`, and `completed` variants. Adjust the `createMeeting` input type to omit completion-only meeting fields. Extend runtime validators only at this point. Historical entries and incomplete meetings use null. New beat-owned entries use the stable id. Do not create fixtures or edit the mock, contract tests, or adapter before the probe below succeeds.

Add a versioned phase read that returns `{ phaseState: MeetingPhaseState | null, version: number }` and a compare-and-set update accepting `meetingId`, `expectedVersion`, `phaseState`, and an optional meeting patch limited to the validated topic. The Supabase update must filter by both meeting id and `phase_version = expectedVersion`, write the new phase state and version `expectedVersion + 1`, and include the topic in that same row update when completing a topic gate. Report `applied: false` when zero rows changed. Keep existing phase methods only while routes are migrated; remove or delegate them at the end so no route can silently bypass versioning.

Add `getShareByBeatId({ meetingId, beatId })`. It returns `NOT_FOUND` for no entry. Make beat-aware append handling converge on the stored row when the unique index reports that another request already wrote the same generated, user, or cue beat. Controlled cue persistence uses this same lookup but never calls a model.

Add `claimBeatGeneration`, `renewBeatGeneration`, `completeBeatGeneration`, and `failBeatGeneration`, or equivalent names with the migration's semantics. A generation route checks for a stored share first, then acquires the claim before invoking or streaming the model. Only the current token can renew, complete, or fail. Completion stores the canonical share id; a completed retry loads it. Use a bounded lease comfortably longer than an ordinary provider call and renew it during streaming and validation. A competitor never receives model chunks from a request that did not acquire the claim.

Add `setUserShareAnalysisIfAbsent({ meetingId, beatId, analysis })`. It updates only a user share whose `user_analysis` is null, writes the same `significanceScore` into the existing score column, then returns the stored analysis whether this request won or lost. This is the interpretation claim: competing analyzers may propose different results, but every completion must use the one analysis the row retained. Contract and adapter validation reject analysis for a character share or invalid scores.

Add `claimMeetingClose({ meetingId, beatId, leaseDurationMs })`, `checkpointMeetingClose({ meetingId, beatId, claimToken, checkpoint })`, `completeMeetingClose({ meetingId, beatId, claimToken, result })`, and `failMeetingClose({ meetingId, beatId, claimToken, errorCode })`, or equivalent names with those semantics. Claim acquisition is the only boundary that authorizes close side effects. Checkpointing validates and preserves model-derived values plus `completedAt` before mutations begin. Completion validates and stores the full canonical response before marking the row completed. `CreateCallbackInput` gains an optional `closeEffectKey`; the close route supplies `<meetingId>:<beatId>:callback:<checkpointed-index>`, and the adapter returns the existing callback on its unique conflict. Meeting completion must use the checkpointed `completedAt`, and lifecycle writes set derived status values rather than incrementing counters, so an expired-lease recovery can safely resume without changing an already-applied result. An ordinary retry of a completed beat reads that response and does not call any generator or mutation seam. An unexpired competing claim produces a retryable conflict with `Retry-After`; it does not start a second close. Bound the lease and test lease takeover so a crashed worker does not strand the meeting forever.

Create `app/probes/serverOwnedMeetingBeatsProbe.mjs` and `probe:supabase-meeting-beats` before writing fixtures or implementations. Run the migration on the real local Supabase stack established by `plans/private-meeting-access-execplan.md`. The probe performs concurrent version updates, a room-cue insert and beat-id conflict, competing generation claims and lease renewal, competing first-analysis writes, two simultaneous close claims, wrong-token checkpoint/completion, callback keys for the same beat in two meetings, completed replay, and expired-lease takeover through the real Supabase client and RPCs. It resets its deterministic rows on repeat and writes redacted raw success, conflict, and failure shapes plus capture metadata to the database fixture directory. If that real probe cannot run, mark this milestone blocked and stop before the fixture, mock, contract-test, adapter, and route dependency chain; do not invent captures.

After inspecting a successful capture, extend the fixture-backed database mock and add contract tests for fixture schema conformance and mock fidelity. Cover version wins and conflicts, stable existing-share and cue lookup, nullable historical beat ids, cue keys, and user analysis, unique-conflict recovery, generation claim and renewal, first-analysis-wins, `empty_chair` with null character id, meeting-scoped callback keys, close-claim contention, completed-result replay, wrong-token rejection, and expired-lease takeover. Only after the mock contract passes, implement the same captured behavior in `app/src/lib/server/seams/database/adapter.ts`, validate each RPC result, and add focused adapter tests. Update test doubles last.

This milestone is complete when the real probe, captured fixtures, mock-fidelity contract, and adapter suites pass in that order; a pair of writers using the same phase version produces one applied update and one conflict; two user-share analyzers converge on one stored interpretation; two close callers produce one claim holder; and every completed retry receives one canonical stored response. It satisfies `BEAT-02` and `BEAT-03` at the persistence boundary.

### Milestone 3: add the next-beat endpoint

Create `app/src/routes/meeting/[id]/next/+server.ts` and route tests in `app/src/lib/server/routes/meeting-next-beat.spec.ts`. The endpoint is a `POST` because claiming or acknowledging a beat changes persisted state. Its body may be empty when asking for the next beat. For a `room_cue` acknowledgment it accepts `{ completedBeatId }`. For the topic gate it accepts `{ completedBeatId, topic }`. Reject unrelated fields, invalid topic values, mismatched beat ids, and attempts to acknowledge character, generated-room, user-share, crisis-support, close, or finished beats through this generic path. The specialized routes named below complete every rejected effectful kind; the engine emits no reflection gate.

For an empty request, load the versioned phase state, owned meeting context from `locals.meetingContext`, roster, and the compact transcript facts required by `nextMeetingBeat`. If an active beat exists, return it unchanged. If the core chooses a new beat, compare-and-set the new active state before responding. On a version conflict, reload and retry a small bounded number of times; normally the response becomes the beat stored by the competing request. If contention does not settle, return HTTP 409 with a retryable seam error rather than choosing locally.

For a room cue acknowledgment, map the active controlled key to its existing rendered text, append one non-user `room_cue` transcript row with `characterId: null`, the beat id, and the cue key, then complete it with compare-and-set and return the next claimed beat. A retry checks `getShareByBeatId` first; an append unique conflict reloads the canonical cue row, and either path completes only a still-active matching beat. Cue insertion failure leaves the beat active. For a valid topic acknowledgment, complete the topic beat and pass the validated topic as the optional patch in that same compare-and-set meeting update. Keep `TOPIC_OPTIONS` in pure shared code so both the page and server validate the same fixed set. If two requests submit different valid topics at the same version, only the winner's topic and completed phase may be stored; the loser reloads that canonical result or receives a stale-beat conflict. Prove both the cue-acknowledgment race and differing-topic race in route and adapter tests. Do not add a standalone topic update.

The returned JSON is a `SeamResult<{ beat: MeetingBeat; phaseState: MeetingPhaseState }>` or the repository's equivalent existing response envelope. It contains no prompt text, private intake, model context, or arbitrary client instructions. This milestone is complete when repeated empty requests return the same id, two simulated claimers converge on one id, completed room cues advance once, a valid topic survives reload, and the ownership test proves the endpoint is gated before phase or transcript reads. It satisfies `BEAT-01`, `BEAT-02`, and `BEAT-08` at the route boundary.

### Milestone 4: let specialized routes complete the active beat

Migrate `share/+server.ts` first. Normal meeting calls provide only `beatId` plus transport options needed for SSE. The route loads the active beat, requires kind `character_share`, and derives `characterId`, `interactionType`, phase, selected topic, and sequence position from server state. Ignore no client override silently: reject legacy character or interaction values that disagree so drift is visible during migration. Before generation, call `getShareByBeatId`; if found, stream or return the canonical stored content and finish any still-active matching beat.

If no stored share exists, acquire the beat's generation claim. A completed claim reloads its share, an unexpired claim returns a retryable in-progress result with no SSE content, and only the acquired token may call the model. Renew the lease during slow generation and validation. Buffer candidate chunks on the server until the complete candidate passes existing quality checks; do not expose a candidate that may still be rejected. Append the accepted text with the beat id, complete the generation run with that share id, complete the active beat, and compare-and-set the new phase state. Then stream the canonical stored text to the holder, preserving the existing progressive presentation without making pre-persistence model output observable. A unique append conflict reloads the canonical entry, associates the claim with it, and returns that text rather than a losing candidate.

Migrate `user-share/+server.ts` so it requires an active `user_gate` for introduction or share, accepts the beat id and user text, and derives sequence and phase behavior on the server. Preserve pass and listening-only behavior. Append the beat-owned content with its deterministic non-crisis baseline score; whether this request inserts or loses a unique conflict, reload `getShareByBeatId` and treat that persisted content as canonical. Derive crisis, heavy-disclosure, and final significance only from that content, then call `setUserShareAnalysisIfAbsent` and use the returned canonical analysis to enter crisis with the interrupted resume point recorded or complete the ordinary gate. A retry after insertion resumes analysis, and a retry after analysis resumes phase completion. If a losing request supplied different text or proposed different analysis, neither can affect the returned flags or phase state.

Migrate `crisis/+server.ts` to require the active `crisis_support` beat and accept only `{ beatId }`. Load `triggerShareId` from that beat, then load that exact owned user share and `userDisplayName` from `locals.meetingContext`; reject missing, cross-meeting, or non-user trigger rows. Do not accept `userText`, `userName`, or a recent-share guess from the browser. Persist each support response with its support beat id so repeated requests return the stored response. Completing support resumes from the saved pre-crisis state, retains the same trigger for any second support beat, then clears it when support ends without resurrecting the interrupted active beat or replaying earlier shares.

Migrate `close/+server.ts` so the request contains only the active close beat id. Look up an existing close run before requiring the active beat: return a completed run immediately, return a retryable conflict for an unexpired claim, or acquire/recover the claim. Only the claim holder may load context and run summary generation, memory extraction, callback scanning, meeting completion, callback writes, lifecycle updates, or phase advancement. Load the topic and recent shares on the server instead of accepting them as client authority.

Refactor callback scanning into candidate discovery and candidate persistence so discovery performs no database write. After all model-derived outputs and callback candidates exist, checkpoint them with one `completedAt` value before the first database mutation. Apply meeting completion with that time, create callbacks with deterministic `<meetingId>:<beatId>:callback:<checkpointed-index>` effect keys, apply idempotent lifecycle status updates, and compare-and-set the close beat to post-meeting. A recovering expired claim reuses the checkpoint and resumes these idempotent mutations; it does not regenerate saved outputs. Finally store the complete endpoint payload in the close run and mark it completed. A later retry returns that exact payload with zero generator, completion, callback-discovery, lifecycle, or phase-write calls. If processing fails before a checkpoint or mutation can complete, mark the claim failed with the seam error and leave it explicitly retryable rather than advancing the beat.

Migrate `expand/+server.ts` so the request contains only `shareId`. Verify that the share belongs to the owned meeting, then load the persisted topic and bounded recent transcript from the database in stable sequence order. Build both the expansion and quality prompts from that canonical server context. Keep expansion outside sequence advancement; it must not change the active beat or accept compatibility context supplied by the browser.

Route tests must cover stale ids, wrong beat kinds, retries before and after persistence, unique conflicts, quality-rejected candidates, pass, heavy share, crisis, close, expansion, and adapter outages. Race two character requests and prove one generation claim, one model call, one stored share, identical eventual text, and zero losing SSE chunks; also prove rejected candidates never reach SSE. Add a two-request user-share race with different text and prove crisis, heavy, significance, response content, and phase outcome all describe the one stored winner. Add a two-request close race and prove one acquires the claim while the other runs zero side effects; then retry after completion and assert the byte-equivalent canonical result with no calls. Use two meetings with the same closing beat and prove their callback keys and rows remain distinct. Add expired-lease recovery from a checkpoint. For expansion, supply forged topic and transcript fields and prove they are rejected while canonical server-loaded context reaches both prompts. Keep the rule that a character result with authenticity below 6 or voice consistency below 6 is not shown; skip or retry according to existing quality behavior without completing the beat with rejected text.

This milestone is complete when only the server-selected character and interaction can be generated, every persisted generated or user entry carries one beat id, and repeating any completion returns one canonical entry and one advanced state. It satisfies `BEAT-03`, `BEAT-06`, and the server half of `BEAT-04`.

### Milestone 5: generate, validate, and persist the empty chair

Add `empty_chair` to `ShareInteractionType` and its database constraint in Milestone 2, then create `app/src/routes/meeting/[id]/room-moment/+server.ts`. Its `POST` body is exactly `{ beatId }`; it requires the matching active `generated_room_moment` with `moment: 'empty_chair'`, and it rejects every other beat kind or extra client context. Check for a stored beat result, then use the same generation-claim contract as character shares so exactly one request can invoke the model; competing requests receive in-progress or completed canonical behavior. Call the existing Grok seam with a stable internal correlation character id such as `empty-chair-room`. Before persistence, validate every candidate with a new pure `buildRoomMomentQualityValidationPrompt` that returns the existing `QualityValidationResult` schema. For this non-character entry, `voiceConsistency` means consistency with the room voice and style constitution. Accept only candidates for which `passesQualityValidationThresholds` enforces authenticity at least 6, voice consistency at least 6, and the existing therapy, moralizing, generic-language, and emotion-labeling exclusions.

Use the same bounded candidate-retry shape as the existing share path. Persist the first accepted result with `characterId: null`, `isUserShare: false`, `interactionType: 'empty_chair'`, and the active beat id, complete its generation run with the stored share id, then compare-and-set completion of that beat. The client-facing transcript mapper renders this interaction type as a ritual or room entry with no character speaker label. Do not treat null character id as the user for this entry. A retry checks `getShareByBeatId` first, completes a still-active matching beat if needed, and returns the canonical stored text without generation or validation. A unique conflict reloads that same row and follows the same completion path.

The generation prompt must ask for a brief, naturally complete empty-chair moment with no names, therapy language, slogans, forced physical action, explained moral, or exact sentence count. It must omit empty sections rather than render placeholder values. Preserve the style constitution. The hardcoded sentence in `runFreshMeeting` must not survive as a fallback. A generation or validation failure shows the existing recoverable room error, leaves the same beat active, and persists nothing.

Update prompt tests, generated-room route tests, transcript mapping tests, and the integration sequence. The mock response should be clearly written test content rather than `example line` placeholders. Prove first-candidate rejection followed by acceptance, all candidates rejected, provider failure, one generation on successful first completion, zero generation and validation calls when the stored beat is retried, one persisted entry, no speaker label, and the same text after refresh.

This milestone is complete when two newly created meetings may receive different accepted outputs, one meeting always keeps its own first persisted output, rejected output never appears or completes the beat, and no literal production fallback supplies the old sentence. It satisfies `BEAT-07` and closes #83.

### Milestone 6: replace the browser script with one renderer loop

First update `app/src/routes/meeting/[id]/+page.server.ts` to expose `initialSummary` from the authorized meeting record's nullable stored summary. A meeting that has not closed receives null; a completed meeting receives the exact stored text. Add a loader test for a post-meeting refresh after the close response was lost.

In `app/src/routes/meeting/[id]/+page.svelte`, preserve the existing transcript components, SSE preview presentation, input components, crisis display, and reflection. Initialize `summaryText` from `initialSummary`. Delete the orchestration functions `runFreshMeeting`, `runRounds`, `runRoundOne`, `runRoundTwo`, `runRoundThree`, `runClosing`, and `continueFromPersistedPhase`. Delete their speaker-picking, hard-question, round-specific random, and phase-replay helpers once tests prove the server supplies those decisions.

Write one small loop that posts to `/next`, switches on the returned discriminated beat kind, and renders it. `room_cue` maps a controlled cue key to the existing system, action, or ritual presentation, waits for `pauseAfterMs`, then acknowledges that id. The acknowledged response and later page loads use the persisted cue transcript row rather than appending a second local copy. `character_share` requests the server-selected beat through `/share`; its accepted canonical stored text may still be chunked for progressive display after validation and persistence. `generated_room_moment` posts its id to the validated `/room-moment` path completed in Milestone 5. `user_gate` presents the corresponding introduction, topic, or share control and stops the loop until user input completes it. `crisis_support` posts its id to `/crisis`. `close_meeting` invokes `/close`. `finished` renders the existing reflection with `summaryText`, including `initialSummary` after refresh, and stops. Every asynchronous continuation checks one cancellation token and is cancelled on unmount, navigation, or crisis.

The page may own animation and waiting mechanics, but it must not own phase-specific delays or decisions. The `pauseAfterMs` value comes from the beat. The client may clamp an unreasonable value to a documented safe presentation range, but must not substitute a different sequence. It may upsert transcript entries by stored share id; it must not invent persisted sequence order or append a second local copy. The transcript mapper must test `room_cue` and `empty_chair` interaction types before applying the historical null-character fallback that labels a row as the user, so neither room-owned entry receives a user or character speaker label.

Move `TOPIC_OPTIONS` to the shared pure module and import it for rendering. Topic selection acknowledges the active topic gate through `/next`. User introduction and round shares go through `/user-share` with their beat ids. Remove private meeting context from generation query strings where the server can derive it from `locals.meetingContext` and stored state.

Use loader, component, or route-backed Playwright tests to prove each beat kind renders through the one loop, stored cues are not duplicated locally, and `finished` after reload displays the stored close summary. A source assertion may supplement behavior by rejecting reintroduction of the named `runRound*` and `continueFromPersistedPhase` functions, but behavior tests remain the primary proof. This milestone is complete when the page has no hardcoded speaker order, optional branch selection, round recursion, or phase replay. It satisfies `BEAT-04` and the reflection portion of `BEAT-05`.

### Milestone 7: prove replay-free refresh

Expand `app/src/lib/server/routes/meeting-ritual-phase.integration.spec.ts` or create a focused integration suite that drives the next-beat protocol through every phase using the mock database. At each point after a generated share, acknowledged room cue, and user gate, snapshot the persisted transcript and state, reconstruct the route/page inputs as a refresh would, ask for the next beat, and assert that entry ids, cue keys, share count, and prior content are unchanged. Then complete the returned beat and continue.

Add Playwright coverage in `app/tests/e2e/meeting-flow.spec.ts` for at least a mid-round refresh, a refresh while waiting for the user, and a refresh immediately after a generated response. Capture the transcript entry ids before refresh and compare after rehydration. No id may disappear, change content, or appear twice. The next new entry must have the next beat id and sequence order.

Exercise crisis during a user gate, refresh during crisis support, complete support, and verify the room resumes from the stored point. Exercise a simulated network retry after the server persisted a share but before the client received the response; the retry must return that stored share and advance once. Exercise a direct close retry after its response is lost and assert that the stored close result returns without any repeated summary, memory, callback, lifecycle, or phase work. Separately refresh the page after close advanced to `finished` and prove the loader's stored `initialSummary` renders the same reflection without needing the cleared close beat id.

Remove the 2026-03-19 replay-free refresh item from `DEFERRED.md` only after these cases pass. If any phase cannot be proven, keep the item and record the exact phase and state rather than declaring #82 solved. This milestone is complete when refresh alone never calls generation and never increases transcript length. It satisfies `BEAT-05` and `BEAT-06`.

## Concrete Steps

Run all application commands from `C:\Users\shiva\OneDrive\Documents\ChatGPT\14thstep\app` in PowerShell, using `npm.cmd` so PowerShell execution-policy shims do not interfere.

After Milestone 1:

    npm.cmd run test:unit -- --run src/lib/core/meeting-beats.spec.ts src/lib/core/ritual-orchestration.spec.ts src/lib/core/prompt-templates.spec.ts
    npm.cmd run verify:core
    npm.cmd run check
    rg -n "new Date\(|Date\.now\(" src/lib/core/meeting-beats.ts src/lib/core/ritual-orchestration.ts

Expect the named suites and core verification to pass and `svelte-check` to report zero errors. Expect the clock search to return no matches after every touched ritual helper accepts its timestamp as an argument. Search the prompts used by the beat engine and confirm no exact sentence range remains.

After Milestone 2:

    npm.cmd exec supabase start
    npm.cmd exec supabase db reset
    npm.cmd run probe:supabase-meeting-beats
    npm.cmd run test:unit -- --run src/lib/seams/database/contract.test.ts src/lib/server/seams/database/adapter.spec.ts
    npm.cmd run verify:contracts
    npm.cmd run check

Expect the real local probe to capture one version winner, one cue/beat-row winner, one generation claimant with renewal, one canonical user analysis, one close claimant, meeting-scoped callback keys, token rejection, completed replay, and lease recovery before fixture, mock, contract, and adapter checks pass. If the real probe cannot run, stop the database-dependent milestones and record the blocker. Do not apply the migration to the unavailable production tenant as part of this local gate.

After Milestones 3 and 4:

    npm.cmd run test:unit -- --run src/lib/server/routes/meeting-next-beat.spec.ts src/lib/server/routes/meeting-share.spec.ts src/lib/server/routes/meeting-user-share.spec.ts src/lib/server/routes/meeting-crisis.spec.ts src/lib/server/routes/meeting-close.spec.ts src/lib/server/routes/meeting-expand.spec.ts src/lib/server/routes/meeting-ritual-phase.integration.spec.ts
    npm.cmd run verify:composition
    npm.cmd run check

Expect all next, durable cue, claimed generation, completion, retry, crisis, close, and expansion cases to pass. The character race must emit no losing SSE text, and the close test must keep identical beat ids in different meetings isolated. The composition check must continue to prove that database and model I/O stay in server modules.

After Milestones 5 through 7:

    npm.cmd run test:unit -- --run src/lib/core/meeting-beats.spec.ts src/lib/core/prompt-templates.spec.ts src/lib/server/routes/meeting-generated-room-moment.spec.ts src/lib/server/routes/meeting-ritual-phase.integration.spec.ts
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

Refresh after an acknowledged opening cue and after the closing ritual. The same stored cue rows, controlled keys, rendered text, and ids must reappear exactly once. Race two character-generation requests for one active beat: only the claim holder may receive generated chunks, and both callers must eventually converge on the same stored accepted text.

For two different meeting ids with the same roster and intake, optional choices may differ. Repeating either meeting from its saved state must not differ. Every selected character must belong to the persisted roster. Every interaction type must match the active beat. No browser-supplied character, phase, sequence order, topic, recent transcript, or interaction override may control server behavior. Expansion accepts a share id and derives both prompt and quality context from the owned meeting and stored shares.

Trigger crisis language during a user gate. The ordinary loop must stop, the crisis-support beat must store that user share's id, one support response must persist, and refresh must remain in crisis at the same active support beat. Submit altered `userText`, `userName`, or a different share id to the crisis endpoint and prove they cannot control its prompt. Completing support must resume from the pre-crisis point without replaying earlier beats. Race the original payload against different non-crisis text for the same beat and prove every returned flag and state transition describes whichever share and analysis the database preserved.

At the empty-chair beat, the model receives the pure empty-chair prompt and every candidate receives the room-moment quality prompt. The transcript stores one null-character `empty_chair` entry only after authenticity and voice consistency both reach 6 and all existing exclusions pass. It displays without a person's name, remains identical after refresh, and contains none of the forbidden placeholder or forced-count instructions. If generation fails or all candidates are rejected, the same active beat remains available for retry, persistence remains unchanged, and no hardcoded replacement appears.

Race two close requests for the same beat. Exactly one may run summary, memory, callback, completion, lifecycle, and phase effects; the other receives the documented in-progress response. After the winner completes, every retry must return its stored canonical response without invoking those effects. Expire a claimed worker after it has checkpointed model output and prove the recovery path reuses that output and applies callback and meeting mutations at most once. Repeat the same deterministic beat id in a second meeting and prove meeting-scoped callback keys cannot collide. Refresh after phase advancement and prove the stored summary still renders in reflection.

The final page must feel continuous. The user sees the existing room pacing and one relevant control at a time; no phase label, beat id, cursor, retry status, or orchestration vocabulary is shown in the product UI.

## Idempotence and Recovery

Beat ids are stable functions of persisted inputs. Claiming an already active beat is a read. Completing an acknowledged cue or already completed generated beat finds the transcript row by beat id and returns the canonical result. The partial unique database index prevents duplicate stored output even if two requests race. Generation routes also acquire a leased generation-run row before any model call or SSE output, so the unique share constraint is a final convergence guard rather than the first observable winner decision.

Compare-and-set phase updates never overwrite a newer version. A losing next-beat request reloads and returns the winner's beat. A losing completion request reloads, checks whether its beat already completed, and returns the canonical outcome or a clear stale-beat conflict. Bound retry loops; do not recurse indefinitely under contention.

Close has a second, durable claim because its work begins before phase completion. The `(meeting_id, beat_id)` close-run row selects one worker, preserves generated checkpoints across lease recovery, and stores the final response. Callback effect keys include both meeting and beat, meeting completion reuses one checkpointed completion time, and lifecycle updates are idempotent assignments. A completed close run is authoritative even after the active beat has cleared. The meeting summary is also authoritative page-bootstrap data after the close beat is no longer active.

Apply the migration only after the private-intake migration. Its added columns, tables, constraints, and indexes are safe to create twice. If code rollback becomes necessary after a live migration, keep nullable `shares.beat_id`, `shares.user_analysis`, `shares.room_cue`, `meetings.phase_version`, `callbacks.close_effect_key`, `meeting_generation_runs`, `meeting_close_runs`, and the expanded interaction constraint in place while reverting application consumers. Removing stored beat, cue, analysis, generation-claim, or close-result evidence is destructive and is never the first rollback action.

Build the additive contract, persistence, and `/next` path first. Implement the specialized route assignments and renderer on one integration branch, validate the full group, and promote `BEAT-L` through `BEAT-Q` together. Do not merge active-beat-only specialized routes while the legacy page is still the production caller, and do not ship a second production sequence switch.

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

The completion map is exhaustive:

    room_cue -> POST /meeting/<id>/next { completedBeatId }
    user_gate:topic -> POST /meeting/<id>/next { completedBeatId, topic }
    character_share -> POST or SSE /meeting/<id>/share with beatId
    user_gate:introduction|share -> POST /meeting/<id>/user-share with beatId and content/pass
    crisis_support -> POST /meeting/<id>/crisis { beatId }
    generated_room_moment -> POST /meeting/<id>/room-moment { beatId }
    close_meeting -> POST /meeting/<id>/close { beatId }
    finished -> no completion request; render reflection and stop

The requirement map is: `BEAT-01` is Milestones 1 and 3; `BEAT-02` is Milestones 2 and 3; `BEAT-03` is Milestones 2 through 5; `BEAT-04` is Milestones 4 and 6; `BEAT-05` is Milestones 6 and 7; `BEAT-06` is Milestone 7; `BEAT-07` is Milestone 5; `BEAT-08` is Milestones 1, 3, and 6.

The March restore plan remains at `archive/plans/restore-virtual-recovery-meeting-execplan-2026-03-19.md`. Its shipped experience target and historical findings are useful evidence. Its frontend ownership rules, fixed branch instructions, old checkout paths, and prohibition on an orchestration endpoint are superseded and must not guide implementation.

## Interfaces and Dependencies

The implementation must expose a discriminated `MeetingBeat` union from `app/src/lib/core/types.ts` equivalent to:

    type MeetingBeat =
        | BeatBase & { kind: 'character_share'; characterId: string; interactionType: ShareInteractionType }
        | BeatBase & { kind: 'room_cue'; cue: RoomCue }
        | BeatBase & { kind: 'generated_room_moment'; moment: 'empty_chair' }
        | BeatBase & { kind: 'user_gate'; gate: 'introduction' | 'topic' | 'share' }
        | BeatBase & { kind: 'crisis_support'; triggerShareId: string; responderCharacterId: string }
        | BeatBase & { kind: 'close_meeting' }
        | BeatBase & { kind: 'finished' };

    interface BeatBase {
        id: string;
        ordinal: number;
        phase: MeetingPhase;
        pauseAfterMs: number;
    }

`MeetingPhaseState` must add `beatCursor: number`, `activeBeat: MeetingBeat | null`, and `crisisTriggerShareId: string | null`, with backward-compatible revival for historical JSON. `nextMeetingBeat` and `completeMeetingBeat` live in `app/src/lib/core/meeting-beats.ts` and perform no I/O. Initialization and completion require a timestamp supplied by the server clock seam; none of the pure functions or ritual helpers they call may read the system clock.

The database seam must provide a versioned phase read, a compare-and-set meeting-state update that can atomically include a validated topic, `getShareByBeatId`, generation claim/renew/complete/fail operations, first-analysis-wins persistence for `UserShareAnalysis`, and the claim, checkpoint, complete, and fail operations for a beat-keyed close run. Exact interface names may follow existing repository naming, but their semantics and tests are fixed by this plan. `ShareRecord.beatId` is nullable for history and required for new beat-owned generated, cue, and user transcript entries; `ShareRecord.roomCue` and `ShareRecord.userAnalysis` are nullable and mutually appropriate to their row kind. `MeetingRecord` exposes nullable summary and notable moments, `MeetingCloseResult` validates the stored endpoint payload, and close-created callbacks accept an optional effect key containing meeting and beat scope.

The next-beat route depends on the ownership gate and `locals.meetingContext` from `plans/private-meeting-access-execplan.md`. The meeting-flow plan does not depend on a hosted provider, but its database seam must pass the real local Supabase probe before fixture, mock, adapter, or route work. Applying migrations to a hosted tenant, refreshing unrelated provider fixtures, and production verification remain blocked by #71 and #91.

Issue #90 should follow this plan for `+page.svelte`: deleting the old orchestration will materially shrink the file and reveal the remaining honest component boundaries. Do not split the old sequence into several files before removing it. Issues #86 through #89 are independent except where their code touches a file in the active slice; do not pull them into these milestones.

## Revision Note

2026-09-12: Created this plan to replace the superseded frontend-owned March meeting plan with the server-owned direction in epic #77. The revision introduces persisted beats and idempotency before client cutover, makes replay-free refresh an acceptance condition, and gives the unused empty-chair prompt a compliant generated and persisted path.

2026-09-13: Tightened topic completion so the selected topic and phase transition are committed in one version-checked meeting-row update. This closes the race where separate writes could pair the losing topic with the winning beat state.

2026-09-13: Revised the plan after PR review to add durable generation and close claims, persist room cues, namespace callback effects by meeting, hydrate the stored summary, group legacy-route and renderer cutover, derive user-share and expansion decisions from persisted server state, quality-gate the generated empty-chair moment, run that completion endpoint before renderer cutover, persist the crisis-trigger share, remove the uncompletable reflection gate, inject transition time from the clock seam, restore real-probe-before-fixture ordering, and point browser verification at Playwright's configured test directory.
