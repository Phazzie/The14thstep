# Ship "The 14th Step" â€” Recovery Meeting Simulator

This ExecPlan is a living document. The sections Progress, Surprises & Discoveries, Decision Log, and Outcomes & Retrospective must be kept up to date as work proceeds. This document must be maintained in accordance with PLANS.md at the repository root.

## Purpose / Big Picture

After this change, a person in recovery â€” or someone curious, isolated, anxious, or in crisis at 3 AM â€” can open a browser, sign in, and sit in a virtual recovery meeting with eight to ten AI-driven characters who feel like real people. The characters remember past meetings, develop running jokes, evolve over time, and respond to the user with the raw, specific, no-therapy-speak language of actual recovery rooms. When the user returns next week, the characters remember them.

To see it working: navigate to the deployed URL, create an account, enter a name and mood, and join a meeting. Within thirty seconds, eight AI characters stream shares one at a time through Server-Sent Events. The user can share, pass, or just listen. After the meeting closes, a personal reflection appears. Return for a second meeting and at least one character references something from the first session.

The app is called "The 14th Step." It is built with SvelteKit, uses Supabase for authentication and PostgreSQL persistence, calls grok-4-1-fast-reasoning via the xAI Responses API for all AI generation, and deploys to Vercel.

## Environment Prerequisites

The implementation and deployment flow assumes Linux shell execution and uses `npx` for CLI tools so no global install is required. Verified toolchain in this workspace:

- `node` v24.13.0
- `npm` 11.6.2
- `npx vercel --version` -> 50.17.1
- `npx supabase --version` -> 2.76.8

Required environment variables before live probes and deploy:

- `XAI_API_KEY` (xAI Responses API key)
- `SUPABASE_URL` (project URL)
- `SUPABASE_SERVICE_ROLE_KEY` (service-role key for server-side probes and adapters)
- `PROBE_USER_ID` (UUID from Supabase Auth `auth.users`)
- `VERCEL_TOKEN` (recommended for non-interactive CI/agent deploys)
- `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` (recommended once project is linked)

Optional but useful for Supabase CLI operations:

- `SUPABASE_ACCESS_TOKEN` (if using Supabase CLI loginless workflows)
- `SUPABASE_DB_PASSWORD` (if linking and pushing migrations through CLI)

## Progress

- [x] (2026-02-15 23:40Z) Created Milestone 0 scaffolding artifacts: `seam-registry.json`, `decision-log.md`, seam contract files under `app/src/lib/seams/**`, shared result envelope in `app/src/lib/core/seam.ts`, and probe scripts in `app/probes/**`.
- [x] (2026-02-15 23:40Z) Added and validated local SSE probe path: endpoint `app/src/routes/api/probes/sse/+server.ts`, UI `app/src/routes/probes/sse/+page.svelte`, and CLI probe `npm run probe:sse` returning PASS.
- [x] (2026-02-16 03:23Z) Completed Milestone 1 seam skeleton implementation by adding fixture sets, fixture-backed mocks, runtime contract validators, and green contract tests for `grok-ai`, `database`, `auth`, `uuid`, and `clock` under `app/src/lib/seams/**`.
- [x] (2026-02-16 03:28Z) Started Milestone 2 by implementing `app/src/lib/core/meeting.ts` lifecycle functions (`createMeeting`, `addShare`, `closeMeeting`) and pure `scoreSignificance`, with `app/src/lib/core/meeting.spec.ts` passing in unit tests.
- [x] (2026-02-16 04:19Z) Completed Milestone 2 core modules with tests: `character-selector.ts`, `prompt-templates.ts`, `memory-builder.ts`, and `callback-scanner.ts` with full unit coverage in `app/src/lib/core/*.spec.ts`.
- [x] (2026-02-16 04:19Z) Completed Milestone 3 live prompt-engineering probes: `probe.ts` generated live fixtures, quality cycle generated per-character pass rates, and all six core characters met/exceeded the 0.7 target (recorded 1.0 in this run).
- [x] (2026-02-16 04:19Z) Completed remaining Milestone 0 live probes in isolated workspace using local env loading: `probe:grok-voice` PASS (9/10) and `probe:supabase-memory` PASS after threshold tuning via `SUPABASE_MEMORY_PROBE_MAX_MS=1200`.
- [x] (2026-02-16 05:34Z) Completed Milestone 4 adapter wiring by implementing real adapters and tests in `app/src/lib/server/seams/**`, adding Supabase client helper `app/src/lib/server/supabase.ts`, and wiring `auth/database/grokAi` seam bundle through `app/src/hooks.server.ts` and `app/src/app.d.ts`.
- [x] (2026-02-16 09:35Z) Completed Milestone 5 functional meeting flow baseline: setup form action (`+page.server.ts`), live meeting route/UI (`meeting/[id]/+page.svelte`), SSE share generation endpoint (`share/+server.ts`), user-share endpoint flags (`crisis`/`heavy`), close endpoint wiring, and new expand-share endpoint (`meeting/[id]/expand/+server.ts`).
- [x] (2026-02-16 09:38Z) Completed Milestone 6 dual-track memory integration in server flow by extending the database seam with callback/share retrieval methods, wiring `buildPromptContext` into character-share generation, and triggering callback scanning/persistence during close.
- [x] (2026-02-16 09:40Z) Implemented Milestone 7 callback probability core (`callback-engine.ts`) with rule-matrix tests and integrated callback selection + reference marking in `share/+server.ts`; lifecycle evolution/retirement rules remain as follow-up.
- [x] Milestone 0: Repository bootstrap and reality probes complete
- [x] Milestone 1: Hexagonal skeleton with all seam contracts, mocks, and contract tests green
- [x] Milestone 2: Domain core (pure meeting workflow logic) tested with zero I/O
- [x] Milestone 3: Prompt engineering â€” Grok produces character-voice shares that pass AI-driven quality validation
- [x] Milestone 4: Real adapters wired (Supabase database, Supabase auth, xAI grok-ai seam)
- [x] Milestone 5: UI and meeting flow â€” full meeting runs on localhost with streaming shares
- [x] Milestone 6: Dual-track memory system (heavy memory + callback detection) persisted and surfaced in prompts
- [ ] Milestone 7: Callback engine with conditional probability matrix producing organic recurring moments
- [ ] Milestone 8: Crisis response system â€” detection, intervention, UI state change, resource display
- [ ] Milestone 9: CI pipeline, composition tests, fixture freshness, governance artifacts
- [ ] Milestone 10: Production deploy to Vercel â€” public URL serving authenticated meetings

## Surprises & Discoveries

- Observation: Existing `app/node_modules` was platform-skewed and initially broke Vitest with missing Linux Rollup binary.
  Evidence: `npm run test:unit -- --run` failed with `Cannot find module @rollup/rollup-linux-x64-gnu`; running `npm install` resolved this, then unit tests passed.
- Observation: First dev-server response was delayed by initial compilation, which can make immediate probe calls fail if startup is not warm.
  Evidence: `curl http://127.0.0.1:5173/` took ~16 seconds before first `HTTP/1.1 200 OK`; subsequent `npm run probe:sse` passed in ~2.7s.
- Observation: ESLint appears to stall in this environment despite successful formatting and type checks; lint requires dedicated follow-up.
  Evidence: `npm run lint` and targeted `npx eslint ...` produced no rule output and did not complete within timeout windows.
- Observation: Both deployment CLIs can run from `npx`, so global installation is not required.
  Evidence: `npx --yes vercel --version` returned `50.17.1`; `npx --yes supabase --version` returned `2.76.8`.
- Observation: Isolated worktrees require their own dependency install even when another sibling worktree already has `node_modules`.
  Evidence: In `/mnt/c/Users/latro/Downloads/t/recoverymeeting-codex/app`, `npm run test:unit -- --run` failed with `vitest: not found` until `npm install` completed.
- Observation: Strict TypeScript checks on runtime validators require explicit narrowing of values read from `Record<string, unknown>`.
  Evidence: `npm run check` reported `'value.significanceScore' is of type 'unknown'` and `'tokenValue' is possibly 'null'`; adding local typed variables and type guards resolved all errors.
- Observation: Scoring precedence materially changes test outcomes when a single share contains multiple signal types.
  Evidence: In `meeting.spec.ts`, a user share containing both "told the truth" and "first time" must score 7 (connection/breakthrough) rather than 5 (first-time share), so precedence is now explicit and covered by tests.
- Observation: Live seam probes and contract-test fixtures need separate filenames; sharing names causes probe runs to overwrite deterministic test fixtures.
  Evidence: First live `probe.ts` run replaced `fixtures/sample.json` and `fixtures/fault.json`, which broke contract assumptions until probe outputs were moved to `probe.sample.json` and `probe.fault.json`.
- Observation: Probe scripts in isolated worktrees fail without explicit env-file loading, even when `.env.local` exists.
  Evidence: `npm run probe:grok-voice` and `npm run probe:supabase-memory` initially failed with missing env vars; adding `node --env-file-if-exists=.env.local` to scripts resolved it.
- Observation: Quality validation prompt currently produces strong pass rates for all six core characters under live xAI calls.
  Evidence: `voice-quality-report.json` recorded `5/5` passes for Marcus, Heather, Meechie, Gemini, Gypsy, and Chrystal (passRate `1.0` each).
- Observation: Parallel subagent execution accelerated Milestone 4 delivery with low merge friction when ownership boundaries were explicit.
  Evidence: Three parallel subagents delivered Grok, database, and auth/wiring slices independently; only one integration-level TypeScript test fix was required post-merge.
- Observation: This shell can drift to Windows `npm` execution, which breaks Linux `node_modules/.bin` scripts.
  Evidence: `npm run check` failed with `'svelte-kit' is not recognized...` until PATH was switched to `/home/latro/.nvm/versions/node/v24.13.0/bin`.
- Observation: Milestone 6 callback persistence required expanding the database seam contract before route integration could proceed.
  Evidence: `buildPromptContext` and `scanForCallbacks` integration was blocked until `database` contract/adapter exposed `getShareById`, `getMeetingShares`, `createCallback`, `getActiveCallbacks`, and `markCallbackReferenced`.
- Observation: Quality-validation retries can be added directly to server share generation without introducing a new seam.
  Evidence: `share/+server.ts` now performs generation -> validation -> retry loops using the existing `grok-ai.generateShare` seam and remained type-safe (`svelte-check` clean).

## Decision Log

