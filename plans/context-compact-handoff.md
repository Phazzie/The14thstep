# Context Compact Handoff (Copy/Paste)

Branch: `codex/recoverymeeting-isolated-2026-02-16`
Last pushed commit: `db74596`
Repo: `/mnt/c/Users/latro/Downloads/t/recoverymeeting-codex`

## Immediate resume commands

```bash
cd /mnt/c/Users/latro/Downloads/t/recoverymeeting-codex
export PATH="/home/latro/.nvm/versions/node/v24.13.0/bin:$PATH"
cd app
npm run check
npm run verify:contracts
npm run verify:core
```

## Current milestone reality

- Complete: 0, 1, 2, 3, 4
- Functional/mostly complete: 5, 6
- Partial: 7, 8
- Not complete: 9, 10

## Top 3 priorities next

1. Finish Milestone 7 lifecycle/evolution logic and integration tests.
2. Finish Milestone 8 crisis UX/state policy and safety test coverage.
3. Complete Milestone 9 verify pipeline (fixture freshness + composition + e2e + CI hardening).

## Key files to read first

- `plans/spec-augmentation-2026-02-16.md`
- `plans/milestone-status.md`
- `plans/turnover-handoff-2026-02-16.md`
- `app/src/routes/meeting/[id]/share/+server.ts`
- `app/src/routes/meeting/[id]/close/+server.ts`
- `app/src/routes/meeting/[id]/crisis/+server.ts`

## Known TODO anchors

- `TODO(M7)` in `app/src/routes/meeting/[id]/share/+server.ts`
- `TODO(M7)` in `app/src/routes/meeting/[id]/close/+server.ts`
- `TODO(M8)` in `app/src/routes/meeting/[id]/crisis/+server.ts`
- `TODO(M8)` in `app/src/routes/meeting/[id]/+page.svelte`
- `TODO(M9)` in `app/scripts/verify-fixtures.mjs`
- `TODO(M9)` in `app/scripts/verify-composition.mjs`
