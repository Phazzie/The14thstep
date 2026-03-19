# Restore the Virtual Recovery Meeting

This ExecPlan is a living document. Keep `Progress`, `Surprises & Discoveries`, `Decision Log`, `Outcomes & Retrospective`, and the revision note at the bottom current as work proceeds. Maintain this file in accordance with [PLANS.md](/mnt/c/users/latro/downloads/t/recoverymeeting-autonomous-run/PLANS.md).

## Purpose / Big Picture

After this work, a person can open `/`, answer the intake questions, click `Join Meeting`, and then stop touching the screen. The meeting starts on its own, runs like a room instead of a control panel, pauses where it should pause, asks for the user only when the room would ask, and closes like a meeting instead of an app flow.

The deliverable is not "a nicer meeting page." The deliverable is that the page once again behaves like a living meeting. The user is no longer the operator. The room runs.

## Experience Target

The target experience is plain:

- the user enters a first name or alias, clean time, mood, and optional "what's on your mind"
- the user clicks `Join Meeting`
- the meeting starts without another click
- Marcus speaks first and says the user's name
- the room pauses on purpose
- Chrystal reads
- everyone introduces themself
- the room settles and waits
- the user introduces themself
- Marcus asks what they want to talk about
- the user chooses from a fixed topic list
- the room runs three rounds, with the characters carrying most of the talking
- the user is asked to share or pass only at the room's natural openings
- if the user says something heavy, the room pauses longer before answering
- if the user says something crisis-level, the meeting stops and turns to them
- near the end, someone asks the hard question
- Marcus closes the meeting, says the user's name again, and `Keep coming back` appears
- one person catches the user with a private goodbye on the way out

The room should feel relieved the user showed up, not excited to onboard them. It should feel like people in recovery, not a therapist, not a product flow, and not a dashboard.

## Explicit Backend Gaps To Close

These are part of the plan. They are not optional.

1. `crosstalk` currently affects significance but does not select the crosstalk prompt. `hard_question` and `farewell` are missing as real persisted interaction types.
2. Speaking order for the three rounds must be frontend-owned. The current share route hardcodes round speakers and ignores the round speaker the page needs to send.
3. `buildGoodbyePrompt()` already exists and must be wired as a true farewell beat instead of being faked through `respond_to`.
4. The current app has no truthful meeting-scoped participant roster. Two visitor seats are part of the target room, so the roster must be persisted and reloadable.

## Progress

- [x] (2026-03-19 09:35Z) Audited the current meeting page, backend share route, prompt builders, database seam, and participant roster gap; converted those findings into this ExecPlan.
- [x] (2026-03-19 10:20Z) Phase 1 complete enough to build on: interaction types are real through the seam, meeting-scoped participants persist through the database adapter, page load bootstraps a persisted eight-person roster, and intro completion no longer shortcuts past the user gate with crude speaker counts.
- [x] (2026-03-19 15:58Z) Phases 2 through 6 are substantially implemented: the meeting page now renders as a single-column room shell, the opening ritual auto-runs, topic selection is room-led, rounds stop only for user turns, hard question / farewell are real interaction modes, and the close lands in reflection instead of dashboard chrome.
- [ ] (2026-03-19 16:05Z) Phase 7 is partially complete: crisis interruption now stops the room sequence and refresh restores the truthful next user gate, but replay-free recovery for every mid-beat auto sequence is still deferred pending richer persisted ritual substep state.

## Surprises & Discoveries

- Observation: the meeting page already auto-runs some room-led phases, but the visible UI still reads like a control panel.
  Evidence: `app/src/routes/meeting/[id]/+page.svelte` already has room-led auto-request logic, yet still renders meeting ID, raw phase, editable meeting metadata, transcript debug details, and operational controls.

- Observation: the two random visitor seats from the original experience are not just a front-end shuffle problem; they are a persistence and schema problem.
  Evidence: `app/src/lib/core/character-selector.ts` generates visitors with synthetic `visitor-*` ids, `public.characters.id` is a UUID column, `public.meeting_participants` has no ordering column, `app/src/routes/meeting/[id]/+page.server.ts` loads only `CORE_CHARACTERS`, and `app/src/lib/server/seams/database/adapter.ts` rejects unknown character ids during share persistence.

- Observation: `crosstalk` is only a significance label today, not a prompt mode, and `hard_question` / `farewell` are not first-class interaction types.
  Evidence: `buildCrosstalkReactionPrompt()`, `buildHardQuestionPrompt()`, and `buildGoodbyePrompt()` exist in `app/src/lib/core/prompt-templates.ts`, but the share route does not branch to them and the enum unions do not include all required values.

- Observation: the original React component body was not present in the user prompt; only its named functions and the canonical sequence were provided.
  Evidence: Appendix A contained the placeholder text `[PASTE THE ORIGINAL REACT COMPONENT HERE]`.

- Observation: `TOPIC_SELECTION` only had one durable server-side beat, but the experience needed both Marcus asking for the topic and Marcus acknowledging the chosen topic.
  Evidence: `transitionToNextPhase()` advanced `topic_selection -> sharing_round_1` on any room-led share, while `buildTopicAcknowledgmentPrompt()` already existed unused in `app/src/lib/core/prompt-templates.ts`.

- Observation: the meeting page can restore honest user gates from persisted phase state, but it still cannot replay every in-progress automated beat without more granular persisted sequence state.
  Evidence: `syncInputModeFromPersistedPhase()` can show `intro`, `topic`, `share`, and `reflection` gates truthfully, but the persisted phase snapshot does not encode all intra-round steps needed to resume arbitrary mid-beat room motion.

## Decision Log

- Decision: treat the `Experience Target` and `Canonical Sequence Map` sections in this plan as the real source of truth, and treat the named React functions as intent anchors rather than literal code to port.
  Rationale: the body of the original React component is absent, so the plan must not invent details and call them traceability.
  Date/Author: 2026-03-19 / Codex

- Decision: make a meeting-scoped participant roster the source of truth for who is in the room, rather than trying to fake `random1` and `random2` on the client.
  Rationale: the current app cannot persist or reload visitor speakers cleanly without a real roster, and the schema already contains `meeting_participants`.
  Date/Author: 2026-03-19 / Codex

- Decision: add an explicit `seat_order` to `meeting_participants` and use database ids for persisted visitor rows.
  Rationale: synthetic selector ids cannot be stored in a UUID primary key column, and intro order must survive refresh.
  Date/Author: 2026-03-19 / Codex

- Decision: keep the existing route boundaries (`/share`, `/user-share`, `/crisis`, `/close`, `/expand`) and do not add a new orchestration endpoint.
  Rationale: the existing routes already map to the right room beats; the missing work is wiring and page orchestration, not backend proliferation.
  Date/Author: 2026-03-19 / Codex

- Decision: persist the roster and intro order, but do not persist round order. Derive round order deterministically from the meeting id plus the non-Marcus participant ids.
  Rationale: the room needs stable intro order on refresh, different round order across meetings, and deterministic tests without a second round-order table.
  Date/Author: 2026-03-19 / Codex

- Decision: do not route all meeting logic through one giant `autoPlay()` chain. Use named, interruptible sequence functions in `+page.svelte`.
  Rationale: crisis interrupts, heavy-share pauses, and user gates all require stop points. A monolith would be fragile and hard to debug.
  Date/Author: 2026-03-19 / Codex

- Decision: split the `topic_selection` behavior by interaction type instead of inventing a new persisted phase.
  Rationale: the route already receives `interactionType`, `buildTopicAcknowledgmentPrompt()` already existed, and this let Marcus ask for the topic and then acknowledge the chosen topic without adding a second schema or route contract.
  Date/Author: 2026-03-19 / Codex

- Decision: stop Phase 7 short of fake “full refresh resume” claims and defer the remaining replay-free mid-beat resume problem.
  Rationale: the current persisted phase model does not encode enough substep detail to resume every in-flight automated room beat honestly, and patching around that on the client would add debt.
  Date/Author: 2026-03-19 / Codex

