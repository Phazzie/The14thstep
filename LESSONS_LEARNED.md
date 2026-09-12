# Lessons Learned

This file captures practical lessons we want future work to reuse.

## 2026-03-19 (Restore Planning)

### Process

- **A feel-heavy restore plan still has to be brutally concrete**: If the plan hand-waves schema, persistence, or route validation details, the executing agent will fill those gaps with shortcuts.
- **Self-contained ExecPlans beat elegant ones**: If a stateless agent needs the original chat prompt to understand the plan, the plan is not done.

### Technical

- **Random room participants need a real persistence model**: In this repo that means persisted participant rows plus stable seat order, not client-only shuffles.
- **New share interaction types are not real until the whole stack agrees**: Core union, route validation, seam contract, adapter mapping, and database constraint all have to line up.
- **Listening-only is easy to regress during meeting-flow rewrites**: It is mostly “skip this gate” logic, which means it disappears unless it is named explicitly in the plan and tests.

## 2026-03-19

### Process

- **When production feels mysteriously “disconnected,” verify the infrastructure before rewriting code**: In this case the app still expected Supabase, Vercel still had Supabase env vars, and the real problem was that both Vercel projects were pointed at the same dead backend tenant.
- **Blocked production time should still produce clean forward motion**: Merging the small auth hardening slice and opening a bounded narrative-context hardening PR was better than forcing speculative production code while the real backend remained unavailable.
- **Write the catch-up note while the picture is fresh**: Once the diagnosis spans Vercel project links, stale env vars, merged PRs, blocked infra, and future slices, a single current-state memo is more valuable than expecting anyone to reconstruct the story from chat.

### Technical

- **A project switch is not automatically the cause of a backend outage**: The healthy `app` Vercel project and the old `the14thstep` project both carried the same stale Supabase ref, so moving aliases/projects did not sever a live database. It preserved an already-broken backend config.
- **A DNS-resolvable Postgres host is not enough**: The pooler hostname can resolve while the tenant behind every Postgres URL is still dead. Probing all configured Postgres URLs matters before attempting a seam-level transport rewrite.
- **If old data does not matter, fresh backend reprovision is cleaner than speculative adapter work**: Reconnecting the app to a new Supabase project and replaying the existing migrations is less debt than building a new production adapter against dead credentials just to avoid creating a replacement backend.

## 2026-03-19 (Room Restore Execution)

### Process

- **A harsh re-audit after the first frontend pass is worth it**: The initial room-led rewrite looked plausibly done, but the critique step exposed exactly where the page was still cheating: crisis continuation, listening-only shortcuts, topic handoff drift, and dead-end refresh behavior.
- **Backend truth beats frontend elegance when a room sequence needs to feel real**: The cleanest fixes came from making the server distinguish topic ask vs topic acknowledgment and from letting persisted phase state drive the page, not from layering more client-only choreography on top.

### Technical

- **One persisted phase can still hold two beats if the route understands interaction type**: `TOPIC_SELECTION` only became honest once `standard` meant “Marcus sets the topic in the room” and `respond_to` meant “Marcus acknowledges the chosen topic and moves the room forward.”
- **Generated visitor characters need full narrative fields, not just names and colors**: Otherwise they degrade prompt quality exactly when the room is trying to feel most alive.
- **Crisis interruption is not complete until the sequence engine stops advancing**: It is not enough to render the crisis response inline; the page must cancel the active share stream, clear pending user-turn continuations, and refuse to fire the next scheduled room beat.
- **Svelte 5 rune warnings are easy to tolerate and still worth logging explicitly**: They are not blocking errors here, but leaving them unnamed makes later state bugs harder to triage because the meeting page already has noisy initialization semantics.

## 2026-03-14

### Process

