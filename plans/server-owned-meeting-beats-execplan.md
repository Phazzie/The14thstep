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
- [x] (2026-09-14 03:14Z) Integrated PR review findings for canonical completed retries, fully atomic close persistence with lease renewal, version-gated legacy cutover, durable crisis resources, deterministic roster fallback in every consumer, canonical intake and share crisis triggers, crisis and room-moment quality gates, durable generation claims, character skips, room cues, repeated round speakers, in-progress client retry, truthful room-entry labels, meeting-scoped callback effects, summary hydration, one route-and-renderer promotion boundary, compliant close-summary guidance, server-side Grok browser fixtures, injected time, milestone order, test paths, and the required real-system probe stage.
- [x] (2026-09-14 07:50Z) Closed final planning-review gaps with atomic terminal topic/pass outcomes, a character-only interaction subtype, and explicit protocol-stamp ownership in the renderer cutover slice.
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

- Observation: crisis support is generated transcript content but the current crisis route has no quality-validation loop.
  Evidence: persisting the first model response would let authenticity or voice-consistency scores below 6 reach the most sensitive part of the meeting and violate the root generation constraint.

- Observation: an intake-triggered crisis has no user-share row.
  Evidence: the private-access plan derives setup crisis from the canonical stored `userMind` immediately after join, before the user has submitted a transcript entry, so a support beat that requires only `triggerShareId` cannot represent that path.

- Observation: close phase advancement and close-run completion are currently two writes.
  Evidence: a worker can clear the close beat and crash before storing the run result, leaving recovery without the old active beat unless those writes share one transaction.

- Observation: the close summary has an exact sentence range outside the ritual prompt template module.
  Evidence: `buildCloseSummaryPrompt` in `app/src/lib/core/meeting.ts` says `4-6 spoken-style sentences`, and the server-owned close beat invokes that workflow.

- Observation: route-backed browser refresh tests require the Grok seam inside the preview process.
  Evidence: `/share`, `/crisis`, `/close`, and `/room-moment` perform server-side model calls that browser interception cannot replace without bypassing the route persistence under test.

- Observation: the hard quality rule says to skip a character whose share cannot pass, but a stored share is currently the only terminal generation outcome.
  Evidence: leaving that beat active retries forever, while advancing without durable skip evidence lets refresh regenerate a character the room already skipped.

- Observation: the shipped page keeps a meeting open when participant persistence fails by deriving the same fallback roster again.
  Evidence: `+page.server.ts` seeds `selectCharacters` from the meeting id and continues on the generated seats after `saveMeetingParticipants` fails; `/next` must use that same roster or it can strand the already-rendered room.

- Observation: crosstalk may be followed by a scheduled share from the same character in one round.
  Evidence: the current page deliberately uses the second speaker for both moments, while `recordCharacterSpoke` rejects a character already present in `charactersSpokenThisRound`.

- Observation: a refreshed client can encounter a valid in-progress generation or close lease.
  Evidence: the endpoints return a retryable response with no content, but a renderer that treats it as an ordinary failure can stop even after the claim holder stores the canonical result.

- Observation: current server transcript labeling treats every null character id as the user.
  Evidence: durable `room_cue` and `empty_chair` entries also have null character ids, so close and expansion prompts would otherwise attribute ritual text to the person in the meeting.

- Observation: a route retry can arrive after its effect and phase completion both committed.
  Evidence: requiring the old active beat before reading a beat-owned share, analysis, completed run, or skip rejects the exact lost-response retry that idempotency is meant to recover.

- Observation: meeting completion fields currently precede the proposed atomic close finalizer.
  Evidence: writing `endedAt`, summary, and notable moments through `completeMeeting` before phase/run finalization can leave a durably half-closed meeting if the worker stops at that boundary.

- Observation: historical phase JSON cannot reveal a safe beat cursor for every mid-round meeting.
  Evidence: legacy shares have no beat ids, and a repeated crosstalk/scheduled speaker makes `charactersSpokenThisRound` insufficient to reconstruct which observable moments already ran.

- Observation: the crisis resource card exists only in the successful endpoint response.
  Evidence: after support text and phase completion persist, a lost response plus refresh can restore the transcript but has no durable fact telling the page to show the standard 988, 741741, and 911 resources.

- Observation: close preparation can outlive its initial lease.
  Evidence: summary, memory, fallback-summary, and callback-candidate model calls occur before checkpointing, so an expired lease without renewal permits a second healthy worker to repeat them.

- Observation: a fallback visitor beat needs the same character profile outside `/next`.
  Evidence: if participant saving fails, `/next` can select a derived visitor whose row is absent; `/share` still needs that visitor's voice data, and close/expansion need the same derived roster to label the transcript.

- Observation: topic completion changes phase but leaves no beat-keyed terminal evidence.
  Evidence: if the atomic topic/phase update commits and its HTTP response is lost, a retry sees another active beat and cannot distinguish its completed topic acknowledgment from a stale request. Listening-only or explicit user-pass gates have the same no-transcript shape.

- Observation: expanding `ShareInteractionType` with room-only values also widens a character beat unless its contract is narrowed.
  Evidence: `room_cue` and `empty_chair` would otherwise be type-valid `character_share.interactionType` values even though their renderer and transcript ownership belong to the room.

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

- Decision: apply the existing quality thresholds and the generation claim to crisis support before persistence.
  Rationale: crisis text is a generated share with the same authenticity and voice requirements as every other visible share. A bounded validation loop prevents rejected or competing candidates from reaching the user, and total rejection leaves the support beat retryable.
  Date/Author: 2026-09-13 / Codex

- Decision: represent crisis provenance as a typed canonical trigger and record when an intake trigger has completed.
  Rationale: a user-share trigger points to its owned row, while an intake trigger points to the authorized meeting snapshot. Persisting the trigger and an `intakeCrisisHandled` flag makes refresh stable and prevents the same setup text from restarting crisis support forever.
  Date/Author: 2026-09-13 / Codex

- Decision: atomically advance the close beat and complete its run through one database RPC.
  Rationale: successful finalization must leave both the meeting and its canonical close response committed or neither. An expired claimant can safely replay earlier idempotent effects and retry this one transaction without interpreting a half-finished state.
  Date/Author: 2026-09-13 / Codex

- Decision: include the close-summary builder in the prompt-constraint repair and use the preview composition's Grok mock for browser verification.
  Rationale: the hard sentence-count rule applies to every prompt in this flow, regardless of module. Route-backed refresh tests need deterministic generation and quality results inside the server process without contacting a provider.
  Date/Author: 2026-09-13 / Codex

- Decision: persist a terminal `skipped` generation outcome only for a fully rejected character share.
  Rationale: the room must advance without showing sub-threshold text, and retries must know that this character was intentionally omitted. Crisis support and the empty chair remain active on total rejection because neither has a safe skip policy.
  Date/Author: 2026-09-14 / Codex

- Decision: share one deterministic fallback-roster function between the page loader and `/next`.
  Rationale: participant persistence is allowed to degrade, so every reader must derive the same seats from the meeting id and stored start time when no rows are available. The server beat cannot reject a roster the shipped page already accepted.
  Date/Author: 2026-09-14 / Codex

- Decision: make the beat id and cursor authoritative for completion while recording round participation as an idempotent set.
  Rationale: the same character may complete distinct crosstalk and scheduled-share beats. Repeating one beat is rejected by its id; repeating a person across different beats is valid and must not inflate the unique-participant list.
  Date/Author: 2026-09-14 / Codex

- Decision: retry an in-progress claim automatically for a bounded period and classify transcript speakers by user status and room interaction before character id.
  Rationale: refresh should converge on work another holder is finishing, while cancellation and a bounded stop keep the renderer controllable. Room-owned entries must remain visibly and semantically distinct from user speech in both UI and server prompts.
  Date/Author: 2026-09-14 / Codex

- Decision: resolve terminal beat-owned evidence before requiring the beat to remain active.
  Rationale: ownership and request validation still run first, but a stored share plus analysis, completed generation result, skipped result, crisis result, or completed close run is sufficient to answer a retry after phase advancement. Only unfinished work requires an active matching beat.
  Date/Author: 2026-09-14 / Codex

- Decision: put every durable close mutation in one token-checked finalization transaction and renew the claim during preparation.
  Rationale: model work and candidate discovery can be checkpointed without mutation. The meeting completion fields, finished phase, callback inserts and lifecycle states, and close-run result either commit together or not at all, while renewal prevents a healthy slow worker from being taken over.
  Date/Author: 2026-09-14 / Codex

- Decision: activate the beat renderer only for meetings created with `meeting_protocol_version = 1`.
  Rationale: translating a legacy mid-round cursor would guess about already-visible turns. Historical completed meetings may render their stored result, but an in-progress unversioned meeting must not call `/next`; deployment waits for zero such rows or presents a restart path without generating or mutating data.
  Date/Author: 2026-09-14 / Codex

- Decision: persist `crisis_resources_visible` when accepted support completes and hydrate one controlled resource payload from that flag.
  Rationale: the emergency numbers are standard product copy, so the database needs only the durable visibility fact. Writing it with the support phase transition keeps the sticky card present after a lost response and refresh without storing duplicate prose.
  Date/Author: 2026-09-14 / Codex

- Decision: centralize persisted-or-fallback roster resolution for every server consumer.
  Rationale: the pure derivation alone is insufficient if individual routes still load participant rows differently. One server resolver supplies identical character profiles to page load, `/next`, character generation, close, and expansion.
  Date/Author: 2026-09-14 / Codex

- Decision: persist non-transcript topic and user-pass outcomes in a beat-keyed control-completion ledger.
  Rationale: topic choice, its phase update, and the terminal outcome must commit in one transaction so a lost response can return the canonical current beat. The same narrow ledger prevents explicit or listening-only passes from becoming unrecoverable stale requests without inventing transcript rows.
  Date/Author: 2026-09-14 / Codex

- Decision: define `CharacterShareInteractionType` as `ShareInteractionType` without `room_cue` or `empty_chair`.
  Rationale: the broader persisted transcript union can include room-owned entries, while the character-beat union and runtime validator must reject those values before `/share` generation.
  Date/Author: 2026-09-14 / Codex

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

A beat is one renderer instruction with a stable id. A character-share beat names a roster character and interaction type. A room-cue beat contains a controlled cue key such as `moment_of_silence`, which the UI maps to existing presentation text. A generated-room-moment beat asks the server to generate the empty-chair entry. A user-gate beat says which input the room awaits: introduction, topic, or share. A crisis-support beat carries a typed canonical trigger and the server-selected responder. A close beat invokes the existing close workflow. A finished beat leaves the post-meeting reflection visible and stops polling; there is no separate reflection gate because the current product asks for no reflection input.

Claiming a beat means storing it as the phase state's `activeBeat` before returning it. Completing a beat means validating its id against the active beat, applying its recorded outcome, clearing it, incrementing the cursor, and persisting the next phase state. Compare-and-set means the database update includes the version that was read; if another request changed that row first, the update changes zero rows and the route reloads instead of overwriting the newer state.

A user-share analysis is the stored interpretation of one canonical user entry: whether it indicates crisis, whether it is a heavy disclosure, and its significance score. The first valid analysis written for a beat wins. Requests that raced with different text or model output reload that stored interpretation before they can advance the phase.