## Outcomes & Retrospective

- Shipped:
  - roster-backed meeting load and stable visitor persistence
  - real `hard_question` / `farewell` / `crosstalk` prompt routing
  - room-led meeting page flow with opening ritual, topic chooser, three rounds, closing, ritual `Keep coming back`, and reflection
  - crisis interruption that stops the live room sequence instead of letting queued beats continue underneath it
  - topic-selection ask/ack split using the existing phase plus interaction-type semantics
- Not fully shipped:
  - replay-free resume for every possible mid-beat refresh state
  - a fully spoken newcomer-specific welcome before the topic chooser; the current version still uses local room text for that beat
  - cleanup of the remaining Svelte 5 rune warnings in `+page.svelte`
- Verification actually run:
  - targeted unit / route suites for roster persistence, share routing, adapter behavior, page load, and ritual progression
  - targeted ESLint on the edited restore files
  - `npm run check` with zero errors and 8 known warnings

## Source Of Truth, Conflict Rules, And Divergence Budget

The priority order is strict:

1. `Experience Target` in this document.
2. `Canonical Sequence Map` in this document.
3. `Explicit Backend Gaps To Close` in this document.
4. The current repository boundaries in `AGENTS.md`, `app/AGENTS.md`, and `app/src/AGENTS.md`.
5. The existing code.

If two requirements conflict, the winner is:

- user experience beats code elegance
- correct room timing beats micro-optimization
- crisis correctness beats happy-path neatness
- sequence order beats "simpler" implementation
- existing seam boundaries beat route-level hacks

Allowed divergence from the original:

- Timing may vary by plus or minus 20 percent from the target delays when network latency forces it, but do not shorten intentional silences below 80 percent of the requested delay.
- The two placeholder slots named `random1` and `random2` may be implemented as two real visitor participants with generated ids and names, as long as there are exactly two of them and they occupy those two intro/round slots.
- Visual styling may change from the old React UI, but the room structure may not: circle at top, transcript in the middle, one bottom control at a time.

Not allowed:

- swapping sequence order
- skipping the empty chair
- turning the topic chooser into free text
- exposing phase labels or meeting IDs to the user
- keeping a manual "generate" control
- using `respond_to` as a shortcut for `farewell`

## Git Protocol

Use branch `claude/assess-app-divergence-APpi7` unless the branch already exists with unrelated work; in that case, branch from current `main` and keep the same prefix and purpose in the branch name.

The rules are not optional:

- one commit per phase
- do not begin the next phase until the current phase has passed its acceptance criterion and the worktree is clean
- use the commit message listed inside the phase exactly, unless the executing agent adds a ticket or scope suffix for clarity
- if a phase fails badly, revert to the immediately previous phase commit instead of patching forward blindly

## Idempotence And Recovery

This restore must be safe to run in pieces.

- The meeting-participant bootstrap in Phase 1 must be idempotent. Reloading the meeting page must not create duplicate visitor rows or duplicate `meeting_participants` rows.
- The page-level sequence functions in later phases must always clear pending timers and close open `EventSource` handles on unmount, crisis entry, and route change. A page that can be left and revisited safely is part of correctness, not polish.
- Every phase ends in a single commit. Rolling back that phase means reverting only that phase's commit. If two unrelated ideas end up in the same diff, stop and split them before committing.

## What I Am Not Building

This plan does not authorize:

- new backend routes
- new AI providers or prompt systems
- a modal-based crisis flow
- a progress bar, phase badge, round badge, or other task framing
- character bios, avatar click affordances, or a speaker picker
- a text box for open-ended topic entry
- a "restart meeting" or "skip intros" control
- general prompt rewrites beyond wiring the existing missing prompt builders and the explicitly required closing-context data
- cleanup of unrelated production, auth, deployment, or backlog issues unless they block this exact work

Anything outside this scope goes into `DEFERRED.md` immediately. The user named `/home/user/The14thstep/DEFERRED.md`; in this checkout, create or update repo-root `DEFERRED.md` at `/mnt/c/users/latro/downloads/t/recoverymeeting-autonomous-run/DEFERRED.md` and mirror the same entry to `/home/user/The14thstep/DEFERRED.md` only if that path exists in the executing environment.

## Do-Not-Touch Zones And Narrow Exceptions

Do not redesign these files or move their responsibilities:

- `app/src/lib/core/prompt-templates.ts`
- `app/src/lib/core/characters.ts`
- `app/src/lib/core/style-constitution.ts`
- `app/src/routes/meeting/[id]/user-share/+server.ts`
- `app/src/routes/meeting/[id]/crisis/+server.ts`
- `app/src/routes/meeting/[id]/close/+server.ts`
- `app/src/routes/meeting/[id]/expand/+server.ts`
- `app/src/routes/+page.svelte`

Allowed narrow exceptions:

- `app/src/lib/core/types.ts` and `app/src/lib/core/meeting.ts` may be edited only to add the missing interaction-type values and any meeting-participant types required by the roster contract.
- `app/src/lib/core/character-selector.ts` may be edited only if the existing selector needs a stable exported type or helper for the meeting roster. Do not rewrite visitor generation logic.
- `app/src/lib/core/ritual-orchestration.ts` may be edited only if the plan cannot satisfy the canonical sequence without aligning a transition or a "requires user input" rule. Do not collapse the phase machine into page-only state.
- `app/src/routes/meeting/[id]/share/+server.ts` may be edited only to wire the missing prompt modes, honor the frontend-owned round speaker within the roster contract, and keep phase persistence truthful.

The existing route boundaries are fixed seams. Do not add a catch-all "meeting engine" endpoint just because the page orchestration feels busy. The page is allowed to orchestrate. The server routes are allowed to stay narrow.

## Context And Orientation

The current meeting page is not empty. It already has transcript state, SSE streaming, crisis handling, close handling, and a persisted ritual phase. The real problem is that it still behaves like a dashboard wrapped around those capabilities.

The current page in `app/src/routes/meeting/[id]/+page.svelte` is running two state models at once. A local `meetingPhase` drives whether the right rail shows input or reflection. A persisted `ritualPhaseState` tracks the room phases in the database. The page also still shows meeting diagnostics, editable metadata, transcript debug data, raw status text, and operational controls. That visible scaffolding breaks the room.

The backend already exposes the right route seams:

- `app/src/routes/meeting/[id]/share/+server.ts` streams a character share over SSE.
- `app/src/routes/meeting/[id]/user-share/+server.ts` persists a user share and returns `crisis` and `heavy` flags.
- `app/src/routes/meeting/[id]/crisis/+server.ts` interrupts with crisis support.
- `app/src/routes/meeting/[id]/close/+server.ts` closes and summarizes the meeting.
- `app/src/routes/meeting/[id]/expand/+server.ts` expands a share on demand.

The restoring work is therefore split cleanly:

- Phase 1 makes the backend capable of all required beats and makes the participant roster real.
- Later phases make the meeting page use those capabilities in the right order and with the right visible shape.

The UI target is also fixed:

- mobile is single-column
- desktop may breathe more, but it must still read like one room, not a three-column dashboard
- `MeetingCircle` stays visible through the meeting and keeps the amber active-speaker ring
- the transcript is the center of gravity
- the bottom region shows one control only

## Canonical Sequence Map

This section exists so the executing agent does not need to reconstruct the meeting from scattered phase prose.

On mount:

- wait 500ms
- append the empty-chair system line
- wait 2000ms
- request Marcus while the meeting is in `OPENING`; do not send a special interaction type
- wait 3000ms
- append `— moment of silence —`
- wait 3000ms
- append `*Chrystal pulls out a folded paper*`
- wait 800ms
- request Chrystal while the meeting is in `EMPTY_CHAIR`; do not send a special interaction type
- wait 3500ms
- append `— introductions —`
- wait 800ms

Introductions:

- request intro shares in this exact order: Marcus, Heather, Meechie, Gemini, Gypsy, Chrystal, visitor 1, visitor 2
- optionally append `Hi [name]!` after an intro
- append `*The room settles. Everyone is waiting.*`
- wait 1500ms
- show `Introduce yourself`

