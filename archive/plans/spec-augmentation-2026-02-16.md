# Spec Augmentation (2026-02-16)

Purpose: close ambiguity left in `plans/the-14th-step-execplan.md` so a new agent can finish Milestones 7-10 without re-discovery.

## 1) Ground Truth: Current Implementation Contract

These behaviors are implemented in branch `codex/recoverymeeting-isolated-2026-02-16` as of commit `f932e5f`:

- Setup flow:
  - `app/src/routes/+page.svelte`
  - `app/src/routes/+page.server.ts`
- Meeting page + transcript interactions:
  - `app/src/routes/meeting/[id]/+page.server.ts`
  - `app/src/routes/meeting/[id]/+page.svelte`
- Share generation (SSE):
  - `app/src/routes/meeting/[id]/share/+server.ts`
- User share persistence + flags:
  - `app/src/routes/meeting/[id]/user-share/+server.ts`
- Expand endpoint:
  - `app/src/routes/meeting/[id]/expand/+server.ts`
- Close endpoint + callback scan integration:
  - `app/src/routes/meeting/[id]/close/+server.ts`
- Crisis support endpoint:
  - `app/src/routes/meeting/[id]/crisis/+server.ts`
- Callback engine (pure):
  - `app/src/lib/core/callback-engine.ts`
- Memory/callback prompt context integration:
  - `app/src/lib/core/memory-builder.ts`
  - wired in `app/src/routes/meeting/[id]/share/+server.ts`
- Database seam and adapter expanded:
  - `app/src/lib/seams/database/contract.ts`
  - `app/src/lib/server/seams/database/adapter.ts`

## 2) Acceptance Clarifications for Remaining Milestones

## Milestone 7 (remaining)

Done:
- Rule-driven callback probability exists and is tested.
- Runtime callback selection is wired into share generation.
- Callback reference count marking is wired.

Not done:
- Full lifecycle transitions and evolution logic required by plan text.

Explicit required outcomes to call Milestone 7 complete:
1. Implement lifecycle transition rules in persisted callbacks:
   - `active -> stale` when `times_referenced >= 12` without evolution.
   - `active/stale -> retired` when unused for 15+ meetings.
   - `retired -> legend` when revived by high-quality reuse.
2. Add callback evolution path:
   - create child callback with `parent_callback_id` when a share meaningfully evolves an existing callback.
3. Add sequential-meeting integration tests proving matrix outcomes and lifecycle transitions.

Suggested implementation location:
- New pure module: `app/src/lib/core/callback-lifecycle.ts`
- Wire from:
  - `app/src/routes/meeting/[id]/share/+server.ts` (when callbacks are used)
  - `app/src/routes/meeting/[id]/close/+server.ts` (post-meeting lifecycle updates)

## Milestone 8 (remaining)

Done:
- Crisis detection flag from user-share path.
- Crisis endpoint generates Marcus/Heather responses.
- Normal share generation is server/client gated during crisis mode.

Not done:
- Full spec-level crisis UX/state policy and test coverage.

Explicit required outcomes to call Milestone 8 complete:
1. UI/state behavior:
   - render persistent/sticky crisis resource panel regardless of scroll.
   - explicit system message: room goes quiet.
   - 2s pause behavior before crisis responses (or documented equivalent with tests).
2. Safety policy enforcement:
   - no humor/callback/crosstalk generation during crisis mode.
   - setup-time crisis entry handling (if setup text is crisis-like).
3. Tests:
   - crisis keyword matrix test coverage.
   - integration tests for crisis mode transition and generation suppression.

## Milestone 9 (remaining)

Explicit required outcomes to call Milestone 9 complete:
1. Add `verify` command in `app/package.json` with sequence:
   - lint
   - typecheck
   - fixture freshness
   - contract tests
   - core tests
   - composition tests
   - e2e tests
2. Add fixture freshness checker script for seam fixture timestamps.
3. Add composition tests under `app/tests/composition/`:
   - happy path full meeting
   - one failure scenario per seam
4. Add e2e tests under `app/tests/e2e/` for browser flow.
5. Wire CI workflow (GitHub Actions).

## Milestone 10 (remaining)

Explicit required outcomes to call Milestone 10 complete:
1. Vercel project linked and env vars set in Vercel project scope.
2. Production deploy succeeds from branch/main merge path.
3. Post-deploy smoke:
   - auth flow works
   - setup -> meeting -> share -> close flow works
   - no server runtime errors in logs
4. Record deployed URL and verification evidence in plan + changelog.

## 3) Architecture Constraints (Do Not Regress)

- Keep Seam-Driven Development boundaries:
  - core in `app/src/lib/core/*` stays I/O-free.
  - I/O only in seams/adapters/routes.
- Keep seam result envelope (`ok/err`) semantics end-to-end.
- Keep environment secrets in `.env.local` only, never in repo files.
- Keep governance docs in sync after each milestone-sized change:
  - `plans/the-14th-step-execplan.md`
  - `decision-log.md`
  - `CHANGELOG.md`
  - `LESSONS_LEARNED.md`

## 4) Definition of “100% Complete” Per Remaining Milestone

- Milestone 7: lifecycle + evolution + integration tests (not just probability function).
- Milestone 8: full crisis UX + safety suppression policy + tests.
- Milestone 9: reproducible automated `verify` + CI green.
- Milestone 10: live URL deployed + smoke-tested evidence documented.