A crisis trigger is either `{ source: 'user_share', shareId }` or `{ source: 'meeting_intake' }`. The first form reloads the exact owned user transcript row. The second reloads `userMind` from the owner-checked meeting record established by the privacy plan. Neither form carries browser-supplied prose. `intakeCrisisHandled` records that setup-triggered support finished so the same stored intake does not open another crisis sequence after refresh.

The crisis resource payload is controlled application copy, exported once from pure core code. `crisis_resources_visible` is the durable meeting-level fact that the person has reached accepted support. Each accepted support completion sets it in the same versioned meeting update that advances the phase; the page loader maps true to the standard sticky payload even when no crisis beat remains active.

A generation run is a short leased claim keyed by meeting and beat for character, crisis-support, or generated-room text. The holder is the only request allowed to call the model. Competing requests return a retryable in-progress response or the completed stored share. The holder renews its lease while generation and validation continue so a slow valid generation is not mistaken for a crashed worker. Candidate output remains server-buffered until it passes quality checks and is persisted; only canonical stored text may then be presented progressively.

A skipped generation is a terminal character-only run outcome with no share id and a controlled `quality_rejected` reason. It records that every bounded candidate failed the quality gate. The character route completes that beat without adding transcript text; a retry returns the same skip and never regenerates it. Crisis support and the generated room moment cannot use this outcome.

A room cue is controlled text selected by a cue key in the pure beat engine rather than prose returned by a model. Acknowledgment persists that key, rendered text, beat id, and non-user status in the shares transcript before phase completion. This gives refresh the same stable record used for generated and user entries.

A fallback roster is the existing core-plus-visitor selection derived through one pure helper from the meeting id and the meeting record's stable `startedAt`. One server-side resolver loads persisted participants and otherwise calls that helper when rows are empty or a non-not-found read/save fails. The page loader, `/next`, `/share`, `/close`, and `/expand` all use the resolver, so a derived visitor keeps the same profile and name throughout the meeting. An idempotent round-participation set records who has taken part, while the beat cursor records how many distinct scheduled moments completed.

Closing needs a stronger claim because it performs several effects before the active beat can clear. A close run is one durable row keyed by meeting and beat. Its claim token is an unguessable value held by the worker allowed to proceed. Its lease is a bounded time during which competing requests wait instead of repeating work, and the holder renews it during every slow pre-checkpoint stage. A checkpoint contains validated generated output plus the complete intended database mutation set, without applying it. If the worker crashes and the lease expires, a new worker resumes from that checkpoint. The finalization RPC commits meeting completion fields, the exact `finished` phase, callbacks, lifecycle target states, and the canonical run response in one transaction, so a crash cannot expose any durably half-finished close.

`meeting_protocol_version` distinguishes meetings created for this beat contract from historical phase JSON. Version 1 meetings use `/next` and the generic renderer. A completed historical meeting may render its stored transcript and summary without sequence work. An in-progress unversioned meeting receives a stable restart presentation and performs no model or database mutation; the live cutover is blocked unless a preflight query reports zero such rows.

The privacy plan adds a hook-level owner check to every `/meeting/[id]` request. All endpoints in this plan are created below that route and must rely on the common gate. They must never weaken it or add a second inconsistent owner rule.

## Requirements

`BEAT-01` requires one pure function to return the existing active beat or deterministically choose the next beat from persisted state, meeting context, the centrally resolved persisted-or-deterministic roster, and transcript facts. `BEAT-02` requires the chosen beat to be persisted before exposure and protected by a versioned compare-and-set write. `BEAT-03` requires one canonical stored effect per beat id, including quality-accepted generated and crisis entries, a terminal rejected-character skip, acknowledged room cues, topic and pass control completions, user-share interpretation, and the fully atomic close result. Every completion route must return terminal evidence before requiring an active match. Character beats accept only character interaction values; room-owned cue and empty-chair values are invalid. `BEAT-04` requires the client to render server beats without hardcoded round or speaker sequencing and to retry a valid in-progress claim for a bounded period. `BEAT-05` requires refresh at every user gate, after every generated, skipped, crisis-support, or cue entry, and after close to restore transcript, sticky crisis resources, and reflection without growth, loss, or false speaker attribution. `BEAT-06` requires intake- and user-share-triggered crisis interruption and recovery to preserve a canonical source, durable resources, and truthful resume point. `BEAT-07` requires a fresh persisted empty-chair moment that follows all prompt and quality constraints. `BEAT-08` requires the room's topic choice and completion state to survive refresh. Only protocol-version-1 meetings may enter this sequence; a legacy mid-round state must never be guessed into a beat cursor.

## Implementation Slices

These are the maximum assignment units for Codex or a subagent. Assign one slice at a time, with exclusive ownership of its files during that turn. A passing slice returns paths, test evidence, and any newly discovered dependency to the main agent; it does not continue into the next label without a new assignment.

- `BEAT-A` adds the beat union, including a character-only interaction subtype, typed intake and user-share crisis triggers, backward-compatible phase-state fields, the controlled crisis resource payload, and validator tests in `core/types.ts` and the narrow contract tests that exercise those types.
- `BEAT-B` implements only the opening, empty-chair, cue, and introduction selection in `core/meeting-beats.ts` with table-driven pure tests.
- `BEAT-C` adds topic, three-round, closing, and finished selection to the same pure engine after `BEAT-B` passes. It does not touch routes.
- `BEAT-D` injects the server-supplied transition time and adds beat-id completion, idempotent round-participation recording for repeated speakers, deterministic optional branches, listening-only, both canonical crisis-trigger sources, the intake-trigger handled marker, resume behavior, and the direct close-to-finished path to the pure engine. It stops at core tests.
- `BEAT-E` repairs the exact sentence-count instructions in every prompt builder used by this flow after reading `style-constitution.ts`. It owns `prompt-templates.ts`, the private `buildCloseSummaryPrompt` in `meeting.ts`, and their existing specs; it changes no workflow behavior.
- `BEAT-F` adds the database contract and migration `20260912_000005_server_owned_meeting_beats.sql`, including protocol version, durable crisis-resource visibility and room-cue fields, a control-completion ledger for topic and pass outcomes, canonical user-share analysis, completed-or-skipped generation outcomes, the renewable close-run ledger, and one transaction for every durable close mutation. It updates validators but does not author fixtures, mock behavior, contract tests, or adapter queries.
- `BEAT-G` adds `probes/serverOwnedMeetingBeatsProbe.mjs`, runs it against the real local Supabase stack established by the privacy plan, and writes redacted protocol, beat, cue, atomic control-completion, crisis-visibility, completed/skipped generation, analysis, close-renewal, and full atomic-finalization captures. It stops if a real probe cannot run and never hand-authors substitute fixtures.
- `BEAT-H` implements the fixture-backed mock's protocol fields, versioned phase, beat and control-completion lookup, crisis-resource update, cue persistence, generation claims and character skips, unique-retry, first-analysis-wins, atomic topic/pass completion, renewable close claim, and full atomic-finalization behavior, then adds contract tests for schema conformance and mock fidelity.
- `BEAT-I` implements the captured behavior in the Supabase adapter with focused protocol-version, version-win, version-conflict, crisis-resource, control-completion replay, stored-cue, completed/skipped generation, stored-beat, user-analysis race, close-claim renewal, in-progress, full atomic-finalization, and completed-result tests.
- `BEAT-J` extracts one pure deterministic fallback-roster helper and one server-side persisted-or-fallback resolver used first by the page loader and `/next`, then creates the empty-request claim behavior and route spec. It returns an existing or newly persisted active beat and has no acknowledgment behavior yet.
- `BEAT-K` adds room-cue and topic acknowledgments to `/next`, including durable cue transcript rows, atomic beat-keyed topic completion, lost-response replay to the canonical current beat, and version-conflict recovery.
- `BEAT-L` migrates `share/+server.ts` to resolve the canonical roster, return a stored completion before checking active state, derive unfinished generation from an active character beat, acquire its generation claim before streaming, and persist/return a terminal skip when every bounded candidate is rejected.
- `BEAT-M` migrates `user-share/+server.ts` and then `crisis/+server.ts` to terminal-result-first active-beat completion, including canonical-share analysis, typed share-or-intake triggers, durable crisis-resource visibility, a generation claim, and bounded quality validation before any support response persists or becomes visible. These two routes are paired because the user-share result can create the crisis-support beat consumed by the second route; no other route belongs in this slice.
- `BEAT-N` migrates only `close/+server.ts` to terminal-result-first handling, the renewable close claim, centrally resolved roster, truthful user/room/character transcript labels, server-loaded transcript context, pure close mutation planning, and one finalization transaction. It stops when concurrent, slow-holder renewal, completed-retry, expired-lease recovery, room-entry labeling, and every mutation rollback case passes.
- `BEAT-O` makes only `expand/+server.ts` use the central roster resolver and derive its topic, truthfully labeled room/user/character transcript, and recent shares on the server. It stops when forged client context is rejected and both generated prompts receive canonical context.
- `BEAT-P` adds the `/room-moment` completion endpoint, returns stored completion before checking active state, acquires a generation claim, quality-validates, persists, and tests the generated empty-chair beat before any renderer depends on it. It may touch the already-established route branch points but must not reopen round sequencing.
- `BEAT-Q` is the protocol cutover: it makes trusted meeting creation stamp version 1, makes the page loader expose stored summary and crisis-resource visibility and gate the new flow on that version, then replaces the page's named sequence functions with the generic renderer loop and bounded `Retry-After` claim retry after `BEAT-J` through `BEAT-P` pass. It owns the narrow `createMeeting` adapter/composition change, loader bootstrap mapping, `+page.svelte`, and direct tests; it does not split the component into new files.
- `BEAT-R` adds a fixture-backed scripted scenario to the existing Grok mock, installs it through the preview-process composition, builds the refresh, terminal-retry, legacy-state, sticky-crisis-resource, skipped-character, fallback-visitor, repeated-speaker, in-progress-claim, and room-label matrix in the route integration suite and `app/tests/e2e`, and removes the resolved replay item from `DEFERRED.md` only if every case passes.
- `BEAT-S` runs the full nonfixture verification, performs the final stale-code search, and updates the plan and governance files with actual evidence. It contains no new implementation behavior.

The deliberately narrow slices reflect the risk of this migration. `BEAT-Q` is the regenerate-over-debug slice: the old orchestration block is deleted and replaced only after the server contract and every beat kind are proven. `BEAT-L` through `BEAT-Q` are separate assignment and review units on one integration branch, but together form one decision-gated promotion because the legacy page cannot call the migrated routes. Do not merge any of those six slices to `main` alone. The earlier slices are additive contract, probe, fixture-backed mock, adapter, or endpoint outcomes.

## What Not To Do

Do not patch replay guards into `continueFromPersistedPhase` or add more flags to the `runRound*` chain. Do not move those functions into helper files and call that server ownership. They are removed in `BEAT-Q`.

Do not let the browser select a speaker, phase, interaction type, sequence order, optional branch, or persisted topic. Do not keep a production switch that allows both the old client script and the server beat engine to advance one meeting.

Do not promote active-beat-only versions of `share`, `user-share`, `crisis`, or `close` while the production page still sends legacy requests. Do not preserve a second legacy authority as a long-lived compatibility path. Implement the route slices separately, integrate them with the renderer on one branch, and promote the complete cutover together.

Do not revive a missing legacy beat cursor as zero and run the new renderer. Do not infer a cursor from speaker counts or unkeyed shares. Stamp only newly created beat-protocol meetings as version 1, preflight for zero active legacy rows, and keep an unexpected in-progress legacy meeting read-only with an explicit restart path.

