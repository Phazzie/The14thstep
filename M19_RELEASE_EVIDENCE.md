# M19 Release Evidence

Date: 2026-02-23
Reviewer: Codex
Status: Ready with noted local-environment caveat (`npm run check` stall diagnosis deferred)

## Scope

This evidence file covers Milestone 19 release-readiness verification and closeout evidence for the M11-M19 finish pass.

## Critical Changes Verified in This Pass

- M18 ritual phase persistence/load wired across `share`, `user-share`, `crisis`, `close`, `+page.server`, and client sync in `+page.svelte`
- Route-level ritual progression/persistence tests added (including close/crisis/user-share/page-load)
- Full route-handler integration proof added: `app/src/lib/server/routes/meeting-ritual-phase.integration.spec.ts`
- Midpoint-review fixes applied (therapy-speak gate, persisted `CRISIS_MODE` share blocking, fallback signaling/tests, callback lifecycle scope conflict)
- Release blocker fixed: invalid custom endpoint export in `app/src/routes/meeting/[id]/share/+server.ts`
- Playwright web-server timeout increased to match measured local build time (`app/playwright.config.ts`: `180000 -> 300000`)

## Verification Matrix (Executed)

### Type / contracts / core / composition

- `npx tsc --noEmit -p tsconfig.json` -> PASS (2026-02-23)
- `npm run verify:contracts` -> PASS (21 tests)
- `npm run verify:core` -> PASS (131 tests)
- `npm run verify:composition` -> PASS after patching stale seam stub in `tests/composition/seam-failure.spec.ts`

### Route/integration regressions (targeted)

- `npx vitest run --project server src/lib/server/routes/meeting-ritual-phase.integration.spec.ts` -> PASS
- `npx vitest run --project server src/lib/server/routes/meeting-share-generation.spec.ts src/lib/server/routes/meeting-share.spec.ts` -> PASS
- `npx vitest run --project server src/lib/server/routes/meeting-share-generation.spec.ts tests/composition/seam-failure.spec.ts` -> PASS (after upstream-error propagation fix for zero-candidate rate-limit case)

### Build / browser flow

- `time npm run build` -> PASS (`real 2m12.390s` in this workspace)
- `npm run test:e2e` -> PASS after:
  - fixing invalid endpoint export (`generateValidatedShare` -> `_generateValidatedShare`)
  - increasing Playwright `webServer.timeout` to `300000`

Observed Playwright results:
- `tests/e2e/meeting-flow.spec.ts` normal browser flow -> PASS
- `tests/e2e/meeting-flow.spec.ts` crisis UI/resources flow -> PASS

## Manual / Production-like Evidence

- Local Playwright browser flows exercised:
  - share generation
  - user share submission
  - close reflection path
  - crisis mode UI/resource rendering
- Route-level integrated ritual-phase proof exercised server handlers end-to-end with an in-memory database seam:
  - `share` -> `user-share` -> `close` progression
  - persisted phase restore via page reload (`+page.server` load)

## Performance / Timing Observations (local workspace)

- `npm run build` total wall time: ~2m12s
- Playwright `webServer` startup required >180s timeout budget in this workspace due build+preview startup sequence
- Close-route instrumentation now logs:
  - memory extraction parse success/failure
  - extraction duration
  - fallback summary generation duration

## Known Caveats / Accepted External Blockers

1. `npm run check` root-cause diagnosis is deferred
- Behavior: prints banner (`svelte-kit sync && svelte-check ...`) then remains silent while `svelte-check` process stays alive
- Handling: stopped per hang guardrail and replaced with fallback verification (`tsc`, targeted/full Vitest, build, Playwright)
- This is documented, not hidden

2. Real Supabase-backed manual validation not reproducible in this workspace without env credentials
- Playwright logs show local adapter fallback path when `SUPABASE_URL` is missing
- Coverage substitute used for release confidence here:
  - route-handler integration proof with in-memory database seam
  - browser e2e user flows passing

3. Phase-state migration rollout lock sensitivity is operational (documented strategy)
- `app/supabase/migrations/20260221_000002_add_meeting_phase_state.sql` uses standard index DDL on `public.shares`
- Use low-traffic / maintenance-window rollout by default, or split/manual concurrent index DDL if production traffic requires it
- See `app/supabase/migrations/README.md` (post-ship hardening issue `#16`)

## Release Readiness Assessment

- Core functionality (M11-M19 active paths): Verified
- Ritual phase integration (M18): Verified with route tests + integration proof
- Browser user flows: Verified locally (Playwright)
- High-severity known defects in active paths: None open
- Remaining blockers: environment/tooling diagnosis (`npm run check`) and real-credential local DB validation

## Recommendation

Ship-ready for code/review closeout with the documented local-environment caveat (`npm run check` diagnosis deferred). If a strict gate requires `npm run check`, treat that as the only remaining local verification blocker.