User intro:

- append `I'm [name]. I'm an addict. [cleanTime].`
- append `Hi [name]!`
- wait 1200ms
- if the user is new or not currently clean, request a brief welcome from Marcus or Heather
- wait 1500ms
- request Marcus asking for a topic
- show the curated topic chooser

Topic selection:

- user chooses one topic from the fixed list
- request Marcus for a short acknowledgment
- begin round 1

Round 1:

- request `speakingOrder[0]` full share
- optionally request `speakingOrder[1]` as `crosstalk`
- request `speakingOrder[1]` full share
- show `What comes up for you?`

User share 1:

- post to `/user-share`
- if crisis: enter crisis mode immediately
- if heavy: append silence, wait 3500ms, then request a response
- else: optional brief acknowledgment or non-verbal action
- continue to round 2

Round 2:

- apply the keyword-based parallel-story swap if present
- request the first full share
- optional crosstalk or disagreement texture
- request the second full share
- request one direct-to-user prompt
- show `How does this land?`

User share 2:

- post to `/user-share`
- if there have been at least two real user shares and the hard question has not been asked, request one `hard_question`
- continue to round 3

Round 3:

- request `speakingOrder[4]` full share
- request `speakingOrder[5]` full share
- request Marcus asking for anything final
- show `Anything else before we close?`

Closing:

- optional brief Marcus acknowledgment of the user's final share
- request Marcus closing share with confidentiality reminder and user mood context
- wait 2000ms
- request one more goodbye from Heather or an earlier speaker
- wait 1500ms
- append `— Keep coming back —`
- request one private `farewell`
- call `POST /close`
- show post-meeting reflection and `New meeting`

Crisis:

- may interrupt any round or closing user turn
- stops the normal sequence immediately
- appends crisis response in the transcript, not in a modal
- does not allow queued room beats to continue underneath

## Plan Of Work

The work proceeds in one direction. First make the backend truthful: real persisted participants, real interaction types, and share-route behavior that can support the room beats the page needs. Then strip the dashboard shell out of the page so the user stops operating the meeting. Then restore the meeting in order: opening ritual, intro gate, topic gate, round one, round two, round three, closing, crisis, and refresh truthfulness. Do not skip ahead to polish or visual texture before the sequence is mechanically correct.

The page is the orchestrator. The server routes are the room's narrow service boundaries. The database seam is where roster truth and share truth live. The executing agent should keep that layering intact the whole time.

## Interfaces And Dependencies

### Meeting roster contract

The meeting page must receive exactly eight participants from `app/src/routes/meeting/[id]/+page.server.ts`:

- Marcus, always chair
- Heather
- Meechie
- Gemini
- Gypsy
- Chrystal
- two generated visitors

Each participant record must include the fields the UI already uses (`id`, `name`, `avatar`, `color`, `cleanTime`, `tier`, `role`) and enough narrative fields for the share route to build the prompt if that participant speaks. The roster must be persisted per meeting so a refresh does not regenerate different visitors.

Each participant record's `id` must be the persisted id returned from the database load. For visitors, that means a real UUID-backed character id, not the selector's temporary `visitor-*` placeholder. The roster must also expose `seatOrder` so intro order is stable and reloadable.

### Speaking-order contract

The frontend owns round order. It must build a seven-entry `speakingOrder` from the non-Marcus participants. That order must be:

- deterministic within one meeting
- different across different meetings
- independent of intro order

Intro order is not shuffled. Intro order is fixed:

- `marcus`
- `heather`
- `meechie`
- `gemini`
- `gypsy`
- `chrystal`
- visitor 1
- visitor 2

Implement that fixed order by sorting the persisted roster on `seatOrder`, not by regenerating or guessing visitor slots on the page.

### Share interaction contract

Opening, reading, and introductions are phase-selected prompt families. They are not `ShareInteractionType` values.

The share route must understand these persisted interaction types as distinct modes:

- `standard`
- `respond_to`
- `disagree`
- `parallel_story`
- `expand`
- `crosstalk`
- `hard_question`
- `farewell`
- `callback`

`crosstalk`, `hard_question`, and `farewell` are not aliases for `respond_to`. They are different tones, different lengths, and different uses.

If `ritualPhaseState` and `interactionType` disagree, resolve them with this rule:

- in `OPENING`, `EMPTY_CHAIR`, `INTRODUCTIONS`, and `TOPIC_SELECTION`, phase wins and `interactionType` may only be omitted or informational
- in `SHARING_ROUND_1`, `SHARING_ROUND_2`, and `SHARING_ROUND_3`, `interactionType` may override the default share prompt for `crosstalk` and `hard_question`
- `farewell` is only legal after the visible close has happened and before the meeting is marked post-meeting
- if an illegal combination arrives, reject it in the route and fix the caller instead of silently guessing

### Page sequence contract

The page must use small interruptible async functions, not one unbroken chain. The minimum named responsibilities are:

- bootstrap roster and transcript state
- run opening ritual
- run introductions
- wait for user intro
- wait for topic selection
- run a round
- handle a user turn
- enter crisis mode
- run closing

Those functions may call each other, but each must be able to stop if crisis interrupts or if the component unmounts.

The page must also carry an explicit cancellation token or monotonically increasing sequence id that every pending timeout and every `EventSource` callback checks before mutating state. Do not rely on "best effort cleanup" with loose booleans.

### Transcript bootstrap contract

The page must hydrate from persisted meeting shares when they exist. An in-progress meeting must not start from an empty transcript after refresh. `+page.server.ts` therefore has to return both the roster and the existing transcript history needed for the room to resume honestly.

### Listening-only contract

`listeningOnly` is an existing supported mode and must survive the restore.

- the user still joins, is named, introduces themself, and chooses a topic
- the room still runs all three rounds
- the three user share gates are skipped automatically
- the hard question is never asked
- the closing still happens normally

Do not remove or silently degrade listening-only just because it complicates the sequence engine.

### Deterministic randomness contract

Every probabilistic beat in the page layer must be deterministic for one meeting and one transcript path. That includes:

- whether a `Hi [name]!` echo appears after an intro
- whether an "almost share" beat appears
- whether a non-verbal action line appears
- whether crosstalk appears when it is optional

Do not use `Math.random()` directly in the page. Use a seeded helper derived from `meetingId` plus a stable step key so refresh and tests remain truthful.

### Deferred-work contract

The first time the executing agent spots a real issue that is outside this plan, it appends one dated sentence to `DEFERRED.md` and then returns to the plan. Do not "just fix one more thing."

## Curated Topic List

Use these exact topics. Do not paraphrase them, add extra ones, or replace them with free text:

- `Staying clean when everything falls apart`
- `People who don't understand what we've been through`
- `Trusting yourself again`
- `The difference between being alone and being lonely`
- `When the people closest to you don't believe you've changed`
- `Dealing with the things you did`
- `Finding reasons to stay`
- `Coming back after relapse`
- `The people we lost`
- `When staying clean feels harder than using`

## Voice Audit Anchors

Use these to audit generated text. They are not prompt additions. They are quality checks.

Marcus:

- Correct: "Now let me own my side before I tell on anybody else."
- Incorrect: "I invite everyone to explore the emotions this topic brings up tonight."

Heather:

- Correct: "Listen, I did not survive all that to die embarrassed."
- Incorrect: "Let's all hold compassionate space for each other right now."

Meechie:

- Correct: "Relapse starts for me when I call isolation peace."
- Incorrect: "I'm feeling vulnerable but optimistic about my healing journey."

Gemini:

- Correct: "I wanted to run, no, I wanted somebody to stop me."
- Incorrect: "I finally have total clarity and no contradiction left in me."

Gypsy:

- Correct: "Phoenix taught me heat and loneliness are cousins."
- Incorrect: "Recovery is a beautiful journey of self-discovery."

Chrystal:

- Correct: "March 3 was the day I handed over my old phone and numbers."
- Incorrect: "Growth looks different for everyone, and that's okay."