- Decision: Database is Supabase (PostgreSQL), not Appwrite.
  Rationale: The memory retrieval system requires relational queries with JOINs, foreign keys, significance score filtering across tables, and prefix-based key lookups. Appwrite's document-based database cannot express these queries without a full schema redesign. Supabase IS PostgreSQL and supports every query pattern in the spec natively. Supabase Auth also provides the authentication layer.
  Date/Author: 2026-02-15

- Decision: Default meeting size is "small" (8â€“10 participants) with no mid-session size changes.
  Rationale: Keeps token spend predictable (estimated 15â€“25 API calls per meeting at ~$0.05â€“$0.08 total). Simplifies the speaking order logic and context window management. Larger meetings can be added in a future phase without changing the core architecture.
  Date/Author: 2026-02-15

- Decision: Callback probability uses the full conditional matrix, not a flat 50%.
  Rationale: A flat probability makes callbacks feel forced and unnatural. The conditional matrix (described in Milestone 7) makes callbacks feel earned â€” new characters do not know the inside jokes, established jokers reference them more often, and user-initiated callbacks almost always get picked up. The "aggressive" setting means the baseline is higher than the original spec's 35%, but the texture of the conditional system is preserved.
  Date/Author: 2026-02-15

- Decision: No heuristics for narrative quality validation. All quality assessment uses AI.
  Rationale: Heuristic validators (sentence length checks, regex for banned words, pattern matching for speech tics) are brittle and miss context. Instead, a dedicated AI validation call evaluates each generated share against the character profile, the therapy-speak blocklist, and the voice consistency requirements. This costs one additional small API call per share but produces more reliable quality judgments.
  Date/Author: 2026-02-15

- Decision: Use the xAI Responses API endpoint (POST /v1/responses), not the Chat Completions endpoint.
  Rationale: The official xAI documentation steers developers to the Responses API for grok-4-1-fast-reasoning. The Responses API supports streaming via SSE, stateful conversations via previous_response_id, and is the recommended path for reasoning models.
  Date/Author: 2026-02-15

- Decision: Always refer to the methodology as "Seam-Driven Development," never "SDD."
  Rationale: Project convention. Abbreviations create jargon barriers for new contributors.
  Date/Author: 2026-02-15

- Decision: Keep active app implementation inside `app/` and place governance files at repository root.
  Rationale: The existing SvelteKit workspace and dependency graph already live in `app/`; moving files now adds risk without product value.
  Date/Author: 2026-02-15 (Codex)

- Decision: Milestone 0 probes are implemented as executable scripts now, with live probe execution deferred until credentials are present.
  Rationale: This preserves Seam-Driven Development flow (contract + probe tooling first) while allowing autonomous progress without blocking on secrets.
  Date/Author: 2026-02-15 (Codex)

- Decision: Use `npx vercel` and `npx supabase` in plan commands instead of requiring global CLI installs.
  Rationale: Reduces setup friction and keeps execution reproducible in fresh environments.
  Date/Author: 2026-02-15 (Codex)

- Decision: Export runtime validation helpers from seam contracts and reuse them in mocks and contract tests.
  Rationale: This keeps contract shape rules centralized in one seam-owned location and gives adapters a shared validation path for Milestone 4.
  Date/Author: 2026-02-16 (Codex)

- Decision: Implement Milestone 2 incrementally by shipping `meeting.ts` lifecycle/scoring first before broader core modules.
  Rationale: This delivers a verified pure workflow slice quickly while preserving momentum and test confidence, then leaves selector/templates/memory/callback modules as explicit next work.
  Date/Author: 2026-02-16 (Codex)

- Decision: Keep deterministic seam fixtures used by mocks/tests separate from live probe captures by using dedicated `probe.*.json` filenames.
  Rationale: Prevents live probe execution from mutating contract-test baselines and preserves reproducible seam test behavior.
  Date/Author: 2026-02-16 (Codex)

- Decision: Standardize probe scripts to load `.env.local` automatically with `node --env-file-if-exists=.env.local`.
  Rationale: Makes probe commands runnable in fresh/isolated worktrees without manual `export` steps while keeping secret values outside committed files.
  Date/Author: 2026-02-16 (Codex)

- Decision: Use the parallel subagent pattern for adapter-heavy milestones, then run a centralized integration and verification pass.
  Rationale: Adapter work is naturally separable by seam, and centralized integration keeps cross-file correctness and governance consistency.
  Date/Author: 2026-02-16 (Codex)

- Decision: Extend the existing `database` seam (instead of adding a new callback seam) to include callback lifecycle and share lookup operations.
  Rationale: Callback operations are persistence concerns over the same Supabase schema and fit naturally in the current database port, minimizing seam sprawl and integration overhead.
  Date/Author: 2026-02-16 (Codex)

- Decision: Gate callback prompt injection through a pure callback-engine probability matrix before prompt rendering.
  Rationale: Keeps callback inclusion deterministic/testable at the core layer while preserving natural variation in generated meeting dialogue.
  Date/Author: 2026-02-16 (Codex)

## Outcomes & Retrospective

Milestones 0 through 6 are now complete in this branch, with Milestone 7 partially implemented. The app now runs an end-to-end localhost meeting flow with setup, SSE character shares, user shares, share expansion, close-summary generation, callback scanning persistence, and memory/callback-aware prompt building. Callback probability selection is implemented in a pure engine with tests and is wired into live share generation; remaining Milestone 7 scope is callback lifecycle evolution/retirement depth and broader sequential-meeting verification.

## Context and Orientation

This section describes everything a novice needs to know to navigate the project. Every term used later in this document is defined here.

### What "The 14th Step" Is

A web application that simulates a recovery meeting (the kind held by groups like AA and NA). The user joins a small room of AI-driven characters. Characters take turns sharing about a topic. The user can share, pass, or listen. Characters respond to each other and to the user. The meeting follows a real structure: opening, empty chair moment, introductions, topic selection, sharing rounds, closing.

What makes it feel real: characters remember previous meetings, develop running jokes and callbacks, evolve their clean time over weeks, and speak in distinctive voices with no therapy language. The app is a bridge for people who cannot get to a physical meeting â€” not a replacement for human connection.

### Key Terms

A "seam" is a contracted interface that isolates any unpredictable or nondeterministic behavior (network calls, database queries, AI generation, time, random IDs) behind a boundary. The code inside the hexagon (the "core") calls seams but never touches reality directly. The code outside the hexagon ("adapters") performs the real I/O and validates inputs and outputs against the seam's contract. This architecture is called hexagonal architecture (also known as ports and adapters). The methodology governing how seams are built â€” contract first, then probe, then fixtures, then mock, then adapter â€” is called Seam-Driven Development.

A "fixture" is a JSON snapshot captured by running a probe against the real external system. Fixtures are deterministic: they record what the real system actually returned, stamped with a date and environment. Fixtures are never hand-edited for I/O seams. A "mock" is a fixture reader â€” it returns fixture data exactly, with zero transformation logic. A "contract test" proves that fixtures validate against the schema, the mock returns fixtures exactly, and the adapter returns contract-conformant results.

The "result envelope" is the standard shape every seam returns: either `{ ok: true, value: T }` for success or `{ ok: false, error: { code, message, details? } }` for failure. No seam throws exceptions for expected outcomes. Exceptions are bugs, not business results.

The "error taxonomy" is the shared set of error codes every seam uses: INPUT_INVALID, NOT_FOUND, RATE_LIMITED, UPSTREAM_UNAVAILABLE (timeouts, DNS, network failures), UPSTREAM_ERROR (other upstream failures), CONTRACT_VIOLATION (upstream response does not match schema), UNAUTHORIZED, and UNEXPECTED (the bug bucket).

"Heavy memory" refers to meeting shares scored at significance level 7 or above, plus any shares scored 6 or above that involved the current user, plus the full transcript of the last three meetings. This is Track 1 of the dual-track memory system â€” it handles emotional continuity, crisis moments, breakthroughs, and deep connections.

"Callback" refers to a previously flagged share that gets resurfaced in a future meeting to create community texture â€” running jokes, character quirks, room culture. This is Track 2 of the dual-track memory system. Callbacks are included in character prompts based on a conditional probability matrix, not a flat percentage.

"Therapy-speak" refers to clinical, sanitized language that real recovery meetings actively resist. The app enforces a blocklist of banned phrases and patterns. Characters speak in concrete, specific, sometimes profane language â€” the way people actually talk in meetings.

### Directory Layout

The project enforces hexagonal architecture through SvelteKit's server-only boundary. Real I/O code lives exclusively in `src/lib/server/` â€” this prevents accidental imports into browser code.

    the-14th-step/
      src/
        lib/
          core/                           # Pure domain logic. NO fetch, NO database, NO imports from server/.
            meeting.ts                    # Meeting lifecycle: create, add-share, close, score-significance
            memory-builder.ts             # Builds prompt context from dual-track memory (pure data transformation)
            callback-scanner.ts           # Scans shares for callback material (pure pattern detection)
            character-selector.ts         # Selects meeting attendees by tier rules (pure selection logic)
            prompt-templates.ts           # All prompt templates for character generation
            types.ts                      # All TypeScript types and interfaces for the domain
            therapy-blocklist.ts          # The banned phrases list (data, no I/O)
          seams/
            grok-ai/
              contract.ts                 # Input/output schemas, error codes, result envelope
              probe.ts                    # Hits real xAI API, dumps sample.json + fault.json
              fixtures/                   # Auto-generated by probe, never hand-edited
                sample.json
                fault.json
              mock.ts                     # Returns fixture data exactly
              contract.test.ts            # Validates fixtures against schema, mock returns fixtures, negative proof
            database/
              contract.ts
              probe.ts
              fixtures/
              mock.ts
              contract.test.ts
            auth/
              contract.ts
              probe.ts
              fixtures/
              mock.ts
              contract.test.ts
            uuid/                         # Pure seam (wraps crypto.randomUUID for deterministic testing)
              contract.ts
              fixtures/
              mock.ts
              contract.test.ts
            clock/                        # Pure seam (wraps Date.now for deterministic time in tests)
              contract.ts
              fixtures/
              mock.ts
              contract.test.ts
          server/
            seams/
              grok-ai/
                adapter.ts               # Real xAI HTTP calls, validates input/output against contract
              database/
                adapter.ts               # Real Supabase client, validates against contract
                migrations/              # SQL migration files (up and down scripts)
              auth/
                adapter.ts               # Real Supabase Auth calls
          observability/
            logger.ts                    # Structured logging helper
            metrics.ts                   # Token usage, latency, cost tracking
        routes/
          +page.svelte                   # Landing / meeting setup flow
          +page.server.ts                # Form action: create meeting session
          +layout.server.ts              # Auth guard, loads user session
          meeting/
            [id]/
              +page.svelte               # Active meeting UI (circle, shares, input)
              +page.server.ts            # Load meeting state, character data
              share/
                +server.ts               # SSE endpoint: streams next character share
              user-share/
                +server.ts               # POST: processes user input, checks crisis
              expand/
                +server.ts               # POST: generates expanded share (8-10 sentences)
              close/
                +server.ts               # POST: closes meeting, runs post-meeting jobs
          history/
            +page.svelte                 # Past meetings list
            +page.server.ts              # Loads meeting history from database
          auth/
            login/+page.svelte
            login/+page.server.ts
            signup/+page.svelte
            signup/+page.server.ts
            logout/+server.ts
        hooks.server.ts                  # The conductor: wires seam implementations per request
      seam-registry.json                 # Governance inventory of all seams
      decision-log.md                    # Append-only change receipts (mirrors Decision Log above)
      supabase/
        migrations/                      # Versioned SQL migrations (up + down)
      tests/
        e2e/                             # Playwright end-to-end tests
        composition/                     # Workflow-level tests with mock seam bundles
      .env.example                       # Template for environment variables (no secrets)