- **Diagnosis should challenge the "easy fix" first**: In this case, prompt cleanup alone would have looked productive while leaving the user in control of the meeting. The useful critique step was asking whether each proposed fix changed the actual center of gravity or just the wording.
- **Collaboration docs are worth updating during implementation, not after**: The shared Codex/Claude exchange stayed valuable because it captured diagnosis, implementation choices, verification, and remaining open questions in one place instead of splitting them across chat turns.
- **Huge dirty diffs can be mostly line-ending mirages**: Before treating an old worktree as a mine of unpromoted value, compare the diff again with `--ignore-cr-at-eol`. In this repo, that cut the apparent local delta from 177 files to 15 substantive files and prevented a fake “next slice” hunt.
- **Keep one clean `main` worktree separate from the lab**: Once the lab branch drifted badly, the safest way to sync merged remote truth was not to switch the dirty root but to fast-forward an already-clean `main` worktree. That kept promotion work and experimental residue from contaminating each other.

### Technical

- **Room autonomy has to live on the server, not just in prompts**: Removing a user gate is not enough if the page still nominates speakers or manually summons every character turn. Phase-owned speaker selection in the share route was necessary to make the room feel like it had its own momentum.
- **`TOPIC_SELECTION` needed its own prompt type, not a recycled one**: Mapping that phase to `reading` hid the deeper problem. Giving it a dedicated `topic_intro` prompt exposed the missing behavioral seam and made the flow easier to reason about.
- **Auto-flow changes should be verified in narrow lanes first**: `svelte-check` plus targeted Vitest on phase logic, prompt contracts, and route integration produced clear signal quickly, while broader browser verification was noisier and easier to misread.

## 2026-03-05

### Process

- Running hater-style subagent review before commit paid off immediately: it surfaced a high-severity auth flaw (forged guest identity) that test-green verification alone did not catch.
- Large auth migrations are safer when paired with the full verify chain (`check`, unit, composition, e2e) in the same session; partial lanes were insufficient to trust rollout readiness.

### Technical

- Guest-mode identity must never rely on unsigned client cookies. A signed token (HMAC) check in the auth seam is required before mapping any cookie value to `locals.userId`.
- Hosted third-party auth can coexist with seam-driven architecture if route actions stop owning provider-specific flows and move to provider-neutral outcomes (`signed-in`, `signed-out`, `auth-failed` notices).
- Accessibility regressions can hide in redesign work; basic ARIA state (`aria-expanded`, `aria-controls`) and live region semantics (`role="status"/"alert"`) should be treated as part of done criteria, not post-polish work.

## 2026-03-06

### Process

- A single lint error can quietly block the entire release lane; running `npm run verify` after each auth change keeps deployment confidence high.
- Branch triage quality improves dramatically when we trial-apply unique commits (`git cherry` + `cherry-pick --no-commit`) instead of relying on ahead/behind counts alone.
- Cleanup should be staged as `salvage -> verify -> archive`; deleting stale branches before extracting high-value hunks creates avoidable recovery work.

### Technical

- Environment sandbox restrictions can mimic app failures for Playwright (`listen EPERM`) by blocking local preview port binding. Treat this as an execution-environment constraint and rerun e2e in an unsandboxed context before diagnosing application behavior.
- Lockfiles generated with a newer npm can still break CI `npm ci` on older runners; always validate with the runner-major npm version (here, npm 10) before declaring dependency changes done.
- Security hardening commits should be extracted hunk-by-hunk when they include mixed formatting churn, so we preserve behavior while reducing merge risk.
- Character ID maps must enforce UUID shape before persistence writes; accepting slug values at seam boundaries turns data-shape drift into harder downstream failures.
- Dependabot advisory closure can require an explicit transitive override even after parent package upgrades; verify actual installed tree (`npm ls <pkg>`) instead of assuming advisory resolution from top-level version bumps.
- Callback endpoints must verify actual session resolution before emitting success notices; trusting callback entry alone can produce false \"signed-in\" UX even for invalid callback hits.
- npm 11 `ci` can fail hard if `package.json` optional top-level deps are not represented concretely in lockfile packages; if reproducibility is inconsistent, remove brittle optional declarations instead of forcing lock drift.
- When GitHub-hosted runners show install drift that cannot be reproduced locally, pin npm explicitly in workflow jobs and print the toolchain (`node -v`, `npm -v`) so install behavior is deterministic and diagnosable.
- If auth UI depends on client-only SDK bootstrap, initial SSR should communicate "loading" rather than rendering disabled primary actions with no explanation; otherwise healthy auth can look broken on first paint.

