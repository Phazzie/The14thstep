# The 14th Step (App Workspace)

This directory contains the SvelteKit application for the Recovery Meeting Simulator.

## Local Run

```bash
npm install
npm run dev
```

## Core Commands

```bash
npm run check
npm run lint
npm run test:unit -- --run
npm run test:e2e
```

## Verification Pipeline

- Full verification command:

```bash
npm run verify
```

- Verify lanes run in order:
  - `lint:verify`
  - `check`
  - `verify:fixtures`
  - `verify:contracts`
  - `verify:core`
  - `verify:composition`
  - `test:e2e`

- If `lint:verify` is slow/hangs in this mixed Windows/WSL environment, run the remaining lanes directly so regression checks still execute:

```bash
npm run check
npm run test:unit -- --run
npm run verify:fixtures
npm run verify:contracts
npm run verify:core
npm run verify:composition
npm run test:e2e
```

## Production Ops Runbook

### Rollback

1. Open Vercel project `the14thstep`.
2. Locate the previously healthy production deployment.
3. Promote/alias that deployment back to `https://the14thstep.vercel.app`.
4. Re-run quick smoke checks:
   - `GET /` responds `200`
   - setup/join action returns redirect
   - SSE share route emits chunk events.

### Break-glass checks

1. Env parity:
   - Verify `XAI_API_KEY`, `CLERK_SECRET_KEY`, `PUBLIC_CLERK_PUBLISHABLE_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` are set in Vercel production.
   - If behavior drifts between local and production, compare secret fingerprints (never print raw keys in logs).
2. Bootstrap data coherence:
   - `public.users.id` must exist for test/probe users.
   - Missing `public.users` profile row will surface as `meetings.user_id` FK failures during join.
   - Member identities are resolved from Clerk session tokens and mapped to deterministic UUID user IDs in app code.
3. Character identity readiness:
   - Ensure `public.characters` includes the 6 core characters (`Marcus`, `Heather`, `Meechie`, `Gemini`, `Gypsy`, `Chrystal`).
   - Missing core character rows can break slug-to-UUID mapping at persistence time.
4. Crisis safety path:
   - Verify crisis trigger still yields Marcus then Heather and blocks normal share generation while crisis mode is active.

## Milestone 0 Probes

Create `.env.local` from `.env.example` and populate required credentials for external probes.

### SSE streaming probe (local)

1. Start the dev server.
2. Run:

```bash
npm run probe:sse
```

3. Expected result: `PASS` after receiving 5 chunk events over roughly 2.5 seconds.

### Grok voice probe (xAI)

Requires `XAI_API_KEY`.

```bash
npm run probe:grok-voice
```

Expected result: pass-rate report with `PASS` when threshold is >=70%.

### Grok contract probe (xAI live fixtures)

Requires `XAI_API_KEY`.

```bash
npm run probe:grok-contract
```

Expected result: live probe fixtures written to:

- `src/lib/seams/grok-ai/fixtures/probe.sample.json`
- `src/lib/seams/grok-ai/fixtures/probe.fault.json`

### Grok quality cycle (xAI live pass-rate report)

Requires `XAI_API_KEY`.

```bash
npm run probe:grok-quality
```

Expected result: per-character pass rates and report file:

- `src/lib/seams/grok-ai/fixtures/voice-quality-report.json`

### Supabase memory query probe

Requires `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `PROBE_USER_ID`.
Optional: set `SUPABASE_MEMORY_PROBE_MAX_MS` (defaults to `800`) for region-adjusted latency threshold.

```bash
npm run probe:supabase-memory
```

Expected result: query stats and `PASS` with total probe latency <= `SUPABASE_MEMORY_PROBE_MAX_MS` (default `800`).