If a generated line sounds more like the incorrect example than the correct one, it fails, even if the tests pass.

## Anti-Pattern Manifest

Every item below is a known trap. The executing agent must be able to point to the phase that prevents it before proceeding.

1. Replacing silence with a spinner. Wrong because silence is part of the room; a spinner is infrastructure.
2. Keeping or reintroducing a manual `Generate Character Share` control. Wrong because it makes the user the operator.
3. Showing progress bars, round badges, or phase pills. Wrong because the room is not a task.
4. Making the empty chair skippable. Wrong because ritual is part of the room.
5. Flattening the rounds into one endless AI chat stream. Wrong because meetings need shape.
6. Handling crisis in a modal while the feed continues underneath. Wrong because the room stops.
7. Letting the user choose the next speaker. Wrong because people are not menu items.
8. Replacing the curated topic list with a free-text topic box. Wrong because the list teaches the room's language.
9. Adding a skip-intros control. Wrong because every meeting starts with introductions.
10. Auto-expanding every share. Wrong because "Tell me more" is a deliberate act.
11. Using emojis or glossy icons for action lines. Wrong because `*shifts in seat*` belongs to the room's register.
12. Adding character bio popups. Wrong because people should be learned through what they say.
13. Building one giant `autoPlay()` chain. Wrong because crisis, heavy silence, and user gates require interruption points.
14. Showing the meeting phase to the user. Wrong because the phase machine is backstage machinery.
15. Using skeleton loaders for speaker turns. Wrong because a person thinking is not a skeleton.
16. Debouncing or thinning intentional pauses to "optimize." Wrong because the timing is content.
17. Adding a restart button during the meeting. Wrong because the room should not teach exit-at-discomfort.
18. Rendering raw operational status text like `Share saved` or `Streaming:`. Wrong because it breaks the room.
19. Collapsing intake into one form page. Wrong because intake is slow attention, not sign-up friction.
20. Porting the old React client logic directly and bypassing the SvelteKit routes. Wrong because the backend already exists and must remain the source of persistence and crisis state.
21. Faking `random1` and `random2` in the page without a real meeting roster. Wrong because refresh and persistence will immediately lie.
22. Using `respond_to` as the private farewell. Wrong because the goodbye builder already exists and should own that tone.
23. Leaving transcript debug metadata visible in `ShareMessage.svelte`. Wrong because significance scores and sequence numbers are operator data, not room data.
24. Letting local UI state diverge from persisted `ritualPhaseState` without an explicit bridge. Wrong because the room will replay or skip beats on refresh.

## Phase 1 — Make The Backend Capable Of A Real Room

Starting state: the app can stream and persist shares, but the missing prompt modes are unwired, round speakers are not frontend-owned, and there is no real meeting-scoped participant roster for visitors.

Objective: make the backend routes and database seam capable of every meeting beat the page needs, without adding a new endpoint or changing the core voice system.

Files to change:

- `app/src/lib/core/types.ts`
- `app/src/lib/core/meeting.ts`
- `app/src/lib/seams/database/contract.ts`
- `app/src/lib/seams/database/contract.test.ts`
- `app/src/lib/seams/database/fixtures/appendShare.sample.json`
- `app/src/lib/seams/database/mock.ts`
- `app/src/lib/server/seams/database/adapter.ts`
- `app/src/lib/server/seams/database/adapter.spec.ts`
- `app/supabase/migrations/20260319_000003_restore_meeting_roster_and_share_interactions.sql`
- `app/src/routes/meeting/[id]/share/+server.ts`
- `app/src/routes/meeting/[id]/+page.server.ts`
- `app/src/lib/core/prompt-templates.spec.ts`
- `app/src/lib/server/routes/meeting-page-load.spec.ts`
- `app/src/lib/server/routes/meeting-share.spec.ts`
- `app/src/lib/server/routes/meeting-ritual-phase.integration.spec.ts`

What to do:

1. Add `hard_question` and `farewell` to `ShareInteractionType` in both `app/src/lib/core/types.ts` and `app/src/lib/core/meeting.ts`. Keep `crosstalk` in place. Do not change the meaning of existing interaction values.
2. Add `interactionType` to the database seam's `ShareRecord` contract, fixture, mock, and adapter mapping. The restore cannot truthfully persist `hard_question`, `farewell`, or `crosstalk` while the seam still records every share as `standard`.
3. Add a meeting-participant type to `app/src/lib/core/types.ts` that represents one persisted room participant. It must carry the existing character profile fields the UI already needs plus `role`, `isVisitor`, and `seatOrder`.
4. Add one migration that does both of the required persistence repairs:
   - expand the `shares.interaction_type` check constraint to allow `hard_question` and `farewell`
   - add `seat_order integer not null` to `meeting_participants` and enforce uniqueness of `(meeting_id, seat_order)`
5. Extend the database seam contract with two roster operations:
   - one to save the meeting's selected participants exactly once and return the persisted roster with final ids
   - one to load the meeting's selected participants on demand in `seat_order`
   Implement the contract, mock, and adapter in Seam-Driven Development order. Use the existing `public.meeting_participants` table plus `public.characters`. Do not add a new table.
6. In the database adapter, when saving participants for a meeting:
   - preserve core characters by reusing their existing db mappings
   - insert real visitor rows into `public.characters` and let the database assign UUIDs
   - insert `meeting_participants` rows for all eight room members with stable `seat_order`
   - return the persisted roster with final ids so the page never has to trust the selector's temporary visitor ids
   - make the whole operation idempotent so reload or retry does not duplicate participants
7. In `app/src/routes/meeting/[id]/+page.server.ts`, load the meeting participants and the existing transcript history. If the meeting does not yet have any participants, call the existing selector once, persist the roster through the new seam method, then load and return that roster to the page. Do not regenerate visitors on every page load.
8. In `app/src/routes/meeting/[id]/share/+server.ts`, import and wire the three existing prompt builders:
   - `buildCrosstalkReactionPrompt()`
   - `buildHardQuestionPrompt()`
   - `buildGoodbyePrompt()`
   Branch on `interactionType` before falling back to the standard share prompt. Do not introduce `opening`, `reading`, or `intro` as interaction-type enum values; those remain phase-selected prompt families.
9. Change the share route's speaker selection rule:
   - during `OPENING`, `EMPTY_CHAIR`, `INTRODUCTIONS`, and `TOPIC_SELECTION`, phase wins and the route enforces the phase speaker
   - during sharing rounds, if the page provides a `characterId` that belongs to the meeting's persisted roster, honor it
   - during the post-close private goodbye beat, allow `interactionType=farewell` to override the default closing prompt
   - Marcus remains outside the shuffled speaking order and should only be used when the sequence explicitly calls for Marcus
10. Keep the route's persisted `phaseState` truthful. Do not hide phase progression in page-only state.
11. Add tests that prove:
   - page load returns eight persisted participants, including exactly two visitors, sorted by `seat_order`
   - reloading a meeting returns the same roster, the same visitor ids, and existing transcript history
   - `interactionType=crosstalk` uses the crosstalk prompt
   - `interactionType=hard_question` uses the hard-question prompt
   - `interactionType=farewell` uses the goodbye prompt
   - opening, reading, and intro beats still come from phase selection rather than illegal interaction-type values
   - round shares honor a valid frontend-provided speaker from the meeting roster

What NOT to do:

- Do not store the visitor roster inside `phaseState`. The reason is that `phaseState` is for progress through the ritual, not for reconstructing room membership on refresh.
- Do not pretend the selector's temporary visitor ids are database ids. The reason is that `public.characters.id` is UUID-backed and the page must switch to persisted ids after bootstrap.
- Do not keep server-owned hardcoded round arrays for sharing rounds. The reason is that the user explicitly wants frontend-owned round order, and hardcoding the rounds would keep the old drift alive under new UI.
- Do not invent a new `/participants` endpoint. The reason is that page load already owns bootstrap, and adding another route would add architecture without adding capability.
- Do not "solve" farewell by reusing `respond_to`. The reason is that a room goodbye is shorter and more direct than a conversational response, and the correct builder already exists.

