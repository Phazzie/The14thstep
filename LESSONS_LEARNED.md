# Lessons Learned

This file captures practical lessons we want future work to reuse.

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
