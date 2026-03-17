# Source Agent Guide

Scope: apply these rules for work under `app/src/`.

## Core boundaries

- `lib/core/` remains pure and deterministic.
- `lib/server/` contains adapters and real I/O integration.
- Route modules should orchestrate and map errors, not hold domain policy.

## UI implementation rules

- Keep behavior and styling changes together when tightly coupled.
- Preserve mobile and desktop layouts; verify both after significant UI edits.
- Prefer reusable component updates over one-off route-level hacks.

## Auth and meeting flow rules

- Auth callbacks and cookie/session behavior require explicit tests for:
  - success path
  - expired/invalid callback path
  - bootstrap failure path
- Meeting join/setup changes must preserve validation and clear user-facing errors.
- Meeting flow changes must preserve room autonomy where intended; do not reintroduce user-operated beats without a deliberate product decision and test coverage.

## Verification baseline

- Run targeted unit tests for touched server routes/adapters.
- Run `npm run check` after TypeScript or Svelte structure changes.
- Run Playwright smoke/e2e after significant UI or auth flow updates.
- When a change is part of a decision-gated slice, keep validation evidence scoped to the actual files and behaviors touched, then record any blocked checks honestly in the active ExecPlan.