Acceptance criterion:

From `app/`, run:

    npm run test:unit -- --run src/lib/server/routes/meeting-page-load.spec.ts src/lib/server/routes/meeting-share.spec.ts src/lib/server/routes/meeting-ritual-phase.integration.spec.ts src/lib/core/prompt-templates.spec.ts

The named specs for persisted participant loading, transcript bootstrap, prompt branching, persisted interaction-type storage, and frontend-owned round speakers pass. A development log or targeted test assertion proves that `hard_question` and `farewell` do not reuse the standard response prompt, and that opening/reading/introduction calls are not rejected as invalid interaction types.

This phase satisfies the `Experience Target` precondition that the room contains two real additional people and can later ask the hard question and say goodbye in the right voices.

Experience note:

At the end of this phase, the room still looks wrong, but the backend stops lying. There is now a real room to orchestrate instead of six hardcoded core speakers pretending to be a meeting.

Emotional intent tag: PRESENCE

Git commit message:

`fix(meeting): persist room roster and real interaction types — frontend can now run a truthful meeting`

Self-critique checkpoint:

Compare this phase against `Experience Target` and `Explicit Backend Gaps To Close` in this document. If the route still cannot produce a real crosstalk line, a real hard question, a real farewell, or two real persisted visitors, this phase is not done.

Experience audit:

The user should not feel this phase yet, and that is fine. What changes here is honesty: the room now has actual people in it, and the route can speak in the right tones later. If a refresh would still swap out the visitors, the phase failed.

## Phase 2 — Strip The Dashboard Out Of The Room

Starting state: the page has the right raw capabilities but still exposes operator chrome, debug metadata, and multiple competing controls.

Objective: make the meeting page look and behave like one room with one active bottom control, while preserving the existing route boundaries.

Files to change:

- `app/src/routes/meeting/[id]/+page.svelte`
- `app/src/lib/components/MeetingCircle.svelte`
- `app/src/lib/components/ShareMessage.svelte`
- `app/src/lib/components/SystemMessage.svelte`
- `app/src/lib/components/UserInput.svelte`
- `app/src/lib/components/MeetingReflection.svelte`
- `app/src/lib/core/meeting-speaking-order.ts`
- `app/src/lib/core/meeting-speaking-order.spec.ts`
- `app/src/lib/server/routes/meeting-page-load.spec.ts`
- `tests/e2e/meeting-flow.spec.ts`

What to do:

1. Create a pure helper in `app/src/lib/core/meeting-speaking-order.ts` that takes the meeting id and the non-Marcus participant ids and returns:
   - a deterministic shuffled `speakingOrder`
   - deterministic yes/no decisions for optional room texture beats keyed by step name
   The same meeting id and roster must yield the same outputs. Different meetings must usually yield different outputs. Do not use `Math.random()` in the page after this helper exists.
2. In `app/src/routes/meeting/[id]/+page.svelte`, remove the visible admin shell by name:
   - meeting ID display
   - phase pill
   - editable topic input
   - editable name input
   - editable mood input
   - `Close Meeting` toolbar button
   - raw operational status text
   - any visible `Generate Character Share` control, even as a hidden fallback
3. Rebuild the page around three vertical regions:
   - top: `MeetingCircle`
   - middle: transcript
   - bottom: exactly one active user-facing control area
   Keep the page single-column on mobile. On desktop, keep the visual reading order top-to-bottom even if margins widen.
4. Treat the bottom area as an explicit gate renderer. It may show only one of these at a time:
   - nothing while the room is auto-playing
   - the `Introduce yourself` button
   - the topic chooser
   - the share/pass input for a user turn
   - the post-meeting reflection controls
5. Keep `ShareMessage`, `SystemMessage`, `UserInput`, and `MeetingReflection`, but remove their room-breaking affordances:
   - `ShareMessage` must stop showing significance score or sequence number
   - `SystemMessage` must be used for room-native action lines and ritual text, not raw transport status
   - `UserInput` must accept prompt/label/button text from the page so it can say `What comes up for you?`, `How does this land?`, and `Anything else before we close?`
   - `MeetingReflection` must read like an end state, not a return-to-dashboard card
   - `MeetingCircle` must keep the amber active-speaker ring but stop reading like a debug/status widget
6. Replace raw streaming status with an in-room thinking indicator. Use the existing three-dot idea if present; do not use a skeleton or a spinner.
7. Seed the local transcript state from the shares returned by `+page.server.ts` instead of starting from an empty array. A refresh into an in-progress meeting must show what has already happened.
8. Make the page's visible state derive from the persisted `ritualPhaseState` plus a small local gate enum. The local state may control what bottom control is shown, but it must never contradict the ritual phase.
9. Add or update Playwright coverage so the page fails if the old dashboard elements reappear.

What NOT to do:

- Do not leave hidden debug metadata in the DOM because "only developers will notice." The reason is that hidden fallback controls and debug text tend to leak back into the room later.
- Do not make the page prettier by adding generic product polish like cards, badges, or progress UI. The reason is that the goal is not "more polished app chrome"; it is less visible app chrome.
- Do not let `UserInput.svelte` hardcode `Your Share` and `Submit Share`. The reason is that each user gate has a different role in the meeting.
- Do not create a new generalized room-layout system. The reason is that the restore only needs one immersive meeting page, not a design-system detour.

Acceptance criterion:

Run the meeting page locally and inspect the DOM or the Playwright assertion. The following strings and controls are absent: `Meeting ID`, raw phase label, topic/name/mood edit fields, `Generate Character Share`, `Close Meeting`, significance score, sequence number, `Streaming:`. The page shows one vertical room layout with one bottom control region.

This phase satisfies the `Experience Target` beat that the UI should look and feel like a room, not a dashboard.

Experience note:

At this stage, the user finally stops feeling like they are in an admin panel. They still may not have the full room ritual yet, but the page no longer asks them to operate the meeting.

Emotional intent tag: PRESENCE

Git commit message:

`fix(meeting): remove dashboard chrome from meeting page — room shell can carry the sequence`

Self-critique checkpoint:

If there is any visible affordance that tells the user they are looking at a state machine, a debugging surface, or a workflow tool, this phase failed. Re-open the page and look for anything that feels like an operator console.

Experience audit:

The room should now feel quieter before anyone speaks. The screen should stop competing with the transcript. If the user can still tell what phase the machine is in without listening to the room, the page is still wrong.

## Phase 3 — Run The Opening Ritual And The Intro Gate

Starting state: the room shell exists, the backend can speak the right prompt modes, and the page has a real roster and seeded round order.

Objective: make the meeting start itself, carry the opening ritual, introduce everyone in the right order, and stop only at the user's introduction.

Files to change:

- `app/src/routes/meeting/[id]/+page.svelte`
- `app/src/lib/server/routes/meeting-ritual-phase.integration.spec.ts`
- `tests/e2e/meeting-flow.spec.ts`
- `tests/composition/meeting-flow.spec.ts`

What to do:

1. In `+page.svelte`, implement named interruptible sequence functions for:
   - adding a system or action line
   - waiting an intentional delay
   - requesting one character share over SSE
   - running the opening ritual
   - running the intro loop
2. On component mount, if the persisted phase is still at or before `OPENING`, run this exact order:
   - wait 500ms
   - append the empty-chair system line
   - wait 2000ms
   - request Marcus while the persisted phase is `OPENING`; do not send a custom interaction type here
   - wait 3000ms
   - append `— moment of silence —`
   - wait 3000ms
   - append `*Chrystal pulls out a folded paper*`
   - wait 800ms
   - request Chrystal while the persisted phase is `EMPTY_CHAIR`; do not send a custom interaction type here
   - wait 3500ms
   - append `— introductions —`
   - wait 800ms
