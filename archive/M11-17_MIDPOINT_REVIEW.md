# M11-17 Midpoint Review

Date: 2026-02-23
Reviewer: Codex
Status: Complete (focused audit + fix wave)

## Scope

- M11/13/15 voice pipeline + quality validation enforcement
- M14/17 memory + callback continuity and persistence behavior
- M16 crisis handling (core + routes)
- Route error/status mapping consistency
- Character narrative field assumptions/validation

## Method

- Parallel code audits (explorer subagents) for independent subsystems
- Main-agent consolidation of findings
- Severity-ranked fix waves (HIGH first)
- Targeted verification after each fix wave

## Findings (severity-ranked)

| Severity | File | Finding | Status |
|---|---|---|---|
| HIGH (fixed) | `app/src/lib/core/narrative-context.ts`, `app/src/routes/meeting/[id]/share/+server.ts` | Therapy-speak could pass the share-route quality gate because `passesQualityValidationThresholds(...)` ignored `therapySpeakDetected`. | fixed |
| HIGH (fixed) | `app/src/routes/meeting/[id]/share/+server.ts` | Share route only checked persisted shares for crisis blocking, not persisted ritual phase, allowing normal SSE share generation while phase was already `CRISIS_MODE`. | fixed |
| MEDIUM (fixed) | `app/src/routes/meeting/[id]/share/+server.ts` | Fallback share path (`\"{name} is quiet tonight.\"`) persisted after repeated generator/validator failure without explicit client signaling or dedicated regression tests. | fixed |
| MEDIUM (fixed / decision implemented) | `app/src/lib/core/callback-lifecycle-workflow.ts`, `app/src/lib/server/seams/database/adapter.ts` | Callback retrieval scope conflict: prompts are intentionally meeting-scoped (anti-leakage), but lifecycle retirement needed cross-meeting visibility. | fixed |
| LOW / likely legacy | `app/src/lib/services/characterService.ts`, `app/src/routes/api/generate/+server.ts`, `app/src/lib/server/ai.ts` | Character-service/schema mismatch and prompt-context guards were reported, but these paths do not appear to be in the active SvelteKit meeting route flow and may be legacy. | triage |

## Fixes Applied During Review

- Updated `passesQualityValidationThresholds(...)` to reject `therapySpeakDetected`.
- Added regression test in `app/src/lib/core/narrative-context.spec.ts` for therapy-speak rejection.
- Added persisted phase-state crisis pre-check in `app/src/routes/meeting/[id]/share/+server.ts` to block SSE share generation when ritual phase is already `CRISIS_MODE`.
- Added route test in `app/src/lib/server/routes/meeting-share.spec.ts` covering persisted `crisis_mode` phase blocking.
- Added share-generation fallback signaling (`fallbackUsed`) to SSE `persisted` payload and UI status messaging.
- Added dedicated fallback-generation regression coverage in `app/src/lib/server/routes/meeting-share-generation.spec.ts`.
- Added optional `scopeToMeeting` callback seam flag and used `scopeToMeeting: false` for lifecycle retirement workflow while keeping prompt-path callback retrieval meeting-scoped.
- Added workflow regression coverage for unscoped lifecycle callback requests.

## Verification Evidence

- `npx vitest run src/lib/core/narrative-context.spec.ts src/lib/server/routes/meeting-share.spec.ts` (pass)
- `npx tsc --noEmit -p tsconfig.json` (pass)
- `npx vitest run src/lib/server/routes/meeting-share-generation.spec.ts src/lib/server/routes/meeting-share.spec.ts src/lib/core/narrative-context.spec.ts` (pass)
- `npx vitest run src/lib/core/callback-lifecycle-workflow.spec.ts` (pass)
- `npx vitest run src/lib/server/seams/database/adapter.spec.ts` (pass)

## Residual Risks / Follow-ups

- Prompt-path cross-meeting callback continuity remains intentionally limited by design (anti-leakage); verify this still matches product intent during final review.
- Prompt-path cross-meeting callback continuity remains intentionally limited by design (anti-leakage). This is an accepted design constraint, not an active defect.
- Legacy `characterService` / `/api/generate` path mismatch remains triaged as low risk unless those routes are reactivated.

## Review Outcome

- Midpoint review completed with no open HIGH findings.
- Active-path issues found during the audit were fixed and covered with targeted regression tests.
- Remaining noted risks are design tradeoffs or likely-legacy paths and do not block M18/M19 closeout.
