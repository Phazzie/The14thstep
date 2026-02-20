# Handoff: Recovery Meeting App (Synced, February 20, 2026)

## 1) Repo identity

- Repo path: `/mnt/c/Users/latro/Downloads/t/recoverymeeting-codex`
- Active branch: `codex/recoverymeeting-isolated-2026-02-16`
- Upstream: `origin/codex/recoverymeeting-isolated-2026-02-16`
- Last pushed commit at handoff start: `0621a8e`

## 2) Current milestone state

- Milestone 0: complete
- Milestone 1: complete
- Milestone 2: complete
- Milestone 3: complete
- Milestone 4: complete
- Milestone 5: complete
- Milestone 6: complete
- Milestone 7: complete
- Milestone 8: complete
- Milestone 9: complete
- Milestone 10: complete

Primary status source: `plans/milestone-status.md`.

## 3) Production state

- Public URL: `https://the14thstep.vercel.app`
- Milestone 10 evidence file: `plans/m10-production-evidence-2026-02-20.md`
- Verified in production:
  - sign in/out flow,
  - authenticated join with user-id persistence proof,
  - SSE share path,
  - crisis route ordering and share blocking during crisis,
  - callback lifecycle reference increment,
  - schema/readiness checks for core tables.

## 4) Known sensitive integration truths

1. Domain character IDs use slugs (for example `marcus`), while DB uses UUIDs.
2. `public.characters` must contain the six core characters or slug-to-UUID mapping can fail.
3. `auth.users.id` and `public.users.id` must remain coherent for meeting FK integrity.
4. Vercel env parity for `XAI_API_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` is operationally critical.

## 5) Must-read files on resume

- `plans/the-14th-step-execplan.md`
- `plans/milestone-status.md`
- `plans/m10-production-evidence-2026-02-20.md`
- `plans/post-m10-quality-audit-2026-02-20.md`
- `plans/context-compact-handoff.md`
- `CHANGELOG.md`
- `LESSONS_LEARNED.md`
- `decision-log.md`

## 6) Verification commands

```bash
cd /mnt/c/Users/latro/Downloads/t/recoverymeeting-codex/app
npm run check
npm run test:unit -- --run
npm run verify
```

## 7) Next best work (optional hardening)

1. Add a scheduled production smoke runner (auth, share, crisis, callback lifecycle).
2. Add observability counters/dashboards for callback transitions and crisis route usage.
3. Extend composition/e2e failure-injection coverage for retry and degraded-upstream paths.