3. Run the introductions in exact order:
   - Marcus
   - Heather
   - Meechie
   - Gemini
   - Gypsy
   - Chrystal
   - visitor 1
   - visitor 2
   After each intro, optionally append `Hi [name]!` using the deterministic helper from Phase 2, not raw randomness.
4. After all eight intros, append `*The room settles. Everyone is waiting.*`, wait 1500ms, and then show exactly one bottom control: `Introduce yourself`.
5. Make the intro button append the canonical user intro:
   - `I'm [name]. I'm an addict. [cleanTime].`
   Then append `Hi [name]!`, wait 1200ms, and if the user is new or not currently clean, request a brief welcome from Marcus or Heather with `interactionType=respond_to`.
6. If `listeningOnly` is true, still show the intro button and still require the user intro. Listening-only skips share gates later; it does not skip entry into the room.
7. After the user intro sequence, wait 1500ms and request Marcus to ask for the topic with `interactionType=respond_to`. When his share finishes, show the topic chooser and nothing else.
8. Make every step interruptible. If crisis is entered, close any live `EventSource`, clear pending timeouts, and stop advancing the sequence.
9. Only run opening beats that are still missing. On refresh, do not replay finished intro steps if the meeting has already advanced beyond them.

What NOT to do:

- Do not collapse the whole ritual into one `startMeeting()` promise chain. The reason is that the room must be able to stop for crisis, refresh, or a persisted midpoint.
- Do not show a spinner during the silences. The reason is that silence is content here, not a waiting-room for content.
- Do not reorder the intros just because a seeded shuffle already exists. The reason is that intro order is canonical and not part of round variety.
- Do not treat the user intro as a text area. The reason is that this first step is ritual, not composition.

Acceptance criterion:

Run the deterministic meeting flow test or Playwright spec for the opening stage. From a fresh meeting, the transcript shows, in order, the empty-chair line, Marcus's opening share, the moment-of-silence line, the Chrystal paper action, Chrystal's reading, the introductions header, eight intros in canonical order, the settling line, and then the `Introduce yourself` button. No topic chooser appears before the intro button is clicked.

This phase satisfies the `Experience Target` beat where the room starts itself, Marcus speaks first, silence lands, Chrystal reads, and the room waits before asking anything of the user.

Experience note:

This is the first phase where the room should actually feel like a room. The user joins and the meeting is already happening. The silence after Marcus has to read as the room settling, not the app buffering.

Emotional intent tag: SILENCE

Git commit message:

`fix(meeting): autoplay opening ritual and intro gate — room starts itself before asking for the user`

Self-critique checkpoint:

Read the transcript top to bottom. If anything in the opening sequence feels like the computer reporting progress instead of the room moving, stop and fix it before going on.

Experience audit:

The user should now be able to click `Join Meeting` and then do nothing. Marcus speaks first, not the UI. The room pauses before it asks anything of the user.

## Phase 4 — Make Topic Selection And Round One Feel Like A Meeting

Starting state: the room starts itself, introduces everyone, and stops at the user's intro and topic choice.

Objective: let the room ask for a topic, run the first round automatically, and stop at the user's first real share or pass.

Files to change:

- `app/src/routes/meeting/[id]/+page.svelte`
- `app/src/lib/components/UserInput.svelte`
- `app/src/lib/server/routes/meeting-user-share.spec.ts`
- `tests/e2e/meeting-flow.spec.ts`
- `tests/composition/meeting-flow.spec.ts`

What to do:

1. Render the exact curated topic list in the bottom control region after Marcus asks what the user wants to talk about. Do not render a text box. Render the list as one-choice buttons or radios with a clear confirm action.
2. On topic selection:
   - store the chosen topic in page state
   - request Marcus with `interactionType=respond_to` for the brief acknowledgment
   - move directly into round 1
3. Use `speakingOrder[0]` and `speakingOrder[1]` for round 1. Request the first speaker with `interactionType=respond_to`.
4. Use the deterministic helper from Phase 2 for every optional beat in this round:
   - around 20 percent chance of `*[name] starts to say something, stops.*` before a share
   - around 30 percent chance of a non-verbal action line between shares
   - around 40 percent chance of crosstalk before the second full share
   These probabilities are design targets. The actual decision must be seeded, not random.
5. Keep non-verbal action lines in the page and out of the backend. Use a short curated per-character list such as `*Meechie nods*` or `*Gypsy shifts in her chair*`.
6. If crosstalk is selected, request the second participant with `interactionType=crosstalk`, then request that same participant's full `respond_to` share. Otherwise skip straight to the second participant's `respond_to` share.
7. If `listeningOnly` is false, show `UserInput` with the prompt `What comes up for you?`, a primary button labeled `Share`, and a secondary `Pass`.
8. If `listeningOnly` is true, skip the share gate entirely and proceed directly into the next round after the room's final beat for this round lands.
9. When the user does share or pass, post to `/user-share`. If the response returns `crisis: true`, enter crisis mode immediately. If it returns `heavy: true`, append `*silence in the room*`, wait 3500ms, then request Marcus or Heather with `interactionType=respond_to`. If neither flag is set, optionally append a brief one-line acknowledgment or non-verbal action and proceed.

What NOT to do:

- Do not let the user type a custom topic. The reason is that the topic list is part of the room's language and framing.
- Do not fire round 1 and the user prompt simultaneously. The reason is that the user should feel asked, not interrupted by available controls.
- Do not call `crosstalk` as a full share. The reason is that it is meant to be a brief reaction, not a second main turn.
- Do not reduce the heavy-share pause back to the normal beat. The reason is that the room needs to let heavy disclosures land.

Acceptance criterion:

From a fresh meeting, advance through intro and topic selection, choose one topic, and observe this exact behavior: Marcus briefly acknowledges the topic, two automated character turns happen before the user can type, and then the only bottom control becomes a share/pass composer labeled `What comes up for you?`. If the test uses a forced heavy response fixture, the pause before the room answers is 3500ms instead of the default pause.

This phase satisfies the `Experience Target` beat where the user chooses a topic and the room carries it before turning back to them.

Experience note:

This is where the meeting stops being ceremony and becomes conversation. The user should feel like the room picked up the topic and carried it for a while before turning back to them.

Emotional intent tag: WEIGHT

Git commit message:

`fix(meeting): restore topic gate and round one — room speaks before first user share`

Self-critique checkpoint:

Ask one blunt question: did the room carry the topic, or did the user pick a topic and immediately get a blank text area? If the answer is the second one, the round still feels like a chatbot.

Experience audit:

The room should now sound like people responding to a topic, not like a tool waiting for user content. The user's first text area appears only after the room has shown its shape. If round one feels rushed, the phase is not done.

## Phase 5 — Make Round Two Cut Deeper

Starting state: the room can run the first round and collect the user's first real share or pass.

Objective: implement the middle of the meeting: parallel-story swap, crosstalk/disagreement texture, the second user gate, and the hard question.

Files to change:

- `app/src/routes/meeting/[id]/+page.svelte`
- `app/src/routes/meeting/[id]/share/+server.ts`
- `app/src/lib/core/parallel-story.ts`
- `app/src/lib/core/parallel-story.spec.ts`
- `app/src/lib/server/routes/meeting-share.spec.ts`
- `app/src/lib/server/routes/meeting-user-share.spec.ts`
- `tests/e2e/meeting-flow.spec.ts`
- `tests/composition/meeting-flow.spec.ts`

What to do:

1. Track the user's real submitted shares separately from passes. The hard question must not unlock from passes.
2. Add a pure helper in `app/src/lib/core/parallel-story.ts` that maps user-share text to the optional round-two swap:
   - custody, kid, daughter -> Marcus
   - prison, jail, locked up -> Heather
   - relapse, slipped, slip -> Gemini
   - running, city, moved -> Gypsy
   The helper returns either a character id or `null`. The page calls it after user share 1 and before choosing round-two speakers.
3. Run round 2:
   - first speaker full `respond_to`
   - optional disagree/crosstalk texture from the second speaker if it fits
   - second speaker full `respond_to`
   - then request one direct-to-user prompt from a deterministic choice among the first four round speakers using `interactionType=respond_to`