## 2026-02-21

### Process

- **Autonomous agent work can outpace documentation**: Previous Codex session implemented M11-17 fully but did not update ExecPlan Progress checkboxes. Always verify codebase state against plan checkboxes before starting new work.
- **Specification documents separate from ExecPlans can create hidden requirements**: The Writing Engine spec defined M11-19 requirements but wasn't explicitly linked from ExecPlan milestone descriptions. Cross-reference specs explicitly in milestone text.
- **Haiku Explore agents excel at codebase audit**: Using Haiku with `subagent_type=Explore` to verify milestone status before execution prevented duplicate implementation work.

### Technical

- **Voice example fields are highest-leverage prompt improvement**: `voiceExamples` as required 3-tuple correlates with quality improvements. Never make optional or allow placeholder text.
- **Quality validator scores generated but not enforced**: `voiceConsistency` and `authenticity` scores (0-10) are generated but only `pass` boolean used in retry logic. Numeric scores exist but discarded.
- **Voice pipeline retry attempts vs candidate generation are different patterns**: Current 3 retry attempts (same prompt) != M13's 7 candidate generations (generate-multiple-then-select pattern).
- **Meeting ritual prompts vs runtime orchestration**: Prompt templates can exist without being wired into meeting flow. Check both prompt existence AND runtime invocation.
- **Integration analysis prevents costly rework**: Identifying 65% merge conflict probability before parallel execution saved ~20k tokens of rework. Always analyze shared files before spawning parallel agents.

### Architecture

- **Narrative context caching prevents duplicate generation calls**: M14 `meetingNarrativeContextCache` + in-flight deduplication means multiple characters don't regenerate identical context. Apply to other meeting-scoped expensive operations.
- **Crisis detection precedence matters**: Crisis state must be meeting-scoped, not share-scoped, to prevent state drift across character turns.

### Counterintuitive

- **More complete implementation can look "incomplete" in tracking**: M11-17 fully implemented but marked incomplete in ExecPlan creates false signal that misdirects effort.
- **3 attempts != 7 candidates**: Retry logic feels similar to candidate generation but these are architecturally different patterns with different quality outcomes.
- **Prompt existence != runtime behavior**: Beautifully crafted unused prompt templates provide zero user value. Always verify call sites.

## 2026-02-22

### Process

- **Silent test/check runs need explicit stop rules**: In this workspace, valid commands (especially Vitest and `npm run check`) can stay silent long enough to waste time. Time-box silent runs, confirm liveness with `ps`, then stop and fall back to narrower verification if needed.
- **In-process review beats end-only review**: Logging route-cluster checkpoints while coding made it easier to catch missing test stubs and update the scope checklist before drift set in.
- **Selective subagent use is higher ROI than blanket subagent use**: Explorers were useful for audits, but tightly coupled route/state-machine work moved faster and more reliably in a single main-agent pass.

### Technical

- **M18 phase persistence touches many "small" test doubles**: Adding database seam methods (`getMeetingPhase`, `updateMeetingPhase`) requires a broad update sweep across hooks, mocks, composition tests, and route specs.
- **DB-first ritual phase sync can coexist with a separate UI mode state**: The meeting UI can keep local view-state (`sharing/closing/reflection`) while consuming ritual phase snapshots for correctness/debugging, as long as the server remains the source of truth.
- **Close route needs explicit phase semantics, not just summary completion**: Forcing `CLOSING` then persisting `POST_MEETING` on successful close keeps ritual state consistent even when the user closes from an unexpected current phase.

## 2026-02-23

### Process

- **A long-running e2e attempt can still be valuable if you wait for the real failure**: The first Playwright run looked like another hang, but waiting long enough surfaced a genuine SvelteKit export-validation bug and then a web-server timeout constraint.
- **Run broad verification after “targeted green”**: `verify:composition` caught a stale seam stub and an error-semantics regression that targeted route tests did not expose.
- **Document accepted blockers explicitly in the evidence file**: Treating `npm run check` diagnosis as a named deferred item kept the closeout honest without blocking all other high-signal verification.

### Technical

