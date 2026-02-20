# Milestones 7 -> 9 -> 10 -> 8 Execution Checklist (2026-02-20)

Execution order was explicitly requested as:
1. Milestone 7
2. Milestone 9
3. Milestone 10
4. Milestone 8

Status sync note: this checklist was reconciled against:
- `plans/milestone-status.md` (2026-02-19 snapshot)
- `plans/the-14th-step-execplan.md` progress log
- `CHANGELOG.md` Milestone 7/8/9/10 evidence entries

## Milestone 7 (Callback Engine) - Step-by-step

- [x] 7.1 Create callback lifecycle core module with deterministic transitions (`active`, `stale`, `retired`, `legend`).
- [x] 7.2 Add lifecycle config/constants and pure rule functions for usage-count, inactivity, and revival.
- [x] 7.3 Add callback evolution rule path for creating child callbacks with `parent_callback_id`.
- [x] 7.4 Extend database seam contract with lifecycle update APIs and optional evolution-create API.
- [x] 7.5 Implement seam mocks + adapter implementations + contract tests for new lifecycle/evolution APIs.
- [x] 7.6 Wire lifecycle transitions into close/share server routes at all TODO(M7) points.
- [x] 7.7 Ensure callback reference events increment persistence fields required by lifecycle logic.
- [x] 7.8 Add pure unit tests covering every lifecycle transition and non-transition case.
- [x] 7.9 Add integration tests for 3+ meeting progression with lifecycle + evolution persistence behavior.
- [x] 7.10 Update exec plan + milestone status + changelog + lessons learned evidence for M7 completion.

## Milestone 9 (CI Pipeline and Governance) - Step-by-step

- [x] 9.1 Finalize `npm run verify` sequence with strict exit behavior.
- [x] 9.2 Replace `verify-fixtures` scaffold with real timestamp/staleness enforcement.
- [x] 9.3 Replace `verify-composition` scaffold with seam composition test harness.
- [x] 9.4 Add per-seam failure-injection composition test coverage.
- [x] 9.5 Add automated e2e flow test (`setup -> share -> close`).
- [x] 9.6 Add automated e2e crisis flow test.
- [x] 9.7 Update GitHub Actions workflow to run verify/test/check/e2e with proper dependencies.
- [x] 9.8 Add CI artifact upload for failed tests.
- [x] 9.9 Document verify workflow + troubleshooting in docs.
- [x] 9.10 Mark M9 complete only after clean local run confirms full verification pass.

## Milestone 10 (Production Deploy - Vercel) - Step-by-step

- [x] 10.1 Validate Vercel linkage settings and add required local deploy scripts if missing.
- [x] 10.2 Produce exact required production env var matrix doc (name, source, sensitivity).
- [ ] 10.3 Confirm Supabase schema readiness/migration status for production.
- [x] 10.4 Run preview deploy and capture logs/URL/evidence.
- [x] 10.5 Run production deploy and capture logs/URL/evidence.
- [ ] 10.6 Execute post-deploy smoke: auth/session.
- [x] 10.7 Execute post-deploy smoke: meeting creation + SSE share generation.
- [ ] 10.8 Execute post-deploy smoke: crisis-mode path.
- [x] 10.9 Record deploy evidence in plan/changelog/turnover docs.
- [ ] 10.10 Add rollback and break-glass notes in deployment docs.

## Milestone 8 (Crisis Response System) - Step-by-step

- [x] 8.1 Implement sticky/persistent crisis resource panel in meeting UI.
- [x] 8.2 Implement deterministic crisis timing/sequence policy (quiet message, pause, ordered responders).
- [x] 8.3 Enforce strict no-humor/no-callback/no-crosstalk behavior in crisis mode.
- [x] 8.4 Add setup-phase crisis detection from initial user mind-share input.
- [x] 8.5 Persist crisis mode in meeting state and load it on refresh/re-entry.
- [x] 8.6 Add server-side guards rejecting non-crisis share paths while in crisis mode.
- [x] 8.7 Add crisis keyword matrix tests (all planned terms).
- [x] 8.8 Add integration tests proving crisis mode entry + persistence + constraints.
- [x] 8.9 Add tests ensuring crisis resources remain visible through close state.
- [x] 8.10 Update plan + changelog + lessons learned evidence for M8 completion.

## Completion Gate

- [ ] All steps above completed and committed.
- [x] `npm run verify`, `npm run check`, and `npm run test:unit -- --run` pass locally.
- [x] Docs and milestone tracker updated with factual completion evidence.
