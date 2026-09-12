# M11-19 Scope Lock Checklist

Last updated: 2026-02-23
Status: Closeout complete (with documented local `npm run check` blocker)

## Purpose

This checklist is the source of truth for remaining work needed to finish M11-19 without hidden loose ends.

## Rules

- Every line item must include:
  - file(s)
  - why it matters
  - validation method
  - status
- Use this checklist to prevent "mostly done" claims.
- Add newly discovered work immediately (including handoff omissions).

## Decision queue (must resolve during execution)

- [x] Intro completion semantics in routes vs core `areIntroductionsComplete(...)`
  - Decision: keep current simplified threshold-based route progression for this ship; revisit alignment with `areIntroductionsComplete(...)` in follow-up hardening
- [x] Intro order enforcement mode (`warn` vs `block`)
  - Decision: `warn` for this ship (preserve flow, log violations)
- [x] Crisis-during-closing transition behavior
  - Decision: crisis route may interrupt to `CRISIS_MODE`; explicit close request can force `CLOSING` then persist `POST_MEETING`
- [x] Client/server phase sync strategy (DB/server-first vs client-tracked)
  - Decision: server/DB-first; client consumes phase snapshots but is not authoritative

## Critical path (to working app)

- [x] Complete phase integration in `app/src/routes/meeting/[id]/user-share/+server.ts`
  - Why: user shares participate in round state and topic-selection transition
  - Current state: phase load/track/transition/persist added; needs dedicated route-phase tests and semantic review
  - Validation: targeted route tests + manual user share -> phase update behavior
  - Status: complete (route wired + route tests + integrated ritual phase flow test)
- [x] Complete phase integration in `app/src/routes/meeting/[id]/crisis/+server.ts`
  - Why: crisis mode affects route flow and state machine correctness
  - Current state: crisis route now persists `CRISIS_MODE`; closing-interrupt behavior has direct route test coverage
  - Validation: crisis route test + manual crisis trigger + persisted phase check
  - Status: complete (route wired + crisis route tests incl closing-interrupt case)
- [x] Complete phase integration in `app/src/routes/meeting/[id]/close/+server.ts`
  - Why: closing/post-meeting transitions must persist and reload correctly
  - Current state: close route now forces `CLOSING` and persists `POST_MEETING`; needs dedicated tests
  - Validation: close flow test + manual close/reload behavior
  - Status: complete (route wired + dedicated route tests + integrated ritual phase flow test)
- [x] Confirm/finish client phase sync in `app/src/routes/meeting/[id]/+page.svelte`
  - Why: UI currently may ignore server phase state and drift from backend
  - Current state: now displays/updates ritual phase snapshots from server responses, but UI flow still uses separate local `meetingPhase`
  - Validation: manual reload/resume + integration test if supported
  - Status: complete for ship (DB/server-first snapshot sync + UI visibility; warning cleaned up)

## Verification and coverage (M18)

- [x] Add adapter tests for `getMeetingPhase` / `updateMeetingPhase`
  - Files: `app/src/lib/server/seams/database/adapter.ts` tests (exact target TBD)
  - Why: new seam methods need direct error/contract coverage
  - Validation: passing seam/adapter tests
  - Status: complete (added adapter spec coverage for read/write + malformed/null payloads)
- [x] Add route integration tests for phase progression + persistence + crisis/closing edge cases
  - Files: route/composition specs (exact targets TBD)
  - Why: most remaining risk is route wiring behavior
  - Validation: passing integration tests
  - Status: complete (route-level tests + `meeting-ritual-phase.integration.spec.ts` full progression/reload proof)

## Midpoint review (M11-17)

- [x] Produce `M11-17_MIDPOINT_REVIEW.md` with severity-ranked findings and evidence
  - Validation: doc exists + references + tested fixes for HIGH findings
  - Status: complete (findings documented; HIGH items fixed; evidence recorded)

## Release readiness (M19)

- [x] Produce `M19_RELEASE_EVIDENCE.md` with reproducible evidence
  - Validation: command results + smoke transcripts + metrics included
  - Status: complete

## Final review and closure

- [x] Produce `M11-19_FINAL_REVIEW.md`
  - Validation: severity-ranked findings + final recommendation
  - Status: complete
- [x] Hidden unfinished work sweep (TODO/FIXME/HACK/partial stubs/doc mismatches)
  - Validation: sweep results recorded and reviewed
  - Status: complete (active app/test paths clean; docs reviewed and synced)
- [x] Governance docs updated (`plans/the-14th-step-execplan.md`, `decision-log.md`, `CHANGELOG.md`, `LESSONS_LEARNED.md`)
  - Validation: diffs present and current
  - Status: complete

## Handoff omissions / under-specified work (fill during Phase 0)

- [x] Update stale M11-19/M13-18 handoff docs that still claim core M18 route/persistence wiring is missing
  - Files:
    - `HANDOFF_CODEX_FINAL_M11-19.md`
    - `HANDOFF_M13-M18_INTEGRATION.md`
  - Why: stale docs can trigger redundant work and incorrect gating
  - Validation: docs reflect actual code state and clearly separate done vs remaining work
  - Status: complete (dated partial-stale notices added)
- [x] Add close-route instrumentation for post-meeting memory extraction success/fallback + timing
  - File: `app/src/routes/meeting/[id]/close/+server.ts`
  - Why: handoff/documentation expectations mention observability, but implementation lacks it
  - Validation: logs/metrics emitted for success/fallback path and elapsed time
  - Status: complete (console instrumentation added; metrics backend still optional)
- [x] Add runtime validation for character narrative fields used by voice pipeline (e.g. `voiceExamples`, `lie`)
  - Files: `app/src/lib/core/characters.ts`, `app/src/lib/core/types.ts` (and/or a new validator module)
  - Why: type-only guarantees do not protect runtime visitor/extended character data
  - Validation: invalid profile is rejected or logged before prompt generation
  - Status: complete (core enforcement + runtime warning path + tests)
- [x] Add at least one backend-integrated browser/e2e flow (or equivalent non-stubbed integration proof)
  - Files: Playwright/integration tests (exact target TBD)
  - Why: current e2e coverage may rely on stubs and miss real backend regressions
  - Validation: one passing end-to-end flow hits real meeting routes
  - Status: complete (added route-level integrated phase-flow proof + Playwright e2e pass)