- **SvelteKit route modules allow underscore-prefixed helper exports for tests, but not arbitrary named exports**: Route-adjacent test helpers must use `_` prefixes (or move to separate modules) to avoid build/e2e failures.
- **Fallback generation should not erase upstream error semantics**: A quiet fallback is appropriate for repeated low-quality candidates, but repeated upstream failures (for example rate limits) should still surface as upstream errors.
- **Local Playwright `webServer.timeout` must account for full build + preview startup, not just server boot**: In this workspace `npm run build` took ~2m12s, so a 180s timeout was guaranteed to cause false negatives.

## 2026-02-20

### Process
- Milestone closure quality improved once we required a single evidence file per milestone (`plans/m10-production-evidence-2026-02-20.md`) instead of scattered log snippets.
- Context compaction is safer when compact handoff docs are maintained continuously, not only at session end.

### Technical
- Auth smoke should always include an auth-bound persistence assertion (for example, meeting row `user_id` equals the signed-in smoke user), otherwise fallback IDs can hide defects.
- Crisis-mode verification needs both positive-path checks (Marcus then Heather sequence) and negative-path checks (normal share blocked with `409`) to catch partial regressions.
- Character identity bridge stability depends on seeded `public.characters`; empty tables can manifest as UUID parse errors far away from the real root cause.
- Close/share endpoints should treat client transcript context as untrusted and rebuild prompt/summary context from persisted DB shares to avoid prompt poisoning.
- E2E reliability in this workspace improved by raising Playwright `webServer` timeout; otherwise healthy builds can fail before tests start.

## 2026-02-19

### Process
- For safety-sensitive features, lock policy to the ExecPlan during implementation and treat tone/product refinements as a separate explicit milestone to avoid accidental requirement drift.
- Milestone closure is more reliable when core logic, route integration, and route-level tests land together in one pass instead of splitting them across handoffs.

### Technical
- In mixed Windows/WSL workspaces, a copied project can appear healthy but still miss runnable local CLI shims (`svelte-kit`, `vitest`); rerun `npm install` in the active workspace before judging build health.
- Persisted crisis-state checks on the server are necessary even when the client tracks crisis mode; client-only flags are not sufficient across refreshes/re-entry.
- Callback lifecycle logic is easiest to verify when separated into a pure lifecycle core plus an orchestration workflow that resolves persistence-specific facts (for example, post-date meeting counts).
- Registry-backed fixture freshness (`io` + `freshnessDays` + explicit fixture paths) keeps verification deterministic and avoids hidden assumptions in ad-hoc scripts.
- Composition tests are more reliable when implemented as pure seam-bundle workflow tests; direct imports of route modules from non-`src` test paths can be brittle in TypeScript/SvelteKit path resolution.
- Vercel deployment checks in mixed Windows/WSL shells are fragile if `node` and `npx` resolve to different runtimes; validate toolchain (`which node`, `which npx`, version parity) before milestone deploy attempts.
- `@sveltejs/adapter-vercel` can fail on mounted filesystems that disallow symlinks; preserve local build health with `adapter-auto` and run deploy packaging in CI/native environments with proper symlink support.
- When `public.users.id` references `auth.users.id`, deployment smoke can pass for routing but fail at runtime on meeting creation unless both identity rows are present; treat this as bootstrap data, not app-code regression.
- Fingerprint-checking secrets (for example SHA-256 hash comparisons) is a reliable way to confirm env parity across local and Vercel without printing secrets.
- Vercel runtime logs may only show request metadata by default; pair them with direct seam-level reproduction (for example Supabase insert probes) to quickly isolate real root causes.

## 2026-02-16

### Process
- Keep four artifacts in sync during execution: `plans/the-14th-step-execplan.md`, `decision-log.md`, `CHANGELOG.md`, and this file.
- Fast handoffs depend on lightweight, append-only notes more than perfect prose.
- For long milestones, ship one tested core slice at a time and mark remaining scope explicitly in the ExecPlan.
- A dedicated `milestone-status` snapshot with explicit \"next 10 tasks\" per incomplete milestone reduces context-loss risk during compaction/handoffs.
- Milestone closeout works better when acceptance criteria are translated into concrete UI/component artifacts and checked off in a dedicated closeout checklist before moving ahead.

