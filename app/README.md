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

### Supabase memory query probe

Requires `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `PROBE_USER_ID`.
Optional: set `SUPABASE_MEMORY_PROBE_MAX_MS` (defaults to `800`) for region-adjusted latency threshold.

```bash
npm run probe:supabase-memory
```

Expected result: query stats and `PASS` with total probe latency <=200ms.