Do not use `Math.random()`, current time, request order, or unstable database row order to choose a beat or id. Do not update unversioned phase state after the compare-and-set contract lands. Do not store a topic separately from completing its active topic beat. Do not analyze a losing user-share payload after another payload has become canonical. Do not treat a second generated string as equivalent to returning the first persisted result.

Do not strand `/next` on an empty participant table after the page loader used its deterministic fallback. Do not derive fallback seats through separate code paths or an unstable current timestamp. Do not treat `charactersSpokenThisRound` as a prohibition on distinct beats from the same character; the beat id prevents duplicate completion, while the participation list remains an idempotent set.

Do not run summary generation, memory extraction, callback scanning, lifecycle planning, or phase completion before acquiring the unique close claim. Do not let that claim expire silently during pre-checkpoint model work; renew it with the current token and stop before mutation if renewal loses ownership. Do not return an invented close response while another claim is active, and do not rerun close work after a completed result exists. Do not write meeting completion, phase, callbacks, lifecycle, or run completion in separate transactions.

Do not emit character, crisis-support, or room-moment content before acquiring that beat's generation claim, validating the complete candidate, and persisting the canonical winner. Do not persist a crisis response below authenticity 6 or voice consistency 6; if no candidate passes, leave the support beat active. Do not clear an acknowledged room cue without first persisting its controlled cue key, text, and beat id. Do not construct a globally unique callback effect key from a beat id that omits meeting scope.

Do not leave a fully rejected character beat active for unbounded regeneration, and do not advance it without a terminal persisted skip. Do not use that skip outcome for crisis support or the empty chair. Do not turn a valid in-progress lease into a terminal page error; honor `Retry-After` with bounded, cancellable requests for the same beat.

Do not require an active beat before looking up an already stored share, analysis, skip, generation result, crisis response, or close result. Terminal evidence answers a lost-response retry; only a request that still needs work must match the active beat.

Do not treat a stored topic alone as proof that any supplied beat id completed it. Persist a meeting-scoped control-completion row in the same transaction as topic, pass, and phase changes, then use that exact evidence for retry. Do not create fake transcript rows for controls with no spoken text.

Do not require a share id for an intake-triggered crisis or copy `userMind` into a synthetic share. Load the typed trigger from phase state, then load its text from the matching canonical server record. Do not let completed intake support retrigger on every refresh.

Do not accept topic, recent transcript, speaker, or other prompt context from the browser for expansion. The request identifies the owned share; the server loads every other input from persisted meeting state.

Do not infer a transcript speaker from `characterId === null`. Test `isUserShare` first, then classify `room_cue` and `empty_chair` as room-owned entries, and only then resolve an ordinary character. Use the same pure mapping in page hydration, close context, and expansion context.

Do not let crisis resources disappear when support completes or the response is lost. Persist the visibility flag with support phase completion and render the controlled sticky payload independently of whether a crisis beat is still active.

Do not load persisted participants directly in a roster-consuming route after the central resolver exists. A fallback visitor selected by `/next` must resolve to the same profile in `/share` and the same name in close and expansion prompts.

Do not let `character_share.interactionType` widen when room-owned transcript values are added. Its type and runtime validator must reject `room_cue` and `empty_chair`; those values complete only through their own beat kinds and endpoints.

Do not follow the archived plan's fixed branch, old checkout paths, frontend-owned ordering, or ban on an orchestration endpoint. Do not split the entire large Svelte page before deleting its obsolete orchestration; issue #90 follows this work.

Do not rewrite character voices, the style constitution, therapy blocklist, or general generation system. Do not add exact sentence counts, forced physical actions, archetype labels, placeholder voice examples, or empty `SECTION: none` blocks. Do not show a candidate below the existing authenticity and voice-consistency thresholds.

Do not add a stock empty-chair fallback, show beat ids or phase machinery in the UI, call live providers in deterministic tests, construct the real Grok adapter in the mock preview composition, provision production infrastructure, or fold identity and cleanup epics into this plan.

## Plan of Work

### Milestone 1: define the pure beat engine and compliant ritual prompts

Create `app/src/lib/core/meeting-beats.ts` and `app/src/lib/core/meeting-beats.spec.ts`. Add the beat types to `app/src/lib/core/types.ts`. Use a discriminated union so each kind carries only valid fields. The public contract must express at least these kinds: `character_share`, `room_cue`, `generated_room_moment`, `user_gate`, `crisis_support`, `close_meeting`, and `finished`. Every variant includes `id`, `ordinal`, `phase`, and `pauseAfterMs`. Define `CharacterShareInteractionType = Exclude<ShareInteractionType, 'room_cue' | 'empty_chair'>`; character beats require `characterId` plus that narrowed interaction, and their runtime validator rejects both room-owned values. Room cues require a controlled `cue`; user gates accept only `introduction`, `topic`, or `share`; a generated room moment requires `moment: 'empty_chair'`; and a crisis-support beat requires a `CrisisTrigger` discriminated as `{ source: 'user_share'; shareId: string }` or `{ source: 'meeting_intake' }` plus the server-selected `responderCharacterId`. Do not emit a reflection gate: post-meeting reflection is the UI for `finished`.

Extend `MeetingPhaseState` with `beatCursor: number`, `activeBeat: MeetingBeat | null`, `crisisTrigger: CrisisTrigger | null`, and `intakeCrisisHandled: boolean`. Its validator may still revive historical JSON for read-only display, including conversion of an earlier `crisisTriggerShareId` into the typed `user_share` form, but must never manufacture an actionable cursor for an unversioned meeting. Only a meeting whose stored `meeting_protocol_version` is 1 may pass phase state into `nextMeetingBeat`; its initialization writes all four fields explicitly. A missing protocol version or missing beat field is a sequence gate, not an instruction to restart at cursor zero.

Export a pure `nextMeetingBeat(input)` function. If `input.phaseState.activeBeat` exists, return that exact value without consuming randomness or changing state. Otherwise choose the next beat from the current phase, cursor, persisted participants, stored topic and mind context, listening choice, and compact transcript facts. A compact fact is a count, last interaction type, or stable id needed for sequencing; never pass the entire database adapter into core. Build beat ids from stable inputs, for example `<phase>:<cursor>:<kind>:<stable-subject>`. Do not use timestamps, array insertion order that is not part of the persisted roster, or `Math.random()`.

Export a pure `completeMeetingBeat(state, beatId, outcome, now)` function. The `now` value is a required `Date` supplied by the server clock seam. Refactor the ritual initialization and transition helpers used by this path to accept that same value instead of calling `new Date()` internally. The function rejects a mismatched id and uses that persisted id plus `beatCursor` as the completion authority. For character beats, add the character to `charactersSpokenThisRound` only if absent; a second distinct beat from that character is valid and increments the cursor without duplicating the participant. Do not call the existing duplicate-rejecting `recordCharacterSpoke` from this path or use the unique participant count to decide whether the scheduled beat sequence is complete. Apply a legal phase transition where appropriate, clear `activeBeat`, and increment `beatCursor`. A topic outcome must be validated against an exported `TOPIC_OPTIONS` moved from `+page.svelte`; persistence of that valid topic occurs at the server seam in Milestone 4. A crisis outcome stores the canonical typed trigger while recording `preCrisisPhase`; crisis completion returns to that saved point and clears the trigger without replaying completed work. Completing an intake-triggered support sequence also sets `intakeCrisisHandled` before the trigger clears. Completing close computes the `finished` state that the atomic finalization RPC persists with the canonical response.

Write table-driven tests for the full opening through finished sequence, every user gate, listening-only automatic pass, the three rounds, optional crosstalk and hard-question branches, a crosstalk beat followed by a scheduled share from the same character, crisis interruption and recovery tied to one canonical user share, clean-join crisis tied to stored intake, no intake retrigger after support, empty direct-engine roster rejection, stable roster ordering, retry of an active beat, invalid completion, and runtime rejection of `room_cue` or `empty_chair` as a character interaction. The repeated-speaker case must increment the cursor for both beat ids while the unique participation list contains the character once. Test two meeting ids that select different optional branches and repeat each input with one fixed timestamp to prove it is stable. Then vary only the supplied timestamp and prove only the intended phase-time field changes. A source search must find no `new Date()` or `Date.now()` in the new beat engine or the transition helpers it calls.

Before wiring the engine to generation, repair the exact sentence-count instructions in `app/src/lib/core/prompt-templates.ts`, including the meeting opening, topic acknowledgment, ritual opening, ritual introduction, ritual reading, topic introduction, ritual closing, and empty-chair builders used by this flow. Also replace `Target one paragraph (4-6 spoken-style sentences).` in the private `buildCloseSummaryPrompt` in `app/src/lib/core/meeting.ts` with natural brevity guidance. Preserve each prompt's intent, update `prompt-templates.spec.ts` and `meeting.spec.ts` to test meaning and forbidden content without asserting a sentence range, and read `style-constitution.ts` before making these edits. Do not change workflow behavior, character foundations, require physical actions, pass archetype labels to generation, weaken the three-example voice contract, or fill empty prompt sections with placeholders.

This milestone is complete when the pure suite shows the same input always returns the same next beat, the canonical experience reaches `finished`, and a repository search finds no exact sentence-count instruction in the ritual or close-summary builders used by this plan. It satisfies `BEAT-01` and prepares `BEAT-06` through `BEAT-08`.

### Milestone 2: make beat state and generated entries retry-safe

Create `app/supabase/migrations/20260912_000005_server_owned_meeting_beats.sql`, following the private-intake migration numbered `000004`. Add `phase_version bigint not null default 0`, nullable `meeting_protocol_version smallint` constrained to 1 when present, and `crisis_resources_visible boolean not null default false` to `public.meetings`. Existing rows remain unversioned. `createMeeting` begins writing protocol version 1 only in the final cutover that installs the new renderer; the value is selected by trusted server composition and is never accepted from the browser. Add nullable `beat_id text`, nullable `user_analysis jsonb`, and nullable `room_cue text` to `public.shares`, plus a partial unique index on `(meeting_id, beat_id)` where `beat_id is not null`. `user_analysis` is valid only for user shares and contains canonical `crisis`, `heavy`, and `significanceScore` values. `room_cue` is valid only for a non-user row with interaction type `room_cue` and stores a controlled `RoomCue` key; the row's content stores the exact rendered cue text. Replace the `shares_interaction_type_check` constraint with the existing values plus `room_cue` and `empty_chair`.

Create `public.meeting_generation_runs` with `meeting_id`, `beat_id`, a generation kind limited to `character_share`, `crisis_support`, or `empty_chair`, `status`, `claim_token`, `lease_expires_at`, nullable `share_id`, nullable controlled `skip_reason`, timestamps, and primary key `(meeting_id, beat_id)`. Its statuses are `running`, `completed`, `skipped`, and `failed`. A `completed` row requires a share id and no skip reason. A `skipped` row requires kind `character_share`, no share id, and `skip_reason = 'quality_rejected'`; the other kinds can never be skipped. Atomic RPCs claim a run, renew the current token's lease, complete it with the canonical stored share id, terminally skip a rejected character, or fail it. A completed claim resolves and returns that share; a skipped claim returns the same terminal reason; an unexpired running claim returns `in_progress`; a failed or expired claim can be acquired again.