4. If `listeningOnly` is false, show `UserInput` with the prompt `How does this land?`
5. If `listeningOnly` is true, skip the second user gate and continue straight to round 3.
6. After the second user share or pass, if the user has at least two real shares, `listeningOnly` is false, and the hard question has not yet been asked, request Marcus or Meechie with `interactionType=hard_question`. Record that it was asked so it does not repeat.
7. Preserve heavy-share silence rules here too. If the user's second share is marked `heavy`, give it the same extended pause before the room responds.
8. Keep the meeting interruptible for crisis at every user post.

What NOT to do:

- Do not bury the parallel-story detection inside the page as ad hoc string matching. The reason is that the existing product direction already treats it as a pure domain rule, and it needs unit tests of its own.
- Do not ask the hard question after only one real user share. The reason is that it should feel earned, not scripted.
- Do not make the hard question long. The reason is that the function is to cut through, not to deliver another speech.
- Do not let crosstalk become sarcasm for its own sake. The reason is that it should feel like room texture, not character gimmickry.

Acceptance criterion:

Run the round-two flow with a deterministic fixture or seeded test. When the user's first share contains a parallel-story keyword, the mapped character takes the first round-two slot. After the second real user share, exactly one hard question appears, and it is generated through `interactionType=hard_question`, not `respond_to`.

This phase satisfies the `Experience Target` beat where the meeting gets more specific and someone asks the question that cuts through.

Experience note:

Round two is where the meeting starts to know what it is talking about. This is also where the room should begin to feel sharper and more personal without turning therapeutic or polished.

Emotional intent tag: TENSION

Git commit message:

`fix(meeting): restore round two depth — parallel stories and hard question now land`

Self-critique checkpoint:

If round two feels like round one again with different speakers, it failed. The middle of the meeting should turn the room toward the user a little harder and a little more specifically.

Experience audit:

The room should now feel more dangerous in a good way. Someone should finally ask the user something that gets under the first answer. If the hard question feels like a generic check-in, the phase is not done.

## Phase 6 — Close The Meeting Like A Meeting

Starting state: the room can open, run two rounds, and ask the hard question.

Objective: run the final round, gather the user's last word, close the meeting in the right tone, and leave one private line after `Keep coming back`.

Files to change:

- `app/src/routes/meeting/[id]/+page.svelte`
- `app/src/routes/meeting/[id]/share/+server.ts`
- `app/src/lib/components/MeetingReflection.svelte`
- `app/src/lib/server/routes/meeting-close.spec.ts`
- `app/src/lib/server/routes/meeting-share.spec.ts`
- `tests/e2e/meeting-flow.spec.ts`
- `tests/composition/meeting-flow.spec.ts`

What to do:

1. Run round 3 using `speakingOrder[4]` and `speakingOrder[5]` as full `respond_to` shares.
2. If `listeningOnly` is false, after those two shares request Marcus with `interactionType=respond_to` to ask if the user has anything final, then show `UserInput` with the prompt `Anything else before we close?`
3. If `listeningOnly` is true, skip the final user gate and go straight to the closing beat once round 3 lands.
4. On final submit or pass, or immediately after round 3 in listening-only mode:
   - if the user shared, optionally request a brief Marcus acknowledgment of that final share
   - request Marcus's closing share with the confidentiality reminder and the user's mood included in the context
   - wait 2000ms
   - request Heather or `speakingOrder[0]` for a direct goodbye if it fits the room
   - wait 1500ms
   - append `— Keep coming back —` as a highlighted amber system line
5. After `Keep coming back`, request one private farewell using `interactionType=farewell`. The speaker is:
   - the character who most recently addressed the user directly, if tracked
   - otherwise a random non-Marcus participant
6. After the `Keep coming back` line is visible, call `POST /close` exactly once to persist the meeting summary. Do not call `/close` earlier.
7. Replace the bottom control with the post-meeting end state:
   - summary/reflection view
   - `New meeting` button
   - if `MeetingReflection.svelte` currently says `Return to Meeting`, rename or remove that control so the meeting actually ends

What NOT to do:

- Do not let Marcus's closing turn become a summary paragraph about the user's growth. The reason is that a meeting close should sound like a close, not a session note.
- Do not call `/close` before the visible close has happened. The reason is that persistence should follow the room, not lead it.
- Do not use `respond_to` for the private farewell. The reason is that the goodbye has its own tone and length, and the builder already exists.
- Do not omit `Keep coming back`. The reason is that the meeting is not done without it.

Acceptance criterion:

Advance a meeting through round 3. After the final user share or pass, the transcript ends with Marcus's close, one more goodbye, `— Keep coming back —`, then a short direct farewell addressed to the user by name. The page calls `/close` once and then shows the post-meeting reflection state with a `New meeting` action.

This phase satisfies the `Experience Target` beat where Marcus closes the room, says the user's name again, and the meeting ends with `Keep coming back`.

Experience note:

The close should feel like the room loosening, not the app completing. The last private line after `Keep coming back` should feel like someone catching the user on the way out, not a canned outro.

Emotional intent tag: WARMTH

Git commit message:

`fix(meeting): restore closing ritual and farewell — meeting ends like a room, not a workflow`

Self-critique checkpoint:

Read only the last ten transcript items. If they sound like an app wrapping up work instead of a room closing down, this phase failed.

Experience audit:

The user should feel a little seen on the way out, not congratulated. The room should still feel like it existed before them and will exist after them. If the close sounds like support-product copy, back up and fix it.

## Phase 7 — Make Crisis And Refresh Truthful, Then Run The Final Smell Test

Starting state: the happy path is restored, but the restore is not complete until interruption and refresh behavior are honest.

Objective: make crisis stop the meeting cold, make refresh resume the real room without replaying beats, and verify the final result against the user's smell test.

Files to change:

- `app/src/routes/meeting/[id]/+page.svelte`
- `app/src/lib/server/routes/meeting-crisis.spec.ts`
- `app/src/lib/server/routes/meeting-user-share.spec.ts`
- `app/src/lib/server/routes/meeting-page-load.spec.ts`
- `tests/e2e/meeting-flow.spec.ts`
- `DEFERRED.md`

What to do:

1. Make crisis entry cancel the current room sequence immediately:
   - close any active `EventSource`
   - clear pending delays/timeouts
   - prevent any queued round step or closing step from firing afterward
2. Keep crisis in the transcript, not in a modal. The room stops and the crisis response appears in the same feed.
3. Preserve `preCrisisPhase` so the room can recover honestly if the existing backend supports it, but do not auto-resume the room while the crisis response is still on screen.
4. Make page reload bootstrap from persisted truth:
   - load the roster from the database
   - load existing shares
   - derive the deterministic `speakingOrder`
   - inspect `phaseState`
   - show only the next valid user gate for that phase
   - do not replay opening beats that already happened
5. Run the smell test inventory literally. If any item is still true, do not declare done.
6. Anything discovered here that is real but outside scope gets one dated line in `DEFERRED.md`. Do not fix it inside this phase unless it blocks the restore.

What NOT to do:

- Do not keep the meeting running "under" crisis. The reason is that the room turns toward the person in crisis and nothing else matters for that moment.
- Do not paper over refresh bugs by storing transcript-only state in `sessionStorage`. The reason is that the meeting already has a real backend and should resume from persisted truth.
- Do not silently skip smell-test failures because the end-to-end test passes. The reason is that this task is about the room feeling truthful, not merely about the code completing a loop.
- Do not turn deferred items into opportunistic scope creep. The reason is that the restore will stall and blur if this phase starts fixing adjacent ideas.

Acceptance criterion:

Two checks both pass:

1. Crisis check: submit a crisis-text user share during a round and observe that the normal room sequence stops, crisis shares appear inline, and no further scheduled speaker turn fires afterward.
2. Refresh check: refresh the page during an in-progress meeting after the opening ritual and confirm that the page shows the same roster, the same transcript history, and the correct next gate without replaying the empty chair or the intros.