### The Six Core Characters

These are ported directly from the existing React artifact. Each character has a name, hex color, clean time, archetype (their role in the room), wound (core trauma), contradiction (blind spot), voice (speech patterns and syntax), quirk (physical/behavioral tell), and avatar (letter(s) for the UI circle).

Marcus. Color #D97706. 12 years clean. Archetype: The Chair. Wound: daughter will not speak to him, watched too many people die. Contradiction: so calm it can feel distant â€” forgets he was ever in the chaos. Voice: measured, deliberate, starts with "Now" or "See," speaks in stories, protective of newcomers, nothing shocks him, will ask the hard question when needed. Quirk: always has the same chipped coffee cup, shifts in his chair when something lands. Avatar: M.

Heather. Color #EC4899. 2 weeks clean. Archetype: The Queen Returned. Wound: prison, trafficking survivor, mentors women who have been through the worst. Contradiction: goes so hard she might burn out â€” does not know how to rest. Voice: direct, intense, starts with "Look" and "Listen" before truth, switches between ice and fire, just got back but already a force. Quirk: sits forward when she is about to say something real, rolls her eyes when someone is bullshitting. Avatar: H.

Meechie. Color #8B5CF6. Clean time: in and out. Archetype: The Truth. Wound: seen too much, knows too much, survived by seeing patterns others miss. Contradiction: sees everyone clearly except herself. Voice: third person sometimes, "See what happened was..." deadpan truth bombs, says the uncomfortable thing, quotable one-liners. Quirk: always sits in the same spot, mutters under her breath, will call bullshit immediately. Avatar: Me.

Gemini. Color #06B6D4. 8 months clean. Archetype: The War Inside. Wound: genuinely does not know which version of themselves is real. Contradiction: gets stuck in the contradiction instead of choosing. Voice: contradicts self mid-sentence, "But then again..." "I don't know though..." honest about wanting both things at once. Quirk: fidgets, starts to speak then stops, sometimes answers their own questions differently. Avatar: G.

Gypsy. Color #F59E0B. 14 months clean. Archetype: The Runner Who Stopped. Wound: used in every city, ran from everything, finally learning to stay. Contradiction: sometimes romanticizes the road even though it was killing them. Voice: storyteller, "I remember this one time in..." always has a story from another city, road wisdom. Quirk: often late, references specific cities, gets wistful sometimes. Avatar: Gy.

Chrystal. Color #10B981. 3 years clean. Archetype: The Proof. Wound: drug court, couch surfed for a year, built everything from nothing. Contradiction: her success sometimes makes others feel further away from their own. Voice: "I'm not gonna lie..." "It sounds fake but..." remembers specific dates, imposter syndrome despite success. Quirk: checks her phone sometimes (recovery coach, always on call), remembers exact dates. Avatar: C.

### Random Character Generation

Each meeting also generates two random characters from a pool of archetypes: The Newcomer (raw, scared, overshares or barely speaks), The Relapse (just came back, humbled, ashamed but here), The Quiet One (barely speaks but when they do it matters), The Angry One (pissed at everything, has not found the real target yet), The Griever (lost someone recently, carrying it into the room), The Ghost (used to be a regular, disappeared, just showed back up).