Create `public.meeting_control_completions` with `meeting_id`, `beat_id`, `outcome_kind`, validated `outcome jsonb`, `phase_version_after`, `created_at`, and primary key `(meeting_id, beat_id)`. Permit only a topic outcome containing one validated `TopicOption` or a user-pass outcome containing gate `introduction` or `share`; never store arbitrary prose. One RPC validates the active matching control beat and expected phase version, inserts its canonical completion, writes the finished phase state and next version, and includes the topic in that same meeting-row update when the outcome is topic. A conflicting retry returns the existing canonical outcome. If any insert or update fails, neither the control row, topic, nor phase changes.

The same migration creates `public.meeting_close_runs` with `meeting_id`, `beat_id`, `status`, a random `claim_token`, `lease_expires_at`, nullable validated `checkpoint`, nullable validated `result`, timestamps, and primary key `(meeting_id, beat_id)`. The checkpoint holds canonical generated outputs, callback candidates with deterministic effect keys, lifecycle target states, one `completedAt` value, meeting summary and notable moments, the validated final phase state, and the canonical endpoint result before product mutations begin. Add nullable `close_effect_key` to `callbacks` with a partial unique index for non-null values so a checkpointed candidate is inserted at most once. The controlled close statuses are `running`, `completed`, and `failed`. A first claim inserts `running`; an unexpired running row reports `in_progress`; a completed row returns its stored result; and a failed or expired row may be claimed with a new token. Only the current claim token may renew, checkpoint, atomically finalize, or fail the run.

Implement generation and close transitions as narrowly scoped Postgres functions exposed through Supabase RPC so claim insert/conflict inspection, lease renewal or takeover, token validation, and status updates are atomic. The close finalization function locks the named meeting and run rows; verifies the current token, unexpired lease, expected phase version, named `close_meeting` beat, and checkpoint/result agreement; then writes `meetings.ended_at`, summary, notable moments, the checkpointed `finished` phase and next version, callback rows, lifecycle target states, the validated canonical result, and completed run status in one transaction. If any validation, insert, or update cannot apply, none of those durable close mutations apply. The functions qualify table names explicitly, validate all controlled values, and are executable by the service role rather than public callers. Every migration statement and function replacement must be safe to retry; constraint replacement should use the same explicit drop-and-add pattern already used by the March roster migration.

In `app/src/lib/seams/database/contract.ts`, add `beatId: string | null`, `userAnalysis: UserShareAnalysis | null`, and `roomCue: RoomCue | null` to `ShareRecord`; add `meetingProtocolVersion: 1 | null`, `crisisResourcesVisible: boolean`, nullable `summary`, and nullable `notableMoments` to `MeetingRecord`; and add `room_cue` and `empty_chair` to `ShareInteractionType` in `app/src/lib/core/types.ts`. Define the `UserShareAnalysis` shape, a validated `MeetingCloseResult` matching the close endpoint's complete response, a generation-claim result with `acquired`, `in_progress`, `completed`, and `skipped` variants, and a close-claim result with `acquired`, `in_progress`, and `completed` variants. Adjust the `createMeeting` input type to omit completion-only meeting fields and the server-owned protocol choice. Extend runtime validators only at this point. Historical entries and incomplete meetings use null. New beat-owned entries use the stable id. Do not create fixtures or edit the mock, contract tests, or adapter before the probe below succeeds.

Add a versioned phase read that returns `{ phaseState: MeetingPhaseState | null, version: number }` and a compare-and-set update accepting `meetingId`, `expectedVersion`, `phaseState`, and an optional validated meeting patch. Its only allowed patch is the monotonic `crisisResourcesVisible: true` for accepted crisis-support completion; the generic operation can never clear the resource flag or write topic or close fields. Topic and user-pass completion use the control-completion RPC instead. The Supabase update must filter by both meeting id and `phase_version = expectedVersion`, write the new phase state and version `expectedVersion + 1`, and include the resource flag in that same row update when requested. Report `applied: false` when zero rows changed. Keep existing phase methods only while routes are migrated; remove or delegate them at the end so no route can silently bypass versioning.

Add `getShareByBeatId({ meetingId, beatId })`. It returns `NOT_FOUND` for no entry. Make beat-aware append handling converge on the stored row when the unique index reports that another request already wrote the same generated, user, or cue beat. Controlled cue persistence uses this same lookup but never calls a model.

Add `getControlBeatCompletion({ meetingId, beatId })` and `completeControlBeat({ meetingId, beatId, expectedVersion, phaseState, outcome })`, or equivalent names with the atomic semantics above. Routes look up the control result before requiring an active beat. A completed topic retry validates the stored canonical topic rather than trusting the repeated body, then returns the already active current beat or claims the next beat if none is active. An explicit or listening-only pass likewise returns its stored terminal outcome without inventing a share.

Add `claimBeatGeneration`, `renewBeatGeneration`, `completeBeatGeneration`, `skipCharacterGeneration`, and `failBeatGeneration`, or equivalent names with the migration's semantics. A character, crisis-support, or room-moment route checks for a stored share or terminal run first, then acquires the claim before invoking the model. Only the current token can renew, complete, skip, or fail. Completion stores the canonical share id; a completed retry loads it. Skip accepts only a character run and stores no share. A skipped retry returns that outcome even after the active beat advanced, and the route completes a still-active matching character beat without generation or transcript insertion. Use a bounded lease comfortably longer than an ordinary provider call and renew it during generation and validation. No candidate content leaves the server before quality acceptance and persistence, and a competitor receives no generated chunks from a request that did not acquire the claim.

Add `setUserShareAnalysisIfAbsent({ meetingId, beatId, analysis })`. It updates only a user share whose `user_analysis` is null, writes the same `significanceScore` into the existing score column, then returns the stored analysis whether this request won or lost. This is the interpretation claim: competing analyzers may propose different results, but every completion must use the one analysis the row retained. Contract and adapter validation reject analysis for a character share or invalid scores.

Add `claimMeetingClose({ meetingId, beatId, leaseDurationMs })`, `renewMeetingClose({ meetingId, beatId, claimToken, leaseDurationMs })`, `checkpointMeetingClose({ meetingId, beatId, claimToken, checkpoint })`, `finalizeMeetingClose({ meetingId, beatId, claimToken, expectedVersion })`, and `failMeetingClose({ meetingId, beatId, claimToken, errorCode })`, or equivalent names with those semantics. Claim acquisition is the only boundary that authorizes close preparation. Renew the token periodically during summary, memory, fallback-summary, and callback-candidate model work and immediately before checkpoint and finalization; losing renewal discards uncheckpointed output and stops before a product mutation. Split callback work into read-only candidate discovery and lifecycle work into input loading plus a pure target-state plan. Checkpointing validates and preserves those model-derived values, deterministic `<meetingId>:<beatId>:callback:<checkpointed-index>` effect keys, lifecycle targets, `completedAt`, meeting fields, final phase state, and endpoint response. The finalizer consumes that checkpoint and is the only operation allowed to write meeting completion fields, insert callbacks, apply lifecycle targets, clear the close beat, or complete the run. A lost finalization response reloads the now-completed run and cannot observe a subset of those writes. An ordinary retry of a completed beat reads that response and does not call any generator, discovery, planning, or mutation seam. An unexpired competing claim produces a retryable conflict with `Retry-After`; it does not start a second close. Bound the lease, test a healthy slow holder that renews past the original expiry, and separately test takeover after a truly abandoned lease.

Create `app/probes/serverOwnedMeetingBeatsProbe.mjs` and `probe:supabase-meeting-beats` before writing fixtures or implementations. Run the migration on the real local Supabase stack established by `plans/private-meeting-access-execplan.md`. The probe performs concurrent version updates, atomic topic and pass control completions with completed replay, an atomic crisis-resource phase update, a room-cue insert and beat-id conflict, competing generation claims and lease renewal, a terminal character skip and replay, rejection of skip for crisis and empty-chair kinds, competing first-analysis writes, two simultaneous close claims, wrong-token renewal/checkpoint/finalization, a healthy slow close holder renewing past the original expiry, completed replay, and truly expired-lease takeover. It proves a rejected control completion changes neither the ledger, topic, nor phase. It rejects one close finalization after preparing meeting completion, callback, lifecycle, phase, and run changes and proves none of them applied. It then performs a successful finalization, simulates a lost response by rereading, and proves every checkpointed mutation plus the identical completed result is present together. It also records the protocol-cutover preflight query and proves a legacy mid-round row cannot enter a beat RPC. It resets its deterministic rows on repeat and writes redacted raw success, conflict, and failure shapes plus capture metadata to the database fixture directory. If that real probe cannot run, mark this milestone blocked and stop before the fixture, mock, contract-test, adapter, and route dependency chain; do not invent captures.

After inspecting a successful capture, extend the fixture-backed database mock and add contract tests for fixture schema conformance and mock fidelity. Cover protocol version and legacy gating, version wins and conflicts, atomic topic/pass control completion and replay, atomic crisis-resource visibility, stable existing-share and cue lookup, nullable historical beat ids, cue keys, and user analysis, unique-conflict recovery, all three generation kinds, claim renewal, completed and skipped replay, invalid non-character skips, first-analysis-wins, `empty_chair` with null character id, meeting-scoped callback keys, close-claim contention, completed-result replay, wrong-token rejection, slow-holder renewal, expired-lease takeover, rollback of the full close mutation set, and lost-response reread. Only after the mock contract passes, implement the same captured behavior in `app/src/lib/server/seams/database/adapter.ts`, validate each RPC result, and add focused adapter tests. Update test doubles last.

This milestone is complete when the real probe, captured fixtures, mock-fidelity contract, and adapter suites pass in that order; a pair of writers using the same phase version produces one applied update and one conflict; topic and pass completion each store one terminal control result with their phase change; a rejected character run replays one terminal skip while other generation kinds reject that state; two user-share analyzers converge on one stored interpretation; two close callers produce one claim holder; a renewing holder cannot be taken over; a failed finalization changes no meeting, callback, lifecycle, phase, or run row; and every successful or lost-response retry observes the complete atomic close result. It satisfies `BEAT-02` and `BEAT-03` at the persistence boundary.

### Milestone 3: add the next-beat endpoint

Create `app/src/routes/meeting/[id]/next/+server.ts` and route tests in `app/src/lib/server/routes/meeting-next-beat.spec.ts`. The endpoint is a `POST` because claiming or acknowledging a beat changes persisted state. Its body may be empty when asking for the next beat. For a `room_cue` acknowledgment it accepts `{ completedBeatId }`. For the topic gate it accepts `{ completedBeatId, topic }`. Reject unrelated fields, invalid topic values, mismatched beat ids, and attempts to acknowledge character, generated-room, user-share, crisis-support, close, or finished beats through this generic path. The specialized routes named below complete every rejected effectful kind; the engine emits no reflection gate.

Before any phase, participant, or transcript work, require the owner-checked meeting record to have `meetingProtocolVersion === 1`. An in-progress unversioned meeting returns the stable legacy-restart result used by the loader and performs no generation or database mutation. A completed unversioned meeting remains a read-only transcript/summary view and never calls this endpoint. The deployment preflight queries for active unversioned rows and postpones cutover unless the count is zero; the runtime gate remains in place in case an unexpected historical row survives.

