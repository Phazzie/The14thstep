# Milestone Status Snapshot (2026-02-16)

This file is a fast resume map for incomplete milestones.

## Milestone 7 - Callback Engine

- Completion: 70%
- Status: Partial
- Why not 100%:
  - Probability matrix is implemented and wired, but callback lifecycle transitions/evolution are not complete.
  - No sequential multi-meeting integration suite proving lifecycle behavior.

### Next 10 tasks

1. Add `core` lifecycle module for callback status transitions (`active/stale/retired/legend`).
2. Add persisted update method(s) in database seam for callback status changes.
3. Implement `times_referenced` threshold logic for stale transitions.
4. Implement unused-for-N-meetings retirement logic.
5. Add revival rule path for `retired -> legend`.
6. Add callback evolution detection criteria and child callback creation with `parent_callback_id`.
7. Wire lifecycle updates into meeting close flow after scan and after share usage.
8. Add deterministic tests for each lifecycle rule in pure `core` tests.
9. Add integration tests with mock seams for 3+ meeting progression.
10. Record lifecycle decisions/evidence in plan + decision log.

## Milestone 8 - Crisis Response System

- Completion: 45%
- Status: Partial
- Why not 100%:
  - Crisis endpoint and gating exist, but full spec UX/behavior policy is not fully implemented.
  - Missing end-to-end crisis scenario coverage.

### Next 10 tasks

1. Add strict sticky/fixed crisis resource panel behavior regardless of scroll position.
2. Add explicit timed sequence behavior (quiet message, pause, response order) with testable timers.
3. Ensure no callback/crosstalk/humor generation paths are reachable in crisis mode.
4. Add setup-phase crisis detection path for "what's on your mind" input.
5. Add meeting-state crisis flag persistence and load behavior.
6. Add server-side enforcement guard so non-crisis endpoints reject conflicting modes.
7. Add crisis keyword matrix tests against all planned keywords.
8. Add integration tests for entering and remaining in crisis mode.
9. Add tests ensuring crisis panel remains visible through close state.
10. Update plan/docs with safety policy and verification evidence.

## Milestone 9 - CI Pipeline and Governance

- Completion: 20%
- Status: Early scaffold
- Why not 100%:
  - We have docs discipline and baseline checks, but not full automated verify pipeline coverage.
  - Composition + fixture freshness + e2e verification automation incomplete.

### Next 10 tasks

1. Finalize `npm run verify` command sequence for all required gates.
2. Implement fixture freshness validator using seam metadata and fixture timestamps.
3. Add composition test directory and initial end-to-end seam-bundle scenarios.
4. Add one injected failure scenario per seam in composition tests.
5. Add e2e flow tests for setup -> share -> close path.
6. Add e2e crisis-mode flow test.
7. Add CI workflow file to run verify on PR/push.
8. Add artifact upload for failed test logs/screenshots.
9. Add quick local docs for verify runtime expectations and troubleshooting.
10. Mark Milestone 9 done only after CI passes from a clean clone.

## Milestone 10 - Production Deploy (Vercel)

- Completion: 10%
- Status: Not started (implementation is deployable candidate, not verified live)
- Why not 100%:
  - Vercel deployment and post-deploy smoke evidence are not completed.

### Next 10 tasks

1. Confirm Vercel project linkage (`VERCEL_PROJECT_ID`, `VERCEL_ORG_ID`).
2. Set all required production env vars in Vercel project.
3. Ensure Supabase production project schema/migrations are current.
4. Run preview deploy and validate server/runtime logs.
5. Run production deploy.
6. Smoke test auth/session + meeting creation.
7. Smoke test SSE share generation in deployed env.
8. Smoke test crisis flow in deployed env.
9. Record deployed URL and verification evidence in plan/changelog.
10. Add rollback note and post-deploy checklist entry in handoff docs.