Random characters draw from a name pool (Danny, Keisha, Ray, Tina, Destiny, Carlos, Brandy, Terrell), a color pool for UI avatars (#EF4444, #3B82F6, #22C55E, #F97316, #A855F7, #14B8A6), a wound pool (lost custody last month; DUI killed someone, anniversary coming up; just did 5 years out 3 weeks; best friend overdosed this year; divorce finalized last week; sleeping in car right now; family cut them off completely; had a six-figure job lost everything), a contradiction pool (gives perfect advice they never follow; takes care of everyone but cannot take care of themselves; seems tough but one thing will break them open; hates the program but keeps showing up; wants connection but pushes everyone away), and a clean time pool with context (6 days barely holding on; 19 days still shaky; 2 months pink cloud or white-knuckling; 9 months reality hitting; relapsed 11 days back humbled starting over).

### Speaking Order and Character Selection

Marcus always chairs â€” he is never in the shuffled speaking order. The remaining seven characters (Heather, Meechie, Gemini, Gypsy, Chrystal, and the two random characters) are shuffled randomly at meeting start. This shuffled order determines who speaks in each round: the first two in Round 1, the next two in Round 2, the next two in Round 3. The introduction order is fixed: Marcus first, then Heather, Meechie, Gemini, Gypsy, Chrystal, then both random characters, then the user last. This means introductions always proceed in a predictable order (the room knows each other), but the sharing order varies per meeting (who speaks when is organic).

### The Therapy-Speak Blocklist

This list is enforced during AI-driven quality validation. If a generated share contains any of these phrases or patterns, it fails validation and must be regenerated. The blocklist:

Banned exact phrases: "I hear you." "That's valid." "You're brave for sharing." "How does that make you feel?" "Hold space." "Set boundaries." "Your truth." "Healing journey." "Self-care." "Triggered." "Safe space." "Emotional labor." "Sit with that." "Do the work." "Lean into." "Unpack that." "Honor your feelings." "You're enough." "Toxic." "Gaslighting." "Boundaries." "Process your emotions." "Growth mindset." "Inner child." "Trauma response." "Coping mechanism." "Accountability partner." "Recovery is not linear." "One day at a time." "Let go and let God." "It works if you work it." "Surrender." "Higher power." (Note: "higher power" and "surrender" are AA/NA language that real meetings use ironically or resist â€” the characters in this app are the ones who roll their eyes at it.)

Banned patterns: any sentence starting with "I want to acknowledge..." or "I appreciate you sharing..." or "Thank you for being vulnerable..." or "It takes courage to..." Any sentence containing "journey" used metaphorically. Any sentence containing "boundaries" as a standalone concept rather than a specific action. Any use of "triggers" as a noun rather than describing a specific event.

The blocklist is stored as a data file at `src/lib/core/therapy-blocklist.ts` and exported as arrays of exact phrases and regex patterns. It is imported by the quality validation prompt template, which instructs Grok to check its own output against the list before returning.

### Setup Screen Options

The mood options presented during setup (exact strings from the artifact): "Struggling", "Okay", "Good actually", "Numb", "Angry", "Scared", "Don't know", "Just need to be somewhere."

The clean time options presented during setup (exact strings): "This is my first meeting", "Less than a week", "Few weeks", "Few months", "6 months to a year", "Over a year", "Multiple years", "I'm not clean right now", "Rather not say."

The clean time options that trigger a special welcome from Marcus or Heather during introductions (Phase 3): "This is my first meeting", "Less than a week", "I'm not clean right now." These are the newcomer and at-risk states where the room needs to acknowledge the user's courage in showing up.

### Listening-Only Mode

On the setup screen, the user can choose "Just listening" instead of "Join Meeting." This sets a flag that persists for the entire session. When listening-only is active, the meeting flow changes in one specific way: after each sharing round, instead of prompting the user to share ("What comes up for you?"), the meeting automatically advances to the next round. The user still picks the topic. The user still introduces themselves. Characters still share, crosstalk, and respond to each other. The hard question is not asked (because the user has not shared substantively). The closing still happens normally. The user prompt phases (user-response-1, user-response-2, user-final) are skipped entirely. This mode exists because real meetings allow people to just sit and listen â€” sometimes that is exactly what someone needs.

### Meeting Topics

The topic pool (from the artifact): "Staying clean when everything falls apart." "People who don't understand what we've been through." "Trusting yourself again." "The difference between being alone and being lonely." "When the people closest to you don't believe you've changed." "Dealing with the things you did." "Finding reasons to stay." "Coming back after relapse." "The people we lost." "When staying clean feels harder than using."

### Parallel Story Detection

When the user shares something in Round 1 or Round 2, the system checks for keyword overlap with specific characters' wounds. If a match is found, that character is swapped into the next round to tell a parallel story â€” their own experience with the same pain. The keyword-to-character mapping (from the artifact): any mention of "daughter", "kid", or "custody" maps to Marcus (his daughter will not speak to him). Any mention of "prison", "jail", or "locked up" maps to Heather (prison survivor). Any mention of "relapse" or "slip" maps to Gemini (the war inside, relapse identity). Any mention of "running", "city", or "moved" maps to Gypsy (the runner who stopped). This mapping is implemented as a pure function in the domain core, not as part of the AI prompt â€” it determines which character speaks, not what they say.

### Crisis Detection

Crisis keywords (from the artifact): "kill myself," "suicide," "want to die," "end it all," "no point anymore," "give up," "better off dead," "can't do this anymore," "not worth it."

Heavy topic keywords (from the artifact): "relapsed," "used last," "picked up," "lost custody," "divorce," "homeless," "died," "funeral," "prison," "jail," "arrested," "overdose."

### The xAI Grok API

The AI engine is grok-4-1-fast-reasoning, accessed via the xAI Responses API. Key technical details that affect implementation:

Endpoint: POST https://api.x.ai/v1/responses. Authorization via Bearer token in the header. The request body contains "model" (string: "grok-4-1-fast-reasoning") and "input" (array of message objects with role and content fields). Streaming is enabled by setting "stream": true and uses Server-Sent Events.

Parameters that will cause errors if included: presencePenalty, frequencyPenalty, stop, reasoning_effort, instructions. These are explicitly unsupported for reasoning models and the API will reject the request.

The x-grok-conv-id header (a UUID4 value) can increase cache-hit likelihood for repeated prompts â€” use this for the system prompt portions that are identical across shares in the same meeting.

Rate limits are team-specific; check the xAI console. A 429 response means rate limited. Timeouts should be set long (the docs recommend up to 3600 seconds for reasoning models, though shares should complete much faster). Server-side conversation storage is on by default and persists for 30 days; disable with "store": false if desired.

The SvelteKit integration pattern: all xAI calls happen in +server.ts files (server routes) so the API key stays private. The key is loaded from the environment via `$env/static/private`. Set "store": false in all API requests to disable xAI's server-side conversation storage â€” this app stores its own meeting data in Supabase and does not need xAI retaining copies of recovery meeting content.

### Supabase

Supabase provides two services for this app: PostgreSQL database (for all persistent data â€” characters, meetings, shares, callbacks, users) and authentication (email/password signup and login, session management via cookies). The Supabase client libraries for both are available via the `@supabase/supabase-js` package. The URL and anon key are environment variables.

### Database Schema

Six tables. All use UUID primary keys generated by the uuid seam.

Table: characters. Columns: id (uuid, primary key), name (text), tier (text, one of: core, regular, pool, visitor, archived), archetype (text), clean_time_start (date, used to calculate current clean time dynamically), voice (text, speech pattern description), wound (text, core trauma), contradiction (text, blind spot), quirk (text, behavioral tell), color (text, hex code), avatar (text, 1-2 letters), meeting_count (integer, default 0), created_at (timestamptz), last_seen_at (timestamptz), status (text, one of: active, relapsed, archived), profile_evolved (jsonb, tracks changes over time), intro_style (text, nullable, for random characters).

Table: users. Columns: id (uuid, primary key, matches Supabase Auth user ID), display_name (text), clean_time (text, self-reported), meeting_count (integer, default 0), first_meeting_at (timestamptz, nullable), last_meeting_at (timestamptz, nullable), preferences (jsonb, default empty object), is_anonymous (boolean, default false).

Table: meetings. Columns: id (uuid, primary key), user_id (uuid, foreign key to users), meeting_type (text, default "general"), topic (text), user_mood (text, the mood selected during setup), user_mind (text, nullable, the "what's on your mind" text from setup), listening_only (boolean, default false), started_at (timestamptz), ended_at (timestamptz, nullable), summary (text, nullable), notable_moments (jsonb, nullable), in_world_date (date, simulated timeline).

Table: meeting_participants. Columns: meeting_id (uuid, foreign key to meetings), character_id (uuid, foreign key to characters), role (text, one of: chair, active_sharer, quiet_presence), shares_count (integer, default 0). Primary key is the composite of meeting_id and character_id.

Table: shares. Columns: id (uuid, primary key), meeting_id (uuid, foreign key to meetings), character_id (uuid, foreign key to characters, nullable for user shares), is_user_share (boolean), content (text), interaction_type (text, one of: standard, respond_to, disagree, parallel_story, expand, crosstalk, callback), target_character_id (uuid, nullable), significance_score (integer, 1-10), heavy_topic_tags (text array), sequence_order (integer), created_at (timestamptz).

Table: callbacks. Columns: id (uuid, primary key), origin_share_id (uuid, foreign key to shares), character_id (uuid, foreign key to characters), original_text (text), callback_type (text, one of: self_deprecation, quirk_habit, catchphrase, absurd_detail, physical_behavioral, room_meta), scope (text, one of: character, room), potential_score (integer, 1-10), times_referenced (integer, default 0), last_referenced_at (timestamptz, nullable), status (text, one of: active, stale, retired, legend), parent_callback_id (uuid, nullable, links evolved variants to original).

Indexes: shares(meeting_id), shares(character_id), shares(significance_score), callbacks(character_id, status), callbacks(scope, status), meeting_participants(meeting_id), meeting_participants(character_id).

### Meeting Flow Phases

The meeting progresses through these phases in order. Each phase is a distinct UI state and a distinct set of API calls.

Phase 1 â€” Setup. Four screens: name entry, clean time selection, mood selection, optional "what's on your mind" textarea. User can also choose "just listening" mode. Every setup screen displays a small, persistent crisis link at the bottom: "In crisis? 988" in subdued red text. This is entirely client-side; no API calls until "Join Meeting" is pressed.

Phase 2 â€” Opening. The meeting begins. An empty chair message appears: "This chair stays empty for everyone who couldn't make it tonight â€” and everyone who didn't make it at all." Marcus (the chair) opens with a welcome that names the user and acknowledges their mood or status. A moment of silence follows (displayed as "â€” moment of silence â€”" system message with a 3-second pause). Chrystal pulls out a folded paper (displayed as an action: "Chrystal pulls out a folded paper") and reads a short, original, hard-hitting recovery reading (not from AA/NA literature â€” generated fresh each meeting, tone is street wisdom and accountability, not soft inspiration).

Phase 3 â€” Introductions. Characters introduce in fixed order: Marcus, Heather, Meechie, Gemini, Gypsy, Chrystal, then both random characters. Each gets 1-2 sentences generated via the introduction prompt template. After each introduction, there is a 50% chance the system displays "Hi [name]" as a group response. The user then introduces themselves â€” the text is auto-generated from their setup info: "I'm [name]. I'm an addict. [clean time]." If the user selected one of the newcomer clean times ("This is my first meeting", "Less than a week", "I'm not clean right now"), either Marcus or Heather (50/50 chance) gives a brief, warm, non-generic welcome â€” one sentence with a physical action.

Phase 4 â€” Topic Selection. Marcus asks what people want to talk about. The user sees the topic list and picks one. Marcus acknowledges it and opens discussion.

Phase 5 â€” Sharing Round 1. The first two characters from the shuffled speaking order share on the topic. After the first share, there is a 40% chance of a brief crosstalk reaction from the second character (one sentence â€” agreement like "Facts." or "That's real.", a question, or mild pushback). Then the second character gives their full share. If the user is not in listening-only mode, they are prompted: "What comes up for you?" with a "Share" button and a "Pass" button. If they share crisis content, the meeting immediately enters crisis mode (Phase 8). If they share content containing heavy topic keywords, the room responds with weight: a system action "â€” silence in the room â€”" appears, followed by Marcus acknowledging the share directly with a physical action and 1-2 sentences. If the share is not heavy, there is a 50% chance a random character from the first three in speaking order says a brief acknowledgment like "That's real."

Phase 6 â€” Sharing Round 2. The next two characters from the speaking order share, responding to what has been said. If the user shared something in Round 1 that matches the parallel story keyword mapping (see Parallel Story Detection above), the matching character is swapped into this round's first slot even if they were not next in the speaking order. The first character in this round shares normally or tells a parallel story if swapped in. The second character either responds to the previous share (60% chance) or pushes back and disagrees (40% chance). After both shares, if the user is not in listening-only mode, a randomly selected character from the first four in the speaking order asks the user a direct question about how the topic lands for them. The user responds or passes. The prompt text for this phase is "How does this land?"

Phase 7 â€” Sharing Round 3. The last two characters from the speaking order share. If the user has shared substantively at least twice (shares that were not passes), either Meechie or Marcus (50/50 chance) asks "the hard question" â€” the one nobody else will ask, specific to what the user has said, not cruel but direct. Examples of the tone: "Are you actually working a program or just coming to meetings?" or "You keep talking about them. What's your part in it?" or "When's the last time you were honest with yourself?" If the user is in listening-only mode or has not shared twice, the hard question is skipped. Marcus then asks the user if there is anything else before closing. The prompt text for this phase is "Anything else before we close?" The user responds or passes, and the meeting moves to closing.

Phase 8 â€” Crisis Mode (conditional). If crisis keywords are detected in user input at any point, the meeting immediately shifts. The room goes quiet (UI displays "â€” room goes quiet â€”"). Marcus speaks first â€” stops the meeting energy, shares that he has been there too, does not panic or get clinical. Heather speaks second â€” shares her own moment of feeling the same way, specific but not graphic. A resource panel appears with 988 Suicide & Crisis Lifeline and 1-800-662-4357 SAMHSA helpline. Marcus asks: "[name], you don't gotta say anything else. But we ain't going nowhere. What do you need right now?" The user can respond or the meeting transitions to closing. During crisis mode: no humor, no callbacks, no crosstalk from other characters. The tone shifts to focused support. The crisis resource panel stays visible for the remainder of the session. All other characters are silent unless directly relevant.

Phase 9 â€” Closing. If the user shared something in the final prompt, Marcus acknowledges it briefly (1 sentence, with weight if heavy). Then Marcus delivers the closing: thanks everyone, specifically acknowledges the user for showing up, says "What we share here stays here," includes a physical action. After Marcus, one other character says something personal and welcoming to the user â€” either Heather or the first character in the speaking order (50/50 chance). The system displays "â€” Keep coming back â€”" as a highlighted system message and the meeting phase changes to "done."

Phase 10 â€” Post-Meeting. The UI shows "Meeting's over. You showed up." with two buttons: "Meeting reflection" and "New meeting." If the user clicks "Meeting reflection," a modal appears with a loading indicator while the reflection generates. The reflection content depends on whether the user shared. If the user shared substantively (at least one non-pass share), the reflection includes: what you shared (brief summary), themes noticed (2-3 sentences), a question to sit with before next meeting, and one piece of real talk from Marcus or Heather's perspective. If the user only listened (all passes or listening-only mode), the reflection says: "You listened today. Sometimes that's exactly what we need. The room held space for you, and you were here. That matters. If there's something you wanted to say but couldn't, it'll still be there next time. Keep coming back." The post-meeting phase also triggers background jobs: callback scanning (scan all shares for callback material), memory scoring (assign significance scores), character memory updates (generate 2-sentence summaries per character), and meeting summary generation.

### Expand Feature

At any point during sharing, the user can click "Tell me more" on any character's share. This triggers a new API call that generates an expanded version (8-10 sentences instead of 3-4) of that character's share, going deeper into the topic. The expanded share replaces the original in the UI. This is a core UX affordance and a token-cost lever â€” most shares are short, expanded shares cost more but provide depth on demand.

## Plan of Work

### Milestone 0: Bootstrap and Reality Probes

This milestone creates the repository and proves three things that could kill the project before any application code is written. It is labeled "prototyping" â€” the purpose is to de-risk unknowns, not to build features.

Probe 1: SSE streaming on Vercel. Create a minimal SvelteKit project with one +server.ts endpoint that streams five chunks of text via Server-Sent Events with 500ms delays between chunks. Deploy to Vercel. Verify that all five chunks arrive in the browser without buffering or timeout. This proves that Vercel's edge/serverless runtime supports the per-share streaming pattern the meeting flow requires. If chunks arrive batched (all at once after the function completes), the streaming approach needs adjustment â€” likely switching to short-lived per-share streams rather than one long meeting stream.

Probe 2: Grok voice quality. Using a local script that calls the xAI Responses API directly, generate ten shares for Marcus using the full character prompt template (defined later in this document). Evaluate each share manually against three criteria: does it sound like Marcus (measured, starts with "Now" or "See," speaks in stories)? Does it contain any therapy-speak from the blocklist? Is it 3-4 sentences? Record the pass rate. If fewer than seven out of ten pass, the prompt template needs iteration before proceeding. This probe also captures the actual response format from grok-4-1-fast-reasoning for use as fixtures.

Probe 3: Supabase query patterns. Create the six tables in a Supabase project. Insert seed data: two meetings, ten shares with varying significance scores, three callbacks. Execute the memory retrieval query: "select all shares with significance_score >= 7, plus all shares with significance_score >= 6 where the share's meeting involved user X, plus all shares from the last three meetings, ordered by meeting date and sequence order." Verify the query returns the expected rows in under 200ms. This proves the relational schema supports the dual-track memory retrieval at acceptable latency.

The deliverable for this milestone is a working SvelteKit skeleton with Vitest configured, three probe scripts in a `probes/` directory, and the results recorded in Surprises & Discoveries. If any probe fails, the Decision Log records the adjustment and the relevant milestone later in the plan is updated.

Begin by creating the project:

    cd ~
    pnpm create svelte@latest the-14th-step
      # Select: Skeleton project
      # Select: Yes to TypeScript
      # Select: Yes to ESLint, Prettier, Vitest
    cd the-14th-step
    pnpm install
    pnpm add -D @types/node
    pnpm add @supabase/supabase-js
    git init
    git add .
    git commit -m "init: SvelteKit skeleton"

Then create the directory structure:

    mkdir -p src/lib/core
    mkdir -p src/lib/seams/{grok-ai,database,auth,uuid,clock}/{fixtures}
    mkdir -p src/lib/server/seams/{grok-ai,database,auth}
    mkdir -p src/lib/observability
    mkdir -p tests/{e2e,composition}
    mkdir -p supabase/migrations
    mkdir -p probes

Create the seam registry at the repository root:

    # File: seam-registry.json
    {
      "seams": [
        {
          "name": "grok-ai",
          "type": "io",
          "contract": "src/lib/seams/grok-ai/contract.ts",
          "probe": "src/lib/seams/grok-ai/probe.ts",
          "fixtures": "src/lib/seams/grok-ai/fixtures/",
          "mock": "src/lib/seams/grok-ai/mock.ts",
          "tests": "src/lib/seams/grok-ai/contract.test.ts",
          "adapter": "src/lib/server/seams/grok-ai/adapter.ts",
          "freshnessDays": 7,
          "idempotent": true,
          "dataClassification": "public"
        },
        {
          "name": "database",
          "type": "io",
          "contract": "src/lib/seams/database/contract.ts",
          "probe": "src/lib/seams/database/probe.ts",
          "fixtures": "src/lib/seams/database/fixtures/",
          "mock": "src/lib/seams/database/mock.ts",
          "tests": "src/lib/seams/database/contract.test.ts",
          "adapter": "src/lib/server/seams/database/adapter.ts",
          "freshnessDays": 7,
          "idempotent": false,
          "dataClassification": "sensitive"
        },
        {
          "name": "auth",
          "type": "io",
          "contract": "src/lib/seams/auth/contract.ts",
          "probe": "src/lib/seams/auth/probe.ts",
          "fixtures": "src/lib/seams/auth/fixtures/",
          "mock": "src/lib/seams/auth/mock.ts",
          "tests": "src/lib/seams/auth/contract.test.ts",
          "adapter": "src/lib/server/seams/auth/adapter.ts",
          "freshnessDays": 7,
          "idempotent": true,
          "dataClassification": "sensitive"
        },
        {
          "name": "uuid",
          "type": "pure",
          "contract": "src/lib/seams/uuid/contract.ts",
          "fixtures": "src/lib/seams/uuid/fixtures/",
          "mock": "src/lib/seams/uuid/mock.ts",
          "tests": "src/lib/seams/uuid/contract.test.ts",
          "adapter": "src/lib/seams/uuid/adapter.ts",
          "freshnessDays": null,
          "idempotent": true,
          "dataClassification": "public"
        },
        {
          "name": "clock",
          "type": "pure",
          "contract": "src/lib/seams/clock/contract.ts",
          "fixtures": "src/lib/seams/clock/fixtures/",
          "mock": "src/lib/seams/clock/mock.ts",
          "tests": "src/lib/seams/clock/contract.test.ts",
          "adapter": "src/lib/seams/clock/adapter.ts",
          "freshnessDays": null,
          "idempotent": true,
          "dataClassification": "public"
        }
      ]
    }

Create the `.env.example` file at the repository root:

    # .env.example â€” copy to .env and fill in real values
    XAI_API_KEY=your_xai_api_key_here
    PUBLIC_SUPABASE_URL=https://your-project.supabase.co
    PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
    SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

Run the test suite to confirm the skeleton is healthy:

    pnpm test

Expected output: 0 tests, 0 failures. The project builds and the dev server starts with `pnpm dev`.

### Milestone 1: Seam Contracts, Mocks, and Contract Tests

This milestone defines the contract for every seam, creates fixture-backed mocks, and writes contract tests that prove the system can represent both success and failure states before any real adapter exists. No I/O happens in this milestone. Everything is pure TypeScript.

Start with the shared types. In `src/lib/core/types.ts`, define the Result envelope type, the error taxonomy, and all domain types (Character, Meeting, Share, Callback, User, MeetingParticipant, ShareInteractionType, CallbackType, CallbackScope, CallbackStatus, CharacterTier, CharacterStatus, MeetingPhase, SignificanceScore). Every type used anywhere in the project is defined here.

The Result type is a discriminated union: `Result<T>` is either `{ ok: true, value: T }` or `{ ok: false, error: { code: ErrorCode, message: string, details?: unknown } }`. ErrorCode is a string union of INPUT_INVALID, NOT_FOUND, RATE_LIMITED, UPSTREAM_UNAVAILABLE, UPSTREAM_ERROR, CONTRACT_VIOLATION, UNAUTHORIZED, and UNEXPECTED.

Then, for each seam, follow the six-step artifact workflow from Seam-Driven Development:

The grok-ai seam contract defines two operations. `generateShare` accepts a system prompt (string), a user prompt (string), and an optional streaming flag (boolean, default false), and returns `Result<{ text: string, usage: { inputTokens: number, outputTokens: number } }>`. `generateShareStream` accepts the same inputs and returns `Result<ReadableStream<string>>` (a stream of text chunks). Error codes specific to this seam: RATE_LIMITED (429 from xAI), UPSTREAM_UNAVAILABLE (network/timeout), UPSTREAM_ERROR (non-429 HTTP errors), CONTRACT_VIOLATION (response shape does not match expected format), INPUT_INVALID (empty prompt or invalid parameters).

The database seam contract defines operations for each table: `getCharactersByTier`, `getCharacterById`, `upsertCharacter`, `createMeeting`, `getMeeting`, `getMeetingsByUser`, `addParticipant`, `createShare`, `getSharesByMeeting`, `getSharesBySignificance` (the heavy memory query), `getRecentMeetingShares` (last N meetings for a character), `createCallback`, `getActiveCallbacks` (filtered by scope and status), `incrementCallbackReference`, `updateCallbackStatus`, `getOrCreateUser`, `updateUser`. Each returns the appropriate Result type.

The auth seam contract defines: `signUp` (email, password, displayName) returns `Result<{ userId: string, session: Session }>`, `signIn` (email, password) returns `Result<{ userId: string, session: Session }>`, `signOut` returns `Result<void>`, `getSession` (cookies) returns `Result<{ userId: string } | null>`. Error codes: UNAUTHORIZED, INPUT_INVALID, UPSTREAM_ERROR.

The uuid seam contract defines: `generate` returns `Result<string>`. The mock returns a deterministic sequence of UUIDs for testing.

The clock seam contract defines: `now` returns `Result<Date>`. The mock returns a fixed date for deterministic testing.

For each I/O seam, write a probe script that calls the real service and dumps the response as `sample.json` (happy path) and `fault.json` (error case, such as invalid API key for grok-ai or nonexistent record for database). The probe records `probedAt` and `environment` in each fixture.

For each seam, write a mock that reads the fixture files and returns them exactly. Zero transformation logic in mocks.

For each seam, write contract tests that prove three things: (a) the fixture files validate against the contract's schema, (b) the mock returns the fixture data exactly, and (c) the negative proof â€” the fault fixture produces an `ok: false` result through the mock. The negative proof must pass before any adapter exists.

After all contract tests are written, run:

    pnpm test

Expected output: all contract tests pass. The count will depend on implementation but expect roughly 20-30 tests across all seams.

### Milestone 2: Domain Core

This milestone implements the pure business logic of the meeting. No I/O. No imports from `src/lib/server/`. Everything in `src/lib/core/` is testable with mock seams only.

In `src/lib/core/meeting.ts`, implement the meeting lifecycle functions. `createMeeting` accepts a user ID, a topic, and a seams bundle, generates a meeting ID via the uuid seam, records the meeting via the database seam, selects characters via `selectCharacters`, adds them as participants, and returns the meeting ID. `addShare` accepts a meeting ID, a character ID (or null for user), the share text, the interaction type, and a significance score, records it via the database seam, and returns the share. `closeMeeting` accepts a meeting ID, generates the summary via the grok-ai seam, updates the meeting record, and triggers post-meeting jobs (callback scanning, memory updates). `scoreSignificance` is a pure function that assigns a 1-10 score based on the rules described in the Context section: 10 for crisis content, 8 for heavy disclosure, 7 for connection/breakthrough moments, 6 for direct user responses or disagreements, 5 for first-time sharing, 3 for standard shares, 1 for brief crosstalk. The scoring uses the crisis and heavy keyword lists as inputs â€” it does not call any external service, it is pure pattern matching on the share text and interaction type.

In `src/lib/core/character-selector.ts`, implement `selectCharacters`. Given a user ID, the database seam, and the clock seam, it selects 6 core characters (always available), then fills remaining seats (to reach 8-10) from the regular and pool tiers, preferring characters who have not appeared in the last 2 meetings, and generates exactly 2 new visitor characters using the random character generation templates. Returns the full character list with assigned roles (marcus is always chair).

In `src/lib/core/prompt-templates.ts`, implement all prompt templates as pure functions that accept character data, meeting context, memory context, and callback context, and return formatted prompt strings. This file contains the exact prompt text for: character share generation, character introduction, crosstalk reaction, hard question, crisis response (Marcus), crisis response (Heather), meeting opening, meeting reading, topic acknowledgment, closing, goodbye, summary generation, and quality validation. Each template is a function, not a string constant, because it interpolates character-specific and context-specific data.

The quality validation prompt template is critical. It instructs Grok to evaluate a generated share against three criteria and return a JSON object with pass/fail and reasons. The three criteria are: (1) voice consistency â€” does the share match the character's documented speech patterns, sentence starters, and personality? (2) therapy-speak check â€” does the share contain any phrase or pattern from the blocklist? (3) authenticity â€” does the share use concrete, specific language rather than abstract or clinical language? The prompt includes the full therapy-speak blocklist inline so the AI has it in context.

In `src/lib/core/memory-builder.ts`, implement `buildPromptContext`. Given a character ID, a meeting ID, and the database seam, it queries for heavy memory (significance >= 7, plus >= 6 involving current user, plus last 3 meetings) and active callbacks relevant to this character and this room. It returns a structured object with heavy memory entries and callback entries, formatted as prompt-ready strings. This function calls the database seam but performs no other I/O.

In `src/lib/core/callback-scanner.ts`, implement `scanForCallbacks`. Given an array of shares from a completed meeting, it uses the grok-ai seam to ask Grok to identify callback-worthy moments in each share. The AI returns a JSON array of detected callback moments with their type (self_deprecation, quirk_habit, catchphrase, absurd_detail, physical_behavioral, room_meta), the original text, and a potential score (1-10). This function then records each detected callback via the database seam.

Unit tests for all domain core functions use mock seam bundles. Tests cover: meeting creation, share addition with correct significance scoring, character selection respecting tier rules, prompt template output containing expected character details, memory builder returning correctly filtered data, and callback scanner processing AI responses into database records.

Run:

    pnpm test

Expected output: all domain core tests pass alongside the contract tests from Milestone 1.

### Milestone 3: Prompt Engineering

This milestone is about getting Grok to produce character-voice shares that consistently pass AI-driven quality validation. It is iterative and may require multiple cycles.

Write the probe script for the grok-ai seam (`src/lib/seams/grok-ai/probe.ts`). This script calls the real xAI Responses API with the Marcus character prompt template and a sample topic ("Staying clean when everything falls apart"). It captures the response as `sample.json`. It also sends an invalid request (empty model field) and captures the error response as `fault.json`.

Run the probe:

    npx tsx src/lib/seams/grok-ai/probe.ts

This requires a real XAI_API_KEY in .env. The probe creates the fixture files.

Then run a voice quality test cycle. For each of the six core characters, generate five shares using the prompt template. For each share, run the quality validation prompt (also via the real API). Record the pass rate. The target is 7/10 or better for each character.

If the pass rate is below target, iterate on the prompt template. Common adjustments: adding 2-3 example lines per character in the prompt to anchor the voice, making the therapy-speak blocklist more prominent in the system prompt, adding explicit negative examples ("DO NOT write: 'I hear you.' DO write: 'Facts.'"), adjusting the instruction about sentence length and physical actions.

The deliverable for this milestone is: fixture files for the grok-ai seam populated with real API responses, a documented pass rate for each character, and a prompt template that achieves the target quality. The pass rate and any template adjustments are recorded in Surprises & Discoveries.

### Milestone 4: Real Adapters

This milestone replaces mocks with real adapters for all I/O seams. Each adapter validates inputs and outputs against the contract, maps upstream errors to the shared error taxonomy, and returns the standard result envelope.

The grok-ai adapter (`src/lib/server/seams/grok-ai/adapter.ts`) calls POST https://api.x.ai/v1/responses with the model set to "grok-4-1-fast-reasoning." It reads the XAI_API_KEY from the environment. For non-streaming calls, it sends the request, parses the response, validates the output against the contract schema, and returns `{ ok: true, value: { text, usage } }`. For streaming calls, it sends the request with `"stream": true`, returns a ReadableStream that yields text chunks, and validates the final assembled text against the contract schema. It maps HTTP 429 to RATE_LIMITED, network errors to UPSTREAM_UNAVAILABLE, other HTTP errors to UPSTREAM_ERROR, and schema mismatches to CONTRACT_VIOLATION. It sets the x-grok-conv-id header to a stable UUID per meeting to improve cache hits on the system prompt.

The database adapter (`src/lib/server/seams/database/adapter.ts`) uses the Supabase client with the service role key (for server-side operations that bypass Row Level Security). Each method maps to a Supabase query. The adapter validates that query results match the contract's expected types before returning them. Supabase errors are mapped to the taxonomy: PGRST116 (not found) maps to NOT_FOUND, authentication failures to UNAUTHORIZED, constraint violations to INPUT_INVALID, network errors to UPSTREAM_UNAVAILABLE.

The auth adapter (`src/lib/server/seams/auth/adapter.ts`) uses the Supabase Auth client. `signUp` calls `supabase.auth.signUp`, `signIn` calls `supabase.auth.signInWithPassword`, `signOut` calls `supabase.auth.signOut`, and `getSession` calls `supabase.auth.getSession` using the request cookies. Each method validates the response and maps errors to the taxonomy.

Write the SQL migration files in `supabase/migrations/`. Each migration has an up script (creates/alters tables) and a down script (reverses the change). The first migration creates all six tables with their columns, indexes, and foreign keys as specified in the schema above. Run the migration against the Supabase project:

    npx supabase db push

Seed the database with the six core characters:

    npx tsx scripts/seed-characters.ts

This script inserts Marcus, Heather, Meechie, Gemini, Gypsy, and Chrystal with their full profiles, tier set to "core," and status set to "active."

Run the contract tests with real adapters (network calls stubbed at the HTTP level, not mocked at the seam level) to verify adapters conform to contracts:

    pnpm test

All tests pass including the new adapter-level contract tests.

### Milestone 5: UI and Meeting Flow

This milestone builds the SvelteKit routes and Svelte components that make the meeting work in a browser. After this milestone, a user can start a meeting on localhost and watch characters stream shares.

The conductor pattern is implemented in `src/hooks.server.ts`. On every request, it constructs the seam bundle using real adapters and attaches it to `event.locals.seams`. It also checks for an authenticated session via the auth seam and attaches the user ID to `event.locals.userId` (or null for unauthenticated requests).

The routes implement the meeting flow phases described in the Context section. The setup flow (name, clean time, mood, mind) is entirely client-side in `src/routes/+page.svelte`. When the user clicks "Join Meeting," a form action in `src/routes/+page.server.ts` calls `createMeeting` from the domain core, which selects characters, creates the meeting record, and returns a meeting ID. The user is redirected to `/meeting/[id]`.

The meeting page (`src/routes/meeting/[id]/+page.svelte`) loads the meeting state and characters from the server. It renders the meeting circle (character avatars in a row, with the speaking character highlighted), the message feed (scrollable, auto-scrolls to bottom), and the input area (which changes based on the current phase).

Character shares are generated via the SSE endpoint at `/meeting/[id]/share/+server.ts`. The client opens an EventSource connection to this endpoint, which generates one share at a time. The server calls the grok-ai seam's streaming operation, pipes the text chunks to the SSE response, and after the share is complete, runs the quality validation prompt. If validation fails, the share is regenerated (up to two retries). The validated share is saved to the database via the database seam, and the significance score is calculated and stored.

The user share endpoint at `/meeting/[id]/user-share/+server.ts` receives the user's text via POST, checks for crisis keywords (if detected, returns a crisis flag and the meeting enters crisis mode), checks for heavy topic keywords (returns a heavy flag), saves the share to the database, and returns the result.

The expand endpoint at `/meeting/[id]/expand/+server.ts` receives a share ID via POST, loads the share's character and context, generates an expanded 8-10 sentence version, validates it, and returns the expanded text.

The close endpoint at `/meeting/[id]/close/+server.ts` triggers the post-meeting jobs: generates the meeting summary, scans all shares for callback material (via the callback scanner), generates character memory summaries, and marks the meeting as closed.

Svelte components: MeetingCircle (character avatars), ShareMessage (individual share with character info and expand button), SystemMessage (announcements, empty chair, crisis resources), UserInput (textarea with share/pass buttons), SetupFlow (the four setup screens), MeetingReflection (post-meeting summary modal).

The UI uses Tailwind CSS for styling. The color palette is dark (gray-900 background, gray-800 cards) with amber/orange accents, matching the existing artifact's aesthetic. Mobile-responsive: the meeting circle wraps on small screens, the input area is fixed to the bottom, and touch targets are at least 44px.

After this milestone, start the dev server:

    pnpm dev

Navigate to http://localhost:5173. Create an account, fill in setup, join a meeting. Characters stream shares. The user can share, pass, expand, and close the meeting.

### Milestone 6: Dual-Track Memory System

This milestone makes characters remember. After completing two meetings, characters reference past events and the user's previous shares.

The heavy memory track is implemented by the memory builder (`src/lib/core/memory-builder.ts`), which queries the database for shares matching the retrieval rules (significance >= 7, plus >= 6 involving current user, plus last 3 meetings). The results are formatted into a prompt context block that is injected into every character's share prompt.

The prompt template for share generation is updated to include a "YOUR HISTORY" section (heavy memory entries for this character), a "CONTINUITY NOTES" section (user's previous shares and attendance count), and a "MEETING CONTEXT" section (current topic, recent shares). The prompt instructs the character to weave in references to past events naturally, not forced.

The callback detection system runs post-meeting. The callback scanner sends all shares from the completed meeting to Grok with a prompt asking it to identify callback-worthy moments (the six categories described in Context). Grok returns a JSON array of detected callbacks with types and potential scores. These are saved to the callbacks table.

Verification: run two meetings back to back. In the first meeting, at least one character should say something that gets tagged as callback material (the scan runs after meeting 1 closes). In the second meeting, verify that the memory builder includes the callback in the prompt context. Whether the character actually uses it depends on the probability roll (Milestone 7), but the data must be present in the prompt.

Run tests:

    pnpm test

Expect new tests covering: memory builder returns correct shares for the retrieval rules, callback scanner parses AI response into correct database records, prompt templates include memory and callback sections when data exists.

### Milestone 7: Callback Engine

This milestone implements the conditional callback probability matrix that makes callbacks feel organic rather than forced.

The probability matrix is a pure function in `src/lib/core/callback-engine.ts` called `shouldIncludeCallback`. It accepts the callback record, the current character, the current meeting context, and the user's latest share (if any). It returns a boolean (include or not) based on these rules:

Baseline for any relevant callback: 40% chance. If the callback's originating character is the one currently speaking (they are referencing their own past moment): 55% chance. If the current character is known for callbacks (Meechie, or any character with 3+ originated callbacks): 55% chance. If the current character is new (fewer than 3 meetings attended): 10% chance â€” they do not know the lore yet. If the user's latest share references something callback-able (keyword overlap with callback text): 90% chance â€” characters respond to openings. If the callback has not been used in 5+ meetings: 65% chance â€” bringing it back. If the callback was used last meeting: 15% chance â€” do not force it. If the callback's status is "stale" (12+ references with no evolution): 5% chance. If the callback's status is "legend" (retired then revived): 30% chance â€” rare but meaningful.

These probabilities are checked in order of specificity. The most specific matching rule wins. If multiple rules match at the same specificity level, use the highest probability.

When a callback is included, the prompt template adds it to the "CALLBACK OPPORTUNITIES THIS MEETING" section of the character's prompt, with the original text and context. The prompt instructs the character to reference the callback naturally â€” not to quote it verbatim but to riff on it, evolve it, or react to it.

After each meeting, the callback lifecycle is updated: `times_referenced` increments for each callback that was actually included in a character's share. Callbacks that reach 12 references without evolution move to "stale" status. Callbacks unused for 15+ meetings move to "retired." The scope field updates from "character" to "room" when a different character references the callback for the first time.

The callback engine also handles callback evolution. If the quality validation AI detects that a character has added a new dimension to an existing callback (flipped the joke, extended the reference), a new callback record is created with `parent_callback_id` linking it to the original. The original's lifecycle continues independently.

Tests: the `shouldIncludeCallback` function is pure and fully testable. Test cases cover every rule in the matrix. Integration test: run three meetings sequentially with mock seams that return fixture data; verify that callback inclusion patterns match the probability rules.

### Milestone 8: Crisis Response System

This milestone implements the full crisis response behavior. This is safety-critical for a public recovery app and must be thorough.

Crisis detection is already implemented as a keyword match in the domain core (Milestone 2). This milestone builds the response system on top of it.

When the user-share endpoint detects crisis keywords, it returns `{ crisis: true }` to the client. The client immediately transitions to crisis mode, which changes the UI state:

The input area placeholder changes to "Take your time. We're here." All pending share generation is cancelled â€” no more characters speak on topic. The message feed displays "â€” room goes quiet â€”" as a system message. After a 2-second pause, Marcus's crisis response is generated via the grok-ai seam using the crisis response prompt template (Marcus variant). After Marcus speaks, Heather's crisis response is generated (Heather variant). A resource panel appears below the shares: a styled box with red/dark background containing the text "If you're in crisis:" followed by "988 â€” Suicide & Crisis Lifeline" and "1-800-662-4357 â€” SAMHSA" and "You can stay here with us." This panel stays visible for the rest of the session. Marcus then asks: "[name], you don't gotta say anything else. But we ain't going nowhere. What do you need right now?"

The user can respond or close. If they respond, their response is saved (significance score 10, tagged as crisis). Marcus acknowledges briefly, then the meeting moves to closing. No humor, no callbacks, no crosstalk during or after crisis mode.

The crisis resource panel is a Svelte component that renders regardless of scroll position (fixed or sticky). It does not disappear when the user scrolls. It remains visible even after the meeting closes.

If crisis keywords are detected during setup (in the "what's on your mind" field), the meeting still starts normally but the crisis flag is set from the beginning. Marcus's opening acknowledges whatever is on the user's mind with extra care. The crisis resource panel is visible from the start.

Tests: crisis detection returns true for all keywords in the list. The meeting flow correctly transitions to crisis mode. The resource panel renders. No callbacks or humor are generated during crisis mode.

### Milestone 9: CI Pipeline and Governance

This milestone adds the automated verification pipeline that catches contract violations, stale fixtures, and governance failures.

Create a `verify` script in package.json that runs the following checks in sequence: (1) lint (eslint), (2) type check (svelte-check), (3) fixture freshness â€” for every I/O seam in the seam registry, check that `probedAt` in the fixture files is within `freshnessDays` of today; fail if stale, (4) contract tests â€” run all `*.contract.test.ts` files, (5) domain core tests â€” run all tests in `src/lib/core/`, (6) composition tests â€” run all tests in `tests/composition/` that exercise full meeting workflows with mock seam bundles including at least one failure scenario per seam, (7) end-to-end tests â€” run Playwright tests that simulate a full meeting in a browser.

The composition tests in `tests/composition/` build a complete seam bundle from mocks, run the meeting workflow end to end (create meeting, generate shares for all characters, add user share, close meeting), and verify: the meeting record exists with correct data, all shares have significance scores, the callback scanner was invoked, the memory builder returns data for the second meeting. They also inject failures: the grok-ai mock returns RATE_LIMITED for one share, and the workflow retries. The database mock returns UPSTREAM_UNAVAILABLE for one query, and the workflow handles it gracefully (logs the error, continues with available data).

The Playwright end-to-end tests in `tests/e2e/` start the dev server, navigate to the app, fill in the setup flow, join a meeting, verify that characters stream shares (at least one share appears within 30 seconds), type a user share and submit it, verify the meeting closes, and verify the post-meeting reflection appears.

Run the full verification:

    pnpm verify

Expected output: all checks pass. The fixture freshness check reports the age of each I/O seam's fixtures.

### Milestone 10: Production Deploy

This milestone deploys the application to Vercel with a public URL.

Install the Vercel adapter:

    pnpm add -D @sveltejs/adapter-vercel

Update `svelte.config.js` to use the Vercel adapter. Set the runtime to "nodejs" (not "edge") for SSE streaming compatibility.

Set environment variables in the Vercel project dashboard: XAI_API_KEY, PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.

Push to the main branch. Vercel builds and deploys automatically.

Verify the deployment: navigate to the Vercel preview URL. Create an account. Join a meeting. Watch characters stream shares. The network tab shows SSE chunks arriving individually (not batched). Share something. The meeting responds. Close the meeting. View the reflection. Log out. Log back in. Start a new meeting. At least one reference to the previous meeting appears in a character's share or in the memory context (verifiable by checking the database).

After verification, promote the preview to production.

## Concrete Steps

This section lists exact commands. Working directory is the repository root unless noted. Commands below assume Linux (Bash).

    # Milestone 0: Bootstrap
    pnpm create svelte@latest the-14th-step
    cd the-14th-step
    pnpm install
    pnpm add -D @types/node vitest playwright @playwright/test
    pnpm add @supabase/supabase-js
    git init && git add . && git commit -m "init: skeleton"

    # Create directory structure
    mkdir -p src/lib/core
    mkdir -p src/lib/seams/{grok-ai,database,auth,uuid,clock}/fixtures
    mkdir -p src/lib/server/seams/{grok-ai,database,auth}
    mkdir -p src/lib/observability
    mkdir -p tests/{e2e,composition}
    mkdir -p supabase/migrations
    mkdir -p probes

    # Verify skeleton works
    pnpm test
    # Expected: 0 tests, 0 failures

    pnpm dev
    # Expected: dev server at localhost:5173, renders SvelteKit welcome page

    # Milestone 1: After writing contracts/mocks/tests
    pnpm test
    # Expected: ~25 contract tests pass (exact count depends on implementation)

    # Milestone 3: Run grok-ai probe
    npx tsx src/lib/seams/grok-ai/probe.ts
    # Expected: creates fixtures/sample.json and fixtures/fault.json

    # Milestone 4: Run Supabase migration
    npx supabase db push
    # Expected: "Applying migration... done"

    npx tsx scripts/seed-characters.ts
    # Expected: "Seeded 6 core characters"

    # Milestone 5: Full dev server test
    pnpm dev
    # Navigate to localhost:5173, create account, join meeting
    # Expected: characters stream shares within 30 seconds

    # Milestone 9: Full verification
    pnpm verify
    # Expected: lint âœ“, types âœ“, fixtures fresh âœ“, contract tests âœ“,
    #           core tests âœ“, composition tests âœ“, e2e tests âœ“

    # Milestone 10: Deploy
    pnpm add -D @sveltejs/adapter-vercel
    git push origin main
    # Vercel auto-deploys; verify at preview URL

## Validation and Acceptance

The application is considered complete when all of the following behaviors can be observed by a human:

First meeting flow: navigate to the production URL, create a new account with email and password, enter a name and mood, join a meeting. Within 30 seconds, eight AI characters (six core plus two random) and the user appear in the meeting circle. Characters stream shares one at a time with visible text appearing progressively (not all at once). The user can type a share and submit it. At least one character responds to what the user said. The meeting closes with Marcus thanking everyone. The post-meeting reflection appears and references what the user shared.

Memory persistence: start a second meeting with the same account. At least one character's share includes a reference to the first meeting (a memory from heavy memory track, or a callback, or a continuity note like "good to see you back"). This reference appears naturally in the share text, not as metadata.

Callback lifecycle: across three meetings, a moment tagged as callback material in meeting 1 is referenced by a character in meeting 2 or 3. The callback's `times_referenced` counter increments in the database.

Crisis response: in any meeting, type "I want to die" as a share. The room goes quiet. Marcus responds with support. Heather responds with personal experience. The 988 and SAMHSA resources appear and stay visible. No humor or callbacks appear after the crisis moment.

Expand feature: click "Tell me more" on any character's share. A longer version (8-10 sentences) replaces the original within 15 seconds.

Quality gate: across ten generated shares (observed during testing), zero contain therapy-speak phrases from the blocklist.

Authentication: log out and try to join a meeting. The app redirects to the login page. Create a second account with a different email. The second account has no meeting history and characters do not reference the first account's meetings.

CI pipeline: run `pnpm verify` in the repository. All checks pass. Deliberately modify a fixture's `probedAt` date to 30 days ago. Run `pnpm verify` again. The fixture freshness check fails.

## Idempotence and Recovery

All Supabase migrations have corresponding down scripts. Running `npx supabase db reset` drops and recreates all tables from migrations. The seed script checks for existing core characters before inserting (upsert behavior) and can be run multiple times safely.

The verify pipeline can be run repeatedly without side effects. Probe scripts write to fixture files (overwriting previous captures) and can be rerun.

If a Vercel deployment fails, the previous deployment remains live. Rollback by promoting the previous deployment in the Vercel dashboard.

If a meeting is interrupted mid-session (browser crash, network loss), the meeting record and all shares generated so far persist in the database. The user can start a new meeting; the interrupted meeting's data is still available for memory and callback purposes.

If the grok-ai seam returns errors during a meeting, the system retries up to two times with exponential backoff. If all retries fail, the share generation is skipped for that character and the meeting continues with remaining characters. The error is logged via the observability module.

## Artifacts and Notes

### Prompt Template: Character Share Generation (Reference)

This is the core prompt structure used for every character share. Variables in curly braces are interpolated at runtime.

    SYSTEM:
    You are {character.name} at a recovery meeting called The 14th Step.

    CHARACTER PROFILE:
    - Archetype: {character.archetype}
    - Clean time: {computed from character.clean_time_start and clock seam}
    - Voice: {character.voice}
    - Wound: {character.wound}
    - Contradiction: {character.contradiction}
    - Quirk: {character.quirk}

    VOICE EXAMPLES (anchor these patterns):
    {2-3 example lines specific to this character, stored in prompt-templates.ts}

    YOUR HISTORY:
    {heavy memory entries for this character, from memory-builder}

    ROOM CULTURE & CALLBACKS:
    {active callbacks relevant to this meeting, from memory-builder}

    YOUR ESTABLISHED QUIRKS:
    {callbacks of type quirk_habit or catchphrase originated by this character}

    CALLBACK OPPORTUNITIES THIS MEETING:
    {callbacks selected for inclusion by the probability matrix}

    MEETING CONTEXT:
    Topic: {meeting.topic}
    User: {user.display_name} ({user.clean_time}, {user.mood})
    {if user has previous meetings: "Returning for meeting #{user.meeting_count}"}
    {if user shared previously: "Last time they shared about: {summary}"}

    WHAT HAS BEEN SHARED:
    {last 3-4 shares as "Name: text" pairs}

    BEHAVIORAL INSTRUCTION: {one of: standard, respond_to [name], disagree_with [name], parallel_story, callback [specific callback]}

    RULES:
    - NO therapy speak. Specifically banned: {first 10 items from blocklist as examples}.
      If you catch yourself writing any of these, rewrite the sentence in plain language.
    - Real talk, specific details, dark humor OK
    - Include a physical action or quirk occasionally (*shifts in seat*, *takes a breath*)
    - Stay in character voice â€” match the speech patterns above
    - If a callback opportunity is listed, you may reference it naturally. Do not force it.
    - {if crisis_mode: "NO humor. NO callbacks. Supportive and direct only."}

    USER:
    Generate {character.name}'s share. {if expanded: "8-10 sentences, go deep." else: "3-4 sentences."}
    Output ONLY the share text. No labels, no quotation marks, no metadata.

### Prompt Template: Quality Validation (Reference)

    SYSTEM:
    You are a quality validator for a recovery meeting simulator. Your job is to evaluate a generated character share against three criteria. Return ONLY a JSON object.

    USER:
    Evaluate this share by {character.name} ({character.archetype}, voice: {character.voice}):

    "{generated_share_text}"

    CRITERIA:
    1. VOICE CONSISTENCY: Does this share match the character's documented speech patterns? Does it start with their typical sentence starters? Does the length and tone match their personality?
    2. THERAPY-SPEAK CHECK: Does this share contain ANY of these banned phrases or patterns?
       Banned phrases: {full blocklist}
       Banned patterns: sentences starting with "I want to acknowledge" or "I appreciate you sharing" or "Thank you for being vulnerable" or "It takes courage to"; any metaphorical use of "journey"; "boundaries" as abstract concept; "triggers" as a noun.
    3. AUTHENTICITY: Does the share use concrete, specific language? Or does it fall into abstract, clinical, or generic territory?

    Return JSON:
    {
      "pass": true/false,
      "voice_match": true/false,
      "therapy_speak_found": [] or ["phrase1", "phrase2"],
      "authenticity": true/false,
      "reasons": "brief explanation if failed"
    }

### SSE Streaming Pattern (Reference)

In the +server.ts endpoint for share generation, the streaming pattern follows this structure. The server creates a ReadableStream, opens the grok-ai streaming call, and pipes chunks to the SSE response. Each chunk is formatted as `data: {text}\n\n`. When the stream completes, the server sends `data: [DONE]\n\n`. The client uses EventSource to receive chunks and appends text to the current message as it arrives.

Important: set the response headers to `Content-Type: text/event-stream`, `Cache-Control: no-cache`, and `Connection: keep-alive`. On Vercel with the Node.js runtime, SSE streams work within the function duration limit (which is 60 seconds on the Hobby plan, 300 seconds on Pro). Each share stream should complete well within 30 seconds. If the function approaches timeout, the stream is closed gracefully.

## Interfaces and Dependencies

### External Dependencies

    @supabase/supabase-js     # Supabase client for database and auth
    @sveltejs/adapter-vercel  # Vercel deployment adapter (dev dependency)
    vitest                    # Test runner (dev dependency)
    playwright                # End-to-end testing (dev dependency)
    @playwright/test          # Playwright test utilities (dev dependency)

No other external dependencies are required. The xAI API is called via native `fetch` â€” no SDK needed. Tailwind CSS is included with SvelteKit's default setup.

### Key Interfaces (TypeScript)

In `src/lib/core/types.ts`, the following types must exist at the end of Milestone 1:

    type Result<T> =
      | { ok: true; value: T }
      | { ok: false; error: { code: ErrorCode; message: string; details?: unknown } };

    type ErrorCode =
      | 'INPUT_INVALID'
      | 'NOT_FOUND'
      | 'RATE_LIMITED'
      | 'UPSTREAM_UNAVAILABLE'
      | 'UPSTREAM_ERROR'
      | 'CONTRACT_VIOLATION'
      | 'UNAUTHORIZED'
      | 'UNEXPECTED';

    interface GrokAiSeam {
      generateShare(system: string, user: string): Promise<Result<{ text: string; usage: { inputTokens: number; outputTokens: number } }>>;
      generateShareStream(system: string, user: string): Promise<Result<ReadableStream<string>>>;
    }

    interface DatabaseSeam {
      getCharactersByTier(tier: CharacterTier): Promise<Result<Character[]>>;
      getCharacterById(id: string): Promise<Result<Character>>;
      upsertCharacter(char: Partial<Character> & { id: string }): Promise<Result<Character>>;
      createMeeting(meeting: Omit<Meeting, 'id'>): Promise<Result<Meeting>>;
      getMeeting(id: string): Promise<Result<Meeting>>;
      getMeetingsByUser(userId: string, limit: number): Promise<Result<Meeting[]>>;
      addParticipant(p: MeetingParticipant): Promise<Result<MeetingParticipant>>;
      createShare(share: Omit<Share, 'id'>): Promise<Result<Share>>;
      getSharesByMeeting(meetingId: string): Promise<Result<Share[]>>;
      getSharesBySignificance(userId: string, minScore: number, limit: number): Promise<Result<Share[]>>;
      getRecentMeetingShares(characterId: string, meetingCount: number): Promise<Result<Share[]>>;
      createCallback(cb: Omit<Callback, 'id'>): Promise<Result<Callback>>;
      getActiveCallbacks(scope: CallbackScope | null, characterId: string | null): Promise<Result<Callback[]>>;
      incrementCallbackReference(id: string): Promise<Result<Callback>>;
      updateCallbackStatus(id: string, status: CallbackStatus): Promise<Result<Callback>>;
      getOrCreateUser(userId: string, defaults: Partial<User>): Promise<Result<User>>;
      updateUser(userId: string, updates: Partial<User>): Promise<Result<User>>;
    }

    interface AuthSeam {
      signUp(email: string, password: string, displayName: string): Promise<Result<{ userId: string; session: AuthSession }>>;
      signIn(email: string, password: string): Promise<Result<{ userId: string; session: AuthSession }>>;
      signOut(): Promise<Result<void>>;
      getSession(cookies: Cookies): Promise<Result<{ userId: string } | null>>;
    }

    interface UuidSeam {
      generate(): Result<string>;
    }

    interface ClockSeam {
      now(): Result<Date>;
    }

    interface SeamBundle {
      grokAi: GrokAiSeam;
      database: DatabaseSeam;
      auth: AuthSeam;
      uuid: UuidSeam;
      clock: ClockSeam;
    }

These interfaces are the contracts. Mocks implement them with fixture data. Adapters implement them with real I/O. Workflows accept `{ seams: SeamBundle }` as a parameter. Tests pass mock bundles. The conductor in hooks.server.ts passes real adapter bundles.

---

Revision note (2026-02-15): Initial creation of ExecPlan. Fuses the Recovery Meeting Simulator design spec, Seam-Driven Development guide with hexagonal architecture, the autonomous coding ExecPlan format (PLANS.md), and the official xAI grok-4-1-fast-reasoning API specifications into a single self-contained document. All decisions from the design conversation are recorded in the Decision Log. The full React artifact source code has been analyzed and all data (characters, topics, keywords, archetypes, meeting flow phases) is embedded directly in this plan.


Revision note (2026-02-15, setup alignment): Added AGENTS.md + PLANS.md repository wiring, created canonical ExecPlan path at plans/the-14th-step-execplan.md, clarified Linux (Bash) command assumptions, and resolved character-count inconsistencies (always two random characters per meeting).

Revision note (2026-02-15, Codex): Updated Progress, Surprises & Discoveries, Decision Log, and Outcomes & Retrospective to capture Milestone 0 scaffolding completion status, local SSE probe evidence, environment blockers (credentials, ESLint stall), and implementation location decisions.

Revision note (2026-02-15, Codex env/deploy update): Added explicit environment prerequisites, CLI strategy (`npx vercel`, `npx supabase`), and corresponding discoveries/decisions so deployment can run end-to-end without global installs.

Revision note (2026-02-16, Codex milestone-1): Recorded completion of Milestone 1 by adding runtime validators, fixture-backed seam mocks, and passing contract tests for all current seams; updated discoveries and outcomes with isolated-worktree install behavior and strict TypeScript validator constraints.

Revision note (2026-02-16, Codex milestone-2 start): Recorded initial Milestone 2 implementation for `meeting.ts` lifecycle and significance scoring with dedicated tests, and clarified the remaining Milestone 2 modules still pending.

Revision note (2026-02-16, Codex milestone-2/3 complete): Marked Milestones 2 and 3 complete after adding remaining domain-core modules/tests and running live xAI probe + quality-cycle scripts; also documented fixture-separation and env-loading decisions from live execution.

Revision note (2026-02-16, Codex milestone-4 complete): Recorded completion of Milestone 4 after parallel subagent implementation of real adapters (grok-ai/database/auth), integrated seam-bundle hooks wiring, and green full check/unit verification.