For an empty request, load the versioned phase state, owned meeting context from `locals.meetingContext`, the centrally resolved roster, and the compact transcript facts required by `nextMeetingBeat`. Extract the page loader's current deterministic selection into one pure `deriveMeetingRoster({ meetingId, startedAt })` helper using `createSeededRandom(meetingId)` and the meeting record's stable start time. Wrap it in one server-side `resolveMeetingRoster` helper that loads persisted participant rows first and otherwise derives, attempts to save, and returns the stable fallback. The page loader and `/next` adopt the resolver here; `/share`, `/close`, and `/expand` adopt it in Milestone 4. If the participant read returns an empty list or a non-not-found seam failure, derive the fallback and attempt the existing save; if saving fails or returns no rows, continue with those generated seats. A unique save race reloads the canonical rows, which must match the same deterministic selection. A true meeting-not-found result remains an error. Cover the complete join redirect where participant saving fails: the page and its first `/next` call must show and use identical nonempty seats.

Derive setup crisis only by applying the existing pure `detectCrisisContent` to the owner-checked record's effective stored `userMind`; pass the boolean into the pure engine rather than passing browser text or invoking a model. If setup crisis is true, `intakeCrisisHandled` is false, and no crisis is already active, the engine claims a `crisis_support` beat with `{ source: 'meeting_intake' }` before ordinary opening work. If an active beat exists, return it unchanged. If the core chooses a new beat, compare-and-set the new active state before responding. On a version conflict, reload and retry a small bounded number of times; normally the response becomes the beat stored by the competing request. If contention does not settle, return HTTP 409 with a retryable seam error rather than choosing locally.

For a room cue acknowledgment, check `getShareByBeatId` before requiring the active cue. A stored cue returns its canonical row after phase advancement or completes only a still-active matching beat. With no row, map the active controlled key to its existing rendered text, append one non-user `room_cue` transcript row with `characterId: null`, the beat id, and the cue key, then complete it with compare-and-set and return the next claimed beat. An append unique conflict reloads the canonical cue row and follows the same completion path. Cue insertion failure leaves the beat active. For a topic acknowledgment, check `getControlBeatCompletion` before requiring the active topic gate. An existing topic result supplies the canonical topic and returns the current active beat, or claims and returns the next beat if the phase advanced before one was stored. With no result, validate against `TOPIC_OPTIONS`, compute completion, and call `completeControlBeat` so the topic, terminal result, phase state, and version commit together. If two requests submit different valid topics at the same version, only the winner's topic, result, and completed phase may be stored; the loser returns that canonical result rather than its body or a stale-beat error. Prove cue acknowledgment, differing-topic race, and lost topic-response replay in route and adapter tests. Do not add a standalone topic update.

The returned JSON is a `SeamResult<{ beat: MeetingBeat; phaseState: MeetingPhaseState }>` or the repository's equivalent existing response envelope. It contains no prompt text, private intake, model context, or arbitrary client instructions. This milestone is complete when repeated empty requests return the same id, two simulated claimers converge on one id, persisted and fallback rosters choose the same stable speakers, a failed participant save does not strand the redirected room, completed room cues advance once, a valid topic survives reload, a protocol-version-1 meeting starts normally, and a legacy mid-round row produces no `/next` work, model call, transcript growth, or phase write. The ownership test proves the endpoint is gated before phase or transcript reads. It satisfies `BEAT-01`, `BEAT-02`, and `BEAT-08` at the route boundary.

### Milestone 4: let specialized routes complete the active beat

After the common ownership gate and strict request parsing, every specialized completion route resolves beat-owned terminal evidence before it requires the beat to remain active. A stored share plus required analysis, completed or skipped generation run, or completed close run can answer a lost-response retry after phase advancement. When the named beat is still active, the route idempotently completes it from that evidence. When phase already advanced, it returns the canonical result without trying to reconstruct the old active beat. Only a request with unfinished work must match the current active beat. A partially stored invariant that cannot be completed from the current state returns a contract error rather than generating a second result.

Migrate `share/+server.ts` first. Normal meeting calls provide only `beatId` plus transport options needed for SSE. The route calls `getShareByBeatId` and reads the terminal generation result before loading active state. If either identifies a completed stored share, return its canonical content and complete only a still-active matching beat. If neither is terminal, require an active `character_share` beat and use `resolveMeetingRoster` to derive the exact `characterId`, voice profile, `interactionType`, phase, selected topic, and sequence position from server state. Ignore no client override silently: reject legacy character or interaction values that disagree so drift is visible during migration.

If no stored share exists, acquire the beat's generation claim. A completed claim reloads its share, an unexpired claim returns a retryable in-progress result with no SSE content, and only the acquired token may call the model. Renew the lease during slow generation and validation. Buffer candidate chunks on the server until the complete candidate passes existing quality checks; do not expose a candidate that may still be rejected. Append the accepted text with the beat id, complete the generation run with that share id, complete the active beat, and compare-and-set the new phase state. Then stream the canonical stored text to the holder, preserving the existing progressive presentation without making pre-persistence model output observable. A unique append conflict reloads the canonical entry, associates the claim with it, and returns that text rather than a losing candidate.

If every bounded character candidate fails the quality gate, call `skipCharacterGeneration` with the current claim token, then complete the still-active character beat with a typed skipped outcome and no transcript insertion. Return a stable skipped response so the renderer asks for the next beat without displaying text. If the request fails after recording the skip but before phase completion, a retry loads the terminal skipped run before requiring an active claim, performs the same idempotent completion if that beat is still active, and never calls the model. A retry after advancement returns the same skipped result. Do not use this behavior for crisis support or the empty chair; those beats remain active after a failed generation run.

Migrate `user-share/+server.ts` so, after request validation, it first loads the beat-owned share and stored analysis or a beat-owned user-pass control result. A share with complete analysis or stored pass is terminal evidence: complete a still-active matching gate or return its canonical response after phase advancement. A share without analysis resumes analysis only while that beat remains active; if phase already advanced, report the impossible partial state instead of accepting new text. With no stored result, require an active `user_gate` for introduction or share, accept the beat id and user text or the controlled pass action, and derive sequence and phase behavior on the server. Explicit and listening-only passes call `completeControlBeat` so pass evidence and phase commit together. For spoken input, append the beat-owned content with its deterministic non-crisis baseline score; whether this request inserts or loses a unique conflict, reload `getShareByBeatId` and treat that persisted content as canonical. Derive crisis, heavy-disclosure, and final significance only from that content, then call `setUserShareAnalysisIfAbsent` and use the returned canonical analysis to enter crisis with `{ source: 'user_share', shareId: canonicalShare.id }` and the interrupted resume point recorded or complete the ordinary gate. If a losing request supplied different text or proposed different analysis, neither can affect the returned flags or phase state.

Migrate `crisis/+server.ts` to accept only `{ beatId }` and first load the beat's completed generation result and stored share. A terminal result returns the canonical support plus the controlled crisis-resource payload after phase advancement; if its beat remains active, completion uses one compare-and-set meeting update that both resumes the saved state and sets `crisisResourcesVisible: true`. If no terminal result exists, require the active `crisis_support` beat and load its typed trigger from phase state. For `user_share`, load that exact owned row and reject a missing, cross-meeting, or non-user record. For `meeting_intake`, load the effective stored `userMind` from `locals.meetingContext` and reject a missing historical value instead of inventing text. Load `userDisplayName` from the same owner-checked context in both cases. Do not accept `userText`, `userName`, a trigger source, or a recent-share guess from the browser.

Check for the support beat's stored share, then acquire its generation claim before any model call. A completed claim returns the canonical row and an unexpired claim returns retryable in-progress with no generated content. The holder uses the existing crisis prompt and responder but applies `buildQualityValidationPrompt`, `parseQualityValidation`, and `passesQualityValidationThresholds` to every complete candidate. Require authenticity at least 6, voice consistency at least 6, and all existing exclusions; retry only the existing bounded candidate count. Persist and complete the generation run only for the first accepted response. If the provider fails or every candidate is rejected, mark the generation claim failed with the current token, leave the same crisis beat active, and return the existing recoverable room error with no stored or client-visible candidate. A later request may acquire that failed run for an explicit retry.

Completing an accepted support response resumes from the saved pre-crisis state, retains the same typed trigger for any second support beat, then clears it when support ends without resurrecting the interrupted active beat or replaying earlier shares. Every accepted support completion sets `crisisResourcesVisible: true`; intake-triggered completion also sets `intakeCrisisHandled`. Both facts commit in the same versioned meeting update as phase advancement. Repeated requests return the stored response and controlled resources without generation or validation, and page refresh continues to show those resources from the durable flag.

Migrate `close/+server.ts` so the request contains only the active close beat id. Look up an existing close run before requiring the active beat: return a completed run immediately, return a retryable conflict for an unexpired claim, or acquire/recover the claim. Only the claim holder may use `resolveMeetingRoster`, load context, and run summary generation, memory extraction, callback-candidate discovery, or lifecycle target planning. Load the topic and recent shares on the server instead of accepting them as client authority. Renew the close lease throughout every slow model stage and immediately before checkpoint and finalization; if renewal loses ownership, stop without applying any product mutation.

Add one pure transcript-speaker mapper used by the meeting loader, close context, expansion context, and later renderer. It first checks `isUserShare` and returns the owner-checked display name, then maps `room_cue` and `empty_chair` to a controlled `Room` label, then resolves an ordinary non-null character id from the roster or core profiles, with `Character` as the truthful unknown fallback. Never label a row as the user merely because its character id is null. Close summary, memory, and callback prompt inputs must use this mapper, and route tests must include both new room-owned interaction types.

Refactor callback scanning into candidate discovery with no database write. Refactor lifecycle updates into read-only input loading and pure derivation of explicit target states. After all model-derived outputs and candidates exist, compute `completeMeetingBeat` with one `completedAt` value and checkpoint the meeting summary, notable moments, endpoint response, callback candidates with deterministic `<meetingId>:<beatId>:callback:<checkpointed-index>` keys, lifecycle targets, and final phase state before any product mutation. A recovering expired claim reuses the checkpoint and does not regenerate saved outputs.

Finish only through `finalizeMeetingClose`, which verifies the current token and expected version and atomically writes `endedAt`, summary, notable moments, callbacks, lifecycle target states, the checkpointed `finished` phase, and the completed close-run result. Do not call `completeMeeting`, callback persistence, lifecycle mutation, or the general phase compare-and-set separately for close. A failed transaction applies none of those writes. A crash before finalization leaves product state unmodified and the checkpoint recoverable; a crash or lost response after it leaves every mutation committed with a completed run that retries can return without the old active beat. A later retry returns that exact payload with zero generator, discovery, planning, completion, callback, lifecycle, or phase-write calls. If processing fails before finalization, fail the claim with the seam error only when the current token still owns it and leave the meeting explicitly retryable.

Migrate `expand/+server.ts` so the request contains only `shareId`. Verify that the share belongs to the owned meeting, resolve the same persisted-or-fallback roster, then load the persisted topic and bounded recent transcript from the database in stable sequence order. Map every recent row through the same truthful transcript-speaker helper before building the expansion and quality prompts. Keep expansion outside sequence advancement; it must not change the active beat or accept compatibility context supplied by the browser.