### Technical
- Probe thresholds should be configurable by environment; fixed latency budgets produce false failures.
- Validate xAI parsing against real payload shapes early, then lock the parser contract in tests.
- SvelteKit/Vite cold starts can be slow; warm the server before timing-sensitive probes.
- `npx`-based CLI usage (`vercel`, `supabase`) reduces setup friction and keeps agent runs reproducible.
- Each git worktree needs its own dependency install; do not assume sibling worktree `node_modules` are available.
- For strict TypeScript contracts, always narrow values extracted from `Record<string, unknown>` before numeric comparisons.
- Encode significance-scoring precedence in tests; mixed-signal shares otherwise create ambiguous expectations.
- Keep deterministic contract fixtures separate from live probe captures (`sample.json` vs `probe.sample.json`) so test baselines are not overwritten.
- Use script-level env loading (`node --env-file-if-exists=.env.local`) for probe commands in isolated worktrees.
- Parallel subagents work best when each owns non-overlapping file sets and one integrator owns final wiring/tests/docs.
- Verify Linux Node toolchain path explicitly (`/home/latro/.nvm/.../bin`) to avoid accidental Windows npm execution drift.
- Advancing a seam-driven milestone often requires expanding seam contracts first; route-level integration is much faster once adapter methods exist.
- Prompt-quality retry loops can be implemented with the same generation seam by treating validator calls as first-class seam interactions.
- Callback engines are safest as pure, test-first modules; route wiring then becomes straightforward and low-risk.
- Crisis-mode behavior is easiest to keep safe when normal generation paths are explicitly gated in both client and server routes.
- `verify` scaffolding is most reliable when each lane is separately runnable (`verify:contracts`, `verify:core`, etc.) and path filters are directory-based instead of shell glob patterns.
- SvelteKit route directories should not contain `+`-prefixed test filenames; route-adjacent tests are safer under `src/lib/server/**` importing route handlers directly.
- A minimal CI workflow that runs `check` + core/contract verify lanes gives immediate regression signal even before full Milestone 9 coverage is complete.
- EventSource-driven SSE clients are easier to reason about when the route also supports a GET input path and derives recent context from persistence instead of requiring request-body context.
- Close-phase persistence should remain behind the database seam (`completeMeeting`) to preserve seam-driven boundaries and avoid route-level SQL/client drift.
- For dual-track memory systems, keep retrieval-rule composition in a pure core module and treat adapter methods as raw data providers; this keeps milestone acceptance logic directly unit-testable.
- Continuity prompts become more stable when user-profile attendance metadata and recent user-share snippets are emitted as explicit prompt sections instead of implicit heuristics.

## 2026-02-15

### Process
- Seam-Driven Development worked well when we implemented probes and contracts before full adapters.
- Keeping governance files at repo root and app code in `app/` reduced churn and avoided risky project moves.

### Technical
- Existing `node_modules` from another platform can break local test runs; a clean `npm install` fixed missing Linux-native Rollup binaries.
- Lint tooling can behave differently from tests/checks in this environment, so verification should include multiple commands and timeout-aware triage.

## 2026-03-19

### Technical
- The meeting phase machine must advance sharing rounds on the user turn, not on the second character share. If the share route advances early, the room stops feeling like a meeting and starts skipping over the user.
- A persisted meeting roster is only real if the loader refuses to continue when roster persistence fails. Quietly falling back to generated visitor IDs turns a state bug into long-term drift.
- `interactionType` only matters if it survives every seam layer. Adding enum values without preserving them through fixtures, adapters, routes, and tests creates fake support that breaks the first time the UI leans on it.
- The introductions gate has two separate shortcut risks: the share route can jump to topic selection when all characters have spoken, and the user-share route can do the same with a simplistic speaker-count rule. Both have to use the real introduction-completion logic or the room quietly stops waiting for the user.
- Svelte 5 rune warnings about capturing `data` in state initializers are worth fixing early. They are easy to ignore, but they make it harder to tell whether later page bugs are real state mistakes or just noisy initialization patterns.
