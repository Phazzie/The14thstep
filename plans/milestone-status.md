# Milestone Status Snapshot (2026-02-19)

This file is a fast resume map for incomplete milestones.

## Milestone 7 - Callback Engine

- Completion: 100%
- Status: Complete
- Completion notes:
  - Callback lifecycle core implemented (`active/stale/retired/legend`) with pure tests.
  - Lifecycle workflow implemented with seam-backed meeting-count aging and callback update persistence.
  - Share and close routes now apply lifecycle updates and evolution child-callback creation.
  - Lifecycle integration coverage added and green in unit suite.

### Optional follow-up tasks

1. Add multi-meeting e2e flow validating organic callback resurfacing under randomized probability rolls.
2. Add observability counters for callback lifecycle transitions (stale/retired/legend) to support tuning.

## Milestone 8 - Crisis Response System

- Completion: 100%
- Status: Complete
- Completion notes:
  - Crisis detection extracted to pure core (`crisis-engine.ts`) with keyword matrix tests.
  - Setup-time and persisted in-meeting crisis detection now initialize crisis mode reliably.
  - Server-side share route blocks normal generation while crisis mode is active.
  - Crisis route enforces deterministic Marcus-then-Heather sequence with timed pause and sticky resources payload.
  - Route-level tests now cover crisis page-load, crisis sequence, and persisted crisis gating behavior.

### Optional follow-up tasks

1. Run moderated UX review for crisis-mode tone and decide whether/how humor/callback behavior should be reintroduced safely.
2. Add crisis-flow Playwright coverage once Milestone 9 e2e harness is finalized.

## Milestone 9 - CI Pipeline and Governance

- Completion: 100%
- Status: Complete
- Completion notes:
  - `verify-fixtures` now enforces seam freshness windows from `seam-registry.json`.
  - Composition suite implemented under `app/tests/composition/` with full workflow and seam failure injection scenarios.
  - Playwright suite implemented under `app/tests/e2e/` for normal meeting flow and crisis flow.
  - `npm run verify` now runs lint-checks, type-checks, fixture freshness, seam contracts, core tests, composition tests, and e2e tests.
  - CI workflow now runs full verify and uploads Playwright artifacts on failures.
  - Local evidence: `npm run verify` passes end-to-end.

### Optional follow-up tasks

1. Add one CI status badge and troubleshooting guide section to `app/README.md`.
2. Expand e2e assertions to include retry/quality-validation behavior under mocked failure responses.

## Milestone 10 - Production Deploy (Vercel)

- Completion: 85%
- Status: In Progress (deployed + core smoke passed)
- Completion notes:
  - Production deployment succeeded via CLI from non-git temp deploy context, then aliased to `https://the14thstep.vercel.app`.
  - Runtime setup failure on `POST /?/join` was diagnosed to missing `public.users` profile data for `PROBE_USER_ID` (foreign-key violation on `meetings.user_id`).
  - One-time production data repair applied: inserted/upserted probe profile row in `public.users`.
  - Share streaming failure was diagnosed to mismatched production `XAI_API_KEY`; env was corrected and production redeployed.
  - Smoke checks now pass for `/`, `/probes/sse`, setup redirect, SSE share stream, and close endpoint.

### Next 10 tasks

1. Run full authenticated signup/login smoke (not probe-user path) and verify setup redirect uses `locals.userId`.
2. Run crisis-mode end-to-end smoke in production and record expected Marcus-then-Heather sequence evidence.
3. Verify callback lifecycle behavior in production across at least two meetings (aging + reference updates).
4. Record final Milestone 10 completion evidence in this file and ExecPlan once auth + crisis smoke are complete.
5. Add a small ops runbook entry for required production bootstrap data (`auth.users` + `public.users` coherence).
