# Context Compact Handoff (Copy/Paste)

Branch: `codex/recoverymeeting-isolated-2026-02-16`  
Last pushed commit: `0621a8e`  
Repo: `/mnt/c/Users/latro/Downloads/t/recoverymeeting-codex`

## Immediate resume commands

```bash
cd /mnt/c/Users/latro/Downloads/t/recoverymeeting-codex
export PATH="/home/latro/.nvm/versions/node/v24.13.0/bin:$PATH"
cd app
npm run check
npm run test:unit -- --run
npm run verify
```

## Current project reality

- Milestones 0 through 10 are complete in this branch.
- Production URL is live: `https://the14thstep.vercel.app`.
- Milestone 10 production proof is captured in `plans/m10-production-evidence-2026-02-20.md`.
- Remaining work is quality hardening, observability, and optional follow-up automation.

## Critical operational truths

1. Character identity bridge:
   - Domain code uses slugs (for example `marcus`), DB uses UUIDs.
   - If `public.characters` is empty, persistence can fail with UUID parse errors (`22P02`).
2. Bootstrap identity coherence:
   - `auth.users.id` must have matching `public.users.id` rows for meeting creation FK integrity.
3. Production parity checks:
   - Keep `XAI_API_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` aligned across local and Vercel.
4. Crisis safety contract:
   - Crisis mode must return Marcus then Heather and block normal share generation.

## Where persistent logs live

- `CHANGELOG.md`
- `LESSONS_LEARNED.md`
- `decision-log.md`
- `plans/milestone-status.md`
- `plans/m10-production-evidence-2026-02-20.md`
- `plans/post-m10-quality-audit-2026-02-20.md`
- `plans/the-14th-step-execplan.md`

## Optional next priorities

1. Add automated nightly production smoke checks (auth, SSE share, crisis route, callback lifecycle probe).
2. Add lightweight production observability dashboard for crisis and callback lifecycle events.
3. Expand composition/e2e failure-mode scenarios (rate limits, upstream retries, degraded DB reads).