This phase satisfies the `Experience Target` final promise that the meeting is a room that holds shape, not a brittle interface that starts over whenever something goes wrong.

Experience note:

This phase is where the room earns trust. When it breaks for crisis, it breaks the way a meeting would. When it resumes after a refresh, it does not pretend the earlier beats never happened.

Emotional intent tag: WEIGHT

Git commit message:

`fix(meeting): make crisis and refresh truthful — restored room now survives interruption`

Self-critique checkpoint:

If a person in crisis would still see the rest of the meeting trying to continue around them, stop. That is not a bug fix left for later. That is a failed restore.

Experience audit:

The room should now feel dependable. It should hold shape when the user disappears and comes back. If refresh or crisis reveals the machinery again, the job is not finished.

## Concrete Steps

Run these from `/mnt/c/users/latro/downloads/t/recoverymeeting-autonomous-run/app` unless a step says otherwise.

1. Create or switch to the branch from the Git Protocol section.
2. Before Phase 1, capture a baseline by running:

       npm run check
       npm run test:unit -- --run src/lib/server/routes/meeting-page-load.spec.ts src/lib/server/routes/meeting-share.spec.ts src/lib/server/routes/meeting-user-share.spec.ts src/lib/server/routes/meeting-close.spec.ts src/lib/server/routes/meeting-crisis.spec.ts

   Record the failing or missing behaviors in this ExecPlan before editing anything.
3. Execute one phase at a time. After each phase:
   - run the phase's acceptance checks
   - commit exactly once with the listed commit message
   - update `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective`
4. If a phase discovers out-of-scope work, append one dated line to `DEFERRED.md` immediately and keep moving.
5. If a phase requires a new migration, apply it locally before running page-load or route tests so the persisted behavior being tested matches the plan.

## Validation And Acceptance

Run these from `app/` as the work progresses:

1. After Phase 1:

       npm run test:unit -- --run src/lib/server/routes/meeting-page-load.spec.ts src/lib/server/routes/meeting-share.spec.ts src/lib/server/routes/meeting-ritual-phase.integration.spec.ts src/lib/core/prompt-templates.spec.ts

2. After Phases 2 through 6:

       npm run check
       npm run test:unit -- --run src/lib/server/routes/meeting-share.spec.ts src/lib/server/routes/meeting-user-share.spec.ts src/lib/server/routes/meeting-close.spec.ts src/lib/server/routes/meeting-crisis.spec.ts src/lib/server/routes/meeting-page-load.spec.ts

3. During UI restore work:

       npm run test:e2e -- tests/e2e/meeting-flow.spec.ts

   If the script does not accept a path filter, run the repo's Playwright command for that file directly and record the exact command you used in this plan.

4. Final human acceptance:

   - start the app with `npm run dev`
   - open `/`
   - fill in name, clean time, mood, and optional mind text
   - click `Join Meeting`
   - do not touch anything until the room asks you to
   - complete one full meeting and one crisis interruption check

If any required validation is blocked by missing credentials or environment, write the exact blocker into `Progress`, `Surprises & Discoveries`, and `Outcomes & Retrospective`. Do not overclaim.

For the final manual acceptance, the expected observations are concrete:

- within a few seconds of `Join Meeting`, Marcus has spoken and used the user's name
- the user never sees a phase badge, meeting id, or operator toolbar
- the room reaches the topic chooser without any extra click
- each user prompt appears only after the room has spoken
- `Keep coming back` appears before the page moves to reflection
- in listening-only mode, the room never asks the user to share after topic selection
- in crisis mode, no queued room beat fires after the crisis response begins

## Artifacts And Notes

Capture these artifacts as the work proceeds:

- one short log or test assertion proving the route selected the crosstalk prompt
- one short log or test assertion proving the route selected the hard-question prompt
- one short log or test assertion proving the route selected the farewell prompt
- one test or log proving the roster reload returns the same visitor ids and `seatOrder`
- one screenshot or Playwright artifact of the restored room shell with no dashboard chrome
- one transcript excerpt showing the final close sequence with `Keep coming back` and the private farewell

Keep these artifacts concise. They are evidence for the next contributor, not a scrapbook.

## Smell Test Inventory

Before calling the plan done, verify all of these are false:

- The user must click anything other than `Join`, `Introduce yourself`, `Share`, `Pass`, topic choice, or end-state buttons to move the meeting forward.
- A phase label, meeting ID, status string, or debug number is visible during the meeting.
- The loading state for a speaker is a spinner or skeleton instead of a room-native thinking indicator.
- The empty chair can be bypassed.
- Crisis appears as a modal or overlay while the feed continues underneath.
- Topic, name, or mood remains editable once the meeting page is open.
- The topic chooser is a text input.
- Characters speak with no pause between turns.
- The intro order is not `marcus -> heather -> meechie -> gemini -> gypsy -> chrystal -> visitor 1 -> visitor 2`.
- The meeting ends without `Keep coming back`.
- The last line after `Keep coming back` sounds like a generic support message instead of a direct goodbye from a person in the room.

## Completion Litmus Test

Do not mark this ExecPlan done until the executing agent can answer `yes` to every question below:

1. If I join a meeting and put my hands in my lap, does the room start itself without any hidden fallback control?
2. Does Marcus say the user's name early, and does the room pause on purpose rather than showing infrastructure?
3. Do all eight participants introduce themselves before the user is asked to do anything except introduce themself?
4. Does the user pick from the curated topic list instead of inventing the topic from scratch?
5. Do three rounds happen, with the room carrying most of the talking?
6. Does a hard question happen only after the user has really shown up?
7. Does crisis stop the meeting cold instead of decorating it?
8. Does the meeting close with `Keep coming back` and one private farewell?
9. Could a tired, first-time user mistake this for a room instead of an interface?

If any answer is `no`, the restore is not done.

## Audit Revision History

Round 1 self-audit changes made while authoring this plan:

- Added the meeting-participant roster seam after discovering that the random visitors are impossible to persist with the current adapter.
- Added the explicit "missing Appendix A body" rule so the executing agent does not invent traceability.
- Added the conflict hierarchy and divergence budget so timing, UX, and phase order cannot be traded away casually.
- Added the explicit permission to delete the admin UI by name so the executing agent does not preserve the dashboard out of caution.
- Added the voice audit anchors so the executing agent can catch "therapist voice" even when tests pass.

Round 2 self-audit changes made while authoring this plan:

- Added explicit instructions that the share route must honor frontend-provided round speakers inside the persisted roster, while still enforcing ritual speakers for opening and closing beats.
- Added the seeded speaking-order rule so refresh remains stable without inventing new schema.
- Added explicit `DEFERRED.md` handling and anti-scope-creep language.
- Added the smell test item for transcript debug metadata after noticing that `ShareMessage.svelte` currently exposes significance and sequence data.

Round 3 self-audit changes made after a hostile plan review:

- Embedded the experience target and explicit backend gaps directly into the plan so it no longer depends on external prompt context.
- Added the missing named ExecPlan sections: `Plan Of Work`, `Interfaces And Dependencies`, `Concrete Steps`, `Validation And Acceptance`, and `Artifacts And Notes`.
- Corrected the impossible visitor-id assumption by switching the roster plan to database-created visitor ids plus persisted `seat_order`.
- Corrected the interaction-type model so `opening`, `reading`, and `intro` stay phase-driven instead of becoming illegal enum values.
- Added the missing share-interaction persistence work in the database seam, fixture, adapter, and migration.
- Added transcript bootstrap, deterministic randomness, explicit cancellation state, and listening-only handling as first-class plan requirements.

Exit condition for the authoring audit:

The third pass produced fewer than three material changes to the plan structure. The remaining edits were clarifications, not missing execution-critical work.

## Revision Note

2026-03-19: Initial authored version, then revised through three audit passes. The critical fixes were making the document self-contained, correcting the impossible visitor-id story, restoring truthful interaction-type persistence, and adding listening-only, transcript bootstrap, deterministic randomness, and cancellation as explicit requirements instead of implied behavior.
