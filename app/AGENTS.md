# App Agent Guide

Scope: apply these rules for work under `app/`.

## Architecture rules

- Follow Seam-Driven Development order for I/O seams: contract, probe, fixtures, mock, contract test, adapter, composition wiring.
- Keep `src/lib/core/` pure (no network calls, no database calls, no clock/uuid direct calls, no imports from `src/lib/server/`).
- Keep real I/O in server-only modules under `src/lib/server/`.
- Return seam results using the shared result envelope from `src/lib/core/seam.ts`.

## Seam-Driven Development flow

For each I/O seam, execute these steps in order:

1. Contract
- Define seam input/output schemas, result envelope usage, and allowed error codes in `src/lib/seams/<seam>/contract.ts`.

2. Probe
- Add a real-system probe in `probes/` (or seam-local probe if already standardized).
- Record deterministic fixture outputs (success and failure shapes) under seam fixtures.

3. Fixtures
- Treat fixture captures as source-of-truth snapshots.
- Do not hand-edit I/O fixture payloads except redaction of secrets.

4. Mock
- Implement a fixture-backed mock that returns fixture data without business logic transforms.

5. Contract tests
- Add tests that prove fixture schema conformance and mock fidelity.
- Include negative-path validation for malformed input/output shapes.

6. Adapter
- Implement real adapter in `src/lib/server/seams/<seam>/adapter.ts`.
- Validate adapter input and output against seam contract and map all failures to seam error taxonomy.

7. Composition wiring
- Wire seam implementation through server composition boundaries (for example `hooks.server.ts` or server loaders/actions).
- Keep browser code free from server-only imports.

8. Verification gate
- Run seam-relevant tests and probes before moving to the next seam.
- Update plan and governance artifacts (`plans/the-14th-step-execplan.md`, `decision-log.md`, `CHANGELOG.md`, `LESSONS_LEARNED.md`) with meaningful outcomes.

## Definition of done for app changes

- Relevant tests pass.
- Relevant probes pass for touched seams.
- ExecPlan progress and logs are updated for meaningful milestones.
- `CHANGELOG.md` and `LESSONS_LEARNED.md` are updated with concise entries.
- No secrets are committed; env changes are reflected in `app/.env.example` only.

## Runbook commands

Run from `app/`:

- Install: `npm install`
- Unit tests: `npm run test:unit -- --run`
- Type and Svelte checks: `npm run check`
- SSE probe: `npm run probe:sse`
- Grok voice probe: `npm run probe:grok-voice`
- Supabase memory probe: `npm run probe:supabase-memory`

## Environment rules

- Keep secrets in `app/.env.local` (ignored by git).
- Keep non-secret variable templates in `app/.env.example`.
- If a new required env var is introduced, document where it is used in `app/README.md`.