Route tests must cover stale ids, wrong beat kinds, runtime rejection of room-only character interactions, retries before and after persistence, unique conflicts, quality-rejected candidates, pass, heavy share, both crisis trigger sources, close, expansion, and adapter outages. Lose responses after topic, explicit pass, character, user-share, crisis-support, and room-moment phase advancement; each retry must return its terminal canonical result without requiring the old active beat, adding transcript rows, or calling a model. The topic retry must return the canonical current beat, and a competing topic body cannot replace the stored winner. Race two character requests and prove one generation claim, one model call, one stored share, identical eventual text, and zero losing SSE chunks; also prove rejected candidates never reach SSE. Reject every candidate for another character beat and prove one terminal skipped run, no share, one phase completion, no regeneration after a lost response, and the same skipped result after refresh. Add a two-request user-share race with different text and prove crisis, heavy, significance, response content, and phase outcome all describe the one stored winner. For crisis support, prove both a stored user share and clean-join `userMind` supply canonical text, race two requests to one generation claimant, reject a sub-threshold candidate before accepting the next, leave the beat active with no visible or stored output when all candidates fail, and keep the standard resources visible after a successful response is lost and the page refreshes. Prove completed intake support does not reappear after refresh. Make participant saving fail, select a derived visitor, and prove `/share` generates with that visitor's voice profile while close and expansion label the same visitor consistently. Add a two-request close race and prove one acquires the claim while the other runs zero effects; keep the first worker healthy past its original expiry through renewal and prove no takeover or repeated model call. Separately recover an abandoned expired lease from its checkpoint. Reject finalization after preparing every mutation and prove meeting fields, callbacks, lifecycle, phase, and run result all remain unchanged; then finalize and lose its response, reload the complete canonical result, and prove every mutation committed together. Use two meetings with the same closing beat and prove their callback keys and rows remain distinct. For close and expansion, include `room_cue` and `empty_chair` rows and prove both prompts label them as `Room`, never as the user. Supply forged expansion topic, transcript, and speaker fields and prove they are rejected while canonical server-loaded context reaches both prompts. Keep the rule that any generated transcript entry with authenticity below 6 or voice consistency below 6 is not shown or persisted; a character is durably skipped, while crisis and empty-chair beats remain active, without completing any beat with rejected text.

This milestone is complete when only the server-selected character, crisis source, responder, and interaction can drive generation; every persisted generated or user entry carries one beat id; each accepted crisis response passes the quality gate and leaves durable resources; a healthy close holder renews ownership; close finalization cannot split any product mutation from its canonical result; and repeating any completion before or after phase advancement returns one canonical outcome. It satisfies `BEAT-03`, `BEAT-06`, and the server half of `BEAT-04`.

### Milestone 5: generate, validate, and persist the empty chair

Add `empty_chair` to `ShareInteractionType` and its database constraint in Milestone 2, then create `app/src/routes/meeting/[id]/room-moment/+server.ts`. Its `POST` body is exactly `{ beatId }`, and it rejects extra client context. After ownership and body validation, check for a stored beat result or completed generation run before loading active state; return that canonical result after phase advancement, or complete it if the same beat remains active. Only unfinished work requires the matching active `generated_room_moment` with `moment: 'empty_chair'`. Then use the same generation-claim contract as character shares so exactly one request can invoke the model; competing requests receive in-progress or completed canonical behavior. Call the existing Grok seam with a stable internal correlation character id such as `empty-chair-room`. Before persistence, validate every candidate with a new pure `buildRoomMomentQualityValidationPrompt` that returns the existing `QualityValidationResult` schema. For this non-character entry, `voiceConsistency` means consistency with the room voice and style constitution. Accept only candidates for which `passesQualityValidationThresholds` enforces authenticity at least 6, voice consistency at least 6, and the existing therapy, moralizing, generic-language, and emotion-labeling exclusions.

Use the same bounded candidate-retry shape as the existing share path. Persist the first accepted result with `characterId: null`, `isUserShare: false`, `interactionType: 'empty_chair'`, and the active beat id, complete its generation run with the stored share id, then compare-and-set completion of that beat. The client-facing transcript mapper renders this interaction type as a ritual or room entry with no character speaker label. Do not treat null character id as the user for this entry. A retry checks `getShareByBeatId` first, completes a still-active matching beat if needed, and returns the canonical stored text without generation or validation. A unique conflict reloads that same row and follows the same completion path.

The generation prompt must ask for a brief, naturally complete empty-chair moment with no names, therapy language, slogans, forced physical action, explained moral, or exact sentence count. It must omit empty sections rather than render placeholder values. Preserve the style constitution. The hardcoded sentence in `runFreshMeeting` must not survive as a fallback. A generation or validation failure shows the existing recoverable room error, leaves the same beat active, and persists nothing.

Update prompt tests, generated-room route tests, transcript mapping tests, and the integration sequence. The mock response should be clearly written test content rather than `example line` placeholders. Prove first-candidate rejection followed by acceptance, all candidates rejected, provider failure, one generation on successful first completion, zero generation and validation calls when the stored beat is retried, one persisted entry, no speaker label, and the same text after refresh.

This milestone is complete when two newly created meetings may receive different accepted outputs, one meeting always keeps its own first persisted output, rejected output never appears or completes the beat, and no literal production fallback supplies the old sentence. It satisfies `BEAT-07` and closes #83.

### Milestone 6: replace the browser script with one renderer loop

As part of this same cutover slice, update trusted `createMeeting` persistence to stamp protocol version 1 for newly created meetings. The browser cannot choose the value, and the earlier additive persistence slices leave creation unversioned so an old renderer can never create a record later mistaken for a new-protocol meeting. Then update `app/src/routes/meeting/[id]/+page.server.ts` to expose `initialSummary` from the authorized meeting record's nullable stored summary and `initialCrisisResources` from `crisisResourcesVisible` using the single controlled payload. Gate sequence bootstrap on `meetingProtocolVersion === 1`. A completed unversioned meeting may render its stored transcript and summary. An in-progress unversioned meeting receives a clear read-only restart presentation with a clean join link; it receives no active beat, makes no `/next` request, and triggers no model or database mutation. Add creation and loader tests for a new version-1 row, that legacy mid-round state, and a post-meeting refresh after the close response was lost.

In `app/src/routes/meeting/[id]/+page.svelte`, preserve the existing transcript components, SSE preview presentation, input components, crisis display, and reflection. Initialize `summaryText` from `initialSummary` and the sticky crisis card from `initialCrisisResources`; accepted support keeps that controlled card visible independently of the current active beat. Render the legacy restart presentation without starting the generic loop. Delete the orchestration functions `runFreshMeeting`, `runRounds`, `runRoundOne`, `runRoundTwo`, `runRoundThree`, `runClosing`, and `continueFromPersistedPhase`. Delete their speaker-picking, hard-question, round-specific random, and phase-replay helpers once tests prove the server supplies those decisions.

Write one small loop that posts to `/next`, switches on the returned discriminated beat kind, and renders it. `room_cue` maps a controlled cue key to the existing system, action, or ritual presentation, waits for `pauseAfterMs`, then acknowledges that id. The acknowledged response and later page loads use the persisted cue transcript row rather than appending a second local copy. `character_share` requests the server-selected beat through `/share`; accepted canonical stored text may still be chunked for progressive display after validation and persistence, while a canonical skipped result adds no transcript entry and immediately asks for the next beat. `generated_room_moment` posts its id to the validated `/room-moment` path completed in Milestone 5. `user_gate` presents the corresponding introduction, topic, or share control and stops the loop until user input completes it. `crisis_support` posts its id to `/crisis`. `close_meeting` invokes `/close`. `finished` renders the existing reflection with `summaryText`, including `initialSummary` after refresh, and stops.

For character, crisis-support, room-moment, and close routes, treat a valid `in_progress` result as a claim state rather than the existing terminal error presentation. Re-request the same beat id after the server's validated `Retry-After`, capping each delay at 5 seconds and stopping after 30 seconds total. Every delay and request shares the renderer's cancellation token and stops on unmount, navigation, or crisis interruption. Success or a terminal skipped-character result resumes the loop. Exhaustion shows one recoverable retry control bound to the same beat; it does not call `/next`, advance locally, or start a second sequence. Malformed or missing `Retry-After` uses a documented 1-second default. Component tests return in-progress twice then canonical completion, cover the bounded stop, and prove cancellation starts no later request.

The page may own animation, waiting, and bounded claim-retry mechanics, but it must not own phase-specific delays or decisions. The `pauseAfterMs` value comes from the beat. The client may clamp an unreasonable value to a documented safe presentation range, but must not substitute a different sequence. It may upsert transcript entries by stored share id; it must not invent persisted sequence order or append a second local copy. Use the shared transcript-speaker mapper so `isUserShare` wins, `room_cue` and `empty_chair` remain room-owned, and neither null-character room entry receives a user or character speaker label.

Move `TOPIC_OPTIONS` to the shared pure module and import it for rendering. Topic selection acknowledges the active topic gate through `/next`. User introduction and round shares go through `/user-share` with their beat ids. Remove private meeting context from generation query strings where the server can derive it from `locals.meetingContext` and stored state.

Use loader, component, or route-backed Playwright tests to prove each beat kind and a skipped character render through the one loop, in-progress claims retry and converge without duplicate output, stored cues are not duplicated locally, accepted crisis resources survive phase advancement and refresh, `finished` after reload displays the stored close summary, and an in-progress legacy meeting renders only the restart path. A source assertion may supplement behavior by rejecting reintroduction of the named `runRound*` and `continueFromPersistedPhase` functions, but behavior tests remain the primary proof. This milestone is complete when the page has no hardcoded speaker order, optional branch selection, round recursion, phase replay, terminal handling of a valid in-progress claim, or sequence execution for an unversioned meeting. It satisfies `BEAT-04` and the reflection portion of `BEAT-05`.

### Milestone 7: prove replay-free refresh

Expand `app/src/lib/server/routes/meeting-ritual-phase.integration.spec.ts` or create a focused integration suite that drives the next-beat protocol through every phase using the mock database. At each point after a generated share, skipped character, acknowledged room cue, and user gate, snapshot the persisted transcript, generation outcome, roster, and state, reconstruct the route/page inputs as a refresh would, ask for the next beat, and assert that entry ids, cue keys, skip result, share count, and prior content are unchanged. Then complete the returned beat and continue. Force participant saving to fail after join and prove the loader and `/next` independently derive the same seats; carry the derived visitor into `/share`, close, and expansion and prove the voice profile and label remain identical. Include the shipped crosstalk branch where one character takes the following scheduled share and prove both beat ids complete while the unique participation list contains one id.

Extend the existing `createGrokAiMock` with a fixture-backed scripted scenario selected only when the server test composition is constructed. Classify calls by stable correlation id and controlled prompt marker, then return deterministic accepted character, crisis-support, and empty-chair prose; valid quality JSON above both minimum scores; a close summary; memory output; and callback-scan output as the real routes require. Record calls by meeting and prompt category for unit and integration assertions. Do not select output through a browser header, cookie, query parameter, or test-only HTTP endpoint. Install this mock as `event.locals.grokAi` through the `E2E_MOCK_SEAMS=1` composition established by the privacy plan, with `reuseExistingServer: false`; no route-backed browser case may construct or contact the real Grok adapter.

Add Playwright coverage in `app/tests/e2e/meeting-flow.spec.ts` for at least a mid-round refresh, a refresh while waiting for the user, a refresh while another request owns an in-progress claim, and a refresh immediately after a generated or skipped response. Capture the transcript entry ids before refresh and compare after rehydration. No id may disappear, change content, or appear twice, and a skipped beat must stay absent without regenerating. The in-progress page must poll the same beat according to `Retry-After` and eventually render or skip its canonical result. The next new entry must have the next beat id and sequence order. Seed a historical mid-round meeting with null protocol version and prove the page offers restart while the browser makes no `/next` or generation request and persisted state remains byte-identical; separately prove a newly created version-1 meeting begins the loop.

Exercise clean-join crisis from stored intake, refresh during support, complete support, and prove it does not trigger again. Separately exercise crisis during a user gate, refresh during crisis support, complete support, and verify the room resumes from the stored point. Lose the accepted support response after phase advancement, refresh, and prove the standard resources remain sticky from `crisisResourcesVisible`. Exercise simulated network loss after character, user-share, crisis-support, and room-moment phase advancement; each retry must return its stored terminal outcome without the old active beat, transcript growth, or a model call. Exercise a direct close retry after its atomic finalization response is lost and assert that the stored close result returns without any repeated summary, memory, callback, lifecycle, or phase work. Separately refresh the page after close advanced to `finished` and prove the loader's stored `initialSummary` renders the same reflection without needing the cleared close beat id. Hold close generation beyond its first lease while renewing and prove a competitor never takes over; separately abandon a checkpointed claim and prove takeover reuses the checkpoint.

Include room cues and the empty-chair row in the server-built close and expansion contexts and assert that both are labeled `Room`, while the real user row alone uses the person's display name. Reject one close finalization and assert byte-identical meeting completion fields, callbacks, lifecycle state, phase, and run result; then retry and prove the full set commits together. Remove the 2026-03-19 replay-free refresh item from `DEFERRED.md` only after these cases pass. If any phase cannot be proven, keep the item and record the exact phase and state rather than declaring #82 solved. This milestone is complete when refresh alone never starts duplicate generation, never increases transcript length, preserves accepted crisis resources, and automatically converges on terminal or in-progress canonical outcomes. It satisfies `BEAT-05` and `BEAT-06`.

## Concrete Steps

Run all application commands from `C:\Users\shiva\OneDrive\Documents\ChatGPT\14thstep\app` in PowerShell, using `npm.cmd` so PowerShell execution-policy shims do not interfere.

After Milestone 1:

    npm.cmd run test:unit -- --run src/lib/core/meeting-beats.spec.ts src/lib/core/ritual-orchestration.spec.ts src/lib/core/prompt-templates.spec.ts src/lib/core/meeting.spec.ts
    npm.cmd run verify:core
    npm.cmd run check
    rg -n "new Date\(|Date\.now\(" src/lib/core/meeting-beats.ts src/lib/core/ritual-orchestration.ts
    rg -n "([0-9]+\s*-\s*[0-9]+|exactly\s+[0-9]+).*sentences?" src/lib/core/prompt-templates.ts src/lib/core/meeting.ts

Expect the named suites and core verification to pass and `svelte-check` to report zero errors. Expect both searches to return no matches after every touched ritual helper accepts its timestamp as an argument and every ritual or close-summary prompt uses natural brevity guidance.

After Milestone 2:

    npm.cmd exec supabase start
    npm.cmd exec supabase db reset
    npm.cmd run probe:supabase-meeting-beats
    npm.cmd run test:unit -- --run src/lib/seams/database/contract.test.ts src/lib/server/seams/database/adapter.spec.ts
    npm.cmd run verify:contracts
    npm.cmd run check

Expect the real local probe to capture protocol-version gating, one version winner with atomic crisis-resource visibility, atomic topic/pass control completion and replay, one cue/beat-row winner, one generation claimant with renewal, one completed result, one character-only skipped result, rejection of invalid skip kinds, one canonical user analysis, one close claimant, meeting-scoped callback keys, token rejection, healthy slow-holder renewal, full finalization rollback, the jointly stored meeting fields, callbacks, lifecycle targets, finished phase, and completed result, completed replay, and abandoned-lease recovery before fixture, mock, contract, and adapter checks pass. If the real probe cannot run, stop the database-dependent milestones and record the blocker. Do not apply the migration to the unavailable production tenant as part of this local gate.

After Milestones 3 and 4:

    npm.cmd run test:unit -- --run src/lib/server/routes/meeting-next-beat.spec.ts src/lib/server/routes/meeting-share.spec.ts src/lib/server/routes/meeting-user-share.spec.ts src/lib/server/routes/meeting-crisis.spec.ts src/lib/server/routes/meeting-close.spec.ts src/lib/server/routes/meeting-expand.spec.ts src/lib/server/routes/meeting-ritual-phase.integration.spec.ts
    npm.cmd run verify:composition
    npm.cmd run check

Expect all next, protocol-cutover, atomic topic/pass completion, fallback-roster, fallback-visitor consumer, repeated-speaker, durable cue, claimed generation, terminal-result-first completion, retry, character-interaction validation, intake and user-share crisis, sticky crisis-resource, close-renewal, truthful transcript-label, and expansion cases to pass. Character and crisis races must expose no losing or rejected text. The close test must keep identical beat ids in different meetings isolated and prove every product mutation and the run result finalize atomically. The composition check must continue to prove that database and model I/O stay in server modules.

After Milestones 5 through 7:

    npm.cmd run test:unit -- --run src/lib/core/meeting-beats.spec.ts src/lib/core/prompt-templates.spec.ts src/lib/server/routes/meeting-generated-room-moment.spec.ts src/lib/server/routes/meeting-ritual-phase.integration.spec.ts
    npm.cmd run test:e2e
    npm.cmd run lint:verify
    npm.cmd run check

Expect the full browser flow, legacy restart gate, skipped-character case, failed-roster-save and fallback-visitor case, repeated-speaker case, in-progress claim retry, lost-response terminal retries, sticky crisis resources, slow close renewal, truthful room labels, and dedicated refresh cases to pass against the server-process auth, database, and scripted Grok mocks with no provider calls. Check that the page no longer contains the retired sequence functions:

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

Repeat the join with `saveMeetingParticipants` failing and no participant rows. The page loader and `/next` must derive the same ordered roster from the meeting id and stored start time, the room must reach its first character beat, and refresh must preserve those speakers. `/share` must use the selected fallback visitor's actual voice profile, while close and expansion use that same visitor name. A real meeting-not-found response must still fail rather than manufacture seats.

During each sharing round, refresh after the first character, while waiting for the user, and immediately after submitting the user share. Before and after refresh, transcript ids and content must match exactly. Refresh must not call the model. The next new beat must follow the saved cursor, not the beginning of the round. Lose explicit and listening-only pass responses, then require the stored control result without a stale-beat error or invented transcript row. Lose character and user-share responses after their phase updates, then retry their ids and require the canonical stored results without an active-beat error, transcript growth, analysis drift, or model call. Force the optional crosstalk speaker to take the following scheduled share; both distinct beat ids must complete, the cursor must advance twice, and the unique participation set must contain that character once.

Lose a topic-acknowledgment response after its transaction commits. Retrying that id with either the same or a different valid topic must load the stored control outcome and return the canonical current beat without changing topic or phase again. Refresh after an acknowledged opening cue and after the closing ritual. The same stored cue rows, controlled keys, rendered text, and ids must reappear exactly once. Close and expansion prompt captures must label those cues and the empty-chair entry as `Room`; only rows with `isUserShare` may use the person's name. Race two character-generation requests for one active beat: only the claim holder may receive generated chunks, and both callers must eventually converge on the same stored accepted text. Construct character beats with `room_cue` and `empty_chair` interaction values and prove both type validation paths reject them before generation.

Reject every bounded candidate for another character. The run must become terminally skipped with `quality_rejected`, the beat must advance without a transcript row, and a lost response or refresh must return the same skip without another model call. Attempting that skip for crisis support or the empty chair must fail and leave the beat active. While a different request holds any generation or close lease, return `in_progress` twice and then its canonical result; the renderer must honor bounded `Retry-After` delays, request the same beat, and resume automatically. Exhaustion exposes one retry control for that beat, and navigation cancels every pending delay and request.

For two different meeting ids with the same roster and intake, optional choices may differ. Repeating either meeting from its saved state must not differ. Every selected character must belong to the persisted roster. Every interaction type must match the active beat. No browser-supplied character, phase, sequence order, topic, recent transcript, or interaction override may control server behavior. Expansion accepts a share id and derives both prompt and quality context from the owned meeting and stored shares.

Start one meeting with crisis language in the clean join intake. Its support beat must carry `{ source: 'meeting_intake' }`, load text from the owner-checked meeting record, survive refresh, and set `intakeCrisisHandled` when support finishes so the same intake does not trigger again. In another meeting, trigger crisis during a user gate. The ordinary loop must stop, the crisis-support beat must store `{ source: 'user_share', shareId }`, and refresh must remain at that support beat. Submit altered `userText`, `userName`, trigger source, or share id to the crisis endpoint and prove they cannot control its prompt.

Race two support requests and prove one generation claimant calls the model. Reject one sub-threshold response before accepting a response whose authenticity and voice-consistency scores are both at least 6; only the accepted canonical text may persist or appear. When every bounded candidate is rejected, no text persists or appears and the same beat remains active for retry. Completing user-share-triggered support must resume from the pre-crisis point without replaying earlier beats and must set `crisisResourcesVisible` in that same update. Lose the response after advancement, retry without the old active beat, and refresh; both paths return the canonical support and the sticky controlled resources without generation. Race the original user-share payload against different non-crisis text for the same beat and prove every returned flag and state transition describes whichever share and analysis the database preserved.

At the empty-chair beat, the model receives the pure empty-chair prompt and every candidate receives the room-moment quality prompt. The transcript stores one null-character `empty_chair` entry only after authenticity and voice consistency both reach 6 and all existing exclusions pass. It displays without a person's name, remains identical after refresh, and contains none of the forbidden placeholder or forced-count instructions. Lose the response after phase advancement and prove a retry returns that row without requiring the old active beat or generating again. If generation fails or all candidates are rejected, the same active beat remains available for retry, persistence remains unchanged, and no hardcoded replacement appears.

Race two close requests for the same beat. Exactly one may run summary, memory, callback discovery, lifecycle planning, and finalization; the other receives the documented in-progress response. Keep that holder healthy beyond the original lease through token-checked renewal and prove the competitor cannot take over or repeat a model call. After the winner completes, every retry must return its stored canonical response without invoking any preparation or mutation. Separately abandon a claimed worker after it checkpointed output and prove an expired-lease recovery reuses that checkpoint. Force finalization to reject once and prove meeting completion fields, callbacks, lifecycle state, phase, and close-run result are all unchanged; then retry successfully and prove the complete set commits in one transaction. Lose that response and prove rereading the completed run returns the canonical payload even though the close beat is no longer active. Repeat the same deterministic beat id in a second meeting and prove meeting-scoped callback keys cannot collide. Refresh after phase advancement and prove the stored summary still renders in reflection.

Seed an in-progress historical meeting whose phase JSON represents the middle of a round and whose `meetingProtocolVersion` is null. The loader must present the restart path and neither it nor direct `/next` access may infer cursor zero, call a model, add a transcript row, or write phase state. A completed historical meeting may still show its stored transcript and summary. A newly created meeting receives protocol version 1 only through trusted server creation and enters the generic renderer normally. The deployment preflight must report zero active unversioned meetings before the renderer cutover proceeds.

The final page must feel continuous. The user sees the existing room pacing and one relevant control at a time; no phase label, beat id, cursor, retry status, or orchestration vocabulary is shown in the product UI.

## Idempotence and Recovery

Beat ids are stable functions of persisted inputs. Claiming an already active beat is a read. After ownership and request validation, terminal share, analysis, control completion, generation, skip, or close evidence is checked before active state, so a completed lost-response retry returns its canonical result even after the phase moved on. Topic and user-pass outcomes enter their narrow ledger in the same transaction as the phase and optional topic; retry returns the canonical current beat without inventing transcript text. Completing an acknowledged cue or already completed generated beat finds the transcript row by beat id and returns the canonical result. The partial unique database index prevents duplicate stored output even if two requests race. Character, crisis-support, and room-moment routes also acquire a leased generation-run row before any model call, keep candidates server-buffered through quality validation, and expose only persisted canonical text, so the unique share constraint is a final convergence guard rather than the first observable winner decision. A fully rejected character records a terminal skipped run before phase completion; recovery can complete that same beat without a share or model call. The database rejects skipped outcomes for crisis and room-moment runs. Crisis completion sets the monotonic resource-visibility flag with its phase update, so refresh reconstructs the controlled card independently of the active beat.

Compare-and-set phase updates never overwrite a newer version. A losing next-beat request reloads and returns the winner's beat. A losing completion request reloads, checks whether its beat already completed, and returns the canonical outcome or a clear stale-beat conflict. Bound retry loops; do not recurse indefinitely under contention.

The page loader, `/next`, `/share`, `/close`, and `/expand` call one server roster resolver backed by one pure derivation with stable meeting inputs, so a failed participant save cannot produce different speakers, voice profiles, or transcript labels. A repeated character across two planned beats updates the unique participation set idempotently while each beat id advances the cursor once. An in-progress lease never advances client state; bounded retries request only that same beat until they receive its completed or skipped outcome or present a recoverable stop. Unversioned historical state is never passed to the beat engine; the restart path is read-only because its cursor cannot be reconstructed honestly.

Close has a second, durable claim because its work begins before phase completion. The `(meeting_id, beat_id)` close-run row selects one worker, renews that ownership during slow preparation, and preserves generated checkpoints across lease recovery. Callback effect keys include both meeting and beat, meeting completion reuses one checkpointed completion time, and lifecycle work produces explicit target states. Its final RPC applies meeting completion fields, callbacks, lifecycle targets, the checkpointed `finished` phase, and the completed canonical response in one transaction. A failed transaction changes none of them; a lost response finds all of them committed. The completed close run and meeting summary remain authoritative after the active beat has cleared.

Apply the migration only after the private-intake migration. Its added columns, tables, constraints, and indexes are safe to create twice. If code rollback becomes necessary after a live migration, keep nullable `shares.beat_id`, `shares.user_analysis`, `shares.room_cue`, `meetings.phase_version`, `meetings.meeting_protocol_version`, `meetings.crisis_resources_visible`, `callbacks.close_effect_key`, `meeting_control_completions`, `meeting_generation_runs`, `meeting_close_runs`, and the expanded interaction constraint in place while reverting application consumers. Stop stamping new version-1 meetings before reverting their renderer. Removing stored beat, cue, control, analysis, resource, generation-claim, or close-result evidence is destructive and is never the first rollback action.

Build the additive contract, persistence, and `/next` path first. Implement the specialized route assignments and renderer on one integration branch, validate the full group through `BEAT-R` and `BEAT-S`, and promote `BEAT-L` through `BEAT-Q` together in that final PR. Do not merge active-beat-only specialized routes while the legacy page is still the production caller, and do not ship a second production sequence switch.

If empty-chair generation is unavailable, leave the active beat pending and expose the existing recoverable failure presentation. Do not write a stock sentence, an empty share, or a placeholder voice line to advance the meeting.

## Artifacts and Notes

The current control flow is:

    page phase switch -> runRound* -> choose speaker locally -> call route
    refresh -> phase switch -> run the entire round again -> append new shares

The target control flow is:

    POST /meeting/<id>/next -> claim or return one persisted active beat
    generic page renderer -> invoke the route appropriate to that beat
    route -> persist one beat-owned share, cue, or skip -> complete with version check
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

The requirement map is: `BEAT-01` is Milestones 1 and 3; `BEAT-02` is Milestones 2 and 3; `BEAT-03` is Milestones 2 through 5; `BEAT-04` is Milestones 4 and 6; `BEAT-05` is Milestones 6 and 7; `BEAT-06` is Milestones 1, 3, 4, and 7; `BEAT-07` is Milestone 5; `BEAT-08` is Milestones 1, 3, and 6.

The March restore plan remains at `archive/plans/restore-virtual-recovery-meeting-execplan-2026-03-19.md`. Its shipped experience target and historical findings are useful evidence. Its frontend ownership rules, fixed branch instructions, old checkout paths, and prohibition on an orchestration endpoint are superseded and must not guide implementation.

## Interfaces and Dependencies

The implementation must expose a discriminated `MeetingBeat` union from `app/src/lib/core/types.ts` equivalent to:

    type MeetingBeat =
        | BeatBase & { kind: 'character_share'; characterId: string; interactionType: CharacterShareInteractionType }
        | BeatBase & { kind: 'room_cue'; cue: RoomCue }
        | BeatBase & { kind: 'generated_room_moment'; moment: 'empty_chair' }
        | BeatBase & { kind: 'user_gate'; gate: 'introduction' | 'topic' | 'share' }
        | BeatBase & { kind: 'crisis_support'; trigger: CrisisTrigger; responderCharacterId: string }
        | BeatBase & { kind: 'close_meeting' }
        | BeatBase & { kind: 'finished' };

    type CrisisTrigger =
        | { source: 'user_share'; shareId: string }
        | { source: 'meeting_intake' };

    type CharacterShareInteractionType =
        Exclude<ShareInteractionType, 'room_cue' | 'empty_chair'>;

    interface BeatBase {
        id: string;
        ordinal: number;
        phase: MeetingPhase;
        pauseAfterMs: number;
    }

`MeetingPhaseState` must add `beatCursor: number`, `activeBeat: MeetingBeat | null`, `crisisTrigger: CrisisTrigger | null`, and `intakeCrisisHandled: boolean`. Historical JSON may be revived for read-only display, including conversion of an earlier `crisisTriggerShareId` into the typed share form, but missing beat fields never create an actionable zero cursor. `nextMeetingBeat` accepts state only from a meeting whose `meetingProtocolVersion` is 1. It and `completeMeetingBeat` live in `app/src/lib/core/meeting-beats.ts` and perform no I/O. Initialization and completion require a timestamp supplied by the server clock seam; none of the pure functions or ritual helpers they call may read the system clock.

The database seam must provide a versioned phase read, a compare-and-set meeting-state update that can atomically include monotonic crisis-resource visibility, beat-keyed control-completion read and atomic topic/pass completion, `getShareByBeatId`, a terminal generation-result lookup, generation claim/renew/complete/skip/fail operations for character, crisis, and room-moment beats, first-analysis-wins persistence for `UserShareAnalysis`, and claim, renew, checkpoint, atomic-finalize, and fail operations for a beat-keyed close run. Exact interface names may follow existing repository naming, but their semantics and tests are fixed by this plan. `ControlBeatCompletion` is a discriminated topic or user-pass outcome containing no free text; its completed result commits with phase and topic where applicable. Generation claim results distinguish `acquired`, `in_progress`, `completed { shareId }`, and `skipped { reason: 'quality_rejected' }`; only a character run can enter the last state. `ShareRecord.beatId` is nullable for history and required for new beat-owned generated, cue, and user transcript entries; `ShareRecord.roomCue` and `ShareRecord.userAnalysis` are nullable and mutually appropriate to their row kind. `MeetingRecord` exposes `meetingProtocolVersion: 1 | null`, `crisisResourcesVisible: boolean`, nullable summary, and nullable notable moments. `MeetingCloseResult` validates the stored endpoint payload. The close checkpoint holds the full intended mutation set, and the atomic finalizer accepts the current claim token and expected meeting version, validates that checkpoint, and commits meeting fields, callbacks, lifecycle targets, phase, and run result together.

Expose one pure `deriveMeetingRoster({ meetingId, startedAt })` helper, one server-side `resolveMeetingRoster` helper, and one pure transcript-speaker helper. The server resolver is the only persisted-or-fallback path used by page load, `/next`, `/share`, `/close`, and `/expand`; it uses the pure helper when participant reads or saves cannot return canonical rows. The speaker helper accepts `isUserShare`, `interactionType`, and `characterId` plus trusted user and resolved-roster names; it checks user status first, maps `room_cue` and `empty_chair` to `Room`, resolves ordinary characters next, and returns `Character` for an unknown non-user entry. Close, expansion, and page hydration use the same mapping.

The next-beat route depends on the ownership gate and `locals.meetingContext` from `plans/private-meeting-access-execplan.md`. That plan's preview composition must supply the existing Grok mock as well as auth and database mocks; `BEAT-R` adds its deterministic meeting-flow script. The meeting-flow plan does not depend on a hosted provider, but its database seam must pass the real local Supabase probe before fixture, mock, adapter, or route work. Applying migrations to a hosted tenant, refreshing unrelated provider fixtures, and production verification remain blocked by #71 and #91.

Issue #90 should follow this plan for `+page.svelte`: deleting the old orchestration will materially shrink the file and reveal the remaining honest component boundaries. Do not split the old sequence into several files before removing it. Issues #86 through #89 are independent except where their code touches a file in the active slice; do not pull them into these milestones.

## Revision Note

2026-09-12: Created this plan to replace the superseded frontend-owned March meeting plan with the server-owned direction in epic #77. The revision introduces persisted beats and idempotency before client cutover, makes replay-free refresh an acceptance condition, and gives the unused empty-chair prompt a compliant generated and persisted path.

2026-09-13: Tightened topic completion so the selected topic and phase transition are committed in one version-checked meeting-row update. This closes the race where separate writes could pair the losing topic with the winning beat state.

2026-09-14: Revised the plan after PR review to add durable generation and close claims, a terminal character-only skip, atomic close phase/result finalization, persisted room cues, deterministic roster fallback, repeated-speaker completion, bounded in-progress client retry, truthful room-entry labels, meeting-scoped callback effects, stored-summary hydration, one route-and-renderer cutover, server-derived user and expansion decisions, canonical intake/share crisis sources, crisis and empty-chair quality gates, close-summary prompt repair, deterministic Grok preview fixtures, exhaustive completion, injected time, real-probe-before-fixture ordering, and Playwright's configured test directory.

2026-09-14: Closed the next review pass by making terminal beat results authoritative after phase advancement, moving every durable close mutation into one renewable token-checked transaction, version-gating the renderer instead of guessing historical cursors, persisting sticky crisis-resource visibility, and requiring one roster resolver in every character-consuming route. Added lost-response, full-rollback, slow-holder, legacy-mid-round, and failed-save visitor acceptance cases for those decisions.

2026-09-14: Bound the trusted `createMeeting` protocol-version write to `BEAT-Q`, the same promotion boundary that activates the generic renderer. Earlier additive persistence slices deliberately leave new rows unversioned, so a meeting created by the old renderer cannot later be mistaken for a version-1 meeting; the cutover slice owns both the server stamp and the client that understands it.

2026-09-14: Added an atomic beat-keyed control-completion ledger for topic and user-pass outcomes so a lost acknowledgment returns the canonical current beat after phase advancement. Narrowed `character_share.interactionType` to exclude room-owned cue and empty-chair values in both the static union and runtime validation.
